import { prisma, type Db } from "@/server/db";

export const SEQUENCES = {
  PERSON: { prefix: "PID", width: 6 },
  COMPLAINT: { prefix: "CMP", width: 5 },
  CASE: { prefix: "CASE", width: 5 },
  INVESTIGATION: { prefix: "INV", width: 5 },
  REPORT: { prefix: "RPT", width: 5 },
  STATEMENT: { prefix: "STM", width: 5 },
  INTERVIEW: { prefix: "ITV", width: 5 },
  EVIDENCE: { prefix: "EVD", width: 5 },
  WARRANT: { prefix: "WRT", width: 5 },
  ARREST: { prefix: "ARR", width: 5 },
  DETENTION: { prefix: "DET", width: 5 },
  WANTED: { prefix: "WNT", width: 5 },
  INCIDENT: { prefix: "INC", width: 5 },
  PATROL: { prefix: "PTL", width: 5 },
  OPERATION: { prefix: "OPS", width: 5 },
  GENERATED: { prefix: "GEN", width: 5 },
} as const;
export type SequenceKey = keyof typeof SEQUENCES;

/** Atomic yearly numbering: CASE-2026-00021. Must be called inside the caller's transaction. */
export async function nextNumber(key: SequenceKey, db: Db = prisma, now = new Date()): Promise<string> {
  const def = SEQUENCES[key];
  const year = now.getFullYear();
  const rowKey = `${key}-${year}`;
  await db.documentSequence.upsert({ where: { key: rowKey }, update: {}, create: { key: rowKey, prefix: def.prefix, width: def.width, next: 1 } });
  const row = await db.documentSequence.update({ where: { key: rowKey }, data: { next: { increment: 1 } } });
  return `${row.prefix}-${year}-${String(row.next - 1).padStart(row.width, "0")}`;
}
