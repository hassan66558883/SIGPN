import { apiOk, withApi } from "@/server/api";
import { prisma } from "@/server/db";

/** GET /api/v1/provinces — territorial referential (provinces with their administrative departments and communes). */
export const GET = withApi({ permission: "org:view" }, async ({ actor }) => {
  const where = actor.scopeLevel === "NATIONAL" ? {} : { id: actor.regionId ?? "__none__" };
  const provinces = await prisma.region.findMany({
    where,
    orderBy: { name: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      capital: true,
      isActive: true,
      isDemo: true,
      adminDepartments: { orderBy: { name: "asc" }, select: { id: true, code: true, name: true, capital: true, isActive: true, isDemo: true, communes: { orderBy: { name: "asc" }, select: { id: true, code: true, name: true, type: true, isActive: true, isDemo: true } } } },
      _count: { select: { stations: true } },
    },
  });
  return apiOk(provinces);
});
