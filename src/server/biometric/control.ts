import "server-only";
import type { BiometricControlResult, BiometricErrorKind, BiometricType, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { logAudit } from "@/server/audit";
import { AuthError, BusinessError, NotFoundError } from "@/server/errors";
import type { Actor } from "@/server/auth/dal";
import type { RequestContext } from "@/server/request-context";
import { nextNumber } from "@/server/sequences";
import { classifyControl, pickScenario, simulateOutcome, type Scenario } from "@/lib/biometric-control";
import { notifyPermission, notifyRoles } from "@/server/notifications";
import { wantedScopeWhere } from "@/server/wanted/service";

function need(actor: Actor, permission: string) {
  if (!actor.permissions.has(permission)) throw new AuthError("forbidden", `Permission ${permission} required`);
}

const LIVE_ALERT_KINDS = ["PUBLISHED", "UPDATED", "REACTIVATED"] as const;

/**
 * The reference an indication is compared to: the most recent still-live alert delivered to the officer's units, taken from the
 * network bulletin (so a unit can recognise a person sought elsewhere). Withdrawn, suspended, expired and closed notices are excluded.
 */
async function liveReference(actor: Actor) {
  const stations = actor.stationIds?.length ? actor.stationIds : actor.stationId ? [actor.stationId] : [];
  if (!stations.length) return null;
  const candidates = await prisma.alertDelivery.findMany({
    where: { stationId: { in: stations }, alert: { kind: { in: [...LIVE_ALERT_KINDS] }, wantedPersonId: { not: null }, isSimulation: false } },
    orderBy: { alert: { seq: "desc" } },
    take: 25,
    select: { alert: { select: { id: true, wantedPersonId: true, seq: true } } },
  });
  for (const c of candidates) {
    const latest = await prisma.nationalAlert.findFirst({ where: { wantedPersonId: c.alert.wantedPersonId }, orderBy: { seq: "desc" }, select: { id: true, kind: true } });
    if (latest && (LIVE_ALERT_KINDS as readonly string[]).includes(latest.kind)) return latest.id;
  }
  return null;
}

export type ControlInput = { scenario: Scenario; modality: Extract<BiometricType, "FINGERPRINT" | "FACE">; reason: string; device?: string };

/** Runs one simulated control (fictitious identities; no template is matched, no image is stored or sent). */
export async function runControl(actor: Actor, input: ControlInput, ctx: RequestContext) {
  need(actor, "biometric:control");
  const scenario = pickScenario(input.scenario);
  const outcome = simulateOutcome(scenario);
  const result = classifyControl(outcome);
  const refId = result === "POSSIBLE_MATCH" || result === "UNCERTAIN" ? await liveReference(actor) : null;
  const control = await prisma.$transaction(async (tx) => {
    const number = await nextNumber("BIOCONTROL", tx);
    const c = await tx.biometricControl.create({
      data: { number, modality: input.modality, result, score: outcome.score, captureQuality: outcome.captureQuality, referenceAlertId: refId, subjectLabel: refId || result === "NO_MATCH" || result === "UNAVAILABLE" ? null : "Identité fictive (démonstration)", officerId: actor.id, stationId: actor.stationId, device: input.device || null, reason: input.reason },
      select: { id: true, number: true },
    });
    await logAudit({ actor, action: `BIOMETRIC_CONTROL_${result}`, module: "biometric", entityType: "BiometricControl", entityId: c.id, entityLabel: c.number, summary: `${c.number}: ${input.modality} control (simulation) → ${result}`, after: { result, modality: input.modality }, context: ctx }, tx);
    return c;
  });
  return getControl(actor, control.id);
}

const controlSelect = { id: true, number: true, modality: true, result: true, score: true, captureQuality: true, referenceAlertId: true, subjectLabel: true, officerId: true, stationId: true, device: true, reason: true, status: true, verificationRequestedAt: true, superiorNotifiedAt: true, reviewedById: true, reviewedAt: true, reviewNotes: true, errorKind: true, errorReportedAt: true, isSimulation: true, createdAt: true } satisfies Prisma.BiometricControlSelect;

/** Controls the actor may see besides their own: national all, provincial the units of the province, others their units. */
async function controlScope(actor: Actor): Promise<Prisma.BiometricControlWhereInput> {
  if (actor.scopeLevel === "NATIONAL") return {};
  if (actor.scopeLevel === "REGIONAL") {
    const ids = (await prisma.station.findMany({ where: { regionId: actor.regionId ?? "-" }, select: { id: true } })).map((x) => x.id);
    return { stationId: { in: ids.length ? ids : ["-"] } };
  }
  return { stationId: { in: actor.stationIds?.length ? actor.stationIds : ["-"] } };
}

/** Visibility filter: own controls, or the scope of the actor. (An empty scope means national: no restriction at all.) */
async function visible(actor: Actor): Promise<Prisma.BiometricControlWhereInput> {
  const scope = await controlScope(actor);
  return Object.keys(scope).length ? { OR: [{ officerId: actor.id }, scope] } : {};
}

/** View model: the bulletin identity is shown only for a POSSIBLE_MATCH, and the dossier link only when the actor may open it. */
export async function getControl(actor: Actor, id: string) {
  need(actor, "biometric:control");
  const c = await prisma.biometricControl.findFirst({ where: { id, ...(await visible(actor)) }, select: controlSelect });
  if (!c) throw new NotFoundError("Control");
  let reference: { alertNumber: string; name: string | null; offense: string | null; nature: string | null; unit: string | null; dangerLevel: string | null; instruction: string | null; wantedId: string | null; canOpenDossier: boolean } | null = null;
  if (c.referenceAlertId) {
    const a = await prisma.nationalAlert.findUnique({ where: { id: c.referenceAlertId }, select: { number: true, wantedPersonId: true, payload: true } });
    if (a) {
      const p = a.payload as { person?: { name?: string }; offense?: string; nature?: string; unit?: string; dangerLevel?: string; instruction?: string };
      const canOpen = !!a.wantedPersonId && actor.permissions.has("wanted:view") && !!(await prisma.wantedPerson.findFirst({ where: { id: a.wantedPersonId, AND: [wantedScopeWhere(actor)] }, select: { id: true } }));
      const full = c.result === "POSSIBLE_MATCH";
      reference = { alertNumber: a.number, name: full ? p.person?.name ?? null : null, offense: full ? p.offense ?? null : null, nature: full ? p.nature ?? null : null, unit: full ? p.unit ?? null : null, dangerLevel: full ? p.dangerLevel ?? null : null, instruction: p.instruction ?? null, wantedId: canOpen ? a.wantedPersonId : null, canOpenDossier: canOpen };
    }
  }
  return { ...c, score: c.score === null ? null : Number(c.score), reference };
}

export async function listControls(actor: Actor, limit = 20) {
  need(actor, "biometric:control");
  return prisma.biometricControl.findMany({ where: await visible(actor), orderBy: { createdAt: "desc" }, take: Math.min(limit, 100), select: { id: true, number: true, modality: true, result: true, status: true, createdAt: true, isSimulation: true } });
}

async function load(actor: Actor, id: string) {
  const c = await prisma.biometricControl.findFirst({ where: { id, ...(await visible(actor)) }, select: { id: true, number: true, result: true, status: true, officerId: true, stationId: true } });
  if (!c) throw new NotFoundError("Control");
  return c;
}

const GENERIC = { title: "Vérification biométrique", href: "/biometric/control" } as const;

/** « Demander vérification » — asks a qualified colleague (biometric:verify) of the same unit for a human check. */
export async function requestVerification(actor: Actor, id: string, ctx: RequestContext) {
  need(actor, "biometric:control");
  const c = await load(actor, id);
  if (c.result !== "POSSIBLE_MATCH" && c.result !== "UNCERTAIN") throw new BusinessError("A verification can only be requested for a possible or uncertain result.", "STATE");
  if (c.status === "CONFIRMED_BY_HUMAN" || c.status === "REJECTED_BY_HUMAN") throw new BusinessError("This control has already been reviewed by a person.", "STATE");
  await prisma.biometricControl.update({ where: { id }, data: { status: "VERIFICATION_REQUESTED", verificationRequestedAt: new Date() } });
  const n = await notifyPermission({ permission: "biometric:verify", stationId: c.stationId, excludeUserId: actor.id, kind: "ALERT", title: GENERIC.title, body: `Une vérification humaine est demandée (${c.number}).`, href: GENERIC.href });
  await logAudit({ actor, action: "BIOMETRIC_CONTROL_VERIFICATION_REQUESTED", module: "biometric", entityType: "BiometricControl", entityId: id, entityLabel: c.number, summary: `${c.number}: human verification requested (${n} reviewer(s) notified)`, context: ctx });
  return { notified: n };
}

/** « Notifier le supérieur » — generic notification to the station commanders of the unit. */
export async function notifySuperior(actor: Actor, id: string, ctx: RequestContext) {
  need(actor, "biometric:control");
  const c = await load(actor, id);
  if (!c.stationId) throw new BusinessError("The control is not attached to a unit.", "STATE");
  const n = await notifyRoles({ roleCodes: ["STATION_COMMANDER"], stationId: c.stationId, excludeUserId: actor.id, kind: "ALERT", title: GENERIC.title, body: `Un contrôle biométrique nécessite votre attention (${c.number}).`, href: GENERIC.href });
  await prisma.biometricControl.update({ where: { id }, data: { superiorNotifiedAt: new Date(), ...(c.status === "NEW" ? { status: "SUPERIOR_NOTIFIED" as const } : {}) } });
  await logAudit({ actor, action: "BIOMETRIC_CONTROL_SUPERIOR_NOTIFIED", module: "biometric", entityType: "BiometricControl", entityId: id, entityLabel: c.number, summary: `${c.number}: superior notified (${n})`, context: ctx });
  return { notified: n };
}

/** « Signaler une erreur » — false positive / negative, poor capture or contestation. Feeds accuracy follow-up. */
export async function reportError(actor: Actor, id: string, input: { kind: BiometricErrorKind; notes?: string }, ctx: RequestContext) {
  need(actor, "biometric:control");
  const c = await load(actor, id);
  await prisma.biometricControl.update({ where: { id }, data: { errorKind: input.kind, errorNotes: input.notes || null, errorReportedAt: new Date(), status: c.status === "CONFIRMED_BY_HUMAN" || c.status === "REJECTED_BY_HUMAN" ? c.status : "ERROR_REPORTED" } });
  await notifyPermission({ permission: "biometric:verify", stationId: c.stationId, excludeUserId: actor.id, kind: "INFO", title: GENERIC.title, body: `Une erreur a été signalée sur un contrôle (${c.number}).`, href: GENERIC.href });
  await logAudit({ actor, action: "BIOMETRIC_CONTROL_ERROR_REPORTED", module: "biometric", entityType: "BiometricControl", entityId: id, entityLabel: c.number, summary: `${c.number}: ${input.kind} reported${input.notes ? ` — ${input.notes}` : ""}`, after: { kind: input.kind }, context: ctx });
  return { ok: true };
}

/**
 * Human review (identity AND validity of the warrant, by a qualified officer other than the one who ran the control) — required
 * before any coercive action. CONFIRMED means "the identity is confirmed by a person", never that the system decided.
 */
export async function reviewControl(actor: Actor, id: string, input: { outcome: "CONFIRMED" | "REJECTED"; notes: string }, ctx: RequestContext) {
  need(actor, "biometric:verify");
  need(actor, "biometric:control");
  const c = await load(actor, id);
  if (c.result !== "POSSIBLE_MATCH" && c.result !== "UNCERTAIN") throw new BusinessError("Only a possible or uncertain result is reviewed.", "STATE");
  if (c.officerId === actor.id) throw new BusinessError("The officer who ran the control cannot review it (four-eyes rule).", "STATE");
  if (c.status === "CONFIRMED_BY_HUMAN" || c.status === "REJECTED_BY_HUMAN") throw new BusinessError("This control has already been reviewed by a person.", "STATE");
  if (input.notes.trim().length < 10) throw new BusinessError("Explain the identity and warrant checks you performed (at least 10 characters).", "VALIDATION", { notes: "required" });
  await prisma.biometricControl.update({ where: { id }, data: { status: input.outcome === "CONFIRMED" ? "CONFIRMED_BY_HUMAN" : "REJECTED_BY_HUMAN", reviewedById: actor.id, reviewedAt: new Date(), reviewNotes: input.notes.trim() } });
  await logAudit({ actor, action: `BIOMETRIC_CONTROL_${input.outcome === "CONFIRMED" ? "CONFIRMED" : "REJECTED"}`, module: "biometric", entityType: "BiometricControl", entityId: id, entityLabel: c.number, summary: `${c.number}: ${input.outcome} by ${actor.username} after human identity and warrant checks`, context: ctx });
  return { ok: true };
}

export type ControlView = Awaited<ReturnType<typeof getControl>>;
export type { BiometricControlResult };
