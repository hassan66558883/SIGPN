import "server-only";
import type { DutyStatus } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { logAudit } from "@/server/audit";
import { BusinessError, NotFoundError } from "@/server/errors";
import { inScope, type Actor } from "@/server/auth/dal";
import type { RequestContext } from "@/server/request-context";
import { notify } from "@/server/notifications";
import type { AssignmentInput, DepartmentInput, OfficerInput, OrganizationInput, RankInput, RegionInput, StationInput } from "@/server/org/schemas";

const nul = (v: string | undefined | null) => (v ? v : null);
const num = (v: string | undefined | null) => {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Master-data records may only be managed by NATIONAL actors, or REGIONAL actors inside their own region. */
function assertOrgScope(actor: Actor, regionId: string | null) {
  if (actor.scopeLevel === "NATIONAL") return;
  if (actor.scopeLevel === "REGIONAL" && regionId && actor.regionId === regionId) return;
  throw new BusinessError("You can only manage master data inside your own region.", "STATE");
}

/** Officers may be managed by NATIONAL actors, REGIONAL actors in their region, STATION actors in their station. */
function assertOfficerScope(actor: Actor, placement: { stationId: string; regionId: string }) {
  if (!inScope(actor, placement)) throw new BusinessError("You can only manage officers inside your own station/region.", "STATE");
}

async function regionOfStation(stationId: string): Promise<{ id: string; regionId: string; isActive: boolean; name: string }> {
  const st = await prisma.station.findUnique({ where: { id: stationId }, select: { id: true, regionId: true, isActive: true, name: true } });
  if (!st) throw new BusinessError("Selected station does not exist.");
  return st;
}

// ---------------- Organization ----------------

export async function updateOrganization(actor: Actor, id: string, input: OrganizationInput, ctx: RequestContext) {
  if (actor.scopeLevel !== "NATIONAL") throw new BusinessError("Only national administrators can edit the organization.", "STATE");
  const before = await prisma.organization.findUnique({ where: { id } });
  if (!before) throw new NotFoundError("Organization");
  const after = await prisma.organization.update({ where: { id }, data: { name: input.name, shortName: nul(input.shortName), description: nul(input.description) } });
  await logAudit({ actor, action: "ORGANIZATION_UPDATED", module: "org", entityType: "Organization", entityId: id, entityLabel: after.code, summary: `Organization ${after.code} updated`, before, after, context: ctx });
  return after;
}

// ---------------- Regions ----------------

export async function createRegion(actor: Actor, input: RegionInput, ctx: RequestContext) {
  if (actor.scopeLevel !== "NATIONAL") throw new BusinessError("Only national administrators can create regions.", "STATE");
  const org = await prisma.organization.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" } });
  if (!org) throw new BusinessError("No active organization exists.", "STATE");
  if (await prisma.region.findUnique({ where: { code: input.code } })) throw new BusinessError("A region with this code already exists.", "CONFLICT");
  const r = await prisma.region.create({ data: { organizationId: org.id, code: input.code, name: input.name, capital: nul(input.capital), isActive: input.isActive } });
  await logAudit({ actor, action: "REGION_CREATED", module: "org", entityType: "Region", entityId: r.id, entityLabel: r.code, summary: `Region ${r.code} — ${r.name} created`, after: r, context: ctx });
  return r;
}

export async function updateRegion(actor: Actor, id: string, input: RegionInput, ctx: RequestContext) {
  const before = await prisma.region.findUnique({ where: { id } });
  if (!before) throw new NotFoundError("Region");
  assertOrgScope(actor, id);
  if (input.code !== before.code && (await prisma.region.findUnique({ where: { code: input.code } }))) throw new BusinessError("A region with this code already exists.", "CONFLICT");
  if (!input.isActive && before.isActive) {
    const active = await prisma.station.count({ where: { regionId: id, isActive: true } });
    if (active) throw new BusinessError(`Deactivate the ${active} active station(s) of this region first.`, "STATE");
  }
  const after = await prisma.region.update({ where: { id }, data: { code: input.code, name: input.name, capital: nul(input.capital), isActive: input.isActive } });
  await logAudit({ actor, action: before.isActive && !after.isActive ? "REGION_DEACTIVATED" : "REGION_UPDATED", module: "org", entityType: "Region", entityId: id, entityLabel: after.code, summary: `Region ${after.code} updated`, before, after, context: ctx });
  return after;
}

// ---------------- Stations ----------------

export async function createStation(actor: Actor, input: StationInput, ctx: RequestContext) {
  const region = await prisma.region.findUnique({ where: { id: input.regionId }, select: { id: true, isActive: true } });
  if (!region || !region.isActive) throw new BusinessError("Selected region is invalid or inactive.");
  assertOrgScope(actor, region.id);
  if (await prisma.station.findUnique({ where: { code: input.code } })) throw new BusinessError("A station with this code already exists.", "CONFLICT");
  const s = await prisma.station.create({
    data: { regionId: region.id, code: input.code, name: input.name, type: input.type, address: nul(input.address), city: nul(input.city), phone: nul(input.phone), email: nul(input.email), latitude: num(input.latitude), longitude: num(input.longitude), isActive: input.isActive },
  });
  await logAudit({ actor, action: "STATION_CREATED", module: "org", entityType: "Station", entityId: s.id, entityLabel: s.code, summary: `Station ${s.code} — ${s.name} created`, after: s, context: ctx });
  return s;
}

export async function updateStation(actor: Actor, id: string, input: StationInput, ctx: RequestContext) {
  const before = await prisma.station.findUnique({ where: { id } });
  if (!before) throw new NotFoundError("Station");
  assertOrgScope(actor, before.regionId);
  if (input.regionId !== before.regionId) {
    assertOrgScope(actor, input.regionId);
    const region = await prisma.region.findUnique({ where: { id: input.regionId }, select: { isActive: true } });
    if (!region || !region.isActive) throw new BusinessError("Selected region is invalid or inactive.");
  }
  if (input.code !== before.code && (await prisma.station.findUnique({ where: { code: input.code } }))) throw new BusinessError("A station with this code already exists.", "CONFLICT");
  const commanderId: string | null = nul(input.commanderId);
  if (commanderId) {
    const off = await prisma.officer.findFirst({ where: { id: commanderId, deletedAt: null, isActive: true }, select: { stationId: true, commandsStation: { select: { id: true } } } });
    if (!off) throw new BusinessError("Selected commander does not exist.");
    if (off.stationId !== id) throw new BusinessError("The commander must be posted at this station.");
    if (off.commandsStation && off.commandsStation.id !== id) throw new BusinessError("This officer already commands another station.", "CONFLICT");
  }
  if (!input.isActive && before.isActive) {
    const officers = await prisma.officer.count({ where: { stationId: id, isActive: true, deletedAt: null } });
    if (officers) throw new BusinessError(`Reassign the ${officers} active officer(s) of this station first.`, "STATE");
  }
  const after = await prisma.$transaction(async (tx) => {
    const s = await tx.station.update({
      where: { id },
      data: { regionId: input.regionId, code: input.code, name: input.name, type: input.type, address: nul(input.address), city: nul(input.city), phone: nul(input.phone), email: nul(input.email), latitude: num(input.latitude), longitude: num(input.longitude), commanderId, isActive: input.isActive },
    });
    // Users attached to a station follow it when it changes region.
    if (input.regionId !== before.regionId) await tx.user.updateMany({ where: { stationId: id }, data: { regionId: input.regionId } });
    return s;
  });
  await logAudit({ actor, action: before.isActive && !after.isActive ? "STATION_DEACTIVATED" : "STATION_UPDATED", module: "org", entityType: "Station", entityId: id, entityLabel: after.code, summary: `Station ${after.code} updated`, before, after, context: ctx });
  return after;
}

// ---------------- Departments ----------------

export async function createDepartment(actor: Actor, input: DepartmentInput, ctx: RequestContext) {
  const st = await regionOfStation(input.stationId);
  if (!st.isActive) throw new BusinessError("Selected station is inactive.");
  if (actor.scopeLevel === "STATION" ? actor.stationId !== st.id : false) throw new BusinessError("You can only manage departments of your own station.", "STATE");
  if (actor.scopeLevel !== "STATION") assertOrgScope(actor, st.regionId);
  if (await prisma.department.findUnique({ where: { stationId_code: { stationId: st.id, code: input.code } } })) throw new BusinessError("A department with this code already exists in this station.", "CONFLICT");
  const d = await prisma.department.create({ data: { stationId: st.id, code: input.code, name: input.name, type: input.type, isActive: input.isActive } });
  await logAudit({ actor, action: "DEPARTMENT_CREATED", module: "org", entityType: "Department", entityId: d.id, entityLabel: `${st.name} / ${d.code}`, summary: `Department ${d.code} — ${d.name} created in ${st.name}`, after: d, context: ctx });
  return d;
}

export async function updateDepartment(actor: Actor, id: string, input: DepartmentInput, ctx: RequestContext) {
  const before = await prisma.department.findUnique({ where: { id }, include: { station: { select: { regionId: true, name: true } } } });
  if (!before) throw new NotFoundError("Department");
  if (actor.scopeLevel === "STATION" ? actor.stationId !== before.stationId : false) throw new BusinessError("You can only manage departments of your own station.", "STATE");
  if (actor.scopeLevel !== "STATION") assertOrgScope(actor, before.station.regionId);
  if (input.code !== before.code && (await prisma.department.findUnique({ where: { stationId_code: { stationId: before.stationId, code: input.code } } }))) throw new BusinessError("A department with this code already exists in this station.", "CONFLICT");
  const headId = nul(input.headId);
  if (headId) {
    const off = await prisma.officer.findFirst({ where: { id: headId, deletedAt: null, isActive: true }, select: { stationId: true, headsDepartment: { select: { id: true } } } });
    if (!off) throw new BusinessError("Selected head does not exist.");
    if (off.stationId !== before.stationId) throw new BusinessError("The head must be posted at this station.");
    if (off.headsDepartment && off.headsDepartment.id !== id) throw new BusinessError("This officer already heads another department.", "CONFLICT");
  }
  if (!input.isActive && before.isActive) {
    const officers = await prisma.officer.count({ where: { departmentId: id, isActive: true, deletedAt: null } });
    if (officers) throw new BusinessError(`Reassign the ${officers} active officer(s) of this department first.`, "STATE");
  }
  const after = await prisma.department.update({ where: { id }, data: { code: input.code, name: input.name, type: input.type, headId, isActive: input.isActive } });
  await logAudit({ actor, action: before.isActive && !after.isActive ? "DEPARTMENT_DEACTIVATED" : "DEPARTMENT_UPDATED", module: "org", entityType: "Department", entityId: id, entityLabel: `${before.station.name} / ${after.code}`, summary: `Department ${after.code} updated`, before: { ...before, station: undefined }, after, context: ctx });
  return after;
}

// ---------------- Ranks ----------------

export async function createRank(actor: Actor, input: RankInput, ctx: RequestContext) {
  if (actor.scopeLevel !== "NATIONAL") throw new BusinessError("Only national administrators can manage ranks.", "STATE");
  if (await prisma.rank.findUnique({ where: { code: input.code } })) throw new BusinessError("A rank with this code already exists.", "CONFLICT");
  const r = await prisma.rank.create({ data: { code: input.code, name: input.name, level: input.level, category: input.category, isActive: input.isActive } });
  await logAudit({ actor, action: "RANK_CREATED", module: "org", entityType: "Rank", entityId: r.id, entityLabel: r.code, summary: `Rank ${r.code} — ${r.name} (level ${r.level}) created`, after: r, context: ctx });
  return r;
}

export async function updateRank(actor: Actor, id: string, input: RankInput, ctx: RequestContext) {
  if (actor.scopeLevel !== "NATIONAL") throw new BusinessError("Only national administrators can manage ranks.", "STATE");
  const before = await prisma.rank.findUnique({ where: { id } });
  if (!before) throw new NotFoundError("Rank");
  if (input.code !== before.code && (await prisma.rank.findUnique({ where: { code: input.code } }))) throw new BusinessError("A rank with this code already exists.", "CONFLICT");
  if (!input.isActive && before.isActive) {
    const officers = await prisma.officer.count({ where: { rankId: id, isActive: true, deletedAt: null } });
    if (officers) throw new BusinessError(`${officers} active officer(s) still hold this rank.`, "STATE");
  }
  const after = await prisma.rank.update({ where: { id }, data: { code: input.code, name: input.name, level: input.level, category: input.category, isActive: input.isActive } });
  await logAudit({ actor, action: "RANK_UPDATED", module: "org", entityType: "Rank", entityId: id, entityLabel: after.code, summary: `Rank ${after.code} updated`, before, after, context: ctx });
  return after;
}

// ---------------- Officers ----------------

const officerSelect = {
  id: true,
  badgeNumber: true,
  firstName: true,
  lastName: true,
  gender: true,
  dateOfBirth: true,
  phone: true,
  email: true,
  dutyStatus: true,
  hiredAt: true,
  specialties: true,
  notes: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  rankId: true,
  rank: { select: { id: true, code: true, name: true, level: true, category: true } },
  stationId: true,
  station: { select: { id: true, code: true, name: true, regionId: true, region: { select: { id: true, name: true } } } },
  departmentId: true,
  department: { select: { id: true, code: true, name: true, type: true } },
  userId: true,
  user: { select: { id: true, username: true, status: true } },
  commandsStation: { select: { id: true, code: true, name: true } },
  headsDepartment: { select: { id: true, code: true, name: true } },
} as const;

export async function getOfficer(actor: Actor, id: string) {
  const o = await prisma.officer.findFirst({ where: { id, deletedAt: null }, select: officerSelect });
  if (!o || !inScope(actor, { stationId: o.stationId, regionId: o.station.regionId })) throw new NotFoundError("Officer");
  return o;
}

async function validateOfficerPlacement(input: { rankId: string; stationId: string; departmentId?: string }) {
  const [rank, station] = await Promise.all([prisma.rank.findUnique({ where: { id: input.rankId }, select: { id: true, isActive: true } }), regionOfStation(input.stationId)]);
  if (!rank || !rank.isActive) throw new BusinessError("Selected rank is invalid or inactive.");
  if (!station.isActive) throw new BusinessError("Selected station is inactive.");
  const departmentId = nul(input.departmentId);
  if (departmentId) {
    const dep = await prisma.department.findUnique({ where: { id: departmentId }, select: { stationId: true, isActive: true } });
    if (!dep || !dep.isActive) throw new BusinessError("Selected department is invalid or inactive.");
    if (dep.stationId !== station.id) throw new BusinessError("The department must belong to the selected station.");
  }
  return { station, departmentId };
}

export async function createOfficer(actor: Actor, input: OfficerInput, ctx: RequestContext) {
  const { station, departmentId } = await validateOfficerPlacement(input);
  assertOfficerScope(actor, { stationId: station.id, regionId: station.regionId });
  if (await prisma.officer.findUnique({ where: { badgeNumber: input.badgeNumber } })) throw new BusinessError("An officer with this badge number already exists.", "CONFLICT");
  const o = await prisma.$transaction(async (tx) => {
    const created = await tx.officer.create({
      data: {
        badgeNumber: input.badgeNumber,
        firstName: input.firstName,
        lastName: input.lastName,
        gender: input.gender,
        dateOfBirth: input.dateOfBirth,
        phone: nul(input.phone),
        email: nul(input.email),
        rankId: input.rankId,
        stationId: station.id,
        departmentId,
        hiredAt: input.hiredAt,
        specialties: nul(input.specialties),
        notes: nul(input.notes),
      },
      select: officerSelect,
    });
    await tx.officerAssignment.create({ data: { officerId: created.id, stationId: station.id, departmentId, rankId: input.rankId, position: null, startDate: input.hiredAt ?? new Date(), reason: "Initial posting", createdById: actor.id } });
    await logAudit({ actor, action: "OFFICER_CREATED", module: "officers", entityType: "Officer", entityId: created.id, entityLabel: created.badgeNumber, summary: `Officer ${created.badgeNumber} ${created.firstName} ${created.lastName} created at ${station.name}`, after: created, context: ctx }, tx);
    return created;
  });
  return o;
}

export async function updateOfficer(actor: Actor, id: string, input: Omit<OfficerInput, "stationId" | "rankId" | "departmentId"> & Partial<Pick<OfficerInput, "stationId" | "rankId" | "departmentId">>, ctx: RequestContext) {
  const before = await getOfficer(actor, id);
  if (input.badgeNumber !== before.badgeNumber && (await prisma.officer.findUnique({ where: { badgeNumber: input.badgeNumber } }))) throw new BusinessError("An officer with this badge number already exists.", "CONFLICT");
  const after = await prisma.officer.update({
    where: { id },
    data: { badgeNumber: input.badgeNumber, firstName: input.firstName, lastName: input.lastName, gender: input.gender, dateOfBirth: input.dateOfBirth, phone: nul(input.phone), email: nul(input.email), hiredAt: input.hiredAt, specialties: nul(input.specialties), notes: nul(input.notes) },
    select: officerSelect,
  });
  await logAudit({ actor, action: "OFFICER_UPDATED", module: "officers", entityType: "Officer", entityId: id, entityLabel: after.badgeNumber, summary: `Officer ${after.badgeNumber} profile updated`, before, after, context: ctx });
  return after;
}

/** Posting change: closes the current assignment and opens a new one; the officer record follows. */
export async function assignOfficer(actor: Actor, input: AssignmentInput, ctx: RequestContext) {
  const before = await getOfficer(actor, input.officerId);
  const { station, departmentId } = await validateOfficerPlacement({ rankId: nul(input.rankId) ?? before.rankId, stationId: input.stationId, departmentId: input.departmentId });
  // Actor must be allowed on both the current and the target posting.
  assertOfficerScope(actor, { stationId: station.id, regionId: station.regionId });
  const rankId = nul(input.rankId) ?? before.rankId;
  if (input.startDate.getTime() > Date.now() + 86_400_000 * 366) throw new BusinessError("Start date is too far in the future.");
  if (before.commandsStation && before.commandsStation.id !== station.id) throw new BusinessError("This officer commands a station; appoint another commander before transferring them.", "STATE");
  if (before.headsDepartment && before.headsDepartment.id !== departmentId) throw new BusinessError("This officer heads a department; appoint another head before reassigning them.", "STATE");
  const result = await prisma.$transaction(async (tx) => {
    await tx.officerAssignment.updateMany({ where: { officerId: before.id, endDate: null }, data: { endDate: input.startDate } });
    const a = await tx.officerAssignment.create({ data: { officerId: before.id, stationId: station.id, departmentId, rankId, position: nul(input.position), startDate: input.startDate, reason: nul(input.reason), createdById: actor.id } });
    const o = await tx.officer.update({ where: { id: before.id }, data: { stationId: station.id, departmentId, rankId }, select: officerSelect });
    if (o.userId) await tx.user.update({ where: { id: o.userId }, data: { stationId: station.id, regionId: station.regionId } });
    await logAudit({ actor, action: rankId !== before.rankId && station.id === before.stationId ? "OFFICER_PROMOTED" : "OFFICER_ASSIGNED", module: "officers", entityType: "Officer", entityId: o.id, entityLabel: o.badgeNumber, summary: `Officer ${o.badgeNumber} assigned to ${o.station.name}${o.department ? ` / ${o.department.name}` : ""} as ${o.rank.name}${input.position ? ` (${input.position})` : ""}`, before: { stationId: before.stationId, departmentId: before.departmentId, rankId: before.rankId }, after: { stationId: station.id, departmentId, rankId, position: nul(input.position), startDate: input.startDate, reason: nul(input.reason) }, context: ctx }, tx);
    return { officer: o, assignment: a };
  });
  if (result.officer.userId) await notify({ userId: result.officer.userId, kind: "INFO", title: "New posting", body: `You have been assigned to ${result.officer.station.name}${result.officer.department ? ` / ${result.officer.department.name}` : ""}.`, href: `/officers/${result.officer.id}` });
  return result;
}

const DUTY_TRANSITIONS: Record<DutyStatus, DutyStatus[]> = {
  ON_DUTY: ["OFF_DUTY", "ON_LEAVE", "TRAINING", "SUSPENDED", "RETIRED", "DECEASED"],
  OFF_DUTY: ["ON_DUTY", "ON_LEAVE", "TRAINING", "SUSPENDED", "RETIRED", "DECEASED"],
  ON_LEAVE: ["ON_DUTY", "OFF_DUTY", "SUSPENDED", "RETIRED", "DECEASED"],
  TRAINING: ["ON_DUTY", "OFF_DUTY", "SUSPENDED", "RETIRED", "DECEASED"],
  SUSPENDED: ["ON_DUTY", "OFF_DUTY", "RETIRED", "DECEASED"],
  RETIRED: ["DECEASED"],
  DECEASED: [],
};

export async function setDutyStatus(actor: Actor, officerId: string, dutyStatus: DutyStatus, reason: string | undefined, ctx: RequestContext) {
  const before = await getOfficer(actor, officerId);
  if (!DUTY_TRANSITIONS[before.dutyStatus].includes(dutyStatus)) throw new BusinessError(`Cannot move an officer from ${before.dutyStatus} to ${dutyStatus}.`, "STATE");
  const terminal = dutyStatus === "RETIRED" || dutyStatus === "DECEASED";
  await prisma.$transaction(async (tx) => {
    const r = await tx.officer.updateMany({ where: { id: officerId, dutyStatus: before.dutyStatus }, data: { dutyStatus, ...(terminal ? { isActive: false } : {}) } });
    if (r.count !== 1) throw new BusinessError("The record was modified concurrently. Reload and retry.", "CONFLICT");
    if (terminal) {
      await tx.officerAssignment.updateMany({ where: { officerId, endDate: null }, data: { endDate: new Date(), reason: dutyStatus } });
      await tx.station.updateMany({ where: { commanderId: officerId }, data: { commanderId: null } });
      await tx.department.updateMany({ where: { headId: officerId }, data: { headId: null } });
      if (before.userId) await tx.user.updateMany({ where: { id: before.userId, status: "ACTIVE" }, data: { status: "DISABLED" } });
    }
    await logAudit({ actor, action: "OFFICER_STATUS_CHANGED", module: "officers", entityType: "Officer", entityId: officerId, entityLabel: before.badgeNumber, summary: `Officer ${before.badgeNumber}: ${before.dutyStatus} → ${dutyStatus}${reason ? ` (${reason})` : ""}`, before: { dutyStatus: before.dutyStatus }, after: { dutyStatus, reason: nul(reason) }, context: ctx }, tx);
  });
}

export async function deactivateOfficer(actor: Actor, officerId: string, reason: string | undefined, ctx: RequestContext) {
  const before = await getOfficer(actor, officerId);
  if (!before.isActive) throw new BusinessError("This officer is already inactive.", "STATE");
  await prisma.$transaction(async (tx) => {
    await tx.officer.update({ where: { id: officerId }, data: { isActive: false, dutyStatus: before.dutyStatus === "DECEASED" ? "DECEASED" : "OFF_DUTY" } });
    await tx.officerAssignment.updateMany({ where: { officerId, endDate: null }, data: { endDate: new Date(), reason: nul(reason) ?? "Deactivated" } });
    await tx.station.updateMany({ where: { commanderId: officerId }, data: { commanderId: null } });
    await tx.department.updateMany({ where: { headId: officerId }, data: { headId: null } });
    await logAudit({ actor, action: "OFFICER_DEACTIVATED", module: "officers", entityType: "Officer", entityId: officerId, entityLabel: before.badgeNumber, summary: `Officer ${before.badgeNumber} deactivated${reason ? ` (${reason})` : ""}`, before: { isActive: true }, after: { isActive: false, reason: nul(reason) }, context: ctx }, tx);
  });
}

export async function reactivateOfficer(actor: Actor, officerId: string, ctx: RequestContext) {
  const before = await getOfficer(actor, officerId);
  if (before.isActive) throw new BusinessError("This officer is already active.", "STATE");
  if (before.dutyStatus === "DECEASED") throw new BusinessError("A deceased officer cannot be reactivated.", "STATE");
  await prisma.$transaction(async (tx) => {
    await tx.officer.update({ where: { id: officerId }, data: { isActive: true, dutyStatus: "ON_DUTY" } });
    await tx.officerAssignment.create({ data: { officerId, stationId: before.stationId, departmentId: before.departmentId, rankId: before.rankId, startDate: new Date(), reason: "Reactivated", createdById: actor.id } });
    await logAudit({ actor, action: "OFFICER_REACTIVATED", module: "officers", entityType: "Officer", entityId: officerId, entityLabel: before.badgeNumber, summary: `Officer ${before.badgeNumber} reactivated`, context: ctx }, tx);
  });
}
