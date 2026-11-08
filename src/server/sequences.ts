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
  ALERT: { prefix: "ALR", width: 6 },
  BIOCONTROL: { prefix: "BCT", width: 6 },
  PUBLIC: { prefix: "PUB", width: 6 },
  INCIDENT: { prefix: "INC", width: 5 },
  PATROL: { prefix: "PTL", width: 5 },
  OPERATION: { prefix: "OPS", width: 5 },
  GENERATED: { prefix: "GEN", width: 5 },
  BIOMETRIC: { prefix: "BIO", width: 6 },
  FINGERPRINT: { prefix: "FPR", width: 5 },
  FACE: { prefix: "FCR", width: 5 },
  VOICE: { prefix: "VCR", width: 5 },
  LPR: { prefix: "LPD", width: 5 },
  TRAFFIC_CONTROL: { prefix: "CTL", width: 5 },
  TRAFFIC_TICKET: { prefix: "PV", width: 6 },
  TRAFFIC_FINE: { prefix: "AMD", width: 6 },
  TRAFFIC_PAYMENT: { prefix: "PAY", width: 6 },
  TRAFFIC_RECEIPT: { prefix: "REC", width: 6 },
  TRANSFER: { prefix: "MUT", width: 5 },
  LEAVE: { prefix: "CNG", width: 5 },
  DISCIPLINE: { prefix: "DIS", width: 5 },
  DISCIPLINE_DECISION: { prefix: "DDI", width: 5 },
  HR_DOCUMENT: { prefix: "DRH", width: 6 },
  TRAINING_CERT: { prefix: "ATT", width: 5 },
  TRANSFER_DECISION: { prefix: "DAF", width: 5 },
  CASH_REGISTER: { prefix: "CSH", width: 6 },
  CASH_CLOSURE: { prefix: "CLO", width: 6 },
  CASH_COLLECTION: { prefix: "REV", width: 6 },
  CASH_DEPOSIT: { prefix: "VRS", width: 6 },
  CASH_SLIP: { prefix: "BRD", width: 6 },
  CASH_RECONCILIATION: { prefix: "RAP", width: 6 },
  CASH_DISCREPANCY: { prefix: "ECA", width: 6 },
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
