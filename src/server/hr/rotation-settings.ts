import "server-only";
import { z } from "zod";
import { prisma } from "@/server/db";
import { logAudit } from "@/server/audit";
import { AuthError } from "@/server/errors";
import type { Actor } from "@/server/auth/dal";
import type { RequestContext } from "@/server/request-context";

export const RANK_CATEGORIES = ["COMMISSIONER", "OFFICER", "INSPECTOR", "NON_COMMISSIONED", "CONSTABLE", "CIVILIAN"] as const;
export const ROTATION_SETTING_KEY = "hr.auto_assignment";
export const ROTATION_LAST_RUN_KEY = "hr.auto_assignment.last_run";

/** AFFECTATION_AUTOMATIQUE = ACTIVÉE / DÉSACTIVÉE and its parameters. Disabled by default: an administrator opts in. */
export const rotationSettingsSchema = z.object({
  /** AFFECTATION_AUTOMATIQUE */
  enabled: z.boolean().default(false),
  /** Reference duration in months at a post (12 by default). */
  durationMonths: z.number().int().min(1).max(120).default(12),
  /** Officers reaching the duration within this many days are reported as "soon eligible". */
  warningDays: z.number().int().min(0).max(365).default(30),
  /** Rank categories concerned; empty = every category. */
  categories: z.array(z.enum(RANK_CATEGORIES)).default([]),
  /** Functions (Position ids) that are never rotated automatically. */
  excludedPositionIds: z.array(z.string().max(64)).default([]),
  /** Assignment rule: keep the destination in the officer's province. */
  sameProvinceOnly: z.boolean().default(true),
  /** Assignment rule: effective date of a proposal = today + this many days. */
  effectiveDelayDays: z.number().int().min(0).max(180).default(30),
  /** Authorities allowed to validate automatic proposals (role codes); empty = any holder of hr:transfer_validate covering both structures. */
  validatorRoleCodes: z.array(z.string().max(60)).default([]),
  /** Progressive roll-out: when not empty, only officers posted in these structures are processed. */
  pilotStationIds: z.array(z.string().max(64)).default([]),
  /** Safety valve: maximum number of automatic proposals created by one run. */
  maxProposalsPerRun: z.number().int().min(1).max(2000).default(200),
});
export type RotationSettings = z.infer<typeof rotationSettingsSchema>;

export const DEFAULT_ROTATION_SETTINGS: RotationSettings = rotationSettingsSchema.parse({});

export async function getRotationSettings(): Promise<RotationSettings> {
  const row = await prisma.systemSetting.findUnique({ where: { key: ROTATION_SETTING_KEY }, select: { value: true } });
  const parsed = rotationSettingsSchema.safeParse(row?.value ?? {});
  return parsed.success ? parsed.data : DEFAULT_ROTATION_SETTINGS;
}

export async function updateRotationSettings(actor: Actor, input: RotationSettings, ctx: RequestContext) {
  if (!actor.permissions.has("hr:auto_assign_config")) throw new AuthError("forbidden", "Permission hr:auto_assign_config required");
  const before = await getRotationSettings();
  const value = rotationSettingsSchema.parse(input);
  await prisma.$transaction(async (tx) => {
    await tx.systemSetting.upsert({
      where: { key: ROTATION_SETTING_KEY },
      update: { value, updatedById: actor.id },
      create: { key: ROTATION_SETTING_KEY, value, description: "Affectation automatique après une durée au poste (AFFECTATION_AUTOMATIQUE et paramètres).", updatedById: actor.id },
    });
    const toggled = before.enabled !== value.enabled;
    await logAudit({ actor, action: toggled ? (value.enabled ? "HR_ROTATION_ENABLED" : "HR_ROTATION_DISABLED") : "HR_ROTATION_SETTINGS_UPDATED", module: "hr", entityType: "SystemSetting", entityId: ROTATION_SETTING_KEY, entityLabel: "AFFECTATION_AUTOMATIQUE", summary: toggled ? `Automatic assignment ${value.enabled ? "ENABLED" : "DISABLED"}` : "Automatic assignment settings updated", before, after: value, context: ctx }, tx);
  });
  return value;
}
