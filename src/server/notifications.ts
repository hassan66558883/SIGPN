import type { NotificationKind } from "@/generated/prisma/client";
import { prisma, type Db } from "@/server/db";

type Base = { title: string; body: string; href?: string | null; kind?: NotificationKind };

export async function notify(input: Base & { userId: string }, db: Db = prisma) {
  return db.notification.create({ data: { userId: input.userId, title: input.title.slice(0, 200), body: input.body.slice(0, 1000), href: input.href ?? null, kind: input.kind ?? "INFO" } });
}

/** Notify every active user holding one of the given role codes, optionally limited to a station or region. */
export async function notifyRoles(
  input: Base & { roleCodes: string[]; stationId?: string | null; regionId?: string | null; excludeUserId?: string | null },
  db: Db = prisma,
): Promise<number> {
  const users = await db.user.findMany({
    where: {
      status: "ACTIVE",
      deletedAt: null,
      role: { code: { in: input.roleCodes } },
      ...(input.stationId ? { stationId: input.stationId } : {}),
      ...(input.regionId ? { regionId: input.regionId } : {}),
      ...(input.excludeUserId ? { id: { not: input.excludeUserId } } : {}),
    },
    select: { id: true },
  });
  if (users.length === 0) return 0;
  await db.notification.createMany({
    data: users.map((u) => ({ userId: u.id, title: input.title.slice(0, 200), body: input.body.slice(0, 1000), href: input.href ?? null, kind: input.kind ?? "INFO" })),
  });
  return users.length;
}

/** Notify users that hold a given permission (via their role), optionally scoped. */
export async function notifyPermission(
  input: Base & { permission: string; stationId?: string | null; regionId?: string | null; excludeUserId?: string | null },
  db: Db = prisma,
): Promise<number> {
  const users = await db.user.findMany({
    where: {
      status: "ACTIVE",
      deletedAt: null,
      role: { isActive: true, permissions: { some: { permission: { code: input.permission } } } },
      ...(input.stationId ? { stationId: input.stationId } : {}),
      ...(input.regionId ? { regionId: input.regionId } : {}),
      ...(input.excludeUserId ? { id: { not: input.excludeUserId } } : {}),
    },
    select: { id: true },
  });
  if (users.length === 0) return 0;
  await db.notification.createMany({
    data: users.map((u) => ({ userId: u.id, title: input.title.slice(0, 200), body: input.body.slice(0, 1000), href: input.href ?? null, kind: input.kind ?? "INFO" })),
  });
  return users.length;
}
