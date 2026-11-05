import "server-only";
import { z } from "zod";
import type { TrainingStatus } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { logAudit } from "@/server/audit";
import { BusinessError, NotFoundError } from "@/server/errors";
import type { Actor } from "@/server/auth/dal";
import type { RequestContext } from "@/server/request-context";
import { optionalDate, optionalText } from "@/server/action-utils";
import { getOfficer } from "@/server/org/service";

const nul = (v: string | undefined | null) => (v ? v : null);

// ---------------- Positions (fonctions) ----------------

export const positionSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(16)
    .regex(/^[A-Z0-9][A-Z0-9_-]*$/i)
    .transform((s) => s.toUpperCase()),
  name: z.string().trim().min(2).max(100),
  description: optionalText(300),
  isActive: z.preprocess((v) => v === "on" || v === "true" || v === "1" || v === true, z.boolean()).default(true),
});
export type PositionInput = z.infer<typeof positionSchema>;

export async function listPositions() {
  return prisma.position.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { officers: true } } } });
}

export async function createPosition(actor: Actor, input: PositionInput, ctx: RequestContext) {
  if (actor.scopeLevel !== "NATIONAL") throw new BusinessError("Only national administrators can manage positions.", "STATE");
  if (await prisma.position.findUnique({ where: { code: input.code } })) throw new BusinessError("A position with this code already exists.", "CONFLICT");
  const p = await prisma.position.create({ data: { code: input.code, name: input.name, description: nul(input.description), isActive: input.isActive } });
  await logAudit({ actor, action: "POSITION_CREATED", module: "org", entityType: "Position", entityId: p.id, entityLabel: p.code, summary: `Position ${p.code} — ${p.name} created`, after: p, context: ctx });
  return p;
}

export async function updatePosition(actor: Actor, id: string, input: PositionInput, ctx: RequestContext) {
  if (actor.scopeLevel !== "NATIONAL") throw new BusinessError("Only national administrators can manage positions.", "STATE");
  const before = await prisma.position.findUnique({ where: { id } });
  if (!before) throw new NotFoundError("Position");
  if (input.code !== before.code && (await prisma.position.findUnique({ where: { code: input.code } }))) throw new BusinessError("A position with this code already exists.", "CONFLICT");
  const after = await prisma.position.update({ where: { id }, data: { code: input.code, name: input.name, description: nul(input.description), isActive: input.isActive } });
  await logAudit({ actor, action: "POSITION_UPDATED", module: "org", entityType: "Position", entityId: id, entityLabel: after.code, summary: `Position ${after.code} updated`, before, after, context: ctx });
  return after;
}

/** Sets the current position (fonction) of an officer; recorded on the current assignment too. */
export async function setOfficerPosition(actor: Actor, officerId: string, positionId: string | null, ctx: RequestContext) {
  const o = await getOfficer(actor, officerId);
  let label: string | null = null;
  if (positionId) {
    const p = await prisma.position.findUnique({ where: { id: positionId }, select: { name: true, isActive: true } });
    if (!p || !p.isActive) throw new BusinessError("Selected position is invalid or inactive.");
    label = p.name;
  }
  await prisma.$transaction(async (tx) => {
    await tx.officer.update({ where: { id: officerId }, data: { positionId } });
    await tx.officerAssignment.updateMany({ where: { officerId, endDate: null }, data: { positionId, position: label } });
    await logAudit({ actor, action: "OFFICER_POSITION_CHANGED", module: "officers", entityType: "Officer", entityId: officerId, entityLabel: o.badgeNumber, summary: `Officer ${o.badgeNumber} position → ${label ?? "none"}`, before: { positionId: o.positionId }, after: { positionId, position: label }, context: ctx }, tx);
  });
}

// ---------------- Trainings ----------------

export const trainingSchema = z.object({
  officerId: z.string().min(1),
  kind: z.enum(["INITIAL", "CONTINUING", "INTERNSHIP", "SPECIALIZED"]).default("CONTINUING"),
  title: z.string().trim().min(2).max(200),
  provider: optionalText(120),
  category: optionalText(60),
  startDate: z
    .string()
    .trim()
    .min(1, "start date is required")
    .transform((s) => new Date(s))
    .refine((d) => !Number.isNaN(d.getTime()), "invalid date"),
  endDate: optionalDate,
  status: z.enum(["PLANNED", "IN_PROGRESS", "COMPLETED", "FAILED", "CANCELLED"]).default("PLANNED"),
  result: optionalText(200),
  certificateNo: optionalText(60),
  expiresAt: optionalDate,
  notes: optionalText(1000),
});
export type TrainingInput = z.infer<typeof trainingSchema>;

export async function listTrainings(officerId: string) {
  return prisma.training.findMany({ where: { officerId }, orderBy: { startDate: "desc" }, include: { recordedBy: { select: { username: true } } } });
}

export async function createTraining(actor: Actor, input: TrainingInput, ctx: RequestContext) {
  const o = await getOfficer(actor, input.officerId);
  if (input.endDate && input.endDate < input.startDate) throw new BusinessError("End date cannot precede the start date.");
  const t = await prisma.training.create({
    data: { officerId: o.id, kind: input.kind, title: input.title, provider: nul(input.provider), category: nul(input.category), startDate: input.startDate, endDate: input.endDate, status: input.status as TrainingStatus, result: nul(input.result), certificateNo: nul(input.certificateNo), expiresAt: input.expiresAt, notes: nul(input.notes), recordedById: actor.id },
  });
  await logAudit({ actor, action: "TRAINING_RECORDED", module: "officers", entityType: "Training", entityId: t.id, entityLabel: `${o.badgeNumber} · ${t.title}`, summary: `Training "${t.title}" (${t.status}) recorded for ${o.badgeNumber}`, after: t, context: ctx });
  return t;
}

export async function updateTrainingStatus(actor: Actor, trainingId: string, status: TrainingStatus, result: string | undefined, ctx: RequestContext) {
  const before = await prisma.training.findUnique({ where: { id: trainingId }, include: { officer: { select: { id: true, badgeNumber: true } } } });
  if (!before) throw new NotFoundError("Training");
  await getOfficer(actor, before.officerId); // scope check
  const after = await prisma.training.update({ where: { id: trainingId }, data: { status, result: nul(result) ?? before.result, endDate: status === "COMPLETED" || status === "FAILED" ? before.endDate ?? new Date() : before.endDate } });
  await logAudit({ actor, action: "TRAINING_UPDATED", module: "officers", entityType: "Training", entityId: trainingId, entityLabel: `${before.officer.badgeNumber} · ${before.title}`, summary: `Training "${before.title}": ${before.status} → ${status}`, before: { status: before.status }, after: { status, result: after.result }, context: ctx });
  return after;
}
