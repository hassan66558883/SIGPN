/**
 * DEMO traffic data (idempotent, deterministic, fictional): drivers, vehicles, roadside controls over the last
 * eleven months, the resulting PV and fines (paid, unpaid, contested, cancelled) with receipts. Amounts are the
 * flat amounts of the imported catalogue. Runs only while no demo control exists.
 */
import { prisma } from "@/server/db";
import { randomToken } from "@/server/crypto";
import { nextNumber } from "@/server/sequences";
import { sealTicket } from "@/server/traffic/seal";

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
const rand = rng(20260926);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
const chance = (p: number) => rand() < p;
const daysAgo = (d: number, hour = int(6, 19)) => {
  const x = new Date(Date.now() - d * 86_400_000);
  x.setHours(hour, int(0, 59), int(0, 59), 0);
  return x;
};

const LOCATIONS = ["Avenue Charles de Gaulle", "Rond-point de la Paix", "Pont de Chagoua", "Route de Farcha", "Carrefour Gardolé", "Avenue Mobutu", "Marché de Dembé", "Poste de contrôle Nord", "Route de Moundou — sortie ville", "Carrefour Toukra", "Avenue Kassaï", "Boulevard du 1er Mars"];
const MAKES = [
  ["Toyota", "Corolla"], ["Toyota", "Hilux"], ["Toyota", "Land Cruiser"], ["Nissan", "Patrol"], ["Hyundai", "Accent"], ["Peugeot", "206"], ["Renault", "Logan"], ["Mitsubishi", "L200"],
] as const;
const MOTOS = [["Yamaha", "Crypton"], ["Haojue", "HJ125"], ["Honda", "CG125"], ["TVS", "Star"]] as const;
const COLORS = ["Blanc", "Noir", "Gris", "Rouge", "Bleu", "Jaune"];
const LICENSE_CATS = ["A", "B", "B", "B", "C", "D"];
// offences chosen by catalogue code, weighted toward the most frequent roadside offences
const COMMON = ["TRF-043", "TRF-043", "TRF-026", "TRF-026", "TRF-016", "TRF-016", "TRF-048", "TRF-002", "TRF-056", "TRF-054", "TRF-011", "TRF-012", "TRF-038", "TRF-039", "TRF-070", "TRF-076", "TRF-068", "TRF-059"];
const DELITS = ["TRF-009", "TRF-013", "TRF-014"];

export async function seedTraffic() {
  if ((await prisma.trafficControl.count({ where: { isDemo: true } })) > 0) return { drivers: 0, vehicles: 0, controls: 0, tickets: 0, fines: 0, payments: 0 };

  const violations = await prisma.trafficViolation.findMany({ include: { legalReference: true } });
  const byCode = new Map(violations.map((v) => [v.code, v]));
  const stations = await prisma.station.findMany({ where: { isDemo: true, isActive: true, type: { in: ["CENTRAL_STATION", "STATION"] } }, select: { id: true, code: true, regionId: true } });
  const officers = await prisma.user.findMany({ where: { status: "ACTIVE", deletedAt: null, stationId: { not: null }, role: { permissions: { some: { permission: { code: "traffic:control_create" } } } } }, select: { id: true, username: true, stationId: true } });
  const cashiers = await prisma.user.findMany({ where: { status: "ACTIVE", deletedAt: null, role: { permissions: { some: { permission: { code: "traffic:payment_record" } } } } }, select: { id: true, stationId: true } });
  const persons = await prisma.person.findMany({ where: { deletedAt: null, mergedIntoId: null }, select: { id: true, number: true, firstName: true, lastName: true }, take: 80, orderBy: { number: "asc" } });
  if (!stations.length || !officers.length || !cashiers.length || persons.length < 20 || !violations.length) return { drivers: 0, vehicles: 0, controls: 0, tickets: 0, fines: 0, payments: 0 };
  const creator = officers[0];

  // ---- drivers (licences), some expired
  let drivers = 0;
  const driverPersons = persons.slice(0, 36);
  const driverIds = new Map<string, string>();
  for (const [i, p] of driverPersons.entries()) {
    const expired = chance(0.15);
    const d = await prisma.trafficDriver.create({
      data: {
        personId: p.id,
        licenseNumber: `TD-PC-${String(2010 + i * 37).padStart(6, "0")}`,
        licenseCategory: pick(LICENSE_CATS),
        licenseIssuedAt: daysAgo(int(700, 3600), 9),
        licenseExpiresAt: expired ? daysAgo(int(10, 300), 9) : new Date(Date.now() + int(60, 1800) * 86_400_000),
        licenseIssuedBy: "Direction des transports terrestres (DEMO)",
        createdById: creator.id,
      },
      select: { id: true },
    });
    driverIds.set(p.id, d.id);
    drivers++;
  }

  // ---- vehicles
  let vehicles = 0;
  const vehicleRows: { id: string; plate: string; type: "CAR" | "PICKUP" | "MOTORCYCLE" | "MOTO_TAXI"; make: string; color: string; ownerId: string }[] = [];
  for (let i = 0; i < 48; i++) {
    const moto = i % 4 === 3;
    const type = moto ? (chance(0.5) ? "MOTO_TAXI" : "MOTORCYCLE") : i % 5 === 0 ? "PICKUP" : "CAR";
    const [make, model] = moto ? pick(MOTOS) : pick(MAKES);
    const plate = `TD-${String(1000 + i * 173 + int(0, 90)).slice(-4).padStart(4, "0")}-${String.fromCharCode(65 + (i % 26))}${String.fromCharCode(65 + ((i * 7) % 26))}`;
    const owner = pick(persons);
    const insExpired = chance(0.12);
    const techExpired = chance(0.1);
    const status = i === 7 ? "STOLEN" : i === 19 ? "SEIZED" : "ACTIVE";
    try {
      const v = await prisma.trafficVehicle.create({
        data: {
          plateNumber: plate,
          registrationCardNumber: `CG-${String(700000 + i * 31)}`,
          make,
          model,
          color: pick(COLORS),
          vehicleType: type,
          year: int(2004, 2024),
          ownerPersonId: owner.id,
          chassisNumber: `VIN${String(9000000 + i * 977)}`,
          insuranceCompany: pick(["Assurances Générales Tchadiennes (DEMO)", "Sahel Assurances (DEMO)"]),
          insurancePolicyNumber: `POL-${int(10000, 99999)}`,
          insuranceExpiresAt: insExpired ? daysAgo(int(5, 200)) : new Date(Date.now() + int(30, 330) * 86_400_000),
          technicalInspectionExpiresAt: techExpired ? daysAgo(int(5, 200)) : new Date(Date.now() + int(30, 330) * 86_400_000),
          status,
          createdById: creator.id,
        },
        select: { id: true, plateNumber: true },
      });
      vehicleRows.push({ id: v.id, plate: v.plateNumber, type: type as "CAR" | "PICKUP" | "MOTORCYCLE" | "MOTO_TAXI", make, color: pick(COLORS), ownerId: owner.id });
      vehicles++;
    } catch {
      /* a plate collision of the deterministic generator is simply skipped */
    }
  }

  // ---- controls, PV, fines, payments
  let controls = 0;
  let tickets = 0;
  let fines = 0;
  let payments = 0;
  const N = 150;
  for (let i = 0; i < N; i++) {
    const age = Math.floor(Math.pow(rand(), 0.85) * 330); // more recent controls than old ones
    const at = daysAgo(age);
    const st = pick(stations);
    const officer = officers.find((o) => o.stationId === st.id) ?? pick(officers);
    const station = officer.stationId ? (stations.find((s) => s.id === officer.stationId) ?? st) : st;
    const veh = pick(vehicleRows);
    const person = pick(driverPersons);
    const compliant = chance(0.25);
    const wantDelit = !compliant && chance(0.07);
    const codes = compliant ? [] : wantDelit ? [pick(DELITS)] : [...new Set([pick(COMMON), ...(chance(0.35) ? [pick(COMMON)] : []), ...(chance(0.08) ? [pick(COMMON)] : [])])];
    const lines = codes.map((c) => byCode.get(c)!).filter(Boolean);
    const total = lines.reduce((s, v) => s + (v.fineAmountFcfa ?? 0), 0);

    await prisma.$transaction(async (tx) => {
      const number = await nextNumber("TRAFFIC_CONTROL", tx, at);
      const control = await tx.trafficControl.create({
        data: {
          number,
          controlledAt: at,
          location: `${pick(LOCATIONS)}, N'Djamena`,
          latitude: 12.1 + rand() * 0.09,
          longitude: 15.02 + rand() * 0.08,
          stationId: station.id,
          regionId: station.regionId,
          officerId: officer.id,
          driverPersonId: person.id,
          driverId: driverIds.get(person.id) ?? null,
          licenseNumber: null,
          vehicleId: veh.id,
          plateNumber: veh.plate,
          vehicleType: veh.type,
          vehicleMake: veh.make,
          vehicleColor: veh.color,
          outcome: lines.length ? "INFRACTION" : "COMPLIANT",
          observations: lines.length ? "Contrôle de routine — données de démonstration." : "Documents en règle (démonstration).",
          isDemo: true,
        },
        select: { id: true },
      });
      controls++;
      if (!lines.length) return;

      const issuedAt = new Date(at.getTime() + int(4, 25) * 60_000);
      const ticketNumber = await nextNumber("TRAFFIC_TICKET", tx, issuedAt);
      const snap = lines.map((v) => ({ violationId: v.id, code: v.code, name: v.name, classText: v.classText, legalReference: v.legalReference.reference, amountFcfa: v.fineAmountFcfa, amountText: v.fineAmountText }));
      const seal = sealTicket({ number: ticketNumber, issuedAt, stationCode: station.code, issuedByUsername: officer.username, driver: { number: person.number, lastName: person.lastName, firstName: person.firstName }, plateNumber: veh.plate, offences: snap, totalFineFcfa: total, observations: "Contrôle de routine — données de démonstration." }, officer.id);
      const cancelled = chance(0.06);
      const ticket = await tx.trafficTicket.create({
        data: {
          number: ticketNumber,
          verificationToken: randomToken(18),
          controlId: control.id,
          issuedAt,
          stationId: station.id,
          regionId: station.regionId,
          issuedById: officer.id,
          driverPersonId: person.id,
          plateNumber: veh.plate,
          totalFineFcfa: total,
          hasNonSettleableOffence: snap.some((l) => l.amountFcfa === null),
          observations: "Contrôle de routine — données de démonstration.",
          contentHash: seal.contentHash,
          signature: seal.signature,
          signedAt: issuedAt,
          status: cancelled ? "CANCELLED" : "ISSUED",
          cancelledAt: cancelled ? new Date(issuedAt.getTime() + 86_400_000) : null,
          cancelledById: cancelled ? officer.id : null,
          cancellationReason: cancelled ? "PV établi par erreur sur le mauvais véhicule (démonstration)." : null,
          offences: { create: snap },
        },
        select: { id: true },
      });
      tickets++;
      if (total <= 0) return;

      const r = rand();
      const status = cancelled ? "CANCELLED" : r < 0.55 ? "PAID" : r < 0.8 ? "TO_PAY" : r < 0.9 ? "PENDING" : "CONTESTED";
      const fineNumber = await nextNumber("TRAFFIC_FINE", tx, issuedAt);
      const fine = await tx.trafficFine.create({
        data: {
          number: fineNumber,
          ticketId: ticket.id,
          status,
          amountFcfa: total,
          amountPaidFcfa: status === "PAID" ? total : 0,
          issuedAt,
          paidAt: null,
          driverPersonId: person.id,
          plateNumber: veh.plate,
          officerId: officer.id,
          stationId: station.id,
          regionId: station.regionId,
          contestedAt: status === "CONTESTED" ? new Date(issuedAt.getTime() + 2 * 86_400_000) : null,
          contestReason: status === "CONTESTED" ? "Le conducteur conteste les faits (démonstration)." : null,
          statusNote: status === "PENDING" ? "Dossier mis en attente dans l'attente de pièces (démonstration)." : status === "CANCELLED" ? "PV annulé : erreur de saisie (démonstration)." : null,
        },
        select: { id: true },
      });
      fines++;
      if (status !== "PAID") return;
      const paidAt = new Date(issuedAt.getTime() + int(1, 20) * 86_400_000);
      const method = pick(["CASH", "CASH", "MOBILE_MONEY", "MOBILE_MONEY", "ELECTRONIC", "BANK_TRANSFER"] as const);
      const cashier = cashiers.find((c) => c.stationId === station.id) ?? pick(cashiers);
      const paymentNumber = await nextNumber("TRAFFIC_PAYMENT", tx, paidAt);
      const payment = await tx.trafficPayment.create({
        data: {
          number: paymentNumber,
          fineId: fine.id,
          amountFcfa: total,
          method,
          provider: method === "MOBILE_MONEY" ? pick(["Airtel Money (DEMO)", "Moov Money (DEMO)"]) : null,
          transactionReference: method === "CASH" ? null : `DEMO-${randomToken(5).toUpperCase()}`,
          paidAt,
          receivedById: cashier.id,
          stationId: cashier.stationId,
          paymentPoint: "Régie des amendes (DEMO)",
        },
        select: { id: true },
      });
      const receiptNumber = await nextNumber("TRAFFIC_RECEIPT", tx, paidAt);
      await tx.trafficReceipt.create({ data: { number: receiptNumber, verificationToken: randomToken(18), paymentId: payment.id, fineId: fine.id, amountFcfa: total, issuedAt: paidAt, issuedById: cashier.id } });
      await tx.trafficFine.update({ where: { id: fine.id }, data: { paidAt } });
      payments++;
    });
  }
  return { drivers, vehicles, controls, tickets, fines, payments };
}
