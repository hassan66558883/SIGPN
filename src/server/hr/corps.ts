import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";

/** Default corps of a rank category (the referential is editable; this only fills the default). */
export const CORPS_OF_CATEGORY: Record<string, string> = { COMMISSIONER: "COMMISSAIRES", OFFICER: "OFFICIERS", INSPECTOR: "INSPECTEURS", NON_COMMISSIONED: "GRADES", CONSTABLE: "AGENTS", CIVILIAN: "CIVILS" };

export async function defaultCorpsId(rankId: string, db: Prisma.TransactionClient | typeof prisma = prisma): Promise<string | null> {
  const rank = await db.rank.findUnique({ where: { id: rankId }, select: { category: true } });
  const code = rank ? CORPS_OF_CATEGORY[rank.category] : undefined;
  if (!code) return null;
  return (await db.corps.findUnique({ where: { code }, select: { id: true } }))?.id ?? null;
}
