import "server-only";
import { z } from "zod";
import type { PayApprovalStatus, PayComponentKind, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { logAudit } from "@/server/audit";
import { AuthError, BusinessError, NotFoundError } from "@/server/errors";
import type { Actor } from "@/server/auth/dal";
import type { Permission } from "@/server/rbac/permissions";
import type { RequestContext } from "@/server/request-context";
import { getOfficer } from "@/server/org/service";
import { dateInput, optionalDate, optionalText } from "@/server/action-utils";
import { PERIOD_RE, computePay, periodBounds, type PayItemInput } from "@/lib/pay-calc";

const DAY = 86_400_000;
export const PAY_SETTING_KEY = "hr.pay";
const MAX_AMOUNT = 100_000_000;
/** Retroactive pay corrections are legitimate, but nothing before 1990 is accepted. */
const MIN_PAY_DATE = new Date(Date.UTC(1990, 0, 1));
const nul = (v: string | undefined | null) => (v ? v : null);
const utcDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const num = (v: bigint | number) => Number(v);

function need(actor: Actor, permission: Permission) {
  if (!actor.permissions.has(permission)) throw new AuthError("forbidden", `Permission ${permission} required`);
}

// ---------------- Schemas ----------------

export const COMPONENT_KINDS = ["BONUS", "ALLOWANCE", "BENEFIT", "DEDUCTION"] as const;
export const scaleSchema = z.object({ rankId: z.string().min(1), amount: z.number().int().min(1).max(MAX_AMOUNT), effectiveFrom: dateInput, note: optionalText(300) });
export const componentSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_]{2,24}$/, "2 to 24 letters, digits or underscores"),
  name: z.string().trim().min(2).max(100),
  kind: z.enum(COMPONENT_KINDS),
  calculation: z.enum(["FIXED", "PERCENT_OF_BASE"]),
  defaultValue: z.number().int().min(0).max(MAX_AMOUNT),
  description: optionalText(300),
  isActive: z.boolean().default(true),
});
export const elementSchema = z.object({ officerId: z.string().min(1), componentId: z.string().min(1), value: z.number().int().min(0).max(MAX_AMOUNT).optional(), startDate: dateInput, endDate: optionalDate, reason: z.string().trim().min(5, "reason is required").max(500), decisionRef: optionalText(60) });
export const decisionSchema = z.object({ id: z.string().min(1), decision: z.enum(["APPROVE", "REJECT"]), note: optionalText(500) });
export const endElementSchema = z.object({ id: z.string().min(1), endDate: optionalDate, reason: z.string().trim().min(5).max(500) });
export const paySettingsSchema = z.object({ suspendedPayPercent: z.number().int().min(0).max(100).default(50) });
export type PaySettings = z.infer<typeof paySettingsSchema>;

export async function getPaySettings(): Promise<PaySettings> {
  const row = await prisma.systemSetting.findUnique({ where: { key: PAY_SETTING_KEY }, select: { value: true } });
  const p = paySettingsSchema.safeParse(row?.value ?? {});
  return p.success ? p.data : paySettingsSchema.parse({});
}

export async function updatePaySettings(actor: Actor, input: PaySettings, ctx: RequestContext) {
  need(actor, "hr:pay_manage");
  const before = await getPaySettings();
  const value = paySettingsSchema.parse(input);
  await prisma.$transaction(async (tx) => {
    await tx.systemSetting.upsert({ where: { key: PAY_SETTING_KEY }, update: { value, updatedById: actor.id }, create: { key: PAY_SETTING_KEY, value, description: "Paramètres de solde : part de la solde versée pendant une suspension disciplinaire.", updatedById: actor.id } });
    await logAudit({ actor, action: "HR_PAY_SETTINGS_UPDATED", module: "hr", entityType: "SystemSetting", entityId: PAY_SETTING_KEY, summary: `Pay during suspension: ${before.suspendedPayPercent}% → ${value.suspendedPayPercent}%`, before, after: value, context: ctx }, tx);
  });
  return value;
}

// ---------------- Pay scale ----------------

export async function payScale(actor: Actor) {
  need(actor, "hr:pay_view");
  const [ranks, entries] = await Promise.all([prisma.rank.findMany({ where: { isActive: true }, orderBy: { level: "desc" }, select: { id: true, code: true, name: true, level: true } }), prisma.payScaleEntry.findMany({ orderBy: { effectiveFrom: "desc" }, include: { createdBy: { select: { username: true } }, validatedBy: { select: { username: true } } } })]);
  const today = utcDay(new Date());
  return ranks.map((r) => {
    const mine = entries.filter((e) => e.rankId === r.id);
    const current = mine.find((e) => e.status === "ACTIVE" && e.effectiveFrom <= today) ?? null;
    return { rank: r, current, upcoming: mine.filter((e) => e.status === "ACTIVE" && e.effectiveFrom > today), pending: mine.filter((e) => e.status === "PENDING"), history: mine.filter((e) => e.status !== "PENDING").slice(0, 6) };
  });
}

export async function requestScaleEntry(actor: Actor, input: z.infer<typeof scaleSchema>, ctx: RequestContext) {
  need(actor, "hr:pay_manage");
  const rank = await prisma.rank.findUnique({ where: { id: input.rankId }, select: { id: true, code: true, isActive: true } });
  if (!rank || !rank.isActive) throw new BusinessError("Selected rank is invalid or inactive.", "VALIDATION", { rankId: "invalid" });
  const effectiveFrom = utcDay(input.effectiveFrom);
  if (effectiveFrom < MIN_PAY_DATE || effectiveFrom.getTime() > Date.now() + 5 * 366 * DAY) throw new BusinessError("The effective date is out of the accepted range.", "VALIDATION", { effectiveFrom: "out of range" });
  if (await prisma.payScaleEntry.findUnique({ where: { rankId_effectiveFrom: { rankId: rank.id, effectiveFrom } } })) throw new BusinessError("A pay scale entry already exists for this rank and date.", "CONFLICT");
  return prisma.$transaction(async (tx) => {
    const e = await tx.payScaleEntry.create({ data: { rankId: rank.id, amount: input.amount, effectiveFrom, note: nul(input.note), createdById: actor.id } });
    await logAudit({ actor, action: "HR_PAY_SCALE_REQUESTED", module: "hr", entityType: "PayScaleEntry", entityId: e.id, entityLabel: rank.code, summary: `Pay scale ${rank.code}: ${input.amount} FCFA from ${effectiveFrom.toISOString().slice(0, 10)} requested`, after: e, context: ctx }, tx);
    return e;
  });
}

async function decide<T extends { id: string; status: PayApprovalStatus; createdById?: string | null; requestedById?: string | null }>(actor: Actor, row: T | null, kind: string, input: z.infer<typeof decisionSchema>, apply: (tx: Prisma.TransactionClient, status: PayApprovalStatus) => Promise<void>, label: string, ctx: RequestContext) {
  need(actor, "hr:pay_validate");
  if (!row) throw new NotFoundError(kind);
  if (row.status !== "PENDING") throw new BusinessError("This request has already been decided.", "STATE");
  if ((row.createdById ?? row.requestedById) === actor.id) throw new BusinessError("You cannot validate a request you created (separation of duties).", "STATE");
  if (input.decision === "REJECT" && !(input.note && input.note.trim().length >= 5)) throw new BusinessError("A reason is required to reject.", "VALIDATION", { note: "required" });
  const status: PayApprovalStatus = input.decision === "APPROVE" ? "ACTIVE" : "REJECTED";
  await prisma.$transaction(async (tx) => {
    await apply(tx, status);
    await logAudit({ actor, action: `HR_PAY_${kind.toUpperCase()}_${status === "ACTIVE" ? "APPROVED" : "REJECTED"}`, module: "hr", entityType: kind, entityId: row.id, entityLabel: label, summary: `${kind} ${label} ${status === "ACTIVE" ? "validated" : "rejected"}`, after: { note: nul(input.note) }, context: ctx }, tx);
  });
}

export async function decideScaleEntry(actor: Actor, input: z.infer<typeof decisionSchema>, ctx: RequestContext) {
  const row = await prisma.payScaleEntry.findUnique({ where: { id: input.id }, include: { rank: { select: { code: true } } } });
  await decide(actor, row, "PayScaleEntry", input, async (tx, status) => {
    const u = await tx.payScaleEntry.updateMany({ where: { id: input.id, status: "PENDING" }, data: { status, validatedById: actor.id, validatedAt: new Date(), note: nul(input.note) ?? row!.note } });
    if (u.count !== 1) throw new BusinessError("The record was modified concurrently. Reload and retry.", "CONFLICT");
  }, row?.rank.code ?? "", ctx);
}

// ---------------- Components ----------------

export async function listComponents(actor: Actor, includeInactive = false) {
  need(actor, "hr:pay_view");
  return prisma.payComponent.findMany({ where: includeInactive ? {} : { isActive: true }, orderBy: [{ kind: "asc" }, { name: "asc" }] });
}

function checkComponent(i: z.infer<typeof componentSchema>) {
  if (i.calculation === "PERCENT_OF_BASE" && i.defaultValue > 100) throw new BusinessError("A percentage cannot exceed 100.", "VALIDATION", { defaultValue: "max 100" });
}

export async function createComponent(actor: Actor, input: z.infer<typeof componentSchema>, ctx: RequestContext) {
  need(actor, "hr:pay_manage");
  checkComponent(input);
  if (await prisma.payComponent.findUnique({ where: { code: input.code } })) throw new BusinessError("A pay element with this code already exists.", "CONFLICT");
  return prisma.$transaction(async (tx) => {
    const c = await tx.payComponent.create({ data: { code: input.code, name: input.name, kind: input.kind as PayComponentKind, calculation: input.calculation, defaultValue: input.defaultValue, description: nul(input.description), isActive: input.isActive } });
    await logAudit({ actor, action: "HR_PAY_COMPONENT_CREATED", module: "hr", entityType: "PayComponent", entityId: c.id, entityLabel: c.code, summary: `Pay element ${c.code} created`, after: c, context: ctx }, tx);
    return c;
  });
}

export async function updateComponent(actor: Actor, id: string, input: z.infer<typeof componentSchema>, ctx: RequestContext) {
  need(actor, "hr:pay_manage");
  checkComponent(input);
  const before = await prisma.payComponent.findUnique({ where: { id } });
  if (!before) throw new NotFoundError("Pay element");
  if (before.code !== input.code) throw new BusinessError("The code of a pay element cannot be changed.", "VALIDATION", { code: "immutable" });
  return prisma.$transaction(async (tx) => {
    const c = await tx.payComponent.update({ where: { id }, data: { name: input.name, kind: input.kind as PayComponentKind, calculation: input.calculation, defaultValue: input.defaultValue, description: nul(input.description), isActive: input.isActive } });
    await logAudit({ actor, action: "HR_PAY_COMPONENT_UPDATED", module: "hr", entityType: "PayComponent", entityId: id, entityLabel: c.code, summary: `Pay element ${c.code} updated (applies to future statements only)`, before, after: c, context: ctx }, tx);
    return c;
  });
}

// ---------------- Elements granted to officers ----------------

export type ElementFilter = { status?: PayApprovalStatus; officerId?: string; page?: number; pageSize?: number };

const elementInclude = { officer: { select: { id: true, badgeNumber: true, firstName: true, lastName: true } }, component: true, requestedBy: { select: { username: true } }, validatedBy: { select: { username: true } } } satisfies Prisma.OfficerPayElementInclude;

export async function listElements(actor: Actor, f: ElementFilter = {}, ctx?: RequestContext) {
  need(actor, "hr:pay_view");
  const page = Math.max(f.page ?? 1, 1);
  const pageSize = Math.min(f.pageSize ?? 25, 100);
  const where: Prisma.OfficerPayElementWhereInput = { ...(f.status ? { status: f.status } : {}), ...(f.officerId ? { officerId: f.officerId } : {}) };
  const [items, total] = await Promise.all([prisma.officerPayElement.findMany({ where, include: elementInclude, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }), prisma.officerPayElement.count({ where })]);
  await logAudit({ actor, action: "HR_PAY_ELEMENTS_LISTED", module: "hr", summary: `Pay elements listed (${items.length} of ${total})`, context: ctx });
  return { items, total, page, pageSize };
}

export async function requestElement(actor: Actor, input: z.infer<typeof elementSchema>, ctx: RequestContext) {
  need(actor, "hr:pay_manage");
  const o = await getOfficer(actor, input.officerId);
  const comp = await prisma.payComponent.findUnique({ where: { id: input.componentId } });
  if (!comp || !comp.isActive) throw new BusinessError("Selected pay element is invalid or inactive.", "VALIDATION", { componentId: "invalid" });
  const value = input.value ?? null;
  if (comp.calculation === "PERCENT_OF_BASE" && (value ?? comp.defaultValue) > 100) throw new BusinessError("A percentage cannot exceed 100.", "VALIDATION", { value: "max 100" });
  const startDate = utcDay(input.startDate);
  const endDate = input.endDate ? utcDay(input.endDate) : null;
  if (endDate && endDate < startDate) throw new BusinessError("The end date cannot precede the start date.", "VALIDATION", { endDate: "before the start" });
  if (startDate < MIN_PAY_DATE || startDate.getTime() > Date.now() + 366 * DAY) throw new BusinessError("The effective date is out of the accepted range.", "VALIDATION", { startDate: "out of range" });
  const overlap = await prisma.officerPayElement.findFirst({ where: { officerId: o.id, componentId: comp.id, status: { in: ["PENDING", "ACTIVE"] }, startDate: { lte: endDate ?? new Date(Date.UTC(9999, 0, 1)) }, OR: [{ endDate: null }, { endDate: { gte: startDate } }] }, select: { id: true } });
  if (overlap) throw new BusinessError("This pay element is already granted or requested for an overlapping period.", "CONFLICT");
  return prisma.$transaction(async (tx) => {
    const e = await tx.officerPayElement.create({ data: { officerId: o.id, componentId: comp.id, value, startDate, endDate, reason: input.reason, decisionRef: nul(input.decisionRef), requestedById: actor.id } });
    await logAudit({ actor, action: "HR_PAY_ELEMENT_REQUESTED", module: "hr", entityType: "Officer", entityId: o.id, entityLabel: o.badgeNumber, summary: `Pay element ${comp.code} requested for ${o.badgeNumber}`, after: e, context: ctx }, tx);
    return e;
  });
}

export async function decideElement(actor: Actor, input: z.infer<typeof decisionSchema>, ctx: RequestContext) {
  const row = await prisma.officerPayElement.findUnique({ where: { id: input.id }, include: { component: { select: { code: true } }, officer: { select: { badgeNumber: true } } } });
  await decide(actor, row, "OfficerPayElement", input, async (tx, status) => {
    const u = await tx.officerPayElement.updateMany({ where: { id: input.id, status: "PENDING" }, data: { status, validatedById: actor.id, validatedAt: new Date(), note: nul(input.note) } });
    if (u.count !== 1) throw new BusinessError("The record was modified concurrently. Reload and retry.", "CONFLICT");
  }, `${row?.component.code ?? ""} / ${row?.officer.badgeNumber ?? ""}`, ctx);
}

export async function endElement(actor: Actor, input: z.infer<typeof endElementSchema>, ctx: RequestContext) {
  need(actor, "hr:pay_manage");
  const e = await prisma.officerPayElement.findUnique({ where: { id: input.id }, include: { component: { select: { code: true } }, officer: { select: { id: true, badgeNumber: true } } } });
  if (!e) throw new NotFoundError("Pay element");
  await getOfficer(actor, e.officerId);
  if (e.status !== "ACTIVE") throw new BusinessError("Only a validated pay element can be ended.", "STATE");
  const endDate = input.endDate ? utcDay(input.endDate) : utcDay(new Date());
  if (endDate < e.startDate) throw new BusinessError("The end date cannot precede the start date.", "VALIDATION", { endDate: "before the start" });
  if (e.endDate && e.endDate <= endDate) throw new BusinessError("This pay element already ends on or before that date.", "STATE");
  await prisma.$transaction(async (tx) => {
    await tx.officerPayElement.update({ where: { id: e.id }, data: { endDate, endReason: input.reason } });
    await logAudit({ actor, action: "HR_PAY_ELEMENT_ENDED", module: "hr", entityType: "Officer", entityId: e.officer.id, entityLabel: e.officer.badgeNumber, summary: `Pay element ${e.component.code} of ${e.officer.badgeNumber} ended on ${endDate.toISOString().slice(0, 10)}`, after: { endDate, reason: input.reason }, context: ctx }, tx);
  });
}

// ---------------- Monthly statements ----------------

export async function generateRun(actor: Actor, period: string, ctx: RequestContext) {
  need(actor, "hr:pay_manage");
  if (actor.scopeLevel !== "NATIONAL") throw new BusinessError("Pay statements are generated at national level.", "STATE");
  if (!PERIOD_RE.test(period)) throw new BusinessError("The period must be YYYY-MM.", "VALIDATION", { period: "invalid" });
  const now = new Date();
  const thisMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  if (period > thisMonth) throw new BusinessError("A pay statement cannot be generated for a future month.", "VALIDATION", { period: "in the future" });
  const existing = await prisma.payRun.findUnique({ where: { period }, select: { id: true, status: true } });
  if (existing?.status === "VALIDATED") throw new BusinessError("The pay statement of this month is already validated.", "CONFLICT");
  const { start, end } = periodBounds(period);
  const settings = await getPaySettings();

  const [scaleRows, elements, excludedStatus] = await Promise.all([
    prisma.payScaleEntry.findMany({ where: { status: "ACTIVE", effectiveFrom: { lte: end } }, orderBy: { effectiveFrom: "desc" }, select: { rankId: true, amount: true } }),
    prisma.officerPayElement.findMany({ where: { status: "ACTIVE", startDate: { lte: end }, OR: [{ endDate: null }, { endDate: { gte: start } }], component: { isActive: true } }, include: { component: true } }),
    prisma.officer.count({ where: { isActive: true, deletedAt: null, administrativeStatus: { notIn: ["ACTIVE", "SUSPENDED"] } } }),
  ]);
  const scale = new Map<string, number>();
  for (const r of scaleRows) if (!scale.has(r.rankId)) scale.set(r.rankId, r.amount);
  const byOfficer = new Map<string, PayItemInput[]>();
  for (const e of elements) {
    const list = byOfficer.get(e.officerId) ?? [];
    list.push({ code: e.component.code, name: e.component.name, kind: e.component.kind, calculation: e.component.calculation, value: e.value ?? e.component.defaultValue });
    byOfficer.set(e.officerId, list);
  }

  const run = await prisma.$transaction(
    async (tx) => {
      if (existing) await tx.payRun.delete({ where: { id: existing.id } }); // a DRAFT is replaced (its lines cascade)
      const created = await tx.payRun.create({ data: { period, generatedById: actor.id, suspendedPercent: settings.suspendedPayPercent, excludedStatus } });
      let last = "";
      let officers = 0;
      let suspended = 0;
      let noScale = 0;
      let totalBase = 0;
      let totalGross = 0;
      let totalDed = 0;
      let totalNet = 0;
      for (;;) {
        const batch = await tx.officer.findMany({ where: { isActive: true, deletedAt: null, administrativeStatus: { in: ["ACTIVE", "SUSPENDED"] }, ...(last ? { id: { gt: last } } : {}) }, orderBy: { id: "asc" }, take: 2000, select: { id: true, rankId: true, stationId: true, administrativeStatus: true, station: { select: { regionId: true } } } });
        if (!batch.length) break;
        last = batch[batch.length - 1].id;
        const lines: Prisma.PayRunLineCreateManyInput[] = [];
        for (const o of batch) {
          const base = scale.get(o.rankId);
          if (base === undefined) {
            noScale++;
            continue;
          }
          const isSuspended = o.administrativeStatus === "SUSPENDED";
          const r = computePay({ base, items: byOfficer.get(o.id) ?? [], suspended: isSuspended, suspendedPercent: settings.suspendedPayPercent });
          lines.push({ runId: created.id, officerId: o.id, rankId: o.rankId, stationId: o.stationId, regionId: o.station.regionId, status: o.administrativeStatus, base: r.base, gross: r.gross, deductions: r.deductions, net: r.net, detail: { items: r.items, benefits: r.benefits, suspended: r.suspended, deductionsCapped: r.deductionsCapped } as unknown as Prisma.InputJsonValue });
          officers++;
          if (isSuspended) suspended++;
          totalBase += r.base;
          totalGross += r.gross;
          totalDed += r.deductions;
          totalNet += r.net;
        }
        if (lines.length) await tx.payRunLine.createMany({ data: lines });
      }
      const done = await tx.payRun.update({ where: { id: created.id }, data: { officers, suspendedCount: suspended, excludedNoScale: noScale, totalBase: BigInt(totalBase), totalGross: BigInt(totalGross), totalDeductions: BigInt(totalDed), totalNet: BigInt(totalNet) } });
      await logAudit({ actor, action: "HR_PAY_RUN_GENERATED", module: "hr", entityType: "PayRun", entityId: created.id, entityLabel: period, summary: `Pay statement ${period} generated: ${officers} officer(s), ${noScale} without pay scale, ${excludedStatus} excluded by status`, after: { officers, noScale, suspended, totalNet }, context: ctx }, tx);
      return done;
    },
    { timeout: 300_000, maxWait: 30_000 },
  );
  return serializeRun(run);
}

type RunRow = { id: string; period: string; status: "DRAFT" | "VALIDATED"; officers: number; suspendedCount: number; excludedNoScale: number; excludedStatus: number; totalBase: bigint; totalGross: bigint; totalDeductions: bigint; totalNet: bigint; suspendedPercent: number; exportedAt: Date | null; exportCount: number; validatedAt: Date | null; createdAt: Date; generatedById: string | null; validatedById: string | null };
function serializeRun(r: RunRow) {
  return { id: r.id, period: r.period, status: r.status, officers: r.officers, suspendedCount: r.suspendedCount, excludedNoScale: r.excludedNoScale, excludedStatus: r.excludedStatus, totalBase: num(r.totalBase), totalGross: num(r.totalGross), totalDeductions: num(r.totalDeductions), totalNet: num(r.totalNet), suspendedPercent: r.suspendedPercent, exportedAt: r.exportedAt, exportCount: r.exportCount, validatedAt: r.validatedAt, createdAt: r.createdAt, generatedById: r.generatedById, validatedById: r.validatedById };
}

export async function listRuns(actor: Actor) {
  need(actor, "hr:pay_view");
  const runs = await prisma.payRun.findMany({ orderBy: { period: "desc" }, take: 36, include: { generatedBy: { select: { username: true } }, validatedBy: { select: { username: true } } } });
  return runs.map((r) => ({ ...serializeRun(r), generatedBy: r.generatedBy?.username ?? null, validatedBy: r.validatedBy?.username ?? null }));
}

export async function getRun(actor: Actor, id: string, ctx?: RequestContext) {
  need(actor, "hr:pay_view");
  const r = await prisma.payRun.findUnique({ where: { id }, include: { generatedBy: { select: { username: true } }, validatedBy: { select: { username: true } } } });
  if (!r) throw new NotFoundError("Pay statement");
  const [byRank, byRegion] = await Promise.all([
    prisma.payRunLine.groupBy({ by: ["rankId"], where: { runId: id }, _count: { _all: true }, _sum: { gross: true, net: true } }),
    prisma.payRunLine.groupBy({ by: ["regionId"], where: { runId: id }, _count: { _all: true }, _sum: { gross: true, net: true } }),
  ]);
  const [ranks, regions] = await Promise.all([prisma.rank.findMany({ select: { id: true, name: true, level: true } }), prisma.region.findMany({ select: { id: true, name: true } })]);
  const rn = new Map(ranks.map((x) => [x.id, x]));
  const gn = new Map(regions.map((x) => [x.id, x.name]));
  await logAudit({ actor, action: "HR_PAY_RUN_VIEWED", module: "hr", entityType: "PayRun", entityId: id, entityLabel: r.period, summary: `Pay statement ${r.period} viewed`, context: ctx });
  return {
    ...serializeRun(r),
    generatedBy: r.generatedBy?.username ?? null,
    validatedBy: r.validatedBy?.username ?? null,
    byRank: byRank.map((g) => ({ name: rn.get(g.rankId)?.name ?? "—", level: rn.get(g.rankId)?.level ?? 0, officers: g._count._all, gross: g._sum.gross ?? 0, net: g._sum.net ?? 0 })).sort((a, b) => b.level - a.level),
    byRegion: byRegion.map((g) => ({ name: gn.get(g.regionId) ?? "—", officers: g._count._all, gross: g._sum.gross ?? 0, net: g._sum.net ?? 0 })).sort((a, b) => b.net - a.net),
  };
}

export async function validateRun(actor: Actor, id: string, ctx: RequestContext) {
  need(actor, "hr:pay_validate");
  const r = await prisma.payRun.findUnique({ where: { id } });
  if (!r) throw new NotFoundError("Pay statement");
  if (r.status !== "DRAFT") throw new BusinessError("This pay statement is already validated.", "STATE");
  if (r.generatedById === actor.id) throw new BusinessError("You cannot validate a statement you generated (separation of duties).", "STATE");
  if (r.officers === 0) throw new BusinessError("An empty pay statement cannot be validated: define the pay scale of the ranks first.", "STATE");
  await prisma.$transaction(async (tx) => {
    const u = await tx.payRun.updateMany({ where: { id, status: "DRAFT" }, data: { status: "VALIDATED", validatedById: actor.id, validatedAt: new Date() } });
    if (u.count !== 1) throw new BusinessError("The record was modified concurrently. Reload and retry.", "CONFLICT");
    await logAudit({ actor, action: "HR_PAY_RUN_VALIDATED", module: "hr", entityType: "PayRun", entityId: id, entityLabel: r.period, summary: `Pay statement ${r.period} validated (${r.officers} officers, net ${num(r.totalNet)} FCFA)`, context: ctx }, tx);
  });
}

export async function runLines(actor: Actor, runId: string, f: { q?: string; rankId?: string; regionId?: string; page?: number; pageSize?: number } = {}, ctx?: RequestContext) {
  need(actor, "hr:pay_view");
  const page = Math.max(f.page ?? 1, 1);
  const pageSize = Math.min(f.pageSize ?? 50, 200);
  const where: Prisma.PayRunLineWhereInput = { runId, ...(f.rankId ? { rankId: f.rankId } : {}), ...(f.regionId ? { regionId: f.regionId } : {}), ...(f.q ? { officer: { OR: [{ badgeNumber: { contains: f.q, mode: "insensitive" } }, { lastName: { contains: f.q, mode: "insensitive" } }] } } : {}) };
  const [items, total] = await Promise.all([prisma.payRunLine.findMany({ where, orderBy: { officer: { lastName: "asc" } }, skip: (page - 1) * pageSize, take: pageSize, include: { officer: { select: { id: true, badgeNumber: true, firstName: true, lastName: true } } } }), prisma.payRunLine.count({ where })]);
  await logAudit({ actor, action: "HR_PAY_LINES_VIEWED", module: "hr", entityType: "PayRun", entityId: runId, summary: `Pay lines viewed (${items.length} of ${total})`, context: ctx });
  return { items, total, page, pageSize };
}

const csvEsc = (v: string | number) => {
  const t = String(v);
  const safe = /^[=+\-@\t\r]/.test(t) ? `'${t}` : t;
  return /[",\n;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/** CSV for the financial services. Only a VALIDATED statement can be exported; each export is counted and audited. */
export async function exportRun(actor: Actor, id: string, ctx: RequestContext) {
  need(actor, "hr:pay_export");
  const r = await prisma.payRun.findUnique({ where: { id } });
  if (!r) throw new NotFoundError("Pay statement");
  if (r.status !== "VALIDATED") throw new BusinessError("Only a validated pay statement can be exported.", "STATE");
  const rows: string[] = ["period,badgeNumber,lastName,firstName,rank,structure,status,base,bonuses,allowances,gross,deductions,net,benefitsValue"];
  let last = "";
  let count = 0;
  for (;;) {
    const lines = await prisma.payRunLine.findMany({ where: { runId: id, ...(last ? { id: { gt: last } } : {}) }, orderBy: { id: "asc" }, take: 2000, include: { officer: { select: { badgeNumber: true, firstName: true, lastName: true } } } });
    if (!lines.length) break;
    last = lines[lines.length - 1].id;
    const [ranks, stations] = await Promise.all([prisma.rank.findMany({ where: { id: { in: [...new Set(lines.map((l) => l.rankId))] } }, select: { id: true, name: true } }), prisma.station.findMany({ where: { id: { in: [...new Set(lines.map((l) => l.stationId))] } }, select: { id: true, code: true } })]);
    const rn = new Map(ranks.map((x) => [x.id, x.name]));
    const sn = new Map(stations.map((x) => [x.id, x.code]));
    for (const l of lines) {
      const d = l.detail as unknown as { items: { kind: string; amount: number }[]; benefits: number };
      const sum = (k: string) => d.items.filter((i) => i.kind === k).reduce((a, i) => a + i.amount, 0);
      rows.push([r.period, l.officer.badgeNumber, l.officer.lastName, l.officer.firstName, rn.get(l.rankId) ?? "", sn.get(l.stationId) ?? "", l.status, l.base, sum("BONUS"), sum("ALLOWANCE"), l.gross, l.deductions, l.net, d.benefits].map(csvEsc).join(","));
      count++;
    }
  }
  await prisma.$transaction(async (tx) => {
    await tx.payRun.update({ where: { id }, data: { exportedAt: new Date(), exportCount: { increment: 1 } } });
    await logAudit({ actor, action: "HR_PAY_RUN_EXPORTED", module: "hr", entityType: "PayRun", entityId: id, entityLabel: r.period, summary: `Pay statement ${r.period} exported (${count} lines, net ${num(r.totalNet)} FCFA)`, after: { lines: count }, context: ctx }, tx);
  });
  return { csv: "﻿" + rows.join("\n") + "\n", period: r.period, lines: count };
}

// ---------------- Officer view and self-service ----------------

/** Pay situation of one officer: elements granted and validated statement lines. Reading is audited. */
export async function officerPay(actor: Actor, officerId: string, ctx?: RequestContext) {
  need(actor, "hr:pay_view");
  const o = await getOfficer(actor, officerId);
  const [elements, lines, rank] = await Promise.all([
    prisma.officerPayElement.findMany({ where: { officerId }, include: { component: true, requestedBy: { select: { username: true } }, validatedBy: { select: { username: true } } }, orderBy: { startDate: "desc" } }),
    prisma.payRunLine.findMany({ where: { officerId, run: { status: "VALIDATED" } }, include: { run: { select: { period: true } } }, orderBy: { run: { period: "desc" } }, take: 12 }),
    prisma.officer.findUniqueOrThrow({ where: { id: officerId }, select: { rankId: true } }),
  ]);
  const scale = await prisma.payScaleEntry.findFirst({ where: { rankId: rank.rankId, status: "ACTIVE", effectiveFrom: { lte: new Date() } }, orderBy: { effectiveFrom: "desc" } });
  await logAudit({ actor, action: "HR_PAY_OFFICER_VIEWED", module: "hr", entityType: "Officer", entityId: officerId, entityLabel: o.badgeNumber, summary: `Pay situation of ${o.badgeNumber} viewed`, context: ctx });
  return { baseSalary: scale?.amount ?? null, elements, lines };
}

/** Self-service: an officer sees their own validated pay lines (no permission needed, nothing else is reachable). */
export async function myPay(actor: Actor) {
  if (!actor.officerId) return [];
  return prisma.payRunLine.findMany({ where: { officerId: actor.officerId, run: { status: "VALIDATED" } }, include: { run: { select: { period: true } } }, orderBy: { run: { period: "desc" } }, take: 12 });
}

export async function paySummary(actor: Actor) {
  need(actor, "hr:pay_view");
  const [runs, pendingElements, pendingScale, components] = await Promise.all([listRuns(actor), prisma.officerPayElement.count({ where: { status: "PENDING" } }), prisma.payScaleEntry.count({ where: { status: "PENDING" } }), prisma.payComponent.count({ where: { isActive: true } })]);
  return { runs: runs.slice(0, 12), pendingElements, pendingScale, components };
}
