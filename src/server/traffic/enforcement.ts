import "server-only";
import type { TrafficFineStatus } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { logAudit } from "@/server/audit";
import { AuthError, BusinessError, NotFoundError } from "@/server/errors";
import { inScope, type Actor } from "@/server/auth/dal";
import { randomToken } from "@/server/crypto";
import type { RequestContext } from "@/server/request-context";
import { nextNumber } from "@/server/sequences";
import { notify, notifyPermission } from "@/server/notifications";
import { saveUpload } from "@/server/storage";
import { addCaseEvent } from "@/server/timeline";
import { createCase } from "@/server/cases/service";
import { resolveDriverPerson, resolveVehicle, upsertDriverProfile } from "@/server/traffic/registry";
import { resolveTrafficStation } from "@/server/traffic/scope";
import { sealTicket } from "@/server/traffic/seal";
import { getTrafficSettings } from "@/server/traffic/settings";
import { normalizePlate, type ControlInput, type EvidenceInput, type FineStatusInput, type TicketCancelInput } from "@/server/traffic/schemas";

const nul = (v: string | undefined | null) => (v ? v : null);

export type WantedHit = { id: string; number: string; offense: string; dangerLevel: string; status: string; via: "PERSON" | "VEHICLE"; name: string };

/** Active/located wanted notices matching the controlled driver or vehicle (any station: a wanted person is a national matter). */
export async function findWantedHits(personId: string | null, plate: string | null): Promise<WantedHit[]> {
  const or = [...(personId ? [{ personId }] : []), ...(plate ? [{ vehicles: { some: { plateNumber: plate } } }] : [])];
  if (!or.length) return [];
  const rows = await prisma.wantedPerson.findMany({
    where: { status: { in: ["ACTIVE", "LOCATED"] }, OR: or },
    select: { id: true, number: true, offense: true, dangerLevel: true, status: true, personId: true, person: { select: { firstName: true, lastName: true } } },
    take: 5,
  });
  return rows.map((w) => ({ id: w.id, number: w.number, offense: w.offense, dangerLevel: w.dangerLevel, status: w.status, via: w.personId === personId ? "PERSON" : "VEHICLE", name: `${w.person.lastName} ${w.person.firstName}` }));
}

export type RecordControlResult = {
  control: { id: string; number: string };
  ticket: { id: string; number: string; verificationToken: string; totalFineFcfa: number; hasNonSettleableOffence: boolean } | null;
  fine: { id: string; number: string; amountFcfa: number } | null;
  wantedHits: WantedHit[];
  vehicleAlert: string | null;
};

/** Records a roadside control; when offences are selected it issues the electronic PV and the fine in the same transaction. */
export async function recordControl(actor: Actor, input: ControlInput, ctx: RequestContext): Promise<RecordControlResult> {
  const station = await resolveTrafficStation(actor, input.stationId);
  if (input.controlledAt.getTime() > Date.now() + 10 * 60_000) throw new BusinessError("The control date cannot be in the future.");
  const violationIds = [...new Set(input.violationIds)];
  const violations = violationIds.length ? await prisma.trafficViolation.findMany({ where: { id: { in: violationIds }, isActive: true }, include: { legalReference: true }, orderBy: { sourceOrder: "asc" } }) : [];
  if (violations.length !== violationIds.length) throw new BusinessError("One or more selected offences are invalid or no longer active.");
  const plate = normalizePlate(input.plateNumber);
  if (violations.length && !input.driverPersonId && !input.driverLastName && !input.driverCni && !input.licenseNumber && !plate && !input.vehicleId) throw new BusinessError("Identify the driver or the vehicle (registration number) to issue a PV.");
  if (input.caseId) {
    const kase = await prisma.case.findUnique({ where: { id: input.caseId }, select: { stationId: true, regionId: true } });
    if (!kase || !inScope(actor, kase)) throw new BusinessError("Selected case is invalid or outside your scope.");
  }
  if (input.incidentId) {
    const inc = await prisma.incident.findUnique({ where: { id: input.incidentId }, select: { stationId: true, regionId: true } });
    if (!inc || !inScope(actor, inc)) throw new BusinessError("Selected incident is invalid or outside your scope.");
  }
  const settings = await getTrafficSettings();

  const result = await prisma.$transaction(async (tx) => {
    const person = await resolveDriverPerson(
      tx,
      actor,
      station,
      { personId: nul(input.driverPersonId) ?? undefined, firstName: nul(input.driverFirstName) ?? undefined, lastName: nul(input.driverLastName) ?? undefined, dateOfBirth: input.driverBirthDate, phone: nul(input.driverPhone) ?? undefined, address: nul(input.driverAddress) ?? undefined, cni: nul(input.driverCni) ?? undefined, licenseNumber: nul(input.licenseNumber) ?? undefined },
      "a traffic control",
    );
    const profile = person ? await upsertDriverProfile(tx, actor, person.id, { licenseNumber: nul(input.licenseNumber) ?? undefined, licenseCategory: nul(input.licenseCategory) ?? undefined, licenseIssuedAt: input.licenseIssuedAt, licenseExpiresAt: input.licenseExpiresAt }) : null;
    const driverProfile = profile ? await tx.trafficDriver.findUnique({ where: { id: profile.id }, select: { id: true, licenseNumber: true } }) : null;
    const vehicle = await resolveVehicle(tx, actor, { vehicleId: nul(input.vehicleId) ?? undefined, plateNumber: plate ?? undefined, vehicleType: input.vehicleType, make: nul(input.vehicleMake) ?? undefined, model: nul(input.vehicleModel) ?? undefined, color: nul(input.vehicleColor) ?? undefined, year: input.vehicleYear, registrationCardNumber: nul(input.registrationCardNumber) ?? undefined, ownerPersonId: undefined }, "a traffic control");
    const vehicleRow = vehicle ? await tx.trafficVehicle.findUnique({ where: { id: vehicle.id }, select: { plateNumber: true, vehicleType: true, make: true, color: true, status: true } }) : null;

    const number = await nextNumber("TRAFFIC_CONTROL", tx);
    const control = await tx.trafficControl.create({
      data: {
        number,
        controlledAt: input.controlledAt,
        location: input.location,
        latitude: input.latitude,
        longitude: input.longitude,
        stationId: station.id,
        regionId: station.regionId,
        officerId: actor.id,
        driverPersonId: person?.id ?? null,
        driverId: driverProfile?.id ?? null,
        licenseNumber: driverProfile?.licenseNumber ?? nul(input.licenseNumber),
        vehicleId: vehicle?.id ?? null,
        plateNumber: vehicleRow?.plateNumber ?? plate,
        vehicleType: vehicleRow?.vehicleType ?? input.vehicleType,
        vehicleMake: vehicleRow?.make ?? nul(input.vehicleMake),
        vehicleColor: vehicleRow?.color ?? nul(input.vehicleColor),
        outcome: violations.length ? "INFRACTION" : "COMPLIANT",
        observations: nul(input.observations),
        caseId: nul(input.caseId),
        incidentId: nul(input.incidentId),
      },
      select: { id: true, number: true },
    });
    await logAudit({ actor, action: "TRAFFIC_CONTROL_CREATED", module: "traffic", entityType: "TrafficControl", entityId: control.id, entityLabel: control.number, summary: `Control ${control.number} recorded at ${station.name} — ${input.location}${violations.length ? ` (${violations.length} offence(s))` : " (compliant)"}`, after: { plate: vehicleRow?.plateNumber ?? plate, driver: person?.number, offences: violations.map((v) => v.code) }, context: ctx }, tx);

    if (!violations.length) return { control, ticket: null, fine: null, person, vehicleStatus: vehicleRow?.status ?? null, stationId: station.id };

    const issuedAt = new Date();
    const lines = violations.map((v) => ({ violationId: v.id, code: v.code, name: v.name, classText: v.classText, legalReference: v.legalReference.reference, amountFcfa: v.fineAmountFcfa, amountText: v.fineAmountText }));
    const total = lines.reduce((s, l) => s + (l.amountFcfa ?? 0), 0);
    const hasNonSettleable = lines.some((l) => l.amountFcfa === null);
    const ticketNumber = await nextNumber("TRAFFIC_TICKET", tx);
    const seal = sealTicket({ number: ticketNumber, issuedAt, stationCode: station.code, issuedByUsername: actor.username, driver: person ? { number: person.number, lastName: person.lastName, firstName: person.firstName } : null, plateNumber: vehicleRow?.plateNumber ?? plate, offences: lines, totalFineFcfa: total, observations: nul(input.observations) }, actor.id);
    const ticket = await tx.trafficTicket.create({
      data: {
        number: ticketNumber,
        verificationToken: randomToken(18),
        controlId: control.id,
        issuedAt,
        stationId: station.id,
        regionId: station.regionId,
        issuedById: actor.id,
        driverPersonId: person?.id ?? null,
        plateNumber: vehicleRow?.plateNumber ?? plate,
        totalFineFcfa: total,
        hasNonSettleableOffence: hasNonSettleable,
        observations: nul(input.observations),
        contentHash: seal.contentHash,
        signature: seal.signature,
        signedAt: issuedAt,
        offences: { create: lines },
      },
      select: { id: true, number: true, verificationToken: true, totalFineFcfa: true, hasNonSettleableOffence: true },
    });
    await logAudit({ actor, action: "TRAFFIC_TICKET_ISSUED", module: "traffic", entityType: "TrafficTicket", entityId: ticket.id, entityLabel: ticket.number, summary: `PV ${ticket.number} issued for control ${control.number}: ${lines.map((l) => l.code).join(", ")} — total ${total} FCFA${hasNonSettleable ? " (contains a délit, no flat fine)" : ""}`, after: { total, offences: lines.map((l) => ({ code: l.code, amount: l.amountFcfa })), contentHash: seal.contentHash }, context: ctx }, tx);

    let fine: { id: string; number: string; amountFcfa: number } | null = null;
    if (total > 0) {
      const fineNumber = await nextNumber("TRAFFIC_FINE", tx);
      const dueDate = settings.paymentDeadlineDays ? new Date(issuedAt.getTime() + settings.paymentDeadlineDays * 86_400_000) : null;
      fine = await tx.trafficFine.create({ data: { number: fineNumber, ticketId: ticket.id, amountFcfa: total, issuedAt, dueDate, driverPersonId: person?.id ?? null, plateNumber: vehicleRow?.plateNumber ?? plate, officerId: actor.id, stationId: station.id, regionId: station.regionId }, select: { id: true, number: true, amountFcfa: true } });
      await logAudit({ actor, action: "TRAFFIC_FINE_CREATED", module: "traffic", entityType: "TrafficFine", entityId: fine.id, entityLabel: fine.number, summary: `Fine ${fine.number} of ${total} FCFA created for PV ${ticket.number}`, after: { amountFcfa: total, dueDate }, context: ctx }, tx);
    }
    if (input.caseId) await addCaseEvent({ caseId: input.caseId, kind: "DOCUMENT", title: `PV ${ticket.number} linked`, description: `Traffic control ${control.number}`, actorId: actor.id, entityType: "TrafficTicket", entityId: ticket.id }, tx);
    return { control, ticket, fine, person, vehicleStatus: vehicleRow?.status ?? null, stationId: station.id };
  });

  const wantedHits = await findWantedHits(result.person?.id ?? null, plate);
  if (wantedHits.length) {
    await logAudit({ actor, action: "TRAFFIC_WANTED_HIT", module: "traffic", entityType: "TrafficControl", entityId: result.control.id, entityLabel: result.control.number, summary: `Control ${result.control.number}: match with wanted notice(s) ${wantedHits.map((h) => h.number).join(", ")}`, after: { hits: wantedHits.map((h) => h.number) }, context: ctx });
    await notifyPermission({ permission: "wanted:approve", stationId: result.stationId, excludeUserId: actor.id, kind: "ALERT", title: "Contrôle routier : correspondance avec un avis de recherche", body: `${result.control.number} — ${wantedHits.map((h) => `${h.number} (${h.name})`).join(", ")}`, href: `/traffic/controls/${result.control.id}` });
  }
  if (result.ticket?.hasNonSettleableOffence) {
    await notifyPermission({ permission: "traffic:fine_manage", stationId: result.stationId, excludeUserId: actor.id, kind: "ALERT", title: "PV comportant un délit", body: `${result.ticket.number} — au moins une infraction n'est pas justiciable de l'amende forfaitaire (« Interdiction d'arbitrer »).`, href: `/traffic/tickets/${result.ticket.id}` });
  }
  const vehicleAlert = result.vehicleStatus === "STOLEN" || result.vehicleStatus === "SEIZED" ? result.vehicleStatus : null;
  return { control: result.control, ticket: result.ticket, fine: result.fine, wantedHits, vehicleAlert };
}

/* ------------------------------------------------------------------ PV cancellation */

export async function cancelTicket(actor: Actor, input: TicketCancelInput, ctx: RequestContext) {
  const t = await prisma.trafficTicket.findUnique({ where: { id: input.ticketId }, select: { id: true, number: true, status: true, stationId: true, regionId: true, issuedById: true, fine: { select: { id: true, number: true, status: true, amountPaidFcfa: true } } } });
  if (!t || !inScope(actor, t)) throw new NotFoundError("TrafficTicket");
  if (t.status !== "ISSUED") throw new BusinessError("This PV is already cancelled.", "STATE");
  if (t.fine && (t.fine.amountPaidFcfa > 0 || t.fine.status === "PAID" || t.fine.status === "PARTIALLY_PAID")) throw new BusinessError("A PV whose fine has been paid cannot be cancelled: void the payment(s) first.", "STATE");
  await prisma.$transaction(async (tx) => {
    const r = await tx.trafficTicket.updateMany({ where: { id: t.id, status: "ISSUED" }, data: { status: "CANCELLED", cancelledAt: new Date(), cancelledById: actor.id, cancellationReason: input.reason } });
    if (r.count !== 1) throw new BusinessError("The PV was modified concurrently. Reload and retry.", "CONFLICT");
    if (t.fine) await tx.trafficFine.update({ where: { id: t.fine.id }, data: { status: "CANCELLED", statusNote: `PV annulé : ${input.reason}` } });
    await logAudit({ actor, action: "TRAFFIC_TICKET_CANCELLED", module: "traffic", entityType: "TrafficTicket", entityId: t.id, entityLabel: t.number, summary: `PV ${t.number} cancelled — ${input.reason}`, before: { status: "ISSUED", fine: t.fine?.status }, after: { status: "CANCELLED" }, context: ctx }, tx);
    if (t.fine) await logAudit({ actor, action: "TRAFFIC_FINE_CANCELLED", module: "traffic", entityType: "TrafficFine", entityId: t.fine.id, entityLabel: t.fine.number, summary: `Fine ${t.fine.number} cancelled with PV ${t.number}`, before: { status: t.fine.status }, after: { status: "CANCELLED" }, context: ctx }, tx);
  });
  if (t.issuedById !== actor.id) await notify({ userId: t.issuedById, kind: "INFO", title: "PV annulé", body: `${t.number} — ${input.reason}`, href: `/traffic/tickets/${t.id}` });
}

/* ------------------------------------------------------------------ fine status */

const FINE_TRANSITIONS: Record<TrafficFineStatus, TrafficFineStatus[]> = {
  TO_PAY: ["PENDING", "CONTESTED", "CANCELLED"],
  PENDING: ["TO_PAY", "CONTESTED", "CANCELLED"],
  CONTESTED: ["TO_PAY", "PENDING", "CANCELLED"],
  PARTIALLY_PAID: [],
  PAID: [],
  CANCELLED: [],
};
const NOTE_REQUIRED = new Set<TrafficFineStatus>(["PENDING", "CONTESTED", "CANCELLED"]);

export function allowedFineTransitions(status: TrafficFineStatus): TrafficFineStatus[] {
  return FINE_TRANSITIONS[status];
}

/** Manual status changes (hold, contest, reinstate, cancel). PAID / PARTIALLY_PAID are only ever produced by payments. */
export async function setFineStatus(actor: Actor, input: FineStatusInput, ctx: RequestContext) {
  const f = await prisma.trafficFine.findUnique({ where: { id: input.fineId }, select: { id: true, number: true, status: true, stationId: true, regionId: true, amountPaidFcfa: true, ticketId: true } });
  if (!f || !inScope(actor, f)) throw new NotFoundError("TrafficFine");
  if (!FINE_TRANSITIONS[f.status].includes(input.status)) throw new BusinessError(`Cannot move a fine from ${f.status} to ${input.status}.`, "STATE");
  const note = input.note?.trim() ?? "";
  if (NOTE_REQUIRED.has(input.status) && note.length < 5) throw new BusinessError("A reason is required for this status change.", "VALIDATION");
  if (input.status === "CANCELLED" && f.amountPaidFcfa > 0) throw new BusinessError("A fine with recorded payments cannot be cancelled: void the payment(s) first.", "STATE");
  await prisma.$transaction(async (tx) => {
    const r = await tx.trafficFine.updateMany({
      where: { id: f.id, status: f.status },
      data: { status: input.status, statusNote: note || null, contestedAt: input.status === "CONTESTED" ? new Date() : undefined, contestReason: input.status === "CONTESTED" ? note : undefined },
    });
    if (r.count !== 1) throw new BusinessError("The fine was modified concurrently. Reload and retry.", "CONFLICT");
    if (input.status === "CANCELLED") await tx.trafficTicket.update({ where: { id: f.ticketId }, data: { status: "CANCELLED", cancelledAt: new Date(), cancelledById: actor.id, cancellationReason: note } });
    await logAudit({ actor, action: `TRAFFIC_FINE_${input.status}`, module: "traffic", entityType: "TrafficFine", entityId: f.id, entityLabel: f.number, summary: `Fine ${f.number}: ${f.status} → ${input.status}${note ? ` — ${note}` : ""}`, before: { status: f.status }, after: { status: input.status }, context: ctx }, tx);
  });
}

/* ------------------------------------------------------------------ evidence (photos) */

const EVIDENCE_MIME = /^(image\/(jpeg|png|webp|heic|heif)|video\/(mp4|quicktime|webm)|application\/pdf)$/i;

export async function attachEvidence(actor: Actor, input: EvidenceInput, file: File, ctx: RequestContext) {
  const control = await prisma.trafficControl.findUnique({ where: { id: input.controlId }, select: { id: true, number: true, stationId: true, regionId: true } });
  if (!control || !inScope(actor, control)) throw new NotFoundError("TrafficControl");
  if (!EVIDENCE_MIME.test(file.type)) throw new BusinessError("Only photos (JPEG, PNG, WebP, HEIC), videos (MP4, MOV, WebM) and PDF documents are accepted.");
  const upload = await saveUpload("traffic", file);
  const kind = file.type.startsWith("image/") ? "PHOTO" : file.type.startsWith("video/") ? "VIDEO" : "DOCUMENT";
  return prisma.$transaction(async (tx) => {
    const doc = await tx.document.create({ data: { title: `${control.number} — ${input.caption || kind.toLowerCase()}`, entityType: "TRAFFIC_CONTROL", entityId: control.id, category: kind === "PHOTO" ? "PHOTO" : kind === "VIDEO" ? "VIDEO" : "SCAN", uploadedById: actor.id, stationId: control.stationId } });
    await tx.documentVersion.create({ data: { documentId: doc.id, version: 1, fileName: file.name, mimeType: upload.mimeType, sizeBytes: upload.size, storagePath: upload.relPath, sha256: upload.sha256, uploadedById: actor.id } });
    const ev = await tx.trafficEvidence.create({ data: { controlId: control.id, kind, documentId: doc.id, caption: nul(input.caption), latitude: input.latitude, longitude: input.longitude, capturedAt: new Date(), uploadedById: actor.id } });
    await logAudit({ actor, action: "TRAFFIC_EVIDENCE_ADDED", module: "traffic", entityType: "TrafficControl", entityId: control.id, entityLabel: control.number, summary: `${control.number}: ${kind.toLowerCase()} attached (${file.name}, sha256 ${upload.sha256.slice(0, 12)}…)`, after: { kind, sha256: upload.sha256, size: upload.size }, context: ctx }, tx);
    return ev;
  });
}

/* ------------------------------------------------------------------ integration with cases */

export async function openCaseFromTicket(actor: Actor, ticketId: string, override: { title?: string; description?: string }, ctx: RequestContext) {
  if (!actor.permissions.has("cases:create")) throw new AuthError("forbidden", "Permission cases:create required");
  const t = await prisma.trafficTicket.findUnique({
    where: { id: ticketId },
    select: { id: true, number: true, stationId: true, regionId: true, driverPersonId: true, plateNumber: true, totalFineFcfa: true, control: { select: { id: true, number: true, caseId: true, controlledAt: true, location: true } }, offences: { select: { name: true, classText: true, legalReference: true } } },
  });
  if (!t || !inScope(actor, t)) throw new NotFoundError("TrafficTicket");
  if (t.control.caseId) throw new BusinessError("A case is already linked to this control.", "STATE");
  const title = override.title || `Infraction routière ${t.number} — ${t.offences[0]?.name ?? ""}`.slice(0, 200);
  const description = override.description || `Affaire ouverte à partir du procès-verbal ${t.number} (contrôle ${t.control.number}, ${t.control.location}). Infractions relevées : ${t.offences.map((o) => `${o.name} (${o.classText} — ${o.legalReference})`).join(" ; ")}.`;
  const kase = await createCase(actor, { title, category: "TRAFFIC_OFFENSE", description, occurredAt: t.control.controlledAt, locationText: t.control.location, stationId: t.stationId, departmentId: "", priority: "NORMAL", isSensitive: false, leadId: "" }, ctx);
  await prisma.$transaction(async (tx) => {
    await tx.trafficControl.update({ where: { id: t.control.id }, data: { caseId: kase.id } });
    if (t.driverPersonId) await tx.caseParty.create({ data: { caseId: kase.id, personId: t.driverPersonId, role: "PERSON_OF_INTEREST", notes: `Conducteur contrôlé — PV ${t.number}` } });
    await addCaseEvent({ caseId: kase.id, kind: "DOCUMENT", title: `PV ${t.number} linked`, description: `Traffic control ${t.control.number}`, actorId: actor.id, entityType: "TrafficTicket", entityId: t.id }, tx);
    await logAudit({ actor, action: "TRAFFIC_CASE_OPENED", module: "traffic", entityType: "TrafficTicket", entityId: t.id, entityLabel: t.number, summary: `Case ${kase.number} opened from PV ${t.number}`, after: { caseId: kase.id }, context: ctx }, tx);
  });
  return kase;
}
