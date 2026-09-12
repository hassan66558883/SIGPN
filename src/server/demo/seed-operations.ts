/**
 * DEMO operational data (idempotent, deterministic, fictional): positions, trainings, persons,
 * complaints (all workflow states) and cases with parties, tasks, notes and timeline.
 * Only runs when the register is empty (person count = 0) so re-seeding never duplicates.
 */
import type { CaseStatus, ComplaintStatus, OffenseCategory, PartyRole, Priority } from "@/generated/prisma/client";
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
const rand = rng(20260913);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
const daysAgo = (d: number, h = 9) => {
  const x = new Date();
  x.setDate(x.getDate() - d);
  x.setHours(h, int(0, 59), 0, 0);
  return x;
};

export const DEMO_POSITIONS = [
  { code: "COMMISSAIRE", name: "Commissaire de police (chef de structure)" },
  { code: "ADJOINT", name: "Commissaire adjoint" },
  { code: "CHEF_SERVICE", name: "Chef de service" },
  { code: "OPJ", name: "Officier de police judiciaire" },
  { code: "APJ", name: "Agent de police judiciaire" },
  { code: "CHEF_POSTE", name: "Chef de poste" },
  { code: "PERMANENCIER", name: "Agent de permanence / accueil" },
  { code: "PATROUILLEUR", name: "Agent de patrouille" },
  { code: "GREFFIER", name: "Greffier de garde à vue" },
  { code: "SECRETAIRE", name: "Secrétaire" },
];

const MALE = ["Mahamat", "Abakar", "Idriss", "Hissein", "Adoum", "Moussa", "Brahim", "Ousmane", "Saleh", "Abdoulaye", "Youssouf", "Djimet", "Kemsol", "Nadjita", "Haroun", "Zakaria", "Souleymane", "Issa", "Hamid", "Tahir"];
const FEMALE = ["Fatimé", "Achta", "Zara", "Aïcha", "Khadidja", "Hawa", "Mariam", "Amné", "Halimé", "Ndilbé", "Clarisse", "Kaltouma", "Hadjé", "Falmata", "Mounira"];
const LAST = ["Saleh", "Nassour", "Djimet", "Haroun", "Adoum", "Moussa", "Brahim", "Abdoulaye", "Mahamoud", "Zakaria", "Nadjita", "Ngarbaroum", "Djasrabé", "Allamine", "Abdelkerim", "Oumar", "Abakar", "Hassan", "Youssouf", "Tahir", "Bichara", "Ali", "Mbaïro", "Dingamnayal", "Ngakoutou", "Djimadoum", "Abbo", "Djibrine", "Ngaryo", "Kemba"];
const OCCUPATIONS = ["Commerçant(e)", "Chauffeur", "Enseignant(e)", "Étudiant(e)", "Agriculteur", "Éleveur", "Mécanicien", "Couturière", "Fonctionnaire", "Vendeur(se)", "Gardien", "Infirmier(ère)", "Sans profession", "Transporteur", "Coiffeuse"];
const QUARTIERS: Record<string, string[]> = {
  NDJ: ["Farcha", "Chagoua", "Moursal", "Walia", "Dembé", "Abena", "Ridina", "Klémat", "Gassi", "Diguel", "Ndjari", "Habbena"],
  LOC: ["Doyon", "Djarabé", "Guelkol", "Kabbé"],
  OUA: ["Kamina", "Sinelou", "Dadjo", "Goz Amir"],
  MOC: ["Bornou", "Kassaï", "Begou", "Kemkian"],
};

const CATEGORIES: OffenseCategory[] = ["THEFT", "ASSAULT", "BURGLARY", "FRAUD", "ROBBERY", "DOMESTIC_VIOLENCE", "PROPERTY_DAMAGE", "TRAFFIC_OFFENSE", "PUBLIC_ORDER", "MISSING_PERSON", "DRUG_OFFENSE", "CYBERCRIME"];
const TITLES: Record<string, string[]> = {
  THEFT: ["Vol de téléphone portable au marché", "Vol de motocyclette devant le domicile", "Vol de sac à main à l'arrêt de bus", "Vol de marchandises dans une boutique"],
  ASSAULT: ["Coups et blessures lors d'une dispute de voisinage", "Agression à la sortie d'un débit de boissons", "Bagarre entre conducteurs de moto-taxi"],
  BURGLARY: ["Cambriolage d'une habitation en l'absence des occupants", "Effraction dans un magasin de nuit", "Cambriolage d'un bureau d'ONG"],
  FRAUD: ["Escroquerie par faux transfert d'argent mobile", "Vente d'une parcelle par un faux propriétaire", "Arnaque à l'emploi contre paiement de frais"],
  ROBBERY: ["Braquage d'un commerçant à la fermeture", "Vol à main armée sur la route de l'aéroport"],
  DOMESTIC_VIOLENCE: ["Violences conjugales signalées par une voisine", "Violences sur mineur au domicile familial"],
  PROPERTY_DAMAGE: ["Dégradation d'un véhicule stationné", "Bris de vitrine d'un commerce"],
  TRAFFIC_OFFENSE: ["Délit de fuite après accrochage", "Conduite dangereuse d'un minibus"],
  PUBLIC_ORDER: ["Tapage nocturne répété", "Attroupement violent après un match"],
  MISSING_PERSON: ["Disparition inquiétante d'un adolescent", "Disparition d'une personne âgée désorientée"],
  DRUG_OFFENSE: ["Vente présumée de stupéfiants près d'un lycée"],
  CYBERCRIME: ["Usurpation d'identité sur les réseaux sociaux", "Piratage d'un compte de paiement mobile"],
};

export async function seedOperations() {
  // positions (referential, idempotent)
  for (const p of DEMO_POSITIONS) await prisma.position.upsert({ where: { code: p.code }, update: { name: p.name }, create: p });
  const positions = await prisma.position.findMany();
  const posByCode = new Map(positions.map((p) => [p.code, p.id]));

  // assign positions to officers lacking one (commanders/heads/first officers)
  const stations = await prisma.station.findMany({ where: { isDemo: true, isActive: true }, include: { officers: { where: { isActive: true, deletedAt: null }, orderBy: { badgeNumber: "asc" } }, departments: true } });
  let positioned = 0;
  for (const st of stations) {
    for (const [i, o] of st.officers.entries()) {
      if (o.positionId) continue;
      const code = o.id === st.commanderId ? (st.type === "POST" ? "CHEF_POSTE" : "COMMISSAIRE") : st.departments.some((d) => d.headId === o.id) ? "CHEF_SERVICE" : i % 5 === 1 ? "OPJ" : i % 5 === 2 ? "APJ" : i % 5 === 3 ? "PATROUILLEUR" : "PERMANENCIER";
      await prisma.officer.update({ where: { id: o.id }, data: { positionId: posByCode.get(code) } });
      await prisma.officerAssignment.updateMany({ where: { officerId: o.id, endDate: null }, data: { positionId: posByCode.get(code), position: DEMO_POSITIONS.find((p) => p.code === code)!.name } });
      positioned++;
    }
  }

  // trainings (a few per structure)
  const TRAININGS = ["Formation initiale de gardien de la paix", "Police judiciaire — procédure pénale", "Techniques d'audition et de recueil de témoignage", "Gestion de la garde à vue et droits des personnes", "Premiers secours", "Maintien de l'ordre et gestion de foule", "Cybercriminalité — initiation", "Police de proximité", "Déontologie et droits humains", "Conduite de véhicules d'intervention"];
  let trainingsCreated = 0;
  if ((await prisma.training.count()) === 0) {
    const officers = await prisma.officer.findMany({ where: { isActive: true, deletedAt: null }, select: { id: true } });
    for (const o of officers) {
      const n = int(0, 2);
      for (let i = 0; i < n; i++) {
        const start = daysAgo(int(30, 1500));
        const status = rand() < 0.75 ? "COMPLETED" : rand() < 0.5 ? "PLANNED" : "IN_PROGRESS";
        await prisma.training.create({ data: { officerId: o.id, title: pick(TRAININGS), provider: pick(["École nationale de police (DEMO)", "Centre de formation régional (DEMO)", "Partenaire international (DEMO)"]), category: pick(["Initiale", "Continue", "Spécialisée"]), startDate: start, endDate: status === "COMPLETED" ? new Date(start.getTime() + int(3, 20) * 86_400_000) : null, status, result: status === "COMPLETED" ? pick(["Admis", "Admis avec mention", "Certifié"]) : null, certificateNo: status === "COMPLETED" ? `CERT-${int(1000, 9999)}-${int(10, 99)}` : null } });
        trainingsCreated++;
      }
    }
  }

  // persons / complaints / cases — only when the register is empty
  if ((await prisma.person.count()) > 0) return { positioned, trainingsCreated, persons: 0, complaints: 0, cases: 0 };

  const opStations = stations.filter((s) => ["CENTRAL_STATION", "STATION", "POST"].includes(s.type));
  const users = await prisma.user.findMany({ where: { status: "ACTIVE", deletedAt: null }, select: { id: true, stationId: true, regionId: true, role: { select: { code: true, permissions: { select: { permission: { select: { code: true } } } } } } } });
  const investigatorsOf = (stationId: string) => users.filter((u) => u.stationId === stationId && u.role.permissions.some((p) => p.permission.code === "cases:update"));
  const deskOf = (stationId: string) => users.find((u) => u.stationId === stationId && u.role.permissions.some((p) => p.permission.code === "complaints:create")) ?? users.find((u) => u.role.code === "SUPER_ADMIN")!;
  const chiefOf = (stationId: string) => users.find((u) => u.stationId === stationId && u.role.permissions.some((p) => p.permission.code === "complaints:review")) ?? users.find((u) => u.role.code === "SUPER_ADMIN")!;

  // persons
  const persons: { id: string; stationId: string; regionId: string }[] = [];
  for (const st of opStations) {
    const provinceCode = (await prisma.region.findUnique({ where: { id: st.regionId }, select: { code: true } }))!.code;
    const n = st.type === "CENTRAL_STATION" ? 14 : st.type === "STATION" ? 9 : 4;
    for (let i = 0; i < n; i++) {
      const female = rand() < 0.45;
      const firstName = pick(female ? FEMALE : MALE);
      const lastName = pick(LAST);
      const p = await prisma.$transaction(async (tx) => {
        const number = await nextNumber("PERSON", tx);
        const created = await tx.person.create({
          data: { number, firstName, lastName, gender: female ? "FEMALE" : "MALE", dateOfBirth: new Date(1955 + int(0, 50), int(0, 11), int(1, 28)), placeOfBirth: pick(["N'Djamena", "Moundou", "Abéché", "Sarh", "Bongor", "Doba", "Mongo"]), nationality: "Tchadienne", maritalStatus: pick(["SINGLE", "MARRIED", "MARRIED", "WIDOWED", "UNKNOWN"]), occupation: pick(OCCUPATIONS), phone: rand() < 0.85 ? `+235 6${int(1000000, 9999999)}` : null, city: pick(QUARTIERS[provinceCode] ?? QUARTIERS.NDJ), regionId: st.regionId, stationId: st.id, createdById: deskOf(st.id).id },
        });
        if (rand() < 0.6) await tx.personIdentifier.create({ data: { personId: created.id, type: pick(["NATIONAL_ID", "NATIONAL_ID", "PASSPORT", "VOTER_CARD", "DRIVER_LICENSE"]), value: `${provinceCode}-${int(100000, 999999)}-${int(10, 99)}`, issuedBy: "République du Tchad (DEMO)" } });
        return created;
      });
      persons.push({ id: p.id, stationId: st.id, regionId: st.regionId });
    }
  }
  // a few relationships
  for (let i = 0; i < 12; i++) {
    const a = pick(persons);
    const b = pick(persons.filter((x) => x.id !== a.id && x.stationId === a.stationId));
    if (!b) continue;
    await prisma.personRelationship.upsert({ where: { fromPersonId_toPersonId_type: { fromPersonId: a.id, toPersonId: b.id, type: "RELATIVE" } }, update: {}, create: { fromPersonId: a.id, toPersonId: b.id, type: pick(["SPOUSE", "SIBLING", "NEIGHBOUR", "ASSOCIATE", "RELATIVE"]), notes: "Lien déclaré (DEMO)" } }).catch(() => null);
  }

  // complaints across the whole workflow + cases
  let complaints = 0;
  let cases = 0;
  const STATUS_MIX: ComplaintStatus[] = ["REGISTERED", "REGISTERED", "UNDER_REVIEW", "ASSIGNED", "ASSIGNED", "CONVERTED", "CONVERTED", "CONVERTED", "CLOSED", "REJECTED", "DRAFT"];
  for (const st of opStations) {
    const stPersons = persons.filter((p) => p.stationId === st.id);
    if (!stPersons.length) continue;
    const investigators = investigatorsOf(st.id);
    const desk = deskOf(st.id);
    const chief = chiefOf(st.id);
    const n = st.type === "CENTRAL_STATION" ? 11 : st.type === "STATION" ? 7 : 3;
    for (let i = 0; i < n; i++) {
      const status = STATUS_MIX[i % STATUS_MIX.length];
      const category = pick(CATEGORIES);
      const title = pick(TITLES[category] ?? TITLES.THEFT);
      const complainant = pick(stPersons);
      const received = daysAgo(int(1, 120));
      const priority: Priority = pick(["LOW", "NORMAL", "NORMAL", "NORMAL", "HIGH", "URGENT"]);
      const lead = investigators.length ? pick(investigators) : null;
      await prisma.$transaction(async (tx) => {
        const number = await nextNumber("COMPLAINT", tx);
        const c = await tx.complaint.create({
          data: {
            number,
            complainantId: complainant.id,
            category,
            title,
            description: `${title}. Les faits se seraient produits ${pick(["en soirée", "en matinée", "dans la nuit", "en fin d'après-midi"])} au quartier ${pick(QUARTIERS.NDJ)}. Le plaignant déclare ${pick(["avoir reconnu l'auteur", "n'avoir pas vu l'auteur", "avoir des témoins", "détenir des preuves (photos, messages)"])}. Données fictives de démonstration.`,
            incidentAt: new Date(received.getTime() - int(1, 72) * 3_600_000),
            receivedAt: received,
            locationText: `Quartier ${pick(QUARTIERS.NDJ)}, ${st.city ?? "N'Djamena"}`,
            regionId: st.regionId,
            stationId: st.id,
            priority,
            status,
            createdById: desk.id,
            ...(status !== "DRAFT" && status !== "REGISTERED" ? { reviewedById: chief.id, reviewedAt: new Date(received.getTime() + 3_600_000 * int(2, 48)), reviewNotes: pick(["Plainte recevable, à instruire.", "Éléments suffisants pour ouvrir une enquête.", "Compléter l'identité des témoins."]) } : {}),
            ...(status === "ASSIGNED" || status === "CONVERTED" ? { assignedToId: lead?.id ?? null } : {}),
            ...(status === "CLOSED" ? { closedAt: new Date(received.getTime() + 86_400_000 * int(2, 20)), closureReason: pick(["Règlement amiable entre les parties.", "Plaignant a retiré sa plainte.", "Objet restitué au plaignant."]) } : {}),
            ...(status === "REJECTED" ? { closedAt: new Date(received.getTime() + 86_400_000 * int(1, 5)), closureReason: pick(["Faits non constitutifs d'une infraction.", "Incompétence territoriale — orientée vers le commissariat compétent."]) } : {}),
          },
        });
        complaints++;
        if (status === "CONVERTED") {
          const caseNumber = await nextNumber("CASE", tx);
          const caseStatus: CaseStatus = pick(["ASSIGNED", "UNDER_INVESTIGATION", "UNDER_INVESTIGATION", "PENDING_REVIEW", "CLOSED"]);
          const k = await tx.case.create({
            data: {
              number: caseNumber,
              title,
              category,
              description: c.description,
              occurredAt: c.incidentAt,
              reportedAt: received,
              locationText: c.locationText,
              regionId: st.regionId,
              stationId: st.id,
              priority,
              status: caseStatus,
              leadId: lead?.id ?? null,
              supervisorId: chief.id,
              createdById: chief.id,
              ...(caseStatus === "CLOSED" ? { disposition: pick(["SOLVED", "REFERRED_TO_PROSECUTION", "DISMISSED"]), dispositionNotes: "Décision de démonstration.", closedAt: daysAgo(int(0, 10)) } : {}),
            },
          });
          await tx.complaint.update({ where: { id: c.id }, data: { caseId: k.id } });
          await tx.caseParty.create({ data: { caseId: k.id, personId: complainant.id, role: "COMPLAINANT", addedById: chief.id } });
          const others = stPersons.filter((p) => p.id !== complainant.id);
          const roles: PartyRole[] = ["VICTIM", "WITNESS", "SUSPECT"];
          for (const [j, role] of roles.entries()) {
            const p = others[(i + j) % others.length];
            if (!p) continue;
            await tx.caseParty.create({ data: { caseId: k.id, personId: p.id, role, status: role === "SUSPECT" ? "UNDER_INVESTIGATION" : "ACTIVE", notes: role === "WITNESS" ? "A assisté aux faits (DEMO)" : null, addedById: lead?.id ?? chief.id } }).catch(() => null);
          }
          if (lead) await tx.caseAssignment.create({ data: { caseId: k.id, userId: lead.id, role: "LEAD", assignedById: chief.id } });
          await tx.caseAssignment.create({ data: { caseId: k.id, userId: chief.id, role: "SUPERVISOR", assignedById: chief.id } });
          const tasks = ["Auditionner le plaignant", "Rechercher et auditionner les témoins", "Relever les indices sur les lieux", "Vérifier les enregistrements vidéo du secteur", "Identifier et convoquer le suspect"];
          for (const [j, tt] of tasks.slice(0, int(2, 5)).entries()) {
            await tx.task.create({ data: { caseId: k.id, title: tt, priority: j === 0 ? "HIGH" : "NORMAL", status: caseStatus === "CLOSED" ? "DONE" : j === 0 ? "DONE" : j === 1 ? "IN_PROGRESS" : "TODO", assignedToId: lead?.id ?? null, createdById: chief.id, dueAt: new Date(received.getTime() + 86_400_000 * (j + 3)), completedAt: caseStatus === "CLOSED" || j === 0 ? new Date(received.getTime() + 86_400_000 * (j + 2)) : null } });
          }
          await tx.caseNote.create({ data: { caseId: k.id, authorId: lead?.id ?? chief.id, content: pick(["Premières constatations effectuées sur les lieux. Aucune caméra exploitable.", "Le plaignant a fourni des captures d'écran des messages échangés.", "Le suspect présumé est connu des services pour des faits similaires (à vérifier)."]) } });
          const ev = [
            { kind: "CONVERTED_FROM_COMPLAINT", title: `Affaire ${caseNumber} ouverte à partir de la plainte ${number}`, at: c.reviewedAt ?? received },
            ...(lead ? [{ kind: "ASSIGNED", title: "Enquêteur principal affecté", at: new Date((c.reviewedAt ?? received).getTime() + 3_600_000) }] : []),
            { kind: "PARTY_ADDED", title: "Victime, témoin et suspect ajoutés", at: new Date((c.reviewedAt ?? received).getTime() + 2 * 3_600_000) },
            { kind: "TASK", title: "Tâches d'enquête créées", at: new Date((c.reviewedAt ?? received).getTime() + 3 * 3_600_000) },
            ...(caseStatus === "CLOSED" ? [{ kind: "DISPOSITION", title: "Affaire clôturée", at: daysAgo(int(0, 10)) }] : []),
          ];
          for (const e of ev) await tx.caseEvent.create({ data: { caseId: k.id, kind: e.kind, title: e.title, actorId: chief.id, occurredAt: e.at } });
          cases++;
        }
      });
    }
  }
  return { positioned, trainingsCreated, persons: persons.length, complaints, cases };
}
