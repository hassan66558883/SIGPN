import "server-only";
import { prisma } from "@/server/db";
import { CENTRAL_DIRECTIONS, DGPN_ROOT } from "@/server/org/central-directions";

/**
 * Makes sure the national headquarters and the central directions of the decree 0572/2023 exist (idempotent, additive:
 * an existing unit is never renamed or moved, so an administrator's later changes are kept). The seat is the capital's province.
 * Returns how many units were created.
 */
export async function syncCentralDirections(): Promise<number> {
  const region = await prisma.region.findUnique({ where: { code: "NDJ" }, select: { id: true } });
  if (!region) return 0;
  const root = (await prisma.station.findUnique({ where: { code: DGPN_ROOT.code }, select: { id: true, regionId: true } })) ?? (await prisma.station.create({ data: { regionId: region.id, code: DGPN_ROOT.code, name: DGPN_ROOT.name, type: "HEADQUARTERS", city: "N'Djamena" }, select: { id: true, regionId: true } }));
  let created = 0;
  for (const d of CENTRAL_DIRECTIONS) {
    const exists = await prisma.station.findUnique({ where: { code: d.code }, select: { id: true } });
    if (exists) continue;
    await prisma.station.create({ data: { regionId: root.regionId, parentId: root.id, code: d.code, name: d.name, type: "CENTRAL_DIRECTION", city: "N'Djamena" } });
    created++;
  }
  return created;
}
