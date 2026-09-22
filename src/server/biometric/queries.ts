import "server-only";
import type { BiometricType, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import type { Actor } from "@/server/auth/dal";
import { biometricScopeWhere } from "@/server/biometric/service";

const historySelect = {
  id: true,
  number: true,
  type: true,
  mode: true,
  reason: true,
  device: true,
  location: true,
  resultCount: true,
  result: true,
  topMatchScore: true,
  action: true,
  actionNotes: true,
  actionAt: true,
  isDemo: true,
  createdAt: true,
  case: { select: { id: true, number: true, title: true } },
  officer: { select: { id: true, username: true, firstName: true, lastName: true } },
  actionBy: { select: { username: true, firstName: true, lastName: true } },
  topMatchPerson: { select: { id: true, number: true, firstName: true, lastName: true } },
  matches: { orderBy: { rank: "asc" }, select: { rank: true, score: true, sourceLabel: true, person: { select: { id: true, number: true, firstName: true, lastName: true } } } },
} satisfies Prisma.BiometricSearchSelect;

export async function biometricHistory(actor: Actor, filter: { type?: BiometricType; caseId?: string; personId?: string; officerId?: string; page?: number; pageSize?: number } = {}) {
  const page = filter.page ?? 1;
  const pageSize = Math.min(filter.pageSize ?? 25, 100);
  const where: Prisma.BiometricSearchWhereInput = {
    AND: [biometricScopeWhere(actor)],
    ...(filter.type ? { type: filter.type } : {}),
    ...(filter.caseId ? { caseId: filter.caseId } : {}),
    ...(filter.officerId ? { officerId: filter.officerId } : {}),
    ...(filter.personId ? { OR: [{ topMatchPersonId: filter.personId }, { matches: { some: { personId: filter.personId } } }] } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.biometricSearch.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, select: historySelect }),
    prisma.biometricSearch.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getBiometricSearch(actor: Actor, id: string) {
  const s = await prisma.biometricSearch.findFirst({ where: { id, ...biometricScopeWhere(actor) }, select: historySelect });
  return s;
}

export async function caseBiometricActivity(caseId: string) {
  const [searches, plates] = await Promise.all([
    prisma.biometricSearch.findMany({ where: { caseId }, orderBy: { createdAt: "desc" }, select: historySelect }),
    prisma.licensePlateDetection.findMany({ where: { caseId }, orderBy: { detectedAt: "desc" }, select: { id: true, number: true, plateNumber: true, vehicleMake: true, vehicleModel: true, vehicleColor: true, cameraId: true, locationText: true, detectedAt: true, status: true, person: { select: { id: true, number: true, firstName: true, lastName: true } } } }),
  ]);
  return { searches, plates };
}

export async function personBiometricSummary(personId: string) {
  const [fingerprint, face, voice, plates, searches] = await Promise.all([
    prisma.fingerprintRecord.count({ where: { personId, isActive: true } }),
    prisma.faceRecord.count({ where: { personId, isActive: true } }),
    prisma.voiceRecord.count({ where: { personId, isActive: true } }),
    prisma.licensePlateDetection.findMany({ where: { personId }, orderBy: { detectedAt: "desc" }, take: 10, select: { id: true, plateNumber: true, vehicleMake: true, vehicleModel: true, detectedAt: true } }),
    prisma.biometricSearch.count({ where: { OR: [{ topMatchPersonId: personId }, { matches: { some: { personId } } }] } }),
  ]);
  return { fingerprintRegistered: fingerprint > 0, faceRegistered: face > 0, voiceRegistered: voice > 0, vehicles: plates, searchAppearances: searches };
}

export async function biometricDashboardStats(actor: Actor) {
  const where = biometricScopeWhere(actor);
  const [byType, potential, verified, pending] = await Promise.all([
    prisma.biometricSearch.groupBy({ by: ["type"], where, _count: true }),
    prisma.biometricSearch.count({ where: { ...where, result: "POTENTIAL_MATCH" } }),
    prisma.biometricSearch.count({ where: { ...where, action: "VERIFIED_BY_INVESTIGATOR" } }),
    prisma.biometricSearch.count({ where: { ...where, result: "POTENTIAL_MATCH", action: "NONE" } }),
  ]);
  const counts: Record<string, number> = { FINGERPRINT: 0, FACE: 0, VOICE: 0, ANPR: 0 };
  for (const r of byType) counts[r.type] = r._count;
  return { byType: counts, potentialMatches: potential, verifiedMatches: verified, pendingVerification: pending };
}
