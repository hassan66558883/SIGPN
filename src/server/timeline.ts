import { prisma, type Db } from "@/server/db";

export type CaseEventKind =
  | "CASE_CREATED"
  | "CONVERTED_FROM_COMPLAINT"
  | "ASSIGNED"
  | "STATUS"
  | "PARTY_ADDED"
  | "PARTY_UPDATED"
  | "NOTE"
  | "TASK"
  | "INVESTIGATION"
  | "STATEMENT"
  | "INTERVIEW"
  | "EVIDENCE"
  | "CUSTODY"
  | "WARRANT"
  | "ARREST"
  | "DOCUMENT"
  | "REPORT"
  | "REVIEW"
  | "DISPOSITION";

/** Appends an entry to a case timeline (CaseEvent). Call inside the caller's transaction. */
export async function addCaseEvent(
  input: { caseId: string; kind: CaseEventKind; title: string; description?: string | null; actorId?: string | null; entityType?: string; entityId?: string; occurredAt?: Date },
  db: Db = prisma,
) {
  return db.caseEvent.create({
    data: {
      caseId: input.caseId,
      kind: input.kind,
      title: input.title.slice(0, 200),
      description: input.description?.slice(0, 2000) ?? null,
      actorId: input.actorId ?? null,
      entityType: input.entityType,
      entityId: input.entityId,
      occurredAt: input.occurredAt ?? new Date(),
    },
  });
}
