import { z } from "zod";
import { apiOk, paginationSchema, parseJson, parseQuery, withApi } from "@/server/api";
import { prisma } from "@/server/db";
import { scopeWhere } from "@/server/auth/dal";
import { createStation } from "@/server/org/service";
import { stationSchema } from "@/server/org/schemas";

const querySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  regionId: z.string().max(64).optional(),
  adminDepartmentId: z.string().max(64).optional(),
  parentId: z.string().max(64).optional(),
  type: z.string().max(32).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "UNDER_CONSTRUCTION", "PLANNED"]).optional(),
});

/** GET /api/v1/stations — police structures inside the caller's scope (own structure + child posts/units for station actors). */
export const GET = withApi({ permission: "org:view" }, async ({ actor, req }) => {
  const q = parseQuery(req, querySchema);
  const where = {
    ...scopeWhere(actor, { stationId: "id", regionId: "regionId" }),
    ...(q.regionId ? { regionId: q.regionId } : {}),
    ...(q.adminDepartmentId ? { adminDepartmentId: q.adminDepartmentId } : {}),
    ...(q.parentId ? { parentId: q.parentId } : {}),
    ...(q.type ? { type: q.type as never } : {}),
    ...(q.status ? { status: q.status } : {}),
    ...(q.q ? { OR: [{ code: { contains: q.q, mode: "insensitive" as const } }, { name: { contains: q.q, mode: "insensitive" as const } }, { city: { contains: q.q, mode: "insensitive" as const } }] } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.station.findMany({
      where,
      orderBy: [{ region: { name: "asc" } }, { name: "asc" }],
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      select: { id: true, code: true, name: true, type: true, status: true, isActive: true, isDemo: true, city: true, regionId: true, adminDepartmentId: true, communeId: true, parentId: true, region: { select: { code: true, name: true } }, _count: { select: { officers: true, children: true, departments: true } } },
    }),
    prisma.station.count({ where }),
  ]);
  return apiOk(items, { meta: { page: q.page, pageSize: q.pageSize, total } });
});

export const POST = withApi({ permission: "org:manage" }, async ({ actor, ctx, req }) => {
  const body = await parseJson(req, stationSchema);
  return apiOk(await createStation(actor, body, ctx), { status: 201 });
});
