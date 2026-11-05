import "server-only";
import type { AdministrativeStatus, CareerEventType, DutyStatus } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { logAudit } from "@/server/audit";
import { BusinessError } from "@/server/errors";
import { inScope, scopeWhere, type Actor } from "@/server/auth/dal";
import type { RequestContext } from "@/server/request-context";
import { getOfficer } from "@/server/org/service";
import type { CareerEventInput, DossierInput } from "@/server/hr/schemas";
import { cancelOpenTransfers } from "@/server/hr/transfer-cleanup";

const nul = (v: string | undefined | null) => (v ? v : null);

/** Statuses from which no further career decision is possible. */
const TERMINAL: AdministrativeStatus[] = ["RETIRED", "CEASED", "DECEASED"];

// ---------------- Reads ----------------

export async function listCorps() {
  return prisma.corps.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
}

/** HR dossier of one officer; reading it is audited (personal data). */
export async function getDossier(actor: Actor, officerId: string, ctx?: RequestContext) {
  await getOfficer(actor, officerId); // scope check (NotFoundError outside the actor's scope)
  const o = await prisma.officer.findUniqueOrThrow({
    where: { id: officerId },
    include: { rank: true, position: true, corps: true, station: { include: { region: true } }, department: true },
  });
  await logAudit({ actor, action: "HR_DOSSIER_VIEWED", module: "hr", entityType: "Officer", entityId: o.id, entityLabel: o.badgeNumber, summary: `HR dossier of ${o.badgeNumber} viewed`, context: ctx });
  return o;
}

export async function careerHistory(officerId: string) {
  const events = await prisma.careerEvent.findMany({ where: { officerId }, orderBy: [{ effectiveDate: "desc" }, { createdAt: "desc" }], include: { recordedBy: { select: { username: true } } } });
  const rankIds = new Set<string>();
  const positionIds = new Set<string>();
  const stationIds = new Set<string>();
  for (const e of events) {
    for (const id of [e.fromRankId, e.toRankId]) if (id) rankIds.add(id);
    for (const id of [e.fromPositionId, e.toPositionId]) if (id) positionIds.add(id);
    for (const id of [e.fromStationId, e.toStationId]) if (id) stationIds.add(id);
  }
  const [ranks, positions, stations] = await Promise.all([
    prisma.rank.findMany({ where: { id: { in: [...rankIds] } }, select: { id: true, name: true } }),
    prisma.position.findMany({ where: { id: { in: [...positionIds] } }, select: { id: true, name: true } }),
    prisma.station.findMany({ where: { id: { in: [...stationIds] } }, select: { id: true, name: true } }),
  ]);
  const name = (list: { id: string; name: string }[]) => new Map(list.map((x) => [x.id, x.name]));
  const rn = name(ranks);
  const pn = name(positions);
  const sn = name(stations);
  return events.map((e) => ({
    ...e,
    fromRank: e.fromRankId ? (rn.get(e.fromRankId) ?? null) : null,
    toRank: e.toRankId ? (rn.get(e.toRankId) ?? null) : null,
    fromPosition: e.fromPositionId ? (pn.get(e.fromPositionId) ?? null) : null,
    toPosition: e.toPositionId ? (pn.get(e.toPositionId) ?? null) : null,
    fromStation: e.fromStationId ? (sn.get(e.fromStationId) ?? null) : null,
    toStation: e.toStationId ? (sn.get(e.toStationId) ?? null) : null,
  }));
}

export type DossierFilter = { q?: string; stationId?: string; regionId?: string; rankId?: string; corpsId?: string; status?: AdministrativeStatus; page?: number; pageSize?: number };

export async function listDossiers(actor: Actor, f: DossierFilter = {}) {
  const page = Math.max(f.page ?? 1, 1);
  const pageSize = Math.min(f.pageSize ?? 25, 100);
  const where = {
    deletedAt: null,
    ...scopeWhere(actor, { via: "station" }),
    ...(f.stationId ? { stationId: f.stationId } : {}),
    ...(f.regionId ? { AND: [{ station: { regionId: f.regionId } }] } : {}),
    ...(f.rankId ? { rankId: f.rankId } : {}),
    ...(f.corpsId ? { corpsId: f.corpsId } : {}),
    ...(f.status ? { administrativeStatus: f.status } : {}),
    ...(f.q ? { OR: [{ badgeNumber: { contains: f.q, mode: "insensitive" as const } }, { firstName: { contains: f.q, mode: "insensitive" as const } }, { lastName: { contains: f.q, mode: "insensitive" as const } }] } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.officer.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, badgeNumber: true, firstName: true, lastName: true, administrativeStatus: true, currentPostSince: true, rank: { select: { name: true } }, corps: { select: { name: true } }, position: { select: { name: true } }, station: { select: { name: true, code: true } } },
    }),
    prisma.officer.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

/** Counts shown on the HR overview (all inside the actor's scope). */
export async function hrOverview(actor: Actor) {
  const base = { deletedAt: null, ...scopeWhere(actor, { via: "station" }) };
  const [total, byStatus, byRank, byCorps, events] = await Promise.all([
    prisma.officer.count({ where: base }),
    prisma.officer.groupBy({ by: ["administrativeStatus"], where: base, _count: { _all: true } }),
    prisma.officer.groupBy({ by: ["rankId"], where: { ...base, administrativeStatus: "ACTIVE" }, _count: { _all: true } }),
    prisma.officer.groupBy({ by: ["corpsId"], where: { ...base, administrativeStatus: "ACTIVE" }, _count: { _all: true } }),
    prisma.careerEvent.findMany({ where: { officer: base }, orderBy: { createdAt: "desc" }, take: 8, include: { officer: { select: { id: true, badgeNumber: true, firstName: true, lastName: true } } } }),
  ]);
  const [ranks, corps] = await Promise.all([prisma.rank.findMany({ select: { id: true, name: true, level: true } }), prisma.corps.findMany({ select: { id: true, name: true } })]);
  const rn = new Map(ranks.map((r) => [r.id, r]));
  const cn = new Map(corps.map((c) => [c.id, c.name]));
  return {
    total,
    byStatus: byStatus.map((g) => ({ key: g.administrativeStatus, n: g._count._all })),
    byRank: byRank.map((g) => ({ name: rn.get(g.rankId)?.name ?? "—", level: rn.get(g.rankId)?.level ?? 0, n: g._count._all })).sort((a, b) => b.level - a.level),
    byCorps: byCorps.map((g) => ({ name: g.corpsId ? (cn.get(g.corpsId) ?? "—") : "—", n: g._count._all })).sort((a, b) => b.n - a.n),
    recentEvents: events,
  };
}

// ---------------- Writes ----------------

export async function updateDossier(actor: Actor, officerId: string, input: DossierInput, ctx: RequestContext) {
  const before = await getOfficer(actor, officerId);
  if (input.corpsId) {
    const c = await prisma.corps.findUnique({ where: { id: input.corpsId }, select: { isActive: true } });
    if (!c || !c.isActive) throw new BusinessError("Selected corps is invalid or inactive.");
  }
  if (input.dateOfBirth && input.dateOfBirth > new Date()) throw new BusinessError("The date of birth cannot be in the future.", "VALIDATION", { dateOfBirth: "cannot be in the future" });
  const data = {
    firstName: input.firstName,
    lastName: input.lastName,
    gender: input.gender,
    dateOfBirth: input.dateOfBirth,
    birthPlace: nul(input.birthPlace),
    maritalStatus: input.maritalStatus ? input.maritalStatus : null,
    phone: nul(input.phone),
    email: nul(input.email),
    corpsId: nul(input.corpsId),
    hiredAt: input.hiredAt,
    serviceStartDate: input.serviceStartDate,
    specialties: nul(input.specialties),
    notes: nul(input.notes),
  };
  const after = await prisma.$transaction(async (tx) => {
    const o = await tx.officer.update({ where: { id: officerId }, data });
    await logAudit({ actor, action: "HR_DOSSIER_UPDATED", module: "hr", entityType: "Officer", entityId: officerId, entityLabel: o.badgeNumber, summary: `HR dossier of ${o.badgeNumber} updated`, before, after: o, context: ctx }, tx);
    return o;
  });
  return after;
}

/**
 * Records a career decision and applies its effect on the dossier in one transaction.
 * Every event needs a decision reference; events are append-only (a mistake is corrected by a new event).
 * Postings (TRANSFER) are NOT handled here: they go through the validated mutation circuit.
 */
export async function recordCareerEvent(actor: Actor, input: CareerEventInput, ctx: RequestContext) {
  const o = await getOfficer(actor, input.officerId);
  if (!inScope(actor, { stationId: o.stationId, regionId: o.station.regionId })) throw new BusinessError("You can only act on officers inside your scope.", "STATE");
  const cur = await prisma.officer.findUniqueOrThrow({ where: { id: o.id }, select: { rankId: true, positionId: true, stationId: true, administrativeStatus: true, hiredAt: true, rank: { select: { level: true } } } });
  if (TERMINAL.includes(cur.administrativeStatus)) throw new BusinessError("This officer has left the service; no further career decision can be recorded.", "STATE");
  if (cur.hiredAt && input.effectiveDate < cur.hiredAt) throw new BusinessError("The effective date cannot precede the recruitment date.", "VALIDATION", { effectiveDate: "before the recruitment date" });
  if (input.effectiveDate.getTime() > Date.now() + 366 * 24 * 3600 * 1000) throw new BusinessError("The effective date is too far in the future.", "VALIDATION", { effectiveDate: "too far in the future" });

  const type: CareerEventType = input.type;
  const officerData: { rankId?: string; positionId?: string; administrativeStatus?: AdministrativeStatus; dutyStatus?: DutyStatus; isActive?: boolean } = {};
  const ev: { toRankId?: string; toPositionId?: string; toStatus?: AdministrativeStatus } = {};
  let positionLabel: string | null | undefined;

  switch (type) {
    case "PROMOTION":
    case "ADVANCEMENT": {
      const rank = input.toRankId ? await prisma.rank.findUnique({ where: { id: input.toRankId } }) : null;
      if (!rank || !rank.isActive) throw new BusinessError("Select the new rank.", "VALIDATION", { toRankId: "required" });
      if (type === "PROMOTION" && rank.level <= cur.rank.level) throw new BusinessError("A promotion must lead to a higher rank than the current one.", "VALIDATION", { toRankId: "must be higher" });
      if (type === "ADVANCEMENT" && rank.id === cur.rankId) throw new BusinessError("The new rank is the current rank.", "VALIDATION", { toRankId: "same as current" });
      officerData.rankId = rank.id;
      ev.toRankId = rank.id;
      break;
    }
    case "APPOINTMENT":
    case "FUNCTION_CHANGE": {
      const pos = input.toPositionId ? await prisma.position.findUnique({ where: { id: input.toPositionId } }) : null;
      if (!pos || !pos.isActive) throw new BusinessError("Select the new function.", "VALIDATION", { toPositionId: "required" });
      if (pos.id === cur.positionId) throw new BusinessError("The new function is the current function.", "VALIDATION", { toPositionId: "same as current" });
      officerData.positionId = pos.id;
      ev.toPositionId = pos.id;
      positionLabel = pos.name;
      break;
    }
    case "SECONDMENT":
    case "AT_DISPOSAL":
      if (cur.administrativeStatus !== "ACTIVE") throw new BusinessError("Only an officer in active service can be seconded or placed at disposal.", "STATE");
      ev.toStatus = type === "SECONDMENT" ? "SECONDED" : "AT_DISPOSAL";
      officerData.administrativeStatus = ev.toStatus;
      break;
    case "REINSTATEMENT":
      if (cur.administrativeStatus === "ACTIVE") throw new BusinessError("This officer is already in active service.", "STATE");
      ev.toStatus = "ACTIVE";
      officerData.administrativeStatus = "ACTIVE";
      officerData.dutyStatus = "ON_DUTY";
      break;
    case "RETIREMENT":
    case "CESSATION":
      ev.toStatus = type === "RETIREMENT" ? "RETIRED" : "CEASED";
      officerData.administrativeStatus = ev.toStatus;
      officerData.dutyStatus = type === "RETIREMENT" ? "RETIRED" : "OFF_DUTY";
      officerData.isActive = false;
      break;
    default:
      throw new BusinessError("This career event cannot be recorded manually.", "STATE");
  }

  return prisma.$transaction(async (tx) => {
    if (officerData.positionId) await tx.officerAssignment.updateMany({ where: { officerId: o.id, endDate: null }, data: { positionId: officerData.positionId, position: positionLabel ?? null } });
    if (officerData.rankId) await tx.officerAssignment.updateMany({ where: { officerId: o.id, endDate: null }, data: { rankId: officerData.rankId } });
    await tx.officer.update({ where: { id: o.id }, data: officerData });
    if (type === "RETIREMENT" || type === "CESSATION") await cancelOpenTransfers(tx, o.id, `Officer left the service (${type})`, actor, ctx);
    const event = await tx.careerEvent.create({
      data: {
        officerId: o.id,
        type,
        effectiveDate: input.effectiveDate,
        reference: input.reference,
        reason: nul(input.reason),
        fromRankId: ev.toRankId ? cur.rankId : null,
        toRankId: ev.toRankId ?? null,
        fromPositionId: ev.toPositionId ? cur.positionId : null,
        toPositionId: ev.toPositionId ?? null,
        fromStatus: ev.toStatus ? cur.administrativeStatus : null,
        toStatus: ev.toStatus ?? null,
        recordedById: actor.id,
      },
    });
    await logAudit({ actor, action: `HR_CAREER_${type}`, module: "hr", entityType: "Officer", entityId: o.id, entityLabel: o.badgeNumber, summary: `Career decision ${type} (${input.reference}) recorded for ${o.badgeNumber}`, after: event, context: ctx }, tx);
    return event;
  });
}
