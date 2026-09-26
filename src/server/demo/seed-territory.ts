/**
 * Territorial referential + DEMO police structures (idempotent).
 *
 * OFFICIAL referential (isDemo = false): the 23 provinces of Chad with their capitals, and the
 * 10 arrondissements of the city of N'Djamena. Nothing else is asserted as official.
 * DEMO data (isDemo = true): administrative departments, communes, localities, police structures,
 * services, ranks and officers created for demonstration. Names of persons are fictional.
 */
import type { CommuneType, DepartmentType, RankCategory, StationStatus, StationType } from "@/generated/prisma/client";
import { prisma } from "@/server/db";

export const CHAD_PROVINCES: { code: string; name: string; capital: string }[] = [
  { code: "BAT", name: "Batha", capital: "Ati" },
  { code: "BEG", name: "Barh El Gazel", capital: "Moussoro" },
  { code: "BOR", name: "Borkou", capital: "Faya-Largeau" },
  { code: "CHB", name: "Chari-Baguirmi", capital: "Massenya" },
  { code: "ENE", name: "Ennedi-Est", capital: "Amdjarass" },
  { code: "ENO", name: "Ennedi-Ouest", capital: "Fada" },
  { code: "GUE", name: "Guéra", capital: "Mongo" },
  { code: "HAL", name: "Hadjer-Lamis", capital: "Massakory" },
  { code: "KAN", name: "Kanem", capital: "Mao" },
  { code: "LAC", name: "Lac", capital: "Bol" },
  { code: "LOC", name: "Logone Occidental", capital: "Moundou" },
  { code: "LOR", name: "Logone Oriental", capital: "Doba" },
  { code: "MAN", name: "Mandoul", capital: "Koumra" },
  { code: "MKE", name: "Mayo-Kebbi Est", capital: "Bongor" },
  { code: "MKO", name: "Mayo-Kebbi Ouest", capital: "Pala" },
  { code: "MOC", name: "Moyen-Chari", capital: "Sarh" },
  { code: "NDJ", name: "Ville de N'Djamena", capital: "N'Djamena" },
  { code: "OUA", name: "Ouaddaï", capital: "Abéché" },
  { code: "SAL", name: "Salamat", capital: "Am Timan" },
  { code: "SIL", name: "Sila", capital: "Goz Beïda" },
  { code: "TAN", name: "Tandjilé", capital: "Laï" },
  { code: "TIB", name: "Tibesti", capital: "Bardaï" },
  { code: "WAF", name: "Wadi Fira", capital: "Biltine" },
];

export const DEMO_RANKS: { code: string; name: string; level: number; category: RankCategory }[] = [
  { code: "CDIV", name: "Commissaire divisionnaire", level: 12, category: "COMMISSIONER" },
  { code: "CPR", name: "Commissaire principal", level: 11, category: "COMMISSIONER" },
  { code: "COM", name: "Commissaire de police", level: 10, category: "COMMISSIONER" },
  { code: "OPP", name: "Officier de police principal", level: 9, category: "OFFICER" },
  { code: "OP", name: "Officier de police", level: 8, category: "OFFICER" },
  { code: "IPP", name: "Inspecteur principal", level: 7, category: "INSPECTOR" },
  { code: "IP", name: "Inspecteur de police", level: 6, category: "INSPECTOR" },
  { code: "BC", name: "Brigadier-chef", level: 5, category: "NON_COMMISSIONED" },
  { code: "BRG", name: "Brigadier", level: 4, category: "NON_COMMISSIONED" },
  { code: "GPHC", name: "Gardien de la paix hors classe", level: 3, category: "CONSTABLE" },
  { code: "GP", name: "Gardien de la paix", level: 2, category: "CONSTABLE" },
  { code: "CIV", name: "Agent civil", level: 1, category: "CIVILIAN" },
];

type DemoStation = { code: string; name: string; type: StationType; status?: StationStatus; province: string; department?: string; commune?: string; parent?: string; city?: string; services?: [string, string, DepartmentType][] };

const STD_SERVICES: [string, string, DepartmentType][] = [
  ["CMD", "Commandement", "COMMAND"],
  ["ENQ", "Service des enquêtes", "INVESTIGATION"],
  ["PAT", "Service de patrouille", "PATROL"],
  ["GAV", "Service de garde à vue", "CUSTODY"],
  ["ADM", "Secrétariat & administration", "ADMINISTRATION"],
];

export const DEMO_STATIONS: DemoStation[] = [
  { code: "DGPN", name: "Direction Générale de la Police Nationale (DEMO)", type: "HEADQUARTERS", province: "NDJ", department: "DEP-NDJ", commune: "NDJ-ARR-01", city: "N'Djamena", services: [["CAB", "Cabinet", "COMMAND"], ["DRH", "Ressources humaines", "ADMINISTRATION"], ["DSI", "Systèmes d'information", "ADMINISTRATION"], ["PJ", "Direction de la police judiciaire", "INVESTIGATION"]] },
  { code: "CS-01", name: "Commissariat Central de N'Djamena (DEMO)", type: "CENTRAL_STATION", province: "NDJ", department: "DEP-NDJ", commune: "NDJ-ARR-01", city: "N'Djamena", services: [...STD_SERVICES, ["CIR", "Service de la circulation", "TRAFFIC"], ["PTS", "Police technique et scientifique", "FORENSICS"]] },
  { code: "PP-NDJ-01A", name: "Poste de police 1er arrondissement (DEMO)", type: "POST", province: "NDJ", department: "DEP-NDJ", commune: "NDJ-ARR-01", parent: "CS-01", city: "N'Djamena", services: [["ACC", "Accueil & plaintes", "ADMINISTRATION"]] },
  { code: "PP-NDJ-02A", name: "Poste de police 2e arrondissement (DEMO)", type: "POST", province: "NDJ", department: "DEP-NDJ", commune: "NDJ-ARR-02", parent: "CS-01", city: "N'Djamena", services: [["ACC", "Accueil & plaintes", "ADMINISTRATION"]] },
  { code: "BAC-NDJ", name: "Brigade anti-criminalité de N'Djamena (DEMO)", type: "UNIT", province: "NDJ", department: "DEP-NDJ", commune: "NDJ-ARR-01", parent: "CS-01", city: "N'Djamena", services: [["INT", "Interventions", "SPECIAL"]] },
  { code: "CA-NDJ-05", name: "Commissariat du 5e arrondissement (DEMO)", type: "STATION", province: "NDJ", department: "DEP-NDJ", commune: "NDJ-ARR-05", city: "N'Djamena", services: STD_SERVICES },
  { code: "PP-NDJ-05A", name: "Poste de police Chagoua (DEMO)", type: "POST", province: "NDJ", department: "DEP-NDJ", commune: "NDJ-ARR-05", parent: "CA-NDJ-05", city: "N'Djamena", services: [["ACC", "Accueil & plaintes", "ADMINISTRATION"]] },
  { code: "CA-NDJ-07", name: "Commissariat du 7e arrondissement (DEMO)", type: "STATION", province: "NDJ", department: "DEP-NDJ", commune: "NDJ-ARR-07", city: "N'Djamena", services: STD_SERVICES },
  { code: "CA-NDJ-09", name: "Commissariat de Walia (DEMO)", type: "STATION", status: "PLANNED", province: "NDJ", department: "DEP-NDJ", commune: "NDJ-ARR-09", city: "N'Djamena" },
  { code: "DP-LOC", name: "Direction provinciale du Logone Occidental (DEMO)", type: "PROVINCIAL_DIRECTION", province: "LOC", department: "DEP-LOC-LACWEY", city: "Moundou", services: [["CMD", "Commandement", "COMMAND"], ["ADM", "Administration", "ADMINISTRATION"]] },
  { code: "NS-01", name: "Commissariat Central de Moundou (DEMO)", type: "CENTRAL_STATION", province: "LOC", department: "DEP-LOC-LACWEY", commune: "LOC-MOUNDOU", city: "Moundou", services: STD_SERVICES },
  { code: "PP-MDU-01", name: "Poste de police Doyon (DEMO)", type: "POST", province: "LOC", department: "DEP-LOC-LACWEY", commune: "LOC-MOUNDOU", parent: "NS-01", city: "Moundou", services: [["ACC", "Accueil & plaintes", "ADMINISTRATION"]] },
  { code: "DP-OUA", name: "Direction provinciale du Ouaddaï (DEMO)", type: "PROVINCIAL_DIRECTION", province: "OUA", department: "DEP-OUA-ABECHE", city: "Abéché", services: [["CMD", "Commandement", "COMMAND"]] },
  { code: "CC-ABE", name: "Commissariat Central d'Abéché (DEMO)", type: "CENTRAL_STATION", province: "OUA", department: "DEP-OUA-ABECHE", commune: "OUA-ABECHE", city: "Abéché", services: STD_SERVICES },
  { code: "PP-ABE-01", name: "Poste de police Abéché-Nord (DEMO)", type: "POST", status: "UNDER_CONSTRUCTION", province: "OUA", department: "DEP-OUA-ABECHE", commune: "OUA-ABECHE", parent: "CC-ABE", city: "Abéché" },
  { code: "CC-SRH", name: "Commissariat Central de Sarh (DEMO)", type: "CENTRAL_STATION", province: "MOC", department: "DEP-MOC-BARHKOH", commune: "MOC-SARH", city: "Sarh", services: STD_SERVICES },
];

/** DEMO administrative departments and communes (fictional codes; N'Djamena arrondissements are official). */
const DEMO_DEPARTMENTS: { code: string; name: string; province: string; capital?: string; isDemo: boolean }[] = [
  { code: "DEP-NDJ", name: "Ville de N'Djamena", province: "NDJ", capital: "N'Djamena", isDemo: false },
  { code: "DEP-LOC-LACWEY", name: "Lac Wey (DEMO)", province: "LOC", capital: "Moundou", isDemo: true },
  { code: "DEP-OUA-ABECHE", name: "Ouara (DEMO)", province: "OUA", capital: "Abéché", isDemo: true },
  { code: "DEP-MOC-BARHKOH", name: "Barh Köh (DEMO)", province: "MOC", capital: "Sarh", isDemo: true },
];

const DEMO_COMMUNES: { code: string; name: string; department: string; type: CommuneType; isDemo: boolean }[] = [
  ...Array.from({ length: 10 }, (_, i) => ({ code: `NDJ-ARR-${String(i + 1).padStart(2, "0")}`, name: `${i + 1}${i === 0 ? "er" : "e"} arrondissement`, department: "DEP-NDJ", type: "ARRONDISSEMENT" as CommuneType, isDemo: false })),
  { code: "LOC-MOUNDOU", name: "Commune de Moundou (DEMO)", department: "DEP-LOC-LACWEY", type: "COMMUNE", isDemo: true },
  { code: "OUA-ABECHE", name: "Commune d'Abéché (DEMO)", department: "DEP-OUA-ABECHE", type: "COMMUNE", isDemo: true },
  { code: "MOC-SARH", name: "Commune de Sarh (DEMO)", department: "DEP-MOC-BARHKOH", type: "COMMUNE", isDemo: true },
];

const DEMO_LOCALITIES: { name: string; commune: string }[] = [
  { name: "Farcha (DEMO)", commune: "NDJ-ARR-01" },
  { name: "Klémat (DEMO)", commune: "NDJ-ARR-02" },
  { name: "Chagoua (DEMO)", commune: "NDJ-ARR-05" },
  { name: "Moursal (DEMO)", commune: "NDJ-ARR-06" },
  { name: "Walia (DEMO)", commune: "NDJ-ARR-09" },
  { name: "Doyon (DEMO)", commune: "LOC-MOUNDOU" },
];

// Deterministic fictional names (no real persons).
const FIRST = ["Mahamat", "Abakar", "Idriss", "Hissein", "Adoum", "Moussa", "Brahim", "Ousmane", "Saleh", "Abdoulaye", "Youssouf", "Djimet", "Kemsol", "Nadjita", "Haroun", "Zakaria", "Souleymane", "Issa", "Fatimé", "Achta", "Zara", "Aïcha", "Khadidja", "Hawa", "Mariam", "Amné", "Halimé", "Ndilbé", "Clarisse", "Kaltouma"];
const LAST = ["Saleh", "Nassour", "Djimet", "Haroun", "Adoum", "Moussa", "Brahim", "Abdoulaye", "Mahamoud", "Zakaria", "Nadjita", "Ngarbaroum", "Djasrabé", "Allamine", "Abdelkerim", "Oumar", "Abakar", "Hassan", "Youssouf", "Tahir", "Bichara", "Ali", "Mbaïro", "Dingamnayal", "Ngakoutou", "Djimadoum", "Abbo", "Djibrine", "Ngaryo", "Kemba"];
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

export async function seedTerritory() {
  const org = await prisma.organization.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" } });
  if (!org) throw new Error("organization missing (run foundation seed first)");
  await prisma.organization.update({ where: { id: org.id }, data: { name: "Police Nationale du Tchad", shortName: "PNT", description: "Organisation nationale (démonstration SIGPN-T). Le référentiel des provinces est officiel ; les structures policières sont fictives." } });

  // Legacy fictional regions from the Phase 1 seed become real provinces (ids preserved so users stay attached).
  const legacy: Record<string, string> = { CEN: "NDJ", NOR: "LOC" };
  for (const [oldCode, newCode] of Object.entries(legacy)) {
    const old = await prisma.region.findUnique({ where: { code: oldCode } });
    if (old) {
      const p = CHAD_PROVINCES.find((x) => x.code === newCode)!;
      await prisma.region.update({ where: { id: old.id }, data: { code: p.code, name: p.name, capital: p.capital, isDemo: false } });
    }
  }
  for (const p of CHAD_PROVINCES) {
    await prisma.region.upsert({ where: { code: p.code }, update: { name: p.name, capital: p.capital, isDemo: false }, create: { organizationId: org.id, code: p.code, name: p.name, capital: p.capital, isDemo: false } });
  }
  const provinces = new Map((await prisma.region.findMany({ select: { id: true, code: true } })).map((r) => [r.code, r.id]));

  for (const d of DEMO_DEPARTMENTS) {
    await prisma.adminDepartment.upsert({ where: { code: d.code }, update: { name: d.name, capital: d.capital ?? null, isDemo: d.isDemo }, create: { regionId: provinces.get(d.province)!, code: d.code, name: d.name, capital: d.capital ?? null, isDemo: d.isDemo } });
  }
  const departments = new Map((await prisma.adminDepartment.findMany({ select: { id: true, code: true } })).map((r) => [r.code, r.id]));
  for (const c of DEMO_COMMUNES) {
    await prisma.commune.upsert({ where: { code: c.code }, update: { name: c.name, type: c.type, isDemo: c.isDemo }, create: { adminDepartmentId: departments.get(c.department)!, code: c.code, name: c.name, type: c.type, isDemo: c.isDemo } });
  }
  const communes = new Map((await prisma.commune.findMany({ select: { id: true, code: true } })).map((r) => [r.code, r.id]));
  for (const l of DEMO_LOCALITIES) {
    const communeId = communes.get(l.commune)!;
    const exists = await prisma.locality.findFirst({ where: { communeId, name: l.name } });
    if (!exists) await prisma.locality.create({ data: { communeId, name: l.name, type: "QUARTIER", isDemo: true } });
  }

  for (const r of DEMO_RANKS) {
    await prisma.rank.upsert({ where: { code: r.code }, update: { name: r.name, level: r.level, category: r.category }, create: r });
  }

  // Stations: parents first (order of the array guarantees parents precede children).
  for (const s of DEMO_STATIONS) {
    const parentId = s.parent ? (await prisma.station.findUnique({ where: { code: s.parent }, select: { id: true } }))?.id ?? null : null;
    const data = {
      regionId: provinces.get(s.province)!,
      adminDepartmentId: s.department ? departments.get(s.department) ?? null : null,
      communeId: s.commune ? communes.get(s.commune) ?? null : null,
      parentId,
      name: s.name,
      type: s.type,
      status: s.status ?? ("ACTIVE" as StationStatus),
      isActive: (s.status ?? "ACTIVE") === "ACTIVE",
      city: s.city ?? null,
      isDemo: true,
    };
    const st = await prisma.station.upsert({ where: { code: s.code }, update: data, create: { code: s.code, ...data } });
    for (const [code, name, type] of s.services ?? []) {
      await prisma.department.upsert({ where: { stationId_code: { stationId: st.id, code } }, update: { name, type }, create: { stationId: st.id, code, name, type } });
    }
  }

  // Officers: a deterministic roster per active structure.
  const rand = rng(20260912);
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];
  const ranks = await prisma.rank.findMany({ select: { id: true, code: true } });
  const rankId = (code: string) => ranks.find((r) => r.code === code)!.id;
  const stations = await prisma.station.findMany({ where: { isDemo: true, isActive: true }, include: { departments: true } });
  let created = 0;
  let seq = 1;
  for (const st of stations) {
    const headcount = st.type === "HEADQUARTERS" ? 12 : st.type === "CENTRAL_STATION" ? 14 : st.type === "PROVINCIAL_DIRECTION" ? 6 : st.type === "STATION" ? 8 : st.type === "UNIT" ? 6 : 4;
    const profile = st.type === "HEADQUARTERS" || st.type === "PROVINCIAL_DIRECTION" ? ["CDIV", "CPR", "COM", "OPP", "OP", "IPP", "IP", "BC", "CIV"] : st.type === "CENTRAL_STATION" || st.type === "STATION" ? ["COM", "OPP", "OP", "IPP", "IP", "BC", "BRG", "GPHC", "GP", "GP", "GP"] : ["IP", "BC", "BRG", "GP", "GP"];
    for (let i = 0; i < headcount; i++) {
      const badge = `${st.code}-${String(i + 1).padStart(3, "0")}`;
      if (await prisma.officer.findUnique({ where: { badgeNumber: badge } })) continue;
      const firstName = pick(FIRST);
      const lastName = pick(LAST);
      const gender = ["Fatimé", "Achta", "Zara", "Aïcha", "Khadidja", "Hawa", "Mariam", "Amné", "Halimé", "Ndilbé", "Clarisse", "Kaltouma"].includes(firstName) ? "FEMALE" : "MALE";
      const dep = st.departments.length ? st.departments[i % st.departments.length] : null;
      const rk = i === 0 ? profile[0] : profile[Math.min(profile.length - 1, 1 + Math.floor(rand() * (profile.length - 1)))];
      const hired = new Date(2005 + Math.floor(rand() * 18), Math.floor(rand() * 12), 1 + Math.floor(rand() * 27));
      const o = await prisma.officer.create({
        data: { badgeNumber: badge, firstName, lastName, gender, dateOfBirth: new Date(1970 + Math.floor(rand() * 28), Math.floor(rand() * 12), 1 + Math.floor(rand() * 27)), phone: `+235 6${String(10000000 + Math.floor(rand() * 89999999)).slice(0, 7)}`, rankId: rankId(rk), stationId: st.id, departmentId: dep?.id ?? null, hiredAt: hired, dutyStatus: rand() < 0.85 ? "ON_DUTY" : rand() < 0.5 ? "OFF_DUTY" : "ON_LEAVE" },
      });
      await prisma.officerAssignment.create({ data: { officerId: o.id, stationId: st.id, departmentId: dep?.id ?? null, rankId: o.rankId, startDate: hired, reason: "Affectation initiale (DEMO)" } });
      if (i === 0 && !st.commanderId) await prisma.station.update({ where: { id: st.id }, data: { commanderId: o.id } });
      if (dep && i < st.departments.length && !dep.headId && i > 0) await prisma.department.update({ where: { id: dep.id }, data: { headId: o.id } });
      created++;
      seq++;
    }
  }
  void seq;
  return { provinces: provinces.size, departments: departments.size, communes: communes.size, stations: stations.length, officers: created };
}
