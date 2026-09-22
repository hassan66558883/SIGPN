import "server-only";
import type { IncidentStatus, IncidentType, OffenseCategory, PartyRole, PatrolStatus, Prisma, Priority, Severity } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { logAudit } from "@/server/audit";
import { BusinessError, NotFoundError } from "@/server/errors";
import { inScope, scopeWhere, type Actor } from "@/server/auth/dal";
import type { RequestContext } from "@/server/request-context";
import { nextNumber } from "@/server/sequences";
import { notify, notifyPermission } from "@/server/notifications";
import { addCaseEvent } from "@/server/timeline";
import { createCase } from "@/server/cases/service";
import { getPerson } from "@/server/persons/service";
import type { IncidentInput, PatrolInput, ZoneInput } from "@/server/ops/schemas";

const nul = (v: string | undefined | null) => (v ? v : null);
const intOrNull = (v: string | undefined | null) => {
  if (!v) return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0) throw new BusinessError("Kilometre readings must be whole positive numbers.");
  return n;
};

/* ------------------------------------------------------------------ incidents */

/**
 * Incident / intervention life cycle:
 *   REPORTED → RESPONDING → ON_SCENE → RESOLVED → CLOSED
 *   any active state → ESCALATED (a case is opened) → CLOSED
 *   REPORTED → CLOSED (false alarm / no action)
 */
export const INCIDENT_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  REPORTED: ["RESPONDING", "ON_SCENE", "RESOLVED", "ESCALATED", "CLOSED"],
  RESPONDING: ["ON_SCENE", "RESOLVED", "ESCALATED"],
  ON_SCENE: ["RESOLVED", "ESCALATED"],
  RESOLVED: ["CLOSED", "ESCALATED"],
  ESCALATED: ["CLOSED"],
  CLOSED: [],
};
export const INCIDENT_OPEN: IncidentStatus[] = ["REPORTED", "RESPONDING", "ON_SCENE"];

export const incidentSelect = {
  id: true,
  number: true,
  type: true,
  severity: true,
  title: true,
  description: true,
  occurredAt: true,
  reportedAt: true,
  locationText: true,
  latitude: true,
  longitude: true,
  status: true,
  report: true,
  resolvedAt: true,
  regionId: true,
  stationId: true,
  caseId: true,
  patrolId: true,
  createdAt: true,
  updatedAt: true,
  station: { select: { id: true, code: true, name: true, regionId: true } },
  reportedBy: { select: { id: true, username: true, firstName: true, lastName: true } },
  case: { select: { id: true, number: true, status: true } },
  patrol: { select: { id: true, number: true, status: true } },
  officers: { select: { role: true, officer: { select: { id: true, badgeNumber: true, firstName: true, lastName: true, rank: { select: { name: true } } } } } },
  persons: { select: { role: true, notes: true, person: { select: { id: true, number: true, firstName: true, lastName: true } } } },
  _count: { select: { documents: true } },
} satisfies Prisma.IncidentSelect;

export function incidentScopeWhere(actor: Actor): Prisma.IncidentWhereInput {
  return scopeWhere(actor, { stationId: "stationId", regionId: "regionId" }) as Prisma.IncidentWhereInput;
}

export async function getIncident(actor: Actor, id: string) {
  const i = await prisma.incident.findUnique({ where: { id }, select: incidentSelect });
  if (!i || !inScope(actor, { stationId: i.stationId, regionId: i.regionId })) throw new NotFoundError("Incident");
  return i;
}

async function resolveStation(actor: Actor, stationId: string | null, what: string) {
  const id = stationId ?? actor.stationId;
  if (!id) throw new BusinessError(`Select the station in charge of the ${what}.`);
  const st = await prisma.station.findUnique({ where: { id }, select: { id: true, regionId: true, isActive: true, name: true, code: true } });
  if (!st || !st.isActive) throw new BusinessError("Selected station is invalid or inactive.");
  if (!inScope(actor, { stationId: st.id, regionId: st.regionId })) throw new BusinessError(`You can only record ${what}s for a station inside your scope.`, "STATE");
  return st;
}

async function resolvePatrolLink(actor: Actor, patrolId: string | null, stationId: string) {
  if (!patrolId) return null;
  const p = await prisma.patrol.findUnique({ where: { id: patrolId }, select: { id: true, stationId: true, status: true, station: { select: { regionId: true } } } });
  if (!p || !inScope(actor, { stationId: p.stationId, regionId: p.station.regionId })) throw new NotFoundError("Patrol");
  if (p.stationId !== stationId) throw new BusinessError("The patrol must belong to the same station as the incident.");
  return p.id;
}

export async function createIncident(actor: Actor, input: IncidentInput, ctx: RequestContext) {
  const st = await resolveStation(actor, nul(input.stationId), "incident");
  if (input.occurredAt.getTime() > Date.now() + 60_000) throw new BusinessError("The incident date cannot be in the future.");
  const patrolId = await resolvePatrolLink(actor, nul(input.patrolId), st.id);
  const created = await prisma.$transaction(async (tx) => {
    const number = await nextNumber("INCIDENT", tx);
    const i = await tx.incident.create({
      data: {
        number,
        type: input.type,
        severity: input.severity,
        title: input.title,
        description: input.description,
        occurredAt: input.occurredAt,
        locationText: input.locationText,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        regionId: st.regionId,
        stationId: st.id,
        patrolId,
        reportedById: actor.id,
        ...(actor.officerId ? { officers: { create: { officerId: actor.officerId, role: "REPORTING" } } } : {}),
      },
      select: incidentSelect,
    });
    await logAudit({ actor, action: "INCIDENT_CREATED", module: "incidents", entityType: "Incident", entityId: i.id, entityLabel: i.number, summary: `Incident ${i.number} reported at ${st.name} — ${i.title} (${i.severity})`, after: { ...i, description: undefined, officers: undefined, persons: undefined }, context: ctx }, tx);
    return i;
  });
  if (created.severity === "HIGH" || created.severity === "CRITICAL") {
    await notifyPermission({ permission: "incidents:update", stationId: st.id, excludeUserId: actor.id, kind: "ALERT", title: `${created.severity === "CRITICAL" ? "Critical" : "High-severity"} incident reported`, body: `${created.number} — ${created.title} · ${created.locationText}`, href: `/incidents/${created.id}` });
  }
  return created;
}

export async function updateIncident(actor: Actor, id: string, input: Omit<IncidentInput, "stationId" | "patrolId">, ctx: RequestContext) {
  const before = await getIncident(actor, id);
  if (before.status === "CLOSED") throw new BusinessError("A closed incident can no longer be edited.", "STATE");
  if (input.occurredAt.getTime() > Date.now() + 60_000) throw new BusinessError("The incident date cannot be in the future.");
  const after = await prisma.incident.update({
    where: { id },
    data: { type: input.type, severity: input.severity, title: input.title, description: input.description, occurredAt: input.occurredAt, locationText: input.locationText, latitude: input.latitude ?? null, longitude: input.longitude ?? null },
    select: incidentSelect,
  });
  await logAudit({ actor, action: "INCIDENT_UPDATED", module: "incidents", entityType: "Incident", entityId: id, entityLabel: after.number, summary: `Incident ${after.number} updated`, before: { type: before.type, severity: before.severity, title: before.title, locationText: before.locationText }, after: { type: after.type, severity: after.severity, title: after.title, locationText: after.locationText }, context: ctx });
  return after;
}

async function transitionIncident(actor: Actor, id: string, to: IncidentStatus, data: Prisma.IncidentUncheckedUpdateInput, action: string, summary: string, ctx: RequestContext, tx?: Prisma.TransactionClient) {
  const db = tx ?? prisma;
  const before = await getIncident(actor, id);
  if (!INCIDENT_TRANSITIONS[before.status].includes(to)) throw new BusinessError(`Cannot move an incident from ${before.status} to ${to}.`, "STATE");
  const r = await db.incident.updateMany({ where: { id, status: before.status }, data: { ...data, status: to } });
  if (r.count !== 1) throw new BusinessError("The incident was modified concurrently. Reload and retry.", "CONFLICT");
  await logAudit({ actor, action, module: "incidents", entityType: "Incident", entityId: id, entityLabel: before.number, summary: `${before.number}: ${summary}`, before: { status: before.status }, after: { status: to, ...JSON.parse(JSON.stringify(data)) }, context: ctx }, db);
  return before;
}

export async function setIncidentStatus(actor: Actor, id: string, status: "RESPONDING" | "ON_SCENE" | "RESOLVED" | "CLOSED", report: string | undefined, ctx: RequestContext) {
  const data: Prisma.IncidentUncheckedUpdateInput = {};
  if (status === "RESOLVED") {
    if (!report || report.trim().length < 10) throw new BusinessError("An intervention report (at least 10 characters) is required to resolve an incident.");
    data.report = report.trim();
    data.resolvedAt = new Date();
  } else if (status === "CLOSED") {
    if (report?.trim()) data.report = report.trim();
    data.resolvedAt = data.resolvedAt ?? new Date();
  }
  await transitionIncident(actor, id, status, data, `INCIDENT_${status}`, status.toLowerCase().replace("_", " "), ctx);
  return getIncident(actor, id);
}

const TYPE_TO_CATEGORY: Record<IncidentType, OffenseCategory> = {
  DISTURBANCE: "PUBLIC_ORDER",
  TRAFFIC_ACCIDENT: "TRAFFIC_OFFENSE",
  ASSAULT: "ASSAULT",
  THEFT: "THEFT",
  FIRE: "PROPERTY_DAMAGE",
  MEDICAL: "OTHER",
  SUSPICIOUS_ACTIVITY: "OTHER",
  PUBLIC_ORDER: "PUBLIC_ORDER",
  DOMESTIC: "DOMESTIC_VIOLENCE",
  NOISE: "PUBLIC_ORDER",
  MISSING_PERSON: "MISSING_PERSON",
  OTHER: "OTHER",
};
const SEVERITY_TO_PRIORITY: Record<Severity, Priority> = { LOW: "LOW", MEDIUM: "NORMAL", HIGH: "HIGH", CRITICAL: "URGENT" };

/** Opens a case from an incident (needs cases:create, checked by the caller) and links both records. */
export async function escalateIncident(actor: Actor, id: string, input: { title?: string | null; leadId?: string | null; isSensitive?: boolean }, ctx: RequestContext) {
  const i = await getIncident(actor, id);
  if (!INCIDENT_TRANSITIONS[i.status].includes("ESCALATED")) throw new BusinessError(`Cannot move an incident from ${i.status} to ESCALATED.`, "STATE");
  if (i.caseId) throw new BusinessError("This incident is already linked to a case.", "STATE");
  const k = await createCase(
    actor,
    {
      title: nul(input.title) ?? i.title,
      category: TYPE_TO_CATEGORY[i.type],
      description: `${i.description}\n\n[Escalated from incident ${i.number} — ${i.locationText}]`,
      occurredAt: i.occurredAt,
      locationText: i.locationText,
      stationId: i.stationId,
      departmentId: "",
      priority: SEVERITY_TO_PRIORITY[i.severity],
      isSensitive: input.isSensitive ?? false,
      leadId: nul(input.leadId) ?? "",
    },
    ctx,
  );
  await prisma.$transaction(async (tx) => {
    await transitionIncident(actor, id, "ESCALATED", { caseId: k.id }, "INCIDENT_ESCALATED", `escalated to case ${k.number}`, ctx, tx);
    for (const p of i.persons) {
      await tx.caseParty.upsert({ where: { caseId_personId_role: { caseId: k.id, personId: p.person.id, role: p.role as PartyRole } }, update: {}, create: { caseId: k.id, personId: p.person.id, role: p.role as PartyRole, notes: p.notes, addedById: actor.id } });
    }
    await addCaseEvent({ caseId: k.id, kind: "CASE_CREATED", title: `Opened from incident ${i.number}`, description: i.title, actorId: actor.id, entityType: "Incident", entityId: i.id }, tx);
  });
  return { incident: await getIncident(actor, id), case: { id: k.id, number: k.number } };
}

export async function addIncidentOfficer(actor: Actor, input: { incidentId: string; officerId: string; role?: string }, ctx: RequestContext) {
  const i = await getIncident(actor, input.incidentId);
  if (i.status === "CLOSED") throw new BusinessError("A closed incident can no longer be edited.", "STATE");
  const o = await prisma.officer.findFirst({ where: { id: input.officerId, isActive: true, deletedAt: null }, select: { id: true, badgeNumber: true, firstName: true, lastName: true, stationId: true, station: { select: { regionId: true } } } });
  if (!o) throw new BusinessError("Selected officer is invalid.");
  if (!inScope(actor, { stationId: o.stationId, regionId: o.station.regionId })) throw new BusinessError("The officer must be inside your scope.", "STATE");
  await prisma.incidentOfficer.upsert({ where: { incidentId_officerId: { incidentId: i.id, officerId: o.id } }, update: { role: nul(input.role) }, create: { incidentId: i.id, officerId: o.id, role: nul(input.role) } });
  await logAudit({ actor, action: "INCIDENT_OFFICER_ADDED", module: "incidents", entityType: "Incident", entityId: i.id, entityLabel: i.number, summary: `${i.number}: officer ${o.badgeNumber} ${o.lastName} dispatched${input.role ? ` (${input.role})` : ""}`, after: { officerId: o.id, role: input.role ?? null }, context: ctx });
}

export async function addIncidentPerson(actor: Actor, input: { incidentId: string; personId: string; role: string; notes?: string }, ctx: RequestContext) {
  const i = await getIncident(actor, input.incidentId);
  if (i.status === "CLOSED") throw new BusinessError("A closed incident can no longer be edited.", "STATE");
  const p = await getPerson(actor, input.personId);
  await prisma.incidentPerson.upsert({ where: { incidentId_personId: { incidentId: i.id, personId: p.id } }, update: { role: input.role as PartyRole, notes: nul(input.notes) }, create: { incidentId: i.id, personId: p.id, role: input.role as PartyRole, notes: nul(input.notes) } });
  await logAudit({ actor, action: "INCIDENT_PERSON_ADDED", module: "incidents", entityType: "Incident", entityId: i.id, entityLabel: i.number, summary: `${i.number}: person ${p.number} recorded as ${input.role}`, after: { personId: p.id, role: input.role }, context: ctx });
}

/* ------------------------------------------------------------------ zones */

export async function upsertZone(actor: Actor, input: ZoneInput, ctx: RequestContext) {
  const st = await resolveStation(actor, input.stationId, "zone");
  const code = input.code.toUpperCase();
  if (input.id) {
    const before = await prisma.zone.findUnique({ where: { id: input.id }, select: { id: true, stationId: true, code: true, name: true, isActive: true } });
    if (!before || before.stationId !== st.id) throw new NotFoundError("Zone");
    const after = await prisma.zone.update({ where: { id: before.id }, data: { code, name: input.name, description: nul(input.description), isActive: input.isActive } });
    await logAudit({ actor, action: "ZONE_UPDATED", module: "patrols", entityType: "Zone", entityId: after.id, entityLabel: `${st.code}/${after.code}`, summary: `Zone ${after.code} of ${st.name} updated`, before, after: { code: after.code, name: after.name, isActive: after.isActive }, context: ctx });
    return after;
  }
  if (await prisma.zone.findUnique({ where: { stationId_code: { stationId: st.id, code } } })) throw new BusinessError(`Zone code ${code} already exists for this station.`, "CONFLICT");
  const z = await prisma.zone.create({ data: { stationId: st.id, code, name: input.name, description: nul(input.description), isActive: input.isActive } });
  await logAudit({ actor, action: "ZONE_CREATED", module: "patrols", entityType: "Zone", entityId: z.id, entityLabel: `${st.code}/${z.code}`, summary: `Zone ${z.code} (${z.name}) created for ${st.name}`, after: z, context: ctx });
  return z;
}

/* ------------------------------------------------------------------ patrols */

export const PATROL_TRANSITIONS: Record<PatrolStatus, PatrolStatus[]> = {
  PLANNED: ["ACTIVE", "CANCELLED"],
  ACTIVE: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export const patrolSelect = {
  id: true,
  number: true,
  shift: true,
  mission: true,
  plannedStart: true,
  plannedEnd: true,
  actualStart: true,
  actualEnd: true,
  status: true,
  startKm: true,
  endKm: true,
  report: true,
  notes: true,
  stationId: true,
  zoneId: true,
  vehicleId: true,
  createdAt: true,
  updatedAt: true,
  station: { select: { id: true, code: true, name: true, regionId: true } },
  zone: { select: { id: true, code: true, name: true } },
  supervisor: { select: { id: true, badgeNumber: true, firstName: true, lastName: true, rank: { select: { name: true } } } },
  vehicle: { select: { id: true, fleetNumber: true, plateNumber: true, make: true, model: true, status: true } },
  createdBy: { select: { id: true, username: true, firstName: true, lastName: true } },
  officers: { select: { role: true, officer: { select: { id: true, badgeNumber: true, firstName: true, lastName: true, rank: { select: { name: true } } } } } },
  incidents: { select: { id: true, number: true, title: true, severity: true, status: true, occurredAt: true }, orderBy: { occurredAt: "desc" } },
} satisfies Prisma.PatrolSelect;

export function patrolScopeWhere(actor: Actor): Prisma.PatrolWhereInput {
  return scopeWhere(actor, { stationId: "stationId", regionId: "regionId", via: "station" }) as Prisma.PatrolWhereInput;
}

export async function getPatrol(actor: Actor, id: string) {
  const p = await prisma.patrol.findUnique({ where: { id }, select: patrolSelect });
  if (!p || !inScope(actor, { stationId: p.stationId, regionId: p.station.regionId })) throw new NotFoundError("Patrol");
  return p;
}

async function officerInScope(actor: Actor, officerId: string, label: string) {
  const o = await prisma.officer.findFirst({ where: { id: officerId, isActive: true, deletedAt: null }, select: { id: true, badgeNumber: true, firstName: true, lastName: true, stationId: true, station: { select: { regionId: true } } } });
  if (!o) throw new BusinessError(`Selected ${label} is invalid or inactive.`);
  if (!inScope(actor, { stationId: o.stationId, regionId: o.station.regionId })) throw new BusinessError(`The ${label} must be inside your scope.`, "STATE");
  return o;
}

async function validatePatrolLinks(actor: Actor, input: PatrolInput, stationId: string, currentVehicleId?: string | null) {
  if (input.plannedEnd.getTime() <= input.plannedStart.getTime()) throw new BusinessError("The planned end must be after the planned start.");
  const zoneId = nul(input.zoneId);
  if (zoneId) {
    const z = await prisma.zone.findUnique({ where: { id: zoneId }, select: { stationId: true, isActive: true } });
    if (!z || z.stationId !== stationId || !z.isActive) throw new BusinessError("The zone must be an active zone of the patrol's station.");
  }
  const supervisor = await officerInScope(actor, input.supervisorId, "supervisor");
  const vehicleId = nul(input.vehicleId);
  if (vehicleId) {
    const v = await prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { id: true, stationId: true, status: true, isActive: true, station: { select: { regionId: true } } } });
    if (!v || !v.isActive || !inScope(actor, { stationId: v.stationId, regionId: v.station.regionId })) throw new BusinessError("Selected vehicle is invalid or outside your scope.");
    if (v.status !== "AVAILABLE" && v.id !== currentVehicleId) throw new BusinessError(`Vehicle is not available (status ${v.status}).`, "STATE");
  }
  return { zoneId, supervisor, vehicleId };
}

export async function createPatrol(actor: Actor, input: PatrolInput, officerIds: string[], ctx: RequestContext) {
  const st = await resolveStation(actor, nul(input.stationId), "patrol");
  const { zoneId, supervisor, vehicleId } = await validatePatrolLinks(actor, input, st.id);
  const members = Array.from(new Set(officerIds.filter(Boolean).filter((x) => x !== supervisor.id)));
  for (const oid of members) await officerInScope(actor, oid, "patrol member");
  const p = await prisma.$transaction(async (tx) => {
    const number = await nextNumber("PATROL", tx);
    const created = await tx.patrol.create({
      data: {
        number,
        stationId: st.id,
        zoneId,
        shift: input.shift,
        mission: input.mission,
        plannedStart: input.plannedStart,
        plannedEnd: input.plannedEnd,
        supervisorId: supervisor.id,
        vehicleId,
        notes: nul(input.notes),
        createdById: actor.id,
        officers: { create: members.map((officerId) => ({ officerId, role: "MEMBER" })) },
      },
      select: patrolSelect,
    });
    await logAudit({ actor, action: "PATROL_CREATED", module: "patrols", entityType: "Patrol", entityId: created.id, entityLabel: created.number, summary: `Patrol ${created.number} planned at ${st.name} (${created.shift}) — ${created.mission}`, after: { ...created, officers: created.officers.length, incidents: undefined }, context: ctx }, tx);
    return created;
  });
  const supUser = await prisma.user.findFirst({ where: { officer: { id: supervisor.id }, status: "ACTIVE", deletedAt: null }, select: { id: true } });
  if (supUser && supUser.id !== actor.id) await notify({ userId: supUser.id, kind: "ASSIGNMENT", title: "Patrol assigned to you", body: `${p.number} — ${p.mission}`, href: `/patrols/${p.id}` });
  return p;
}

export async function updatePatrol(actor: Actor, id: string, input: Omit<PatrolInput, "stationId">, ctx: RequestContext) {
  const before = await getPatrol(actor, id);
  if (before.status !== "PLANNED") throw new BusinessError(`A patrol in status ${before.status} can no longer be edited.`, "STATE");
  const { zoneId, supervisor, vehicleId } = await validatePatrolLinks(actor, { ...input, stationId: before.stationId }, before.stationId, before.vehicleId);
  const after = await prisma.patrol.update({ where: { id }, data: { zoneId, shift: input.shift, mission: input.mission, plannedStart: input.plannedStart, plannedEnd: input.plannedEnd, supervisorId: supervisor.id, vehicleId, notes: nul(input.notes) }, select: patrolSelect });
  await logAudit({ actor, action: "PATROL_UPDATED", module: "patrols", entityType: "Patrol", entityId: id, entityLabel: after.number, summary: `Patrol ${after.number} updated`, before: { mission: before.mission, shift: before.shift, plannedStart: before.plannedStart, supervisorId: before.supervisor.id, vehicleId: before.vehicleId }, after: { mission: after.mission, shift: after.shift, plannedStart: after.plannedStart, supervisorId: after.supervisor.id, vehicleId: after.vehicleId }, context: ctx });
  return after;
}

export async function addPatrolOfficer(actor: Actor, input: { patrolId: string; officerId: string; role?: string }, ctx: RequestContext) {
  const p = await getPatrol(actor, input.patrolId);
  if (p.status === "COMPLETED" || p.status === "CANCELLED") throw new BusinessError(`A patrol in status ${p.status} can no longer be edited.`, "STATE");
  const o = await officerInScope(actor, input.officerId, "patrol member");
  if (o.id === p.supervisor.id) throw new BusinessError("The supervisor is already part of the patrol.");
  await prisma.patrolOfficer.upsert({ where: { patrolId_officerId: { patrolId: p.id, officerId: o.id } }, update: { role: nul(input.role) ?? "MEMBER" }, create: { patrolId: p.id, officerId: o.id, role: nul(input.role) ?? "MEMBER" } });
  await logAudit({ actor, action: "PATROL_OFFICER_ADDED", module: "patrols", entityType: "Patrol", entityId: p.id, entityLabel: p.number, summary: `${p.number}: officer ${o.badgeNumber} ${o.lastName} added`, after: { officerId: o.id, role: input.role ?? "MEMBER" }, context: ctx });
}

async function transitionPatrol(actor: Actor, id: string, to: PatrolStatus, data: Prisma.PatrolUncheckedUpdateInput, action: string, summary: string, ctx: RequestContext, tx: Prisma.TransactionClient) {
  const before = await getPatrol(actor, id);
  if (!PATROL_TRANSITIONS[before.status].includes(to)) throw new BusinessError(`Cannot move a patrol from ${before.status} to ${to}.`, "STATE");
  const r = await tx.patrol.updateMany({ where: { id, status: before.status }, data: { ...data, status: to } });
  if (r.count !== 1) throw new BusinessError("The patrol was modified concurrently. Reload and retry.", "CONFLICT");
  await logAudit({ actor, action, module: "patrols", entityType: "Patrol", entityId: id, entityLabel: before.number, summary: `${before.number}: ${summary}`, before: { status: before.status }, after: { status: to, ...JSON.parse(JSON.stringify(data)) }, context: ctx }, tx);
  return before;
}

export async function startPatrol(actor: Actor, id: string, startKmRaw: string | undefined, ctx: RequestContext) {
  const startKm = intOrNull(startKmRaw);
  await prisma.$transaction(async (tx) => {
    const before = await transitionPatrol(actor, id, "ACTIVE", { actualStart: new Date(), startKm }, "PATROL_STARTED", "patrol started", ctx, tx);
    if (before.vehicleId) {
      const v = await tx.vehicle.updateMany({ where: { id: before.vehicleId, status: "AVAILABLE" }, data: { status: "IN_USE" } });
      if (v.count !== 1) throw new BusinessError("The patrol vehicle is no longer available. Update the patrol first.", "STATE");
      await tx.vehicleAssignment.create({ data: { vehicleId: before.vehicleId, officerId: before.supervisor.id, purpose: `Patrol ${before.number}`, startAt: new Date(), startKm } });
    }
  });
  return getPatrol(actor, id);
}

export async function completePatrol(actor: Actor, id: string, input: { endKm?: string; report: string }, ctx: RequestContext) {
  const endKm = intOrNull(input.endKm);
  await prisma.$transaction(async (tx) => {
    const cur = await getPatrol(actor, id);
    if (endKm !== null && cur.startKm !== null && endKm < cur.startKm) throw new BusinessError("The end kilometre reading cannot be lower than the start reading.");
    const before = await transitionPatrol(actor, id, "COMPLETED", { actualEnd: new Date(), endKm, report: input.report.trim() }, "PATROL_COMPLETED", "patrol completed", ctx, tx);
    if (before.vehicleId) {
      await tx.vehicle.updateMany({ where: { id: before.vehicleId, status: "IN_USE" }, data: { status: "AVAILABLE", ...(endKm !== null ? { mileageKm: endKm } : {}) } });
      await tx.vehicleAssignment.updateMany({ where: { vehicleId: before.vehicleId, purpose: `Patrol ${before.number}`, endAt: null }, data: { endAt: new Date(), endKm } });
    }
  });
  return getPatrol(actor, id);
}

export async function cancelPatrol(actor: Actor, id: string, reason: string, ctx: RequestContext) {
  await prisma.$transaction(async (tx) => {
    const cur = await getPatrol(actor, id);
    const notes = `${cur.notes ? `${cur.notes}\n` : ""}[Cancelled] ${reason.trim()}`;
    const before = await transitionPatrol(actor, id, "CANCELLED", { notes, actualEnd: cur.status === "ACTIVE" ? new Date() : undefined }, "PATROL_CANCELLED", `cancelled — ${reason.trim()}`, ctx, tx);
    if (before.status === "ACTIVE" && before.vehicleId) {
      await tx.vehicle.updateMany({ where: { id: before.vehicleId, status: "IN_USE" }, data: { status: "AVAILABLE" } });
      await tx.vehicleAssignment.updateMany({ where: { vehicleId: before.vehicleId, purpose: `Patrol ${before.number}`, endAt: null }, data: { endAt: new Date() } });
    }
  });
  return getPatrol(actor, id);
}
