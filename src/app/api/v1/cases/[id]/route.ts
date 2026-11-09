import { z } from "zod";
import type { CaseDisposition, CaseStatus, PartyStatus, TaskStatus } from "@/generated/prisma/client";
import { apiError, apiOk, parseJson, withApi } from "@/server/api";
import * as svc from "@/server/cases/service";
import { caseTasks, caseTimeline } from "@/server/cases/queries";
import { caseAssignSchema, noteSchema, partySchema, taskSchema } from "@/server/cases/schemas";

type P = { id: string };

/** GET /api/v1/cases/{id} — case with team, parties, counts, timeline and tasks (404 outside scope / sensitive rule). */
export const GET = withApi<P>({ permission: "cases:view" }, async ({ actor, ctx, params }) => {
  const k = await svc.viewCase(actor, params.id, ctx);
  const [timeline, tasks] = await Promise.all([caseTimeline(k.id, 100), caseTasks(k.id)]);
  return apiOk({ ...k, timeline, tasks });
});

const opSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("assign") }).merge(caseAssignSchema.omit({ caseId: true })),
  z.object({ op: z.literal("addParty") }).merge(partySchema.omit({ caseId: true })),
  z.object({ op: z.literal("partyStatus"), partyId: z.string().min(1), status: z.enum(["ACTIVE", "UNDER_INVESTIGATION", "CLEARED", "CHARGED", "REFERRED", "WITHDRAWN"]), notes: z.string().max(500).optional() }),
  z.object({ op: z.literal("note") }).merge(noteSchema.omit({ caseId: true })),
  z.object({ op: z.literal("task") }).merge(taskSchema.omit({ caseId: true })),
  z.object({ op: z.literal("taskStatus"), taskId: z.string().min(1), status: z.enum(["TODO", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"]), result: z.string().max(2000).optional() }),
  z.object({ op: z.literal("status"), status: z.enum(["UNDER_INVESTIGATION", "PENDING_REVIEW", "REFERRED", "CLOSED", "ARCHIVED"]), disposition: z.enum(["SOLVED", "UNSOLVED", "UNFOUNDED", "REFERRED_TO_PROSECUTION", "TRANSFERRED", "DISMISSED"]).optional(), notes: z.string().max(2000).optional() }),
]);

/** PATCH /api/v1/cases/{id} — case operations; assign requires cases:assign, others cases:update (+ team membership / supervisor rules in the service). */
export const PATCH = withApi<P>({ permission: "cases:view" }, async ({ actor, ctx, params, req }) => {
  const body = await parseJson(req, opSchema);
  const need = (perm: string) => (actor.permissions.has(perm) ? null : apiError(403, "FORBIDDEN", `${perm} required.`));
  if (body.op === "assign") {
    const d = need("cases:assign");
    if (d) return d;
    const { op: _op, ...rest } = body;
    void _op;
    await svc.assignToCase(actor, { caseId: params.id, ...rest }, ctx);
  } else {
    const d = need("cases:update");
    if (d) return d;
    switch (body.op) {
      case "addParty": {
        const { op: _op, ...rest } = body;
        void _op;
        await svc.addParty(actor, { caseId: params.id, ...rest }, ctx);
        break;
      }
      case "partyStatus":
        await svc.setPartyStatus(actor, body.partyId, body.status as PartyStatus, body.notes, ctx);
        break;
      case "note": {
        const { op: _op, ...rest } = body;
        void _op;
        await svc.addNote(actor, { caseId: params.id, ...rest }, ctx);
        break;
      }
      case "task": {
        const { op: _op, ...rest } = body;
        void _op;
        await svc.createTask(actor, { caseId: params.id, ...rest }, ctx);
        break;
      }
      case "taskStatus":
        await svc.setTaskStatus(actor, body.taskId, body.status as TaskStatus, body.result, ctx);
        break;
      case "status":
        await svc.changeCaseStatus(actor, params.id, body.status as CaseStatus, (body.disposition ?? null) as CaseDisposition | null, body.notes, ctx);
        break;
    }
  }
  return apiOk(await svc.getCase(actor, params.id));
});
