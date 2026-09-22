/**
 * DEMO field operations (idempotent, deterministic, fictional): patrol zones, a small vehicle fleet,
 * patrols over the last two weeks (all statuses) and incidents / interventions over the last 60 days,
 * some linked to patrols and a few escalated to cases. Runs only while no incident and no patrol exist.
 */
import type { IncidentStatus, IncidentType, PatrolStatus, Severity, Shift } from "@/generated/prisma/client";
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
const rand = rng(20260914);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
const at = (daysAgo: number, hour: number, minute = 0) => {
  const x = new Date();
  x.setDate(x.getDate() - daysAgo);
  x.setHours(hour, minute, 0, 0);
  return x;
};

const ZONES: Record<string, { code: string; name: string; description: string }[]> = {
  CENTRAL_STATION: [
    { code: "Z1", name: "Centre administratif", description: "Ministères, marché central, gare routière (DEMO)" },
    { code: "Z2", name: "Quartiers résidentiels nord", description: "Zone résidentielle et écoles (DEMO)" },
    { code: "Z3", name: "Axe fluvial", description: "Berges, pont et zone portuaire (DEMO)" },
  ],
  STATION: [
    { code: "Z1", name: "Secteur marché", description: "Marché et commerces (DEMO)" },
    { code: "Z2", name: "Secteur résidentiel", description: "Habitations et lieux de culte (DEMO)" },
  ],
  POST: [{ code: "Z1", name: "Périmètre du poste", description: "Quartier de rattachement (DEMO)" }],
};

const VEHICLES: Record<string, { type: "PATROL_CAR" | "PICKUP" | "MOTORCYCLE" | "VAN"; make: string; model: string }[]> = {
  CENTRAL_STATION: [
    { type: "PICKUP", make: "Toyota", model: "Hilux" },
    { type: "PICKUP", make: "Toyota", model: "Land Cruiser" },
    { type: "PATROL_CAR", make: "Peugeot", model: "301" },
    { type: "MOTORCYCLE", make: "Yamaha", model: "XTZ 125" },
    { type: "VAN", make: "Toyota", model: "Hiace" },
  ],
  STATION: [
    { type: "PICKUP", make: "Toyota", model: "Hilux" },
    { type: "MOTORCYCLE", make: "Yamaha", model: "XTZ 125" },
  ],
  POST: [{ type: "MOTORCYCLE", make: "Haojue", model: "HJ 125" }],
};

const MISSIONS = ["Patrouille de sécurisation du marché et des axes commerçants", "Ronde de nuit — quartiers résidentiels, contrôle des points sensibles", "Sécurisation des abords des établissements scolaires", "Contrôle routier et prévention des accidents sur l'axe principal", "Patrouille pédestre de proximité et prise de contact avec les chefs de quartier", "Surveillance des lieux de culte et des rassemblements", "Patrouille mixte avec la circulation — fluidité et contrôle des motos-taxis"];

const INCIDENTS: Record<IncidentType, { titles: string[]; places: string[] }> = {
  DISTURBANCE: { titles: ["Rixe entre jeunes devant un débit de boissons", "Altercation violente entre commerçants"], places: ["Marché", "Rue commerçante", "Gare routière"] },
  TRAFFIC_ACCIDENT: { titles: ["Collision entre une moto-taxi et un véhicule léger", "Accident de la circulation avec blessé léger", "Renversement d'un piéton par un cycliste"], places: ["Carrefour principal", "Rond-point", "Avenue"] },
  ASSAULT: { titles: ["Agression à l'arme blanche signalée par un passant", "Coups et blessures sur la voie publique"], places: ["Ruelle", "Arrêt de bus", "Marché"] },
  THEFT: { titles: ["Vol à l'arraché d'un téléphone", "Vol de moto signalé en cours"], places: ["Marché", "Parking", "Devant une boutique"] },
  FIRE: { titles: ["Départ d'incendie dans un entrepôt", "Feu de broussailles menaçant des habitations"], places: ["Zone d'entrepôts", "Périphérie"] },
  MEDICAL: { titles: ["Malaise d'une personne âgée sur la voie publique", "Personne inconsciente devant une pharmacie"], places: ["Pharmacie", "Marché", "Arrêt de bus"] },
  SUSPICIOUS_ACTIVITY: { titles: ["Véhicule stationné suspect signalé par des riverains", "Individus rôdant autour d'une école la nuit"], places: ["École", "Quartier résidentiel"] },
  PUBLIC_ORDER: { titles: ["Attroupement bloquant la circulation", "Manifestation spontanée devant un bâtiment public"], places: ["Bâtiment public", "Carrefour"] },
  DOMESTIC: { titles: ["Violence conjugale signalée par le voisinage", "Dispute familiale avec menaces"], places: ["Domicile", "Concession familiale"] },
  NOISE: { titles: ["Tapage nocturne — sonorisation d'une cérémonie", "Nuisances sonores répétées d'un bar"], places: ["Quartier résidentiel", "Bar"] },
  MISSING_PERSON: { titles: ["Enfant de 7 ans introuvable depuis la sortie de l'école", "Personne âgée désorientée disparue de son domicile"], places: ["École", "Domicile"] },
  OTHER: { titles: ["Animal errant dangereux sur la voie publique", "Découverte d'un colis abandonné"], places: ["Rue", "Gare routière"] },
};
const TYPE_MIX: IncidentType[] = ["DISTURBANCE", "TRAFFIC_ACCIDENT", "TRAFFIC_ACCIDENT", "THEFT", "THEFT", "ASSAULT", "PUBLIC_ORDER", "NOISE", "DOMESTIC", "SUSPICIOUS_ACTIVITY", "MEDICAL", "FIRE", "MISSING_PERSON", "OTHER"];
const REPORTS = ["Intervention effectuée, les parties ont été séparées et identifiées. Situation apaisée à notre départ.", "Constat effectué, blessé léger pris en charge par les secours. Circulation rétablie.", "Individus interpellés et conduits au commissariat pour audition.", "Vérifications effectuées : aucun élément suspect constaté. Riverains rassurés.", "Personne retrouvée saine et sauve et remise à sa famille.", "Sinistre circonscrit avec l'appui des sapeurs-pompiers ; aucune victime."];

export async function seedFieldOps() {
  const stations = await prisma.station.findMany({ where: { isDemo: true, isActive: true, type: { in: ["CENTRAL_STATION", "STATION", "POST"] } }, include: { officers: { where: { isActive: true, deletedAt: null }, orderBy: { badgeNumber: "asc" }, select: { id: true } }, region: { select: { code: true } } } });

  // zones + vehicles (idempotent by unique keys)
  let zones = 0;
  let vehicles = 0;
  for (const st of stations) {
    for (const z of ZONES[st.type] ?? []) {
      await prisma.zone.upsert({ where: { stationId_code: { stationId: st.id, code: z.code } }, update: {}, create: { stationId: st.id, ...z } });
      zones++;
    }
    for (const [i, v] of (VEHICLES[st.type] ?? []).entries()) {
      const fleetNumber = `PN-${st.code}-${String(i + 1).padStart(2, "0")}`;
      await prisma.vehicle.upsert({
        where: { fleetNumber },
        update: {},
        create: { fleetNumber, plateNumber: `${st.region.code}-${int(1000, 9999)}-${String.fromCharCode(65 + int(0, 25))}${String.fromCharCode(65 + int(0, 25))}`, make: v.make, model: v.model, year: int(2014, 2024), color: pick(["Blanc", "Bleu", "Gris"]), type: v.type, fuelType: v.type === "MOTORCYCLE" ? "PETROL" : "DIESEL", stationId: st.id, status: "AVAILABLE", mileageKm: int(12_000, 180_000), acquiredAt: at(int(400, 3000), 9), insuranceExpiresAt: at(-int(30, 300), 9), inspectionDueAt: at(-int(10, 200), 9), notes: "Véhicule de démonstration (DEMO)" },
      });
      vehicles++;
    }
  }

  if ((await prisma.incident.count()) > 0 || (await prisma.patrol.count()) > 0) return { zones, vehicles, patrols: 0, incidents: 0, escalated: 0 };

  const users = await prisma.user.findMany({ where: { status: "ACTIVE", deletedAt: null }, select: { id: true, stationId: true, role: { select: { code: true, permissions: { select: { permission: { select: { code: true } } } } } } } });
  const has = (u: (typeof users)[number], p: string) => u.role.permissions.some((x) => x.permission.code === p);
  const admin = users.find((u) => u.role.code === "SUPER_ADMIN")!;
  const plannerOf = (stationId: string) => users.find((u) => u.stationId === stationId && has(u, "patrols:manage")) ?? users.find((u) => u.stationId === stationId && has(u, "incidents:create")) ?? admin;
  const reporterOf = (stationId: string) => users.find((u) => u.stationId === stationId && u.role.code === "PATROL_OFFICER") ?? users.find((u) => u.stationId === stationId && has(u, "incidents:create")) ?? admin;
  const persons = await prisma.person.findMany({ where: { deletedAt: null, mergedIntoId: null }, select: { id: true, stationId: true } });

  let patrols = 0;
  let incidents = 0;
  let escalated = 0;
  for (const st of stations) {
    if (st.officers.length < 2) continue;
    const zoneRows = await prisma.zone.findMany({ where: { stationId: st.id }, select: { id: true } });
    const vehicleRows = await prisma.vehicle.findMany({ where: { stationId: st.id }, select: { id: true, mileageKm: true } });
    const planner = plannerOf(st.id);
    const reporter = reporterOf(st.id);
    const stPersons = persons.filter((p) => p.stationId === st.id);
    const patrolIds: { id: string; number: string; day: number }[] = [];

    // patrols: last 14 days + next 2 days
    const perDay = st.type === "CENTRAL_STATION" ? 2 : 1;
    for (let day = 14; day >= -2; day--) {
      for (let k = 0; k < perDay; k++) {
        const shift: Shift = k === 0 ? pick(["MORNING", "AFTERNOON"]) : "NIGHT";
        const startHour = shift === "MORNING" ? 6 : shift === "AFTERNOON" ? 14 : 22;
        const plannedStart = at(day, startHour);
        const plannedEnd = new Date(plannedStart.getTime() + 8 * 3_600_000);
        const status: PatrolStatus = day > 0 ? (rand() < 0.9 ? "COMPLETED" : "CANCELLED") : day === 0 ? (startHour <= new Date().getHours() ? "ACTIVE" : "PLANNED") : "PLANNED";
        const supervisor = st.officers[int(0, Math.min(3, st.officers.length - 1))];
        const members = st.officers.filter((o) => o.id !== supervisor.id).slice(int(0, 2), int(3, 6)).map((o) => o.id);
        const vehicle = vehicleRows.length && rand() < 0.7 ? vehicleRows[int(0, vehicleRows.length - 1)] : null;
        const startKm = vehicle ? vehicle.mileageKm - int(500, 5000) : null;
        const p = await prisma.$transaction(async (tx) => {
          const number = await nextNumber("PATROL", tx, plannedStart);
          return tx.patrol.create({
            data: {
              number,
              stationId: st.id,
              zoneId: zoneRows.length ? zoneRows[int(0, zoneRows.length - 1)].id : null,
              shift,
              mission: pick(MISSIONS),
              plannedStart,
              plannedEnd,
              status,
              supervisorId: supervisor.id,
              vehicleId: vehicle?.id ?? null,
              createdById: planner.id,
              officers: { create: members.map((officerId) => ({ officerId, role: "MEMBER" })) },
              ...(status === "COMPLETED" ? { actualStart: new Date(plannedStart.getTime() + int(0, 20) * 60_000), actualEnd: new Date(plannedEnd.getTime() + int(-30, 40) * 60_000), startKm, endKm: startKm !== null ? startKm + int(20, 140) : null, report: pick(["Patrouille effectuée sans incident notable. Présence dissuasive sur l'ensemble de la zone.", "Deux contrôles d'identité effectués, RAS. Un véhicule en stationnement gênant verbalisé.", "Intervention sur un différend de voisinage, réglé sur place. Reste de la vacation calme.", "Prise de contact avec les commerçants du marché ; signalement d'un point de vente illicite transmis au service compétent."]) } : {}),
              ...(status === "ACTIVE" ? { actualStart: new Date(plannedStart.getTime() + int(0, 15) * 60_000), startKm } : {}),
              ...(status === "CANCELLED" ? { notes: "[Cancelled] Effectif indisponible — patrouille annulée (DEMO)." } : {}),
            },
            select: { id: true, number: true },
          });
        });
        if (status === "ACTIVE" && vehicle) await prisma.vehicle.update({ where: { id: vehicle.id }, data: { status: "IN_USE" } });
        patrolIds.push({ ...p, day });
        patrols++;
      }
    }

    // incidents: last 60 days
    const n = st.type === "CENTRAL_STATION" ? 22 : st.type === "STATION" ? 12 : 5;
    for (let i = 0; i < n; i++) {
      const type = pick(TYPE_MIX);
      const def = INCIDENTS[type];
      const day = i < 3 ? 0 : int(1, 60);
      const occurredAt = at(day, int(6, 23), int(0, 59));
      if (occurredAt.getTime() > Date.now()) occurredAt.setTime(Date.now() - int(10, 120) * 60_000);
      const severity: Severity = type === "FIRE" || type === "MISSING_PERSON" ? pick(["HIGH", "CRITICAL"]) : type === "ASSAULT" || type === "DOMESTIC" ? pick(["MEDIUM", "HIGH"]) : pick(["LOW", "MEDIUM", "MEDIUM"]);
      const status: IncidentStatus = day === 0 ? pick(["REPORTED", "RESPONDING", "ON_SCENE"]) : rand() < 0.12 ? "ESCALATED" : rand() < 0.75 ? "CLOSED" : "RESOLVED";
      const linked = patrolIds.find((p) => p.day === day && rand() < 0.6);
      const resolvedAt = status === "RESOLVED" || status === "CLOSED" || status === "ESCALATED" ? new Date(occurredAt.getTime() + int(20, 240) * 60_000) : null;
      const inc = await prisma.$transaction(async (tx) => {
        const number = await nextNumber("INCIDENT", tx, occurredAt);
        const created = await tx.incident.create({
          data: {
            number,
            type,
            severity,
            title: pick(def.titles),
            description: `${pick(def.titles)}. Signalement reçu ${pick(["par appel au poste", "par un riverain", "par la patrouille sur place", "par un agent de la circulation"])}. ${pick(["Plusieurs témoins présents.", "Aucun témoin identifié dans l'immédiat.", "Les secours ont été prévenus.", "Renfort demandé."])} Données de démonstration.`,
            occurredAt,
            reportedAt: new Date(occurredAt.getTime() + int(2, 25) * 60_000),
            locationText: `${pick(def.places)}, ${st.city ?? "N'Djamena"}`,
            latitude: 12.1 + rand() * 0.1,
            longitude: 15.02 + rand() * 0.1,
            regionId: st.regionId,
            stationId: st.id,
            status,
            patrolId: linked?.id ?? null,
            reportedById: reporter.id,
            resolvedAt,
            report: resolvedAt ? pick(REPORTS) : null,
            officers: { create: st.officers.slice(0, int(1, 3)).map((o, j) => ({ officerId: o.id, role: j === 0 ? "CHEF_INTERVENTION" : "INTERVENANT" })) },
            ...(stPersons.length && rand() < 0.6 ? { persons: { create: [{ personId: stPersons[int(0, stPersons.length - 1)].id, role: pick(["VICTIM", "WITNESS", "COMPLAINANT", "OTHER"]) }] } } : {}),
          },
          select: { id: true, number: true, title: true, description: true, type: true, occurredAt: true, locationText: true },
        });
        if (status === "ESCALATED") {
          const caseNumber = await nextNumber("CASE", tx, occurredAt);
          const k = await tx.case.create({
            data: { number: caseNumber, title: created.title, category: type === "THEFT" ? "THEFT" : type === "ASSAULT" ? "ASSAULT" : type === "DOMESTIC" ? "DOMESTIC_VIOLENCE" : type === "MISSING_PERSON" ? "MISSING_PERSON" : type === "TRAFFIC_ACCIDENT" ? "TRAFFIC_OFFENSE" : "PUBLIC_ORDER", description: `${created.description}\n\n[Escalated from incident ${created.number} — ${created.locationText}]`, occurredAt: created.occurredAt, reportedAt: resolvedAt ?? occurredAt, locationText: created.locationText, regionId: st.regionId, stationId: st.id, priority: severity === "CRITICAL" ? "URGENT" : severity === "HIGH" ? "HIGH" : "NORMAL", status: "UNDER_INVESTIGATION", createdById: planner.id, supervisorId: planner.id },
            select: { id: true },
          });
          await tx.incident.update({ where: { id: created.id }, data: { caseId: k.id } });
          await tx.caseEvent.create({ data: { caseId: k.id, kind: "CASE_CREATED", title: `Opened from incident ${created.number}`, description: created.title, actorId: planner.id, entityType: "Incident", entityId: created.id, occurredAt: resolvedAt ?? occurredAt } });
          escalated++;
        }
        return created;
      });
      void inc;
      incidents++;
    }
  }
  return { zones, vehicles, patrols, incidents, escalated };
}
