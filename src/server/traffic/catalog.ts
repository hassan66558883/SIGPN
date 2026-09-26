/**
 * Offence catalogue: idempotent import of the official table (see data/violations-source.ts) and an
 * integrity check comparing the database with the source. Reference data — not demo data — so it is
 * imported by the seed AND by `npm run traffic:import` (production).
 *
 * The source is the authority: names, classes, legal texts and amounts are rewritten from it on every
 * run; the only locally managed attribute is `isActive` (an administrator may deactivate an offence).
 */
import { prisma, type Db } from "@/server/db";
import { TRAFFIC_CATEGORIES_SOURCE, TRAFFIC_VIOLATIONS_SOURCE } from "@/server/traffic/data/violations-source";

export type CatalogSyncResult = { categories: number; references: number; violations: number; created: number; updated: number };

export async function syncTrafficCatalog(db: Db = prisma): Promise<CatalogSyncResult> {
  const categoryIds = new Map<string, string>();
  for (const c of TRAFFIC_CATEGORIES_SOURCE) {
    const row = await db.trafficViolationCategory.upsert({ where: { code: c.code }, update: { name: c.name, sourceHeading: c.sourceHeading, sortOrder: c.sortOrder }, create: { code: c.code, name: c.name, sourceHeading: c.sourceHeading, sortOrder: c.sortOrder } });
    categoryIds.set(c.code, row.id);
  }

  const referenceIds = new Map<string, string>();
  for (const ref of new Set(TRAFFIC_VIOLATIONS_SOURCE.map((v) => v.reference))) {
    const row = await db.trafficLegalReference.upsert({ where: { reference: ref }, update: {}, create: { reference: ref } });
    referenceIds.set(ref, row.id);
  }

  let created = 0;
  let updated = 0;
  for (const v of TRAFFIC_VIOLATIONS_SOURCE) {
    const data = {
      categoryId: categoryIds.get(v.category)!,
      legalReferenceId: referenceIds.get(v.reference)!,
      name: v.name,
      offenceClass: v.offenceClass,
      classText: v.classText,
      fineAmountFcfa: v.amountFcfa,
      fineAmountText: v.amountText,
      isFineEligible: v.amountFcfa !== null,
      sourcePage: v.page,
      sourceOrder: v.order,
      sourceNote: v.sourceNote,
    };
    const existing = await db.trafficViolation.findUnique({ where: { code: v.code }, select: { id: true } });
    if (existing) {
      await db.trafficViolation.update({ where: { code: v.code }, data });
      updated++;
    } else {
      await db.trafficViolation.create({ data: { code: v.code, ...data } });
      created++;
    }
  }
  return { categories: categoryIds.size, references: referenceIds.size, violations: TRAFFIC_VIOLATIONS_SOURCE.length, created, updated };
}

/** Compares the database catalogue with the source table. Returns a list of discrepancies (empty = faithful). */
export async function verifyTrafficCatalog(db: Db = prisma): Promise<string[]> {
  const problems: string[] = [];
  const rows = await db.trafficViolation.findMany({ include: { legalReference: true, category: true } });
  const byCode = new Map(rows.map((r) => [r.code, r]));
  if (rows.length !== TRAFFIC_VIOLATIONS_SOURCE.length) problems.push(`count: database has ${rows.length}, source has ${TRAFFIC_VIOLATIONS_SOURCE.length}`);
  for (const v of TRAFFIC_VIOLATIONS_SOURCE) {
    const r = byCode.get(v.code);
    if (!r) {
      problems.push(`${v.code}: missing`);
      continue;
    }
    if (r.name !== v.name) problems.push(`${v.code}: name differs`);
    if (r.classText !== v.classText || r.offenceClass !== v.offenceClass) problems.push(`${v.code}: class differs`);
    if (r.legalReference.reference !== v.reference) problems.push(`${v.code}: legal reference differs`);
    if (r.fineAmountFcfa !== v.amountFcfa || r.fineAmountText !== v.amountText) problems.push(`${v.code}: amount differs`);
    if (r.category.code !== v.category) problems.push(`${v.code}: category differs`);
  }
  return problems;
}
