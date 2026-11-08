/**
 * DEMO wanted persons (idempotent, deterministic, fictional): a spread of wanted notices across
 * statuses/priorities, each with a sighting, and a subset with an associated vehicle and/or a linked
 * warrant. Runs only while no WantedPerson exists.
 */
import { prisma } from "@/server/db";
import { nextNumber } from "@/server/sequences";

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
const at = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000);

const OFFENSES = ["Vol à main armée", "Trafic de stupéfiants", "Cambriolage en réunion", "Agression à l'arme blanche", "Escroquerie et abus de confiance", "Évasion de garde à vue", "Enlèvement", "Recel de véhicule volé"];
const STATUSES = ["ACTIVE", "ACTIVE", "ACTIVE", "PENDING_APPROVAL", "LOCATED", "ARRESTED", "CANCELLED"] as const;
const DANGER = ["LOW", "MEDIUM", "MEDIUM", "HIGH", "EXTREME"] as const;
const LOCATIONS = ["Marché central, N'Djamena", "Quartier Chagoua, N'Djamena", "Gare routière, Moundou", "Frontière de Fianga", "Quartier Dembé, N'Djamena"];
const VEHICLES = [
  { make: "Toyota", model: "Hilux", color: "Blanc" },
  { make: "Toyota", model: "Land Cruiser", color: "Noir" },
  { make: "Yamaha", model: "XTZ 125", color: "Rouge" },
];

export async function seedWanted() {
  if ((await prisma.wantedPerson.count()) > 0) return { created: 0, sightings: 0, vehicles: 0, warrants: 0 };

  const stations = await prisma.station.findMany({ where: { isDemo: true, isActive: true, type: { in: ["CENTRAL_STATION", "STATION"] } }, select: { id: true, code: true, regionId: true } });
  const persons = await prisma.person.findMany({ where: { deletedAt: null, mergedIntoId: null }, select: { id: true, number: true, stationId: true } });
  const officers = await prisma.user.findMany({ where: { status: "ACTIVE", deletedAt: null, role: { permissions: { some: { permission: { code: "wanted:create" } } } } }, select: { id: true, stationId: true } });
  const approvers = await prisma.user.findMany({ where: { status: "ACTIVE", deletedAt: null, role: { permissions: { some: { permission: { code: "wanted:approve" } } } } }, select: { id: true, stationId: true } });
  if (!stations.length || !persons.length || !officers.length) return { created: 0, sightings: 0, vehicles: 0, warrants: 0 };

  let created = 0;
  let sightings = 0;
  let vehicles = 0;
  let warrants = 0;
  const usedPersons = new Set<string>();
  const n = Math.min(18, persons.length, STATUSES.length * 4);
  for (let i = 0; i < n; i++) {
    const person = persons.find((p) => !usedPersons.has(p.id));
    if (!person) break;
    usedPersons.add(person.id);
    const st = stations[int(0, stations.length - 1)];
    const officer = officers.find((o) => o.stationId === st.id) ?? officers[int(0, officers.length - 1)];
    // four-eyes rule (database constraint): the approver is never the issuer
    const others = approvers.filter((a) => a.id !== officer.id);
    const approver = others.find((a) => a.stationId === st.id) ?? others[int(0, Math.max(0, others.length - 1))] ?? null;
    const status = pick(STATUSES);
    const issuedAt = at(int(2, 180));
    const closed = status === "ARRESTED" || status === "CANCELLED";
    const w = await prisma.$transaction(async (tx) => {
      const number = await nextNumber("WANTED", tx, issuedAt);
      const rec = await tx.wantedPerson.create({
        data: {
          number,
          personId: person.id,
          stationId: st.id,
          regionId: st.regionId,
          offense: pick(OFFENSES),
          reason: "Suspect activement recherché dans le cadre d'une enquête en cours. Données de démonstration.",
          dangerLevel: pick(DANGER),
          status,
          issuedById: officer.id,
          issuedAt,
          approvedById: approver?.id ?? null,
          approvedAt: at(int(1, 179)),
          closedAt: closed ? at(int(0, 60)) : null,
          closureNotes: closed ? (status === "ARRESTED" ? "Interpellé lors d'un contrôle de routine (DEMO)." : "Avis annulé — identification erronée (DEMO).") : null,
        },
        select: { id: true, number: true },
      });
      await tx.wantedSighting.create({ data: { wantedPersonId: rec.id, location: pick(LOCATIONS), occurredAt: at(int(0, 30)), source: pick(["Renseignement", "Témoin", "Caméra de surveillance", "Patrouille"]), officerId: officer.id, notes: "Signalement de démonstration." } });
      await tx.wantedPerson.update({ where: { id: rec.id }, data: { lastSeenLocation: pick(LOCATIONS), lastSeenAt: at(int(0, 30)) } });
      if (rand() < 0.5) {
        const v = pick(VEHICLES);
        await tx.wantedVehicle.create({ data: { wantedPersonId: rec.id, plateNumber: `TD-${int(1000, 9999)}-${String.fromCharCode(65 + int(0, 25))}${String.fromCharCode(65 + int(0, 25))}`, make: v.make, model: v.model, color: v.color, year: int(2008, 2023), addedById: officer.id } });
      }
      if (rand() < 0.4 && status !== "PENDING_APPROVAL") {
        const wrNumber = await nextNumber("WARRANT", tx, issuedAt);
        const wr = await tx.warrant.create({ data: { number: wrNumber, type: "ARREST", personId: person.id, issuingAuthority: "Procureur de la République de N'Djamena", grounds: "Charges suffisantes réunies dans le cadre de l'enquête (DEMO).", status: status === "ARRESTED" ? "EXECUTED" : "ACTIVE", requestedById: officer.id, approvedById: approver?.id ?? null, approvedAt: at(int(1, 170)), issuedAt: at(int(1, 170)), executedAt: status === "ARRESTED" ? at(int(0, 30)) : null, executedById: status === "ARRESTED" ? officer.id : null } });
        await tx.wantedPerson.update({ where: { id: rec.id }, data: { warrantId: wr.id } });
        warrants++;
      }
      return rec;
    });
    void w;
    created++;
    sightings++;
    if (rand() < 0.5) vehicles++;
  }
  return { created, sightings, vehicles, warrants };
}
