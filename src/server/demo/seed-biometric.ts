/**
 * DEMO biometric & forensic identification data (idempotent, deterministic, fictional): a handful of
 * enrolled fingerprint/face templates, a spread of biometric searches (fingerprint/face/voice/ANPR)
 * against real DEMO cases with a mix of results and investigator actions, and a few license-plate
 * detections. Uses the same DEMO mock scoring as the live search flow. Runs only while no
 * BiometricSearch exists.
 */
import { prisma } from "@/server/db";
import { encryptSecret, sha256 } from "@/server/crypto";
import { nextNumber } from "@/server/sequences";

/** Mirrors providers/mock-common.ts's mockSimilarity without importing it (that module is
 * "server-only"-guarded and this seed script runs outside Next's bundler, via plain tsx). */
function mockSimilarity(a: string, b: string): number {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0;
  let matches = 0;
  for (let i = 0; i < len; i++) if (a[i] === b[i]) matches++;
  return Math.round((matches / len) * 1000) / 10;
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(20260922);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
const at = (daysAgo: number, hour: number, minute = 0) => {
  const x = new Date();
  x.setDate(x.getDate() - daysAgo);
  x.setHours(hour, minute, 0, 0);
  return x;
};
const fakeTemplate = (label: string) => sha256(`DEMO-${label}-${rand()}`);
const PLATE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const fakePlate = () => `TD-${String(int(1000, 9999))}-${pick(PLATE_LETTERS.split(""))}${pick(PLATE_LETTERS.split(""))}`;

const REASONS = [
  "Vérification d'identité suite à interpellation",
  "Recherche de correspondance dans le cadre d'une enquête en cours",
  "Identification d'une personne non coopérative",
  "Rapprochement avec des traces relevées sur les lieux",
  "Contrôle routier — vérification du véhicule",
  "Suivi d'un véhicule signalé dans plusieurs affaires",
];
const CAMERAS = ["CAM-014", "CAM-021", "CAM-003", "CAM-077"];
const VEHICLES = [
  { make: "Toyota", model: "Land Cruiser", color: "Noir" },
  { make: "Toyota", model: "Hilux", color: "Blanc" },
  { make: "Peugeot", model: "301", color: "Gris" },
  { make: "Yamaha", model: "XTZ 125", color: "Rouge" },
];

export async function seedBiometric() {
  if ((await prisma.biometricSearch.count()) > 0) return { fingerprintEnrolled: 0, faceEnrolled: 0, searches: 0, plates: 0 };

  const cases = await prisma.case.findMany({ where: { deletedAt: null }, select: { id: true, number: true, stationId: true }, take: 60 });
  if (!cases.length) return { fingerprintEnrolled: 0, faceEnrolled: 0, searches: 0, plates: 0 };
  const persons = await prisma.person.findMany({ where: { deletedAt: null, mergedIntoId: null }, select: { id: true, number: true }, take: 80 });
  const officers = await prisma.user.findMany({ where: { status: "ACTIVE", deletedAt: null, role: { permissions: { some: { permission: { code: { in: ["biometric:search_fingerprint", "biometric:search_face", "biometric:search_voice", "biometric:search_anpr"] } } } } } }, select: { id: true, roleId: true } });
  const enrollOfficer = officers[0] ?? (await prisma.user.findFirst({ where: { role: { code: "SUPER_ADMIN" } }, select: { id: true } }));
  if (!enrollOfficer || !officers.length || !persons.length) return { fingerprintEnrolled: 0, faceEnrolled: 0, searches: 0, plates: 0 };

  // Enroll fingerprint + face templates for a third of the demo persons.
  const enrolled = persons.slice(0, Math.max(5, Math.floor(persons.length / 3)));
  let fingerprintEnrolled = 0;
  let faceEnrolled = 0;
  const fingerprintTemplates: { personId: string; template: string }[] = [];
  const faceTemplates: { personId: string; template: string }[] = [];
  for (const p of enrolled) {
    const fpTemplate = fakeTemplate(`fp-${p.id}`);
    const fcTemplate = fakeTemplate(`fc-${p.id}`);
    fingerprintTemplates.push({ personId: p.id, template: fpTemplate });
    faceTemplates.push({ personId: p.id, template: fcTemplate });
    await prisma.fingerprintRecord.create({ data: { number: await nextNumber("FINGERPRINT"), personId: p.id, position: pick(["RIGHT_THUMB", "RIGHT_INDEX", "LEFT_THUMB", "LEFT_INDEX"]), templateSecretEnc: encryptSecret(fpTemplate), quality: int(70, 99), device: "Scanner DEMO", capturedById: enrollOfficer.id, capturedAt: at(int(5, 400), 9) } });
    fingerprintEnrolled++;
    await prisma.faceRecord.create({ data: { number: await nextNumber("FACE"), personId: p.id, templateSecretEnc: encryptSecret(fcTemplate), quality: int(70, 99), device: "Caméra DEMO", capturedById: enrollOfficer.id, capturedAt: at(int(5, 400), 9) } });
    faceEnrolled++;
  }

  let searches = 0;
  const searchCount = Math.min(40, cases.length * 2);
  for (let i = 0; i < searchCount; i++) {
    const kase = pick(cases);
    const officer = pick(officers);
    const type = pick(["FINGERPRINT", "FACE", "VOICE", "ANPR"] as const);
    const mode = rand() < 0.35 ? "VERIFY_1_1" : "IDENTIFY_1_N";
    const createdAt = at(int(0, 90), int(7, 22), int(0, 59));
    const queryTemplate = rand() < 0.4 && (type === "FINGERPRINT" ? fingerprintTemplates : faceTemplates).length ? pick(type === "FINGERPRINT" ? fingerprintTemplates : faceTemplates).template : fakeTemplate(`query-${i}`);
    const pool = type === "FINGERPRINT" ? fingerprintTemplates : type === "FACE" ? faceTemplates : [];
    const ranked = pool.map((c) => ({ personId: c.personId, score: mockSimilarity(queryTemplate, c.template) })).sort((a, b) => b.score - a.score);
    const best = ranked[0];
    const isAnpr = type === "ANPR";
    const anprScore = isAnpr ? int(40, 98) : 0;
    const result = isAnpr ? (anprScore >= 60 ? "POTENTIAL_MATCH" : "NO_MATCH") : best && best.score >= 60 ? "POTENTIAL_MATCH" : "NO_MATCH";
    const action = result === "POTENTIAL_MATCH" ? pick(["NONE", "NONE", "SENT_FOR_VERIFICATION", "VERIFIED_BY_INVESTIGATOR", "REJECTED"] as const) : "NONE";
    const search = await prisma.$transaction(async (tx) => {
      const number = await nextNumber("BIOMETRIC", tx, createdAt);
      const s = await tx.biometricSearch.create({
        data: {
          number,
          type,
          mode,
          caseId: kase.id,
          reason: pick(REASONS),
          officerId: officer.id,
          device: isAnpr ? pick(CAMERAS) : "DEMO capture device",
          location: "N'Djamena",
          parameters: isAnpr ? { source: "image_upload" } : { mode },
          resultCount: isAnpr ? (result === "POTENTIAL_MATCH" ? 1 : 0) : ranked.filter((r) => r.score > 0).length,
          result,
          topMatchScore: isAnpr ? (result === "POTENTIAL_MATCH" ? anprScore : null) : best ? best.score : null,
          topMatchPersonId: isAnpr ? null : best?.personId ?? null,
          action,
          actionNotes: action === "REJECTED" ? "Score insuffisant pour confirmer l'identité (DEMO)." : action === "VERIFIED_BY_INVESTIGATOR" ? "Correspondance confirmée après vérification manuelle (DEMO)." : null,
          actionById: action !== "NONE" ? officer.id : null,
          actionAt: action !== "NONE" ? at(int(0, 5), int(7, 22)) : null,
          isDemo: true,
          createdAt,
        },
      });
      if (!isAnpr) {
        const top = ranked.filter((r) => r.score > 0).slice(0, mode === "VERIFY_1_1" ? 1 : 5);
        if (top.length) await tx.biometricMatch.createMany({ data: top.map((m, rank) => ({ searchId: s.id, personId: m.personId, score: m.score, sourceLabel: rank === 0 && mode === "VERIFY_1_1" ? "Local enrollment (DEMO)" : "National Police Database (DEMO)", rank: rank + 1 })) });
      }
      return s;
    });
    void search;
    searches++;
  }

  // A handful of ANPR plate detections tied to cases.
  let plates = 0;
  const plateCount = Math.min(15, cases.length);
  const reusedPlates = Array.from({ length: 4 }, fakePlate);
  for (let i = 0; i < plateCount; i++) {
    const kase = pick(cases);
    const officer = pick(officers);
    const vehicle = pick(VEHICLES);
    const plateNumber = rand() < 0.4 ? pick(reusedPlates) : fakePlate();
    await prisma.licensePlateDetection.create({
      data: {
        number: await nextNumber("LPR"),
        plateNumber,
        vehicleMake: vehicle.make,
        vehicleModel: vehicle.model,
        vehicleColor: vehicle.color,
        cameraId: pick(CAMERAS),
        locationText: "N'Djamena",
        detectedAt: at(int(0, 60), int(6, 23), int(0, 59)),
        caseId: kase.id,
        personId: rand() < 0.3 ? pick(persons).id : null,
        status: pick(["NEW", "REVIEWED", "LINKED_TO_CASE", "DISMISSED"]),
        recordedById: officer.id,
      },
    });
    plates++;
  }

  return { fingerprintEnrolled, faceEnrolled, searches, plates };
}
