/**
 * Traffic offences and fines — unit tests (no database, no server).
 *   npx tsx --test tests/unit/traffic.test.ts
 */
import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { TRAFFIC_CATEGORIES_SOURCE, TRAFFIC_SOURCE_DOCUMENT, TRAFFIC_VIOLATIONS_SOURCE } from "../../src/server/traffic/data/violations-source";
import { sealTicket, verifySeal, type SealableTicket } from "../../src/server/traffic/seal";
import { controlSchema, fineStatusSchema, normalizePlate, paymentSchema } from "../../src/server/traffic/schemas";
import { fmtClassText, fmtFcfa, fmtFcfaPlain, groupThousands, licenceState } from "../../src/lib/traffic-format";
import { SYSTEM_ROLES } from "../../src/server/rbac/roles";
import { PERMISSION_CATALOG } from "../../src/server/rbac/permissions";
import { translateMessage } from "../../src/lib/i18n/errors";
import { fr } from "../../src/lib/i18n/fr";
import { ar } from "../../src/lib/i18n/ar";
import { TRAFFIC_FINE_STATUS, TRAFFIC_OFFENCE_CLASS, TRAFFIC_PAYMENT_METHOD } from "../../src/lib/labels";

const V = TRAFFIC_VIOLATIONS_SOURCE;
const byCode = (c: string) => V.find((v) => v.code === c)!;

test("catalogue: 82 offences — 67 road, 7 cycles and motorcycles, 8 moto-taxis — with unique sequential codes", () => {
  assert.equal(V.length, 82);
  const count = (c: string) => V.filter((v) => v.category === c).length;
  assert.deepEqual([count("ROAD"), count("CYCLE_MOTORCYCLE"), count("MOTO_TAXI")], [67, 7, 8]);
  assert.equal(new Set(V.map((v) => v.code)).size, 82);
  V.forEach((v, i) => {
    assert.equal(v.order, i + 1);
    assert.equal(v.code, `TRF-${String(i + 1).padStart(3, "0")}`);
  });
  assert.equal(TRAFFIC_CATEGORIES_SOURCE.length, 3);
  assert.equal(new Set(V.map((v) => v.reference)).size, 75, "75 distinct legal references (some offences share one)");
});

test("catalogue: every amount is exactly the one printed in the source; délits have no amount", () => {
  for (const v of V) {
    if (v.offenceClass === "DELIT") {
      assert.equal(v.amountFcfa, null, v.code);
      assert.match(v.amountText, /Interdiction d’arbitrer/, v.code);
      assert.ok(v.sourceNote?.includes("Interdiction d’arbitrer"), `${v.code} délit is flagged`);
    } else {
      assert.equal(v.amountFcfa, Number(v.amountText.replace(/\D/g, "")), `${v.code} amount matches its printed text`);
    }
  }
  assert.equal(V.filter((v) => v.offenceClass === "DELIT").length, 8);
  assert.deepEqual([...new Set(V.filter((v) => v.amountFcfa !== null).map((v) => v.amountFcfa))].sort((a, b) => a! - b!), [2200, 2400, 3600, 25000]);
});

test("catalogue: source anomalies are kept as printed and only flagged (never corrected)", () => {
  assert.equal(byCode("TRF-002").name, "Arrêt interdit");
  assert.equal(byCode("TRF-002").amountFcfa, 2200, "3ème classe at 2 200 while the other 3ème rows are 3 600");
  assert.ok(byCode("TRF-002").sourceNote?.includes("différent du taux"));
  for (const c of ["TRF-039", "TRF-040"]) {
    assert.equal(byCode(c).classText, "4eme");
    assert.equal(byCode(c).amountFcfa, 3600, `${c}: 4ème classe at 3 600 as printed`);
  }
  assert.equal(byCode("TRF-078").name, "Défait de la licence spéciale de transport SMT", "typo « Défait » kept");
  assert.equal(byCode("TRF-010").reference, "Art, 90, 91,742 CR");
  assert.equal(byCode("TRF-023").reference, "Art. 90, 91, A CR");
  assert.equal(byCode("TRF-009").reference, "Art, 74 CP, 200Code CIMA, 9 loi n°65/ Lt/ 9 du 22/05/1965");
  assert.equal(byCode("TRF-048").name, "Mauvaise stationnement ou stationnement interdit");
  assert.equal(byCode("TRF-043").name, "Excès de vitesse");
  assert.equal(byCode("TRF-043").amountFcfa, 25000);
});

test("catalogue: the eight moto-taxi offences named in the brief are present under the moto-taxi category", () => {
  const taxi = V.filter((v) => v.category === "MOTO_TAXI").map((v) => v.name);
  for (const start of ["Conduite sans âge requis", "Conduite sans permis exigé", "Conduite sans port d’un casque et gants", "Défait de la licence spéciale de transport SMT", "Défaut de la carte bleue", "Défaut de visite technique", "Défaut de paiement des droits", "Défaut de dispositif d’équipement d’une mototaxi"]) {
    assert.ok(taxi.some((n) => n.startsWith(start)), start);
  }
  assert.ok(V.filter((v) => v.category === "CYCLE_MOTORCYCLE").every((v) => v.reference.startsWith("Art.90, 91") || v.reference.startsWith("Art. 90")));
});

test("catalogue provenance: the dataset was generated from the exact PDF kept in docs/sources", () => {
  const pdf = readFileSync(path.resolve(process.cwd(), TRAFFIC_SOURCE_DOCUMENT.file));
  assert.equal(createHash("sha256").update(pdf).digest("hex"), TRAFFIC_SOURCE_DOCUMENT.sha256);
  assert.equal(TRAFFIC_SOURCE_DOCUMENT.pages, 5);
});

const ticket = (over: Partial<SealableTicket> = {}): SealableTicket => ({
  number: "PV-2026-000001",
  issuedAt: new Date("2026-09-26T10:00:00Z"),
  stationCode: "CS-01",
  issuedByUsername: "traffic.cs1",
  driver: { number: "PID-2026-000001", lastName: "Doe", firstName: "Jo" },
  plateNumber: "TD-1234-AB",
  offences: [{ code: "TRF-043", name: "Excès de vitesse", classText: "4eme", legalReference: "Art. 90, 91, 8 CR", amountText: "25 000 Fcfa", amountFcfa: 25000 }],
  totalFineFcfa: 25000,
  observations: null,
  ...over,
});

test("electronic seal: verifies the untouched PV and detects any alteration, or a different issuer", () => {
  const t = ticket();
  const seal = sealTicket(t, "user-1");
  assert.match(seal.contentHash, /^[0-9a-f]{64}$/);
  assert.equal(verifySeal(t, "user-1", seal), true);
  assert.equal(verifySeal(ticket({ totalFineFcfa: 1 }), "user-1", seal), false, "amount changed");
  assert.equal(verifySeal(ticket({ plateNumber: "TD-9999-ZZ" }), "user-1", seal), false, "plate changed");
  assert.equal(verifySeal(ticket({ observations: "x" }), "user-1", seal), false, "observations changed");
  assert.equal(verifySeal(t, "user-2", seal), false, "issuer is bound to the seal");
  const reordered = ticket({ offences: [...t.offences] });
  assert.equal(verifySeal(reordered, "user-1", seal), true, "offence order is canonical");
});

test("formatting: plates, thousands, class text, amounts isolated for right-to-left text", () => {
  assert.equal(normalizePlate("  td-1234-ab "), "TD-1234-AB");
  assert.equal(normalizePlate(""), null);
  assert.equal(groupThousands(25000), "25 000");
  assert.equal(fmtFcfaPlain(3600), "3 600 FCFA");
  assert.equal(fmtFcfaPlain(null), "—");
  assert.equal(fmtFcfa(2200), "⁦" + "2 200 FCFA" + "⁩");
  assert.equal(fmtClassText("3eme"), "3ème");
  assert.equal(fmtClassText("Délit"), "Délit");
  assert.equal(licenceState(null), "none");
  assert.equal(licenceState(new Date(Date.now() - 86_400_000)), "expired");
  assert.equal(licenceState(new Date(Date.now() + 10 * 86_400_000)), "expiring");
  assert.equal(licenceState(new Date(Date.now() + 400 * 86_400_000)), "valid");
});

test("control schema: accepts JSON numbers for coordinates, several offences, and refuses invalid coordinates", () => {
  const base = { controlledAt: "2026-09-26T10:00", location: "Avenue Mobutu", vehicleType: "CAR" };
  const ok = controlSchema.safeParse({ ...base, latitude: 12.13, longitude: 15.05, plateNumber: "TD-1234-AB", violationIds: ["a", "b"] });
  assert.equal(ok.success, true, JSON.stringify(ok.error?.issues));
  if (ok.success) {
    assert.equal(ok.data.latitude, 12.13);
    assert.deepEqual(ok.data.violationIds, ["a", "b"]);
  }
  assert.equal(controlSchema.safeParse({ ...base, latitude: 95 }).success, false);
  assert.equal(controlSchema.safeParse({ ...base, longitude: "abc" }).success, false);
  assert.equal(controlSchema.safeParse({ ...base, plateNumber: "??" }).success, false);
  assert.equal(controlSchema.safeParse({ ...base, location: "" }).success, false);
  assert.equal(controlSchema.safeParse({ ...base, violationIds: Array.from({ length: 21 }, (_, i) => String(i)) }).success, false);
});

test("payment and fine-status schemas", () => {
  assert.equal(paymentSchema.safeParse({ fineId: "f", amountFcfa: "3600", method: "CASH" }).success, true);
  assert.equal(paymentSchema.safeParse({ fineId: "f", amountFcfa: 0, method: "CASH" }).success, false);
  assert.equal(paymentSchema.safeParse({ fineId: "f", amountFcfa: 100, method: "BITCOIN" }).success, false);
  assert.equal(fineStatusSchema.safeParse({ fineId: "f", status: "CONTESTED", note: "x" }).success, true);
  assert.equal(fineStatusSchema.safeParse({ fineId: "f", status: "LOST" }).success, false);
});

test("roles: the payment permissions are held only by the finance/administration roles; read-only stays read-only", () => {
  const has = (role: string, p: string) => SYSTEM_ROLES.find((r) => r.code === role)!.permissions.includes(p as never);
  const holders = (p: string) => SYSTEM_ROLES.filter((r) => r.permissions.includes(p as never)).map((r) => r.code).sort();
  assert.deepEqual(holders("traffic:payment_record"), ["POLICE_ADMIN", "TRAFFIC_PAYMENT_MANAGER"]);
  assert.deepEqual(holders("traffic:payment_void"), ["POLICE_ADMIN", "TRAFFIC_PAYMENT_MANAGER"]);
  assert.deepEqual(holders("traffic:catalog_manage"), ["POLICE_ADMIN"]);
  for (const p of PERMISSION_CATALOG.map(([c]) => c).filter((c) => c.startsWith("traffic:"))) {
    assert.ok(!has("SUPER_ADMIN", p) && !has("SECURITY_ADMIN", p), `the platform administrators hold no traffic permission (${p})`);
    if (!p.endsWith("_view") && p !== "traffic:view" && p !== "traffic:dashboard") assert.ok(!has("TRAFFIC_READONLY", p), `read-only role must not hold ${p}`);
  }
  assert.ok(has("TRAFFIC_CONTROL_AGENT", "traffic:control_create") && !has("TRAFFIC_CONTROL_AGENT", "traffic:drivers_manage"));
  assert.ok(has("TRAFFIC_OFFICER", "traffic:drivers_manage") && !has("TRAFFIC_OFFICER", "traffic:ticket_cancel"));
  assert.ok(has("TRAFFIC_SUPERVISOR", "traffic:ticket_cancel") && !has("TRAFFIC_SUPERVISOR", "traffic:payment_record"));
  assert.ok(!has("AUDITOR", "traffic:control_create") && has("AUDITOR", "traffic:view"), "auditors read but never act");
  for (const r of ["TRAFFIC_SUPERVISOR", "TRAFFIC_PAYMENT_MANAGER", "POLICE_ADMIN"]) assert.equal(SYSTEM_ROLES.find((x) => x.code === r)!.requiresMfa, true, `${r} requires MFA`);
});

test("i18n: enumerations and service messages of the module are translated in French and Arabic", () => {
  for (const map of [TRAFFIC_FINE_STATUS, TRAFFIC_OFFENCE_CLASS, TRAFFIC_PAYMENT_METHOD]) for (const [k, d] of Object.entries(map)) assert.ok(d.fr && d.ar, k);
  assert.equal(TRAFFIC_FINE_STATUS.TO_PAY.fr, "À payer");
  assert.equal(TRAFFIC_FINE_STATUS.PARTIALLY_PAID.fr, "Partiellement payée");
  assert.equal(TRAFFIC_FINE_STATUS.CONTESTED.fr, "Contestée");
  assert.equal(translateMessage("The fine is already fully paid.", "fr"), "L'amende est déjà entièrement payée.");
  assert.equal(translateMessage("The amount exceeds the remaining balance (2200 FCFA).", "fr"), "Le montant dépasse le solde restant (2200 FCFA).");
  assert.ok(/[؀-ۿ]/.test(translateMessage("Cannot move a fine from PAID to CANCELLED.", "ar")));
  assert.equal(translateMessage("Too small: expected string to have >=10 characters", "fr"), "10 caractère(s) minimum.");
  assert.equal(fr["app.short"], "SIGPN-T");
  assert.equal(ar["app.short"], "SIGPN-T");
  assert.match(fr["app.name"], /^Système Intégré de Gestion Numérique de la Police Nationale du Tchad$/);
});
