import "server-only";
import type { Prisma, TrafficFineStatus, TrafficOffenceClass, TrafficVehicleStatus } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { NotFoundError } from "@/server/errors";
import { inScope, type Actor } from "@/server/auth/dal";
import { canSeePersonDetails, trafficScopeWhere } from "@/server/traffic/scope";
import { verifySeal } from "@/server/traffic/seal";
import { normalizePlate, TRAFFIC_LIST_PAGE_SIZE } from "@/server/traffic/schemas";

type Page = { page?: number; pageSize?: number };
const paging = (f: Page) => {
  const page = Math.max(1, f.page ?? 1);
  const pageSize = Math.min(f.pageSize ?? TRAFFIC_LIST_PAGE_SIZE, 100);
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
};
const ci = (v: string) => ({ contains: v, mode: "insensitive" as const });
const dayStart = (d?: Date | null) => (d ? new Date(new Date(d).setHours(0, 0, 0, 0)) : undefined);
const dayEnd = (d?: Date | null) => (d ? new Date(new Date(d).setHours(23, 59, 59, 999)) : undefined);

const personBrief = { select: { id: true, number: true, firstName: true, lastName: true, dateOfBirth: true, phone: true, city: true, stationId: true, regionId: true } } as const;
const userBrief = { select: { id: true, username: true, firstName: true, lastName: true } } as const;
const fineBrief = { select: { id: true, number: true, status: true, amountFcfa: true, amountPaidFcfa: true, dueDate: true } } as const;

/* ------------------------------------------------------------------ controls */

export type ControlFilter = Page & { q?: string; outcome?: "COMPLIANT" | "INFRACTION"; stationId?: string; officerId?: string; from?: Date | null; to?: Date | null; mine?: boolean };

export async function listControls(actor: Actor, f: ControlFilter = {}) {
  const { page, pageSize, skip, take } = paging(f);
  const q = f.q?.trim();
  const where: Prisma.TrafficControlWhereInput = {
    AND: [
      trafficScopeWhere(actor),
      f.outcome ? { outcome: f.outcome } : {},
      f.stationId ? { stationId: f.stationId } : {},
      f.officerId ? { officerId: f.officerId } : {},
      f.mine ? { officerId: actor.id } : {},
      f.from || f.to ? { controlledAt: { gte: dayStart(f.from), lte: dayEnd(f.to) } } : {},
      q ? { OR: [{ number: ci(q) }, { location: ci(q) }, { plateNumber: ci(q) }, { licenseNumber: ci(q) }, { ticket: { number: ci(q) } }, { driverPerson: { OR: [{ lastName: ci(q) }, { firstName: ci(q) }, { number: ci(q) }] } }] } : {},
    ],
  };
  const [items, total] = await Promise.all([
    prisma.trafficControl.findMany({
      where,
      orderBy: { controlledAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        number: true,
        controlledAt: true,
        location: true,
        plateNumber: true,
        vehicleType: true,
        outcome: true,
        officer: userBrief,
        station: { select: { code: true, name: true } },
        driverPerson: { select: { id: true, number: true, firstName: true, lastName: true } },
        ticket: { select: { id: true, number: true, status: true, totalFineFcfa: true, hasNonSettleableOffence: true, fine: { select: { number: true, status: true } } } },
      },
    }),
    prisma.trafficControl.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getControl(actor: Actor, id: string) {
  const c = await prisma.trafficControl.findUnique({
    where: { id },
    include: {
      station: { select: { id: true, code: true, name: true } },
      officer: { select: { id: true, username: true, firstName: true, lastName: true, officer: { select: { badgeNumber: true, rank: { select: { name: true } } } } } },
      driverPerson: personBrief,
      driver: { select: { id: true, licenseNumber: true, licenseCategory: true, licenseExpiresAt: true } },
      vehicle: { select: { id: true, plateNumber: true, make: true, model: true, color: true, status: true, insuranceExpiresAt: true, technicalInspectionExpiresAt: true } },
      case: { select: { id: true, number: true, title: true, status: true } },
      incident: { select: { id: true, number: true, title: true } },
      evidence: { orderBy: { createdAt: "asc" }, select: { id: true, kind: true, caption: true, latitude: true, longitude: true, createdAt: true, documentId: true, document: { select: { versions: { orderBy: { version: "desc" }, take: 1, select: { fileName: true, mimeType: true, sizeBytes: true, sha256: true } } } }, uploadedBy: userBrief } },
      ticket: { select: { id: true, number: true, status: true, totalFineFcfa: true, hasNonSettleableOffence: true, fine: fineBrief, offences: { orderBy: { code: "asc" }, select: { id: true, code: true, name: true, classText: true, legalReference: true, amountFcfa: true, amountText: true } } } },
    },
  });
  if (!c || !inScope(actor, c)) throw new NotFoundError("TrafficControl");
  return c;
}

/* ------------------------------------------------------------------ tickets (PV) */

export type TicketFilter = Page & { q?: string; status?: "ISSUED" | "CANCELLED"; fineStatus?: TrafficFineStatus; stationId?: string; from?: Date | null; to?: Date | null };

export async function listTickets(actor: Actor, f: TicketFilter = {}) {
  const { page, pageSize, skip, take } = paging(f);
  const q = f.q?.trim();
  const where: Prisma.TrafficTicketWhereInput = {
    AND: [
      trafficScopeWhere(actor) as Prisma.TrafficTicketWhereInput,
      f.status ? { status: f.status } : {},
      f.fineStatus ? { fine: { status: f.fineStatus } } : {},
      f.stationId ? { stationId: f.stationId } : {},
      f.from || f.to ? { issuedAt: { gte: dayStart(f.from), lte: dayEnd(f.to) } } : {},
      q ? { OR: [{ number: ci(q) }, { plateNumber: ci(q) }, { fine: { number: ci(q) } }, { driverPerson: { OR: [{ lastName: ci(q) }, { firstName: ci(q) }, { number: ci(q) }] } }, { offences: { some: { name: ci(q) } } }] } : {},
    ],
  };
  const [items, total] = await Promise.all([
    prisma.trafficTicket.findMany({
      where,
      orderBy: { issuedAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        number: true,
        issuedAt: true,
        status: true,
        plateNumber: true,
        totalFineFcfa: true,
        hasNonSettleableOffence: true,
        station: { select: { code: true, name: true } },
        issuedBy: userBrief,
        driverPerson: { select: { id: true, number: true, firstName: true, lastName: true } },
        offences: { select: { name: true, classText: true } },
        fine: { select: { id: true, number: true, status: true, amountFcfa: true, amountPaidFcfa: true } },
      },
    }),
    prisma.trafficTicket.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getTicket(actor: Actor, id: string) {
  const t = await prisma.trafficTicket.findUnique({
    where: { id },
    include: {
      station: { select: { id: true, code: true, name: true, address: true, city: true, phone: true } },
      issuedBy: { select: { id: true, username: true, firstName: true, lastName: true, officer: { select: { badgeNumber: true, rank: { select: { name: true } } } } } },
      cancelledBy: userBrief,
      driverPerson: { select: { ...personBrief.select, identifiers: { select: { type: true, value: true } }, trafficDriver: { select: { id: true, licenseNumber: true, licenseCategory: true, licenseIssuedAt: true, licenseExpiresAt: true } } } },
      offences: { orderBy: { code: "asc" } },
      control: {
        select: {
          id: true,
          number: true,
          controlledAt: true,
          location: true,
          latitude: true,
          longitude: true,
          observations: true,
          plateNumber: true,
          licenseNumber: true,
          vehicleType: true,
          vehicleMake: true,
          vehicleColor: true,
          caseId: true,
          case: { select: { id: true, number: true } },
          vehicle: { select: { id: true, plateNumber: true, make: true, model: true, color: true, registrationCardNumber: true, chassisNumber: true, year: true } },
          evidence: { orderBy: { createdAt: "asc" }, select: { id: true, kind: true, caption: true, documentId: true, document: { select: { versions: { orderBy: { version: "desc" }, take: 1, select: { fileName: true, mimeType: true, storagePath: true, sha256: true, sizeBytes: true } } } } } },
        },
      },
      fine: {
        include: {
          payments: { orderBy: { paidAt: "desc" }, include: { receipt: { select: { id: true, number: true } }, receivedBy: userBrief, voidedBy: userBrief } },
        },
      },
    },
  });
  if (!t || !inScope(actor, t)) throw new NotFoundError("TrafficTicket");
  const showIdentity = t.driverPerson ? canSeePersonDetails(actor, t.driverPerson) : false;
  const seal = verifySeal(
    {
      number: t.number,
      issuedAt: t.issuedAt,
      stationCode: t.station.code,
      issuedByUsername: t.issuedBy.username,
      driver: t.driverPerson ? { number: t.driverPerson.number, lastName: t.driverPerson.lastName, firstName: t.driverPerson.firstName } : null,
      plateNumber: t.plateNumber,
      offences: t.offences.map((o) => ({ code: o.code, name: o.name, classText: o.classText, legalReference: o.legalReference, amountText: o.amountText, amountFcfa: o.amountFcfa })),
      totalFineFcfa: t.totalFineFcfa,
      observations: t.observations,
    },
    t.issuedById,
    { contentHash: t.contentHash, signature: t.signature },
  );
  return { ...t, sealValid: seal, showIdentity };
}

/* ------------------------------------------------------------------ fines */

export type FineFilter = Page & { q?: string; status?: TrafficFineStatus; stationId?: string; from?: Date | null; to?: Date | null; overdue?: boolean };

export async function listFines(actor: Actor, f: FineFilter = {}) {
  const { page, pageSize, skip, take } = paging(f);
  const q = f.q?.trim();
  const where: Prisma.TrafficFineWhereInput = {
    AND: [
      trafficScopeWhere(actor) as Prisma.TrafficFineWhereInput,
      f.status ? { status: f.status } : {},
      f.stationId ? { stationId: f.stationId } : {},
      f.from || f.to ? { issuedAt: { gte: dayStart(f.from), lte: dayEnd(f.to) } } : {},
      f.overdue ? { dueDate: { lt: new Date() }, status: { in: ["TO_PAY", "PARTIALLY_PAID"] } } : {},
      q ? { OR: [{ number: ci(q) }, { plateNumber: ci(q) }, { ticket: { number: ci(q) } }, { driverPerson: { OR: [{ lastName: ci(q) }, { firstName: ci(q) }, { number: ci(q) }] } }] } : {},
    ],
  };
  const [items, total, totals] = await Promise.all([
    prisma.trafficFine.findMany({
      where,
      orderBy: { issuedAt: "desc" },
      skip,
      take,
      select: { id: true, number: true, status: true, amountFcfa: true, amountPaidFcfa: true, issuedAt: true, dueDate: true, plateNumber: true, ticket: { select: { id: true, number: true } }, driverPerson: { select: { id: true, number: true, firstName: true, lastName: true } }, station: { select: { code: true, name: true } } },
    }),
    prisma.trafficFine.count({ where }),
    prisma.trafficFine.aggregate({ where, _sum: { amountFcfa: true, amountPaidFcfa: true } }),
  ]);
  return { items, total, page, pageSize, sumAmount: totals._sum.amountFcfa ?? 0, sumPaid: totals._sum.amountPaidFcfa ?? 0 };
}

export async function getFine(actor: Actor, id: string) {
  const f = await prisma.trafficFine.findUnique({
    where: { id },
    include: {
      ticket: { select: { id: true, number: true, status: true, issuedAt: true, plateNumber: true, verificationToken: true, offences: { orderBy: { code: "asc" }, select: { code: true, name: true, classText: true, legalReference: true, amountFcfa: true, amountText: true } }, control: { select: { id: true, number: true, location: true, controlledAt: true } } } },
      driverPerson: { select: { id: true, number: true, firstName: true, lastName: true, phone: true } },
      officer: userBrief,
      station: { select: { id: true, code: true, name: true } },
      payments: { orderBy: { paidAt: "desc" }, include: { receipt: { select: { id: true, number: true, verificationToken: true } }, receivedBy: userBrief, voidedBy: userBrief, station: { select: { code: true, name: true } } } },
    },
  });
  if (!f || !inScope(actor, f)) throw new NotFoundError("TrafficFine");
  return f;
}

export async function getReceipt(actor: Actor, id: string) {
  const r = await prisma.trafficReceipt.findUnique({
    where: { id },
    include: {
      payment: { include: { receivedBy: { select: { id: true, username: true, firstName: true, lastName: true, officer: { select: { badgeNumber: true } } } }, station: { select: { code: true, name: true } } } },
      fine: { select: { id: true, number: true, status: true, amountFcfa: true, amountPaidFcfa: true, stationId: true, regionId: true, plateNumber: true, ticket: { select: { id: true, number: true } }, driverPerson: { select: { id: true, number: true, firstName: true, lastName: true } } } },
      issuedBy: userBrief,
    },
  });
  if (!r || !inScope(actor, r.fine)) throw new NotFoundError("TrafficReceipt");
  return r;
}

/* ------------------------------------------------------------------ drivers (national registry) */

export async function listDrivers(f: Page & { q?: string; expired?: boolean } = {}) {
  const { page, pageSize, skip, take } = paging(f);
  const q = f.q?.trim();
  const where: Prisma.TrafficDriverWhereInput = {
    AND: [
      f.expired ? { licenseExpiresAt: { lt: new Date() } } : {},
      q ? { OR: [{ licenseNumber: ci(q) }, { person: { OR: [{ lastName: ci(q) }, { firstName: ci(q) }, { number: ci(q) }, { phone: ci(q) }] } }, { person: { identifiers: { some: { type: "NATIONAL_ID", value: q } } } }] } : {},
    ],
  };
  const [items, total] = await Promise.all([
    prisma.trafficDriver.findMany({ where, orderBy: { person: { lastName: "asc" } }, skip, take, select: { id: true, licenseNumber: true, licenseCategory: true, licenseExpiresAt: true, person: { select: { id: true, number: true, firstName: true, lastName: true, dateOfBirth: true, phone: true, city: true } }, _count: { select: { controls: true } } } }),
    prisma.trafficDriver.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

/** Traffic history of a person — summaries across the whole national register (a driver controlled elsewhere still owes the fine). */
export async function personTrafficHistory(personId: string) {
  const [controls, tickets, fines, payments] = await Promise.all([
    prisma.trafficControl.findMany({ where: { driverPersonId: personId }, orderBy: { controlledAt: "desc" }, take: 50, select: { id: true, number: true, controlledAt: true, location: true, plateNumber: true, outcome: true, station: { select: { name: true } } } }),
    prisma.trafficTicket.findMany({ where: { driverPersonId: personId }, orderBy: { issuedAt: "desc" }, take: 50, select: { id: true, number: true, issuedAt: true, status: true, totalFineFcfa: true, hasNonSettleableOffence: true, offences: { select: { name: true } } } }),
    prisma.trafficFine.findMany({ where: { driverPersonId: personId }, orderBy: { issuedAt: "desc" }, take: 50, select: { id: true, number: true, status: true, amountFcfa: true, amountPaidFcfa: true, issuedAt: true, ticket: { select: { number: true } } } }),
    prisma.trafficPayment.findMany({ where: { fine: { driverPersonId: personId } }, orderBy: { paidAt: "desc" }, take: 50, select: { id: true, number: true, amountFcfa: true, method: true, paidAt: true, status: true, fine: { select: { number: true } }, receipt: { select: { id: true, number: true } } } }),
  ]);
  const totals = await prisma.trafficFine.aggregate({ where: { driverPersonId: personId, status: { not: "CANCELLED" } }, _sum: { amountFcfa: true, amountPaidFcfa: true }, _count: true });
  return { controls, tickets, fines, payments, totalFines: totals._sum.amountFcfa ?? 0, totalPaid: totals._sum.amountPaidFcfa ?? 0, fineCount: totals._count };
}

export async function getDriver(actor: Actor, id: string) {
  const d = await prisma.trafficDriver.findUnique({
    where: { id },
    include: { person: { select: { ...personBrief.select, address: true, gender: true, placeOfBirth: true, identifiers: { select: { type: true, value: true } } } }, photo: { select: { id: true } } },
  });
  if (!d) throw new NotFoundError("TrafficDriver");
  const showIdentity = canSeePersonDetails(actor, d.person);
  const history = await personTrafficHistory(d.personId);
  const wanted = await prisma.wantedPerson.findMany({ where: { personId: d.personId, status: { in: ["ACTIVE", "LOCATED"] } }, select: { id: true, number: true, offense: true, dangerLevel: true } });
  return { ...d, showIdentity, history, wanted };
}

/* ------------------------------------------------------------------ vehicles (national registry) */

export async function listVehicles(f: Page & { q?: string; status?: TrafficVehicleStatus } = {}) {
  const { page, pageSize, skip, take } = paging(f);
  const q = f.q?.trim();
  const plate = normalizePlate(q);
  const where: Prisma.TrafficVehicleWhereInput = {
    AND: [
      f.status ? { status: f.status } : {},
      q ? { OR: [{ plateNumber: ci(plate ?? q) }, { registrationCardNumber: ci(q) }, { chassisNumber: ci(q) }, { make: ci(q) }, { model: ci(q) }, { owner: { OR: [{ lastName: ci(q) }, { firstName: ci(q) }] } }] } : {},
    ],
  };
  const [items, total] = await Promise.all([
    prisma.trafficVehicle.findMany({ where, orderBy: { plateNumber: "asc" }, skip, take, select: { id: true, plateNumber: true, make: true, model: true, color: true, vehicleType: true, status: true, insuranceExpiresAt: true, technicalInspectionExpiresAt: true, owner: { select: { id: true, number: true, firstName: true, lastName: true } }, _count: { select: { controls: true } } } }),
    prisma.trafficVehicle.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getVehicle(actor: Actor, id: string) {
  const v = await prisma.trafficVehicle.findUnique({
    where: { id },
    include: { owner: { select: { ...personBrief.select } }, documents: { orderBy: [{ type: "asc" }, { createdAt: "desc" }] } },
  });
  if (!v) throw new NotFoundError("TrafficVehicle");
  const [controls, tickets, fines, wanted] = await Promise.all([
    prisma.trafficControl.findMany({ where: { vehicleId: v.id }, orderBy: { controlledAt: "desc" }, take: 50, select: { id: true, number: true, controlledAt: true, location: true, outcome: true, driverPerson: { select: { firstName: true, lastName: true } } } }),
    prisma.trafficTicket.findMany({ where: { plateNumber: v.plateNumber }, orderBy: { issuedAt: "desc" }, take: 50, select: { id: true, number: true, issuedAt: true, status: true, totalFineFcfa: true, offences: { select: { name: true } } } }),
    prisma.trafficFine.findMany({ where: { plateNumber: v.plateNumber }, orderBy: { issuedAt: "desc" }, take: 50, select: { id: true, number: true, status: true, amountFcfa: true, amountPaidFcfa: true, issuedAt: true } }),
    prisma.wantedPerson.findMany({ where: { status: { in: ["ACTIVE", "LOCATED"] }, vehicles: { some: { plateNumber: v.plateNumber } } }, select: { id: true, number: true, offense: true, dangerLevel: true, person: { select: { firstName: true, lastName: true } } } }),
  ]);
  const showOwner = v.owner ? canSeePersonDetails(actor, v.owner) : false;
  return { ...v, controls, tickets, fines, wanted, showOwner };
}

/* ------------------------------------------------------------------ offence catalogue */

export async function listViolations(f: { q?: string; category?: string; offenceClass?: TrafficOffenceClass; onlyInactive?: boolean } = {}) {
  const q = f.q?.trim();
  const where: Prisma.TrafficViolationWhereInput = {
    AND: [
      f.category ? { category: { code: f.category } } : {},
      f.offenceClass ? { offenceClass: f.offenceClass } : {},
      f.onlyInactive ? { isActive: false } : {},
      q ? { OR: [{ name: ci(q) }, { code: ci(q) }, { legalReference: { reference: ci(q) } }] } : {},
    ],
  };
  return prisma.trafficViolation.findMany({ where, orderBy: { sourceOrder: "asc" }, select: { id: true, code: true, name: true, offenceClass: true, classText: true, fineAmountFcfa: true, fineAmountText: true, isFineEligible: true, sourcePage: true, sourceNote: true, isActive: true, category: { select: { code: true, name: true } }, legalReference: { select: { reference: true } } } });
}

export async function violationSummary() {
  const [byCategory, byClass, total, inactive] = await Promise.all([
    prisma.trafficViolation.groupBy({ by: ["categoryId"], _count: true }),
    prisma.trafficViolation.groupBy({ by: ["offenceClass"], _count: true }),
    prisma.trafficViolation.count(),
    prisma.trafficViolation.count({ where: { isActive: false } }),
  ]);
  const cats = await prisma.trafficViolationCategory.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, code: true, name: true, sourceHeading: true } });
  return { total, inactive, byCategory: cats.map((c) => ({ ...c, count: byCategory.find((b) => b.categoryId === c.id)?._count ?? 0 })), byClass: byClass.map((b) => ({ offenceClass: b.offenceClass, count: b._count })) };
}

/** Offences selectable at the roadside, grouped for the control form (active offences only). */
export async function selectableViolations() {
  return prisma.trafficViolation.findMany({ where: { isActive: true }, orderBy: { sourceOrder: "asc" }, select: { id: true, code: true, name: true, classText: true, offenceClass: true, fineAmountFcfa: true, fineAmountText: true, category: { select: { code: true } }, legalReference: { select: { reference: true } } } });
}

/* ------------------------------------------------------------------ global search */

export type TrafficSearchFilter = Page & {
  pv?: string;
  fine?: string;
  plate?: string;
  driver?: string;
  license?: string;
  cni?: string;
  violation?: string;
  officer?: string;
  stationId?: string;
  from?: Date | null;
  to?: Date | null;
  fineStatus?: TrafficFineStatus;
};

export async function searchTraffic(actor: Actor, f: TrafficSearchFilter) {
  const { page, pageSize, skip, take } = paging(f);
  const t = (v?: string) => v?.trim() || undefined;
  const plate = normalizePlate(f.plate);
  const clauses: Prisma.TrafficControlWhereInput[] = [
    trafficScopeWhere(actor),
    t(f.pv) ? { OR: [{ ticket: { number: ci(t(f.pv)!) } }, { number: ci(t(f.pv)!) }] } : {},
    t(f.fine) ? { ticket: { fine: { number: ci(t(f.fine)!) } } } : {},
    plate ? { plateNumber: { contains: plate, mode: "insensitive" } } : {},
    t(f.driver) ? { driverPerson: { OR: [{ lastName: ci(t(f.driver)!) }, { firstName: ci(t(f.driver)!) }, { number: ci(t(f.driver)!) }] } } : {},
    t(f.license) ? { OR: [{ licenseNumber: ci(t(f.license)!) }, { driver: { licenseNumber: ci(t(f.license)!) } }] } : {},
    // CNI: exact match only — a partial match would turn the search into an identity-number enumeration tool
    t(f.cni) ? { driverPerson: { identifiers: { some: { type: "NATIONAL_ID", value: t(f.cni)! } } } } : {},
    t(f.violation) ? { ticket: { offences: { some: { OR: [{ name: ci(t(f.violation)!) }, { code: ci(t(f.violation)!) }] } } } } : {},
    t(f.officer) ? { officer: { OR: [{ firstName: ci(t(f.officer)!) }, { lastName: ci(t(f.officer)!) }, { username: ci(t(f.officer)!) }, { officer: { badgeNumber: ci(t(f.officer)!) } }] } } : {},
    t(f.stationId) ? { stationId: t(f.stationId) } : {},
    f.from || f.to ? { controlledAt: { gte: dayStart(f.from), lte: dayEnd(f.to) } } : {},
    f.fineStatus ? { ticket: { fine: { status: f.fineStatus } } } : {},
  ];
  const where: Prisma.TrafficControlWhereInput = { AND: clauses };
  const [items, total] = await Promise.all([
    prisma.trafficControl.findMany({
      where,
      orderBy: { controlledAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        number: true,
        controlledAt: true,
        plateNumber: true,
        outcome: true,
        location: true,
        station: { select: { code: true, name: true } },
        officer: userBrief,
        driverPerson: { select: { id: true, number: true, firstName: true, lastName: true } },
        ticket: { select: { id: true, number: true, status: true, totalFineFcfa: true, offences: { select: { name: true } }, fine: { select: { id: true, number: true, status: true, amountFcfa: true } } } },
      },
    }),
    prisma.trafficControl.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

/* ------------------------------------------------------------------ public verification (QR code) */

/** Minimal, non-identifying view of a PV for the public QR check: no address, phone, CNI or full name. */
export async function verifyTicketByToken(token: string) {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
  const t = await prisma.trafficTicket.findUnique({
    where: { verificationToken: token },
    include: { station: { select: { code: true, name: true } }, issuedBy: { select: { id: true, username: true } }, driverPerson: { select: { number: true, firstName: true, lastName: true } }, offences: { orderBy: { code: "asc" } }, fine: { select: { number: true, status: true, amountFcfa: true, amountPaidFcfa: true } } },
  });
  if (!t) return null;
  const valid = verifySeal(
    { number: t.number, issuedAt: t.issuedAt, stationCode: t.station.code, issuedByUsername: t.issuedBy.username, driver: t.driverPerson ? { number: t.driverPerson.number, lastName: t.driverPerson.lastName, firstName: t.driverPerson.firstName } : null, plateNumber: t.plateNumber, offences: t.offences.map((o) => ({ code: o.code, name: o.name, classText: o.classText, legalReference: o.legalReference, amountText: o.amountText, amountFcfa: o.amountFcfa })), totalFineFcfa: t.totalFineFcfa, observations: t.observations },
    t.issuedById,
    { contentHash: t.contentHash, signature: t.signature },
  );
  const mask = (s: string) => (s.length <= 1 ? "*" : `${s[0]}${"*".repeat(Math.min(s.length - 1, 6))}`);
  return {
    number: t.number,
    issuedAt: t.issuedAt,
    status: t.status,
    station: t.station.name,
    plateNumber: t.plateNumber ? `${t.plateNumber.slice(0, Math.max(0, t.plateNumber.length - 4))}****` : null,
    driverInitials: t.driverPerson ? `${mask(t.driverPerson.lastName)} ${t.driverPerson.firstName[0]?.toUpperCase() ?? ""}.` : null,
    offences: t.offences.map((o) => ({ name: o.name, classText: o.classText, amountText: o.amountText })),
    totalFineFcfa: t.totalFineFcfa,
    fineStatus: t.fine?.status ?? null,
    fineNumber: t.fine?.number ?? null,
    sealValid: valid,
    cancelled: t.status === "CANCELLED",
  };
}

export async function verifyReceiptByToken(token: string) {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
  const r = await prisma.trafficReceipt.findUnique({
    where: { verificationToken: token },
    include: { payment: { select: { method: true, paidAt: true, status: true } }, fine: { select: { number: true, status: true, amountFcfa: true, amountPaidFcfa: true, ticket: { select: { number: true } } } } },
  });
  if (!r) return null;
  return { number: r.number, issuedAt: r.issuedAt, amountFcfa: r.amountFcfa, method: r.payment.method, voided: r.payment.status === "VOIDED", fineNumber: r.fine.number, ticketNumber: r.fine.ticket.number, fineStatus: r.fine.status, fineAmountFcfa: r.fine.amountFcfa, fineAmountPaidFcfa: r.fine.amountPaidFcfa };
}
