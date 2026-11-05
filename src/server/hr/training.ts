import "server-only";
import { z } from "zod";
import type { Prisma, TrainingKind, TrainingStatus } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { logAudit } from "@/server/audit";
import { AuthError, BusinessError, NotFoundError } from "@/server/errors";
import { scopeWhere, type Actor } from "@/server/auth/dal";
import type { RequestContext } from "@/server/request-context";
import { getOfficer } from "@/server/org/service";
import { nextNumber } from "@/server/sequences";
import { optionalText } from "@/server/action-utils";

export const TRAINING_KINDS = ["INITIAL", "CONTINUING", "INTERNSHIP", "SPECIALIZED"] as const;
export const TRAINING_STATUSES = ["PLANNED", "IN_PROGRESS", "COMPLETED", "FAILED", "CANCELLED"] as const;

export const evaluationSchema = z.object({
  trainingId: z.string().min(1),
  passed: z.boolean(),
  score: z.number().min(0).max(20).optional(),
  result: optionalText(200),
  /** Competences granted when the trainee passes. */
  skills: z.array(z.object({ skillId: z.string().min(1), level: z.number().int().min(1).max(5), validMonths: z.number().int().min(1).max(240).optional() })).max(10).default([]),
});
export type EvaluationInput = z.infer<typeof evaluationSchema>;

function needManage(actor: Actor) {
  if (!actor.permissions.has("hr:training_manage")) throw new AuthError("forbidden", "Permission hr:training_manage required");
}

const include = { officer: { select: { id: true, badgeNumber: true, firstName: true, lastName: true, rank: { select: { name: true } }, station: { select: { name: true } } } } } satisfies Prisma.TrainingInclude;

export async function getTraining(actor: Actor, id: string) {
  const t = await prisma.training.findUnique({ where: { id }, include });
  if (!t) throw new NotFoundError("Training");
  await getOfficer(actor, t.officerId); // scope
  return t;
}
export type TrainingView = Awaited<ReturnType<typeof getTraining>>;

export type TrainingFilter = { kind?: TrainingKind; status?: TrainingStatus; q?: string; expiringDays?: number; page?: number; pageSize?: number };

export async function listTrainings(actor: Actor, f: TrainingFilter = {}) {
  if (!actor.permissions.has("hr:view")) throw new AuthError("forbidden", "Permission hr:view required");
  const page = Math.max(f.page ?? 1, 1);
  const pageSize = Math.min(f.pageSize ?? 25, 100);
  const now = new Date();
  const where: Prisma.TrainingWhereInput = {
    AND: [
      { officer: { deletedAt: null, ...(scopeWhere(actor, { via: "station" }) as Prisma.OfficerWhereInput) } },
      f.kind ? { kind: f.kind } : {},
      f.status ? { status: f.status } : {},
      f.expiringDays ? { expiresAt: { gte: now, lte: new Date(now.getTime() + f.expiringDays * 86_400_000) } } : {},
      f.q ? { OR: [{ title: { contains: f.q, mode: "insensitive" } }, { certificateNo: { contains: f.q, mode: "insensitive" } }, { officer: { OR: [{ badgeNumber: { contains: f.q, mode: "insensitive" } }, { lastName: { contains: f.q, mode: "insensitive" } }] } }] } : {},
    ],
  };
  const [items, total] = await Promise.all([prisma.training.findMany({ where, include, orderBy: { startDate: "desc" }, skip: (page - 1) * pageSize, take: pageSize }), prisma.training.count({ where })]);
  return { items, total, page, pageSize };
}

export async function trainingStats(actor: Actor) {
  const officerScope = { officer: { deletedAt: null, ...(scopeWhere(actor, { via: "station" }) as Prisma.OfficerWhereInput) } };
  const now = new Date();
  const [byKind, byStatus, expiring] = await Promise.all([
    prisma.training.groupBy({ by: ["kind"], where: officerScope, _count: { _all: true } }),
    prisma.training.groupBy({ by: ["status"], where: officerScope, _count: { _all: true } }),
    prisma.training.count({ where: { ...officerScope, expiresAt: { gte: now, lte: new Date(now.getTime() + 90 * 86_400_000) } } }),
  ]);
  return { byKind: byKind.map((g) => ({ key: g.kind, n: g._count._all })), byStatus: byStatus.map((g) => ({ key: g.status, n: g._count._all })), expiring };
}

export async function officerCompetences(actor: Actor, officerId: string) {
  await getOfficer(actor, officerId);
  const [trainings, skills] = await Promise.all([
    prisma.training.findMany({ where: { officerId }, orderBy: { startDate: "desc" } }),
    prisma.officerSkill.findMany({ where: { officerId }, include: { skill: true }, orderBy: { acquiredAt: "desc" } }),
  ]);
  return { trainings, skills };
}

export async function listSkills() {
  return prisma.skill.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
}

export async function createSkill(actor: Actor, input: { code: string; name: string }, ctx: RequestContext) {
  needManage(actor);
  const code = input.code.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{2,12}$/.test(code)) throw new BusinessError("The code must be 2 to 12 letters or digits.", "VALIDATION", { code: "invalid" });
  if (await prisma.skill.findUnique({ where: { code } })) throw new BusinessError("A competence with this code already exists.", "CONFLICT");
  const s = await prisma.skill.create({ data: { code, name: input.name.trim() } });
  await logAudit({ actor, action: "HR_SKILL_CREATED", module: "hr", entityType: "Skill", entityId: s.id, entityLabel: code, summary: `Competence ${code} created`, after: s, context: ctx });
  return s;
}

/**
 * Evaluation closes the training (COMPLETED when passed, FAILED otherwise) and is final: a correction needs an administrator.
 * Competences are granted only on success, keeping the highest level already held.
 */
export async function evaluateTraining(actor: Actor, input: EvaluationInput, ctx: RequestContext) {
  needManage(actor);
  const t = await getTraining(actor, input.trainingId);
  if (t.evaluatedAt) throw new BusinessError("This training has already been evaluated.", "STATE");
  if (t.status === "CANCELLED") throw new BusinessError("A cancelled training cannot be evaluated.", "STATE");
  if (t.startDate.getTime() > Date.now()) throw new BusinessError("A training that has not started cannot be evaluated.", "STATE");
  if (input.passed && input.skills.length) {
    const found = await prisma.skill.count({ where: { id: { in: input.skills.map((s) => s.skillId) }, isActive: true } });
    if (found !== new Set(input.skills.map((s) => s.skillId)).size) throw new BusinessError("Some competences are unknown or inactive.", "VALIDATION");
  }
  const now = new Date();
  const status: TrainingStatus = input.passed ? "COMPLETED" : "FAILED";
  await prisma.$transaction(async (tx) => {
    await tx.training.update({ where: { id: t.id }, data: { status, passed: input.passed, score: input.score ?? null, result: input.result || t.result, evaluatedAt: now, endDate: t.endDate ?? now } });
    if (input.passed) {
      for (const s of input.skills) {
        const held = await tx.officerSkill.findUnique({ where: { officerId_skillId: { officerId: t.officerId, skillId: s.skillId } } });
        const expiresAt = s.validMonths ? new Date(new Date(now).setMonth(now.getMonth() + s.validMonths)) : null;
        if (!held) await tx.officerSkill.create({ data: { officerId: t.officerId, skillId: s.skillId, level: s.level, acquiredAt: now, expiresAt, trainingId: t.id } });
        else await tx.officerSkill.update({ where: { id: held.id }, data: { level: Math.max(held.level, s.level), acquiredAt: now, expiresAt, trainingId: t.id } });
      }
    }
    await logAudit({ actor, action: "HR_TRAINING_EVALUATED", module: "hr", entityType: "Training", entityId: t.id, entityLabel: `${t.officer.badgeNumber} · ${t.title}`, summary: `Training "${t.title}" evaluated: ${input.passed ? "passed" : "failed"}${input.score != null ? ` (${input.score}/20)` : ""}`, after: { status, score: input.score, skills: input.skills }, context: ctx }, tx);
  });
  return getTraining(actor, t.id);
}

/** Issues the training certificate (attestation): only for a passed training; the number is assigned once. */
export async function issueCertificate(actor: Actor, trainingId: string, ctx: RequestContext) {
  needManage(actor);
  const t = await getTraining(actor, trainingId);
  if (t.status !== "COMPLETED" || t.passed !== true) throw new BusinessError("A certificate can only be issued for a training that was passed.", "STATE");
  if (t.certificateIssuedAt) throw new BusinessError("The certificate has already been issued.", "STATE");
  await prisma.$transaction(async (tx) => {
    const certificateNo = t.certificateNo || (await nextNumber("TRAINING_CERT", tx));
    await tx.training.update({ where: { id: t.id }, data: { certificateNo, certificateIssuedAt: new Date() } });
    await logAudit({ actor, action: "HR_TRAINING_CERTIFICATE_ISSUED", module: "hr", entityType: "Training", entityId: t.id, entityLabel: certificateNo, summary: `Certificate ${certificateNo} issued to ${t.officer.badgeNumber} for "${t.title}"`, context: ctx }, tx);
  });
  return getTraining(actor, t.id);
}
