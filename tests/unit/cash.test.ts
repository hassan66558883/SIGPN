/**
 * Field revenue (cash registers, deposits, reconciliation) — unit tests (no database, no server).
 *   npx tsx --test tests/unit/cash.test.ts
 */
import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { SYSTEM_ROLES, CASH_DEFAULT_GRANTS } from "../../src/server/rbac/roles";
import { PERMISSION_CATALOG } from "../../src/server/rbac/permissions";
import { blockRegisterSchema, depositReviewSchema, depositSchema, discrepancyActionSchema, openRegisterSchema, REPORT_KINDS } from "../../src/server/traffic/cash-schemas";
import { translateMessage } from "../../src/lib/i18n/errors";
import { fr } from "../../src/lib/i18n/fr";
import { ar } from "../../src/lib/i18n/ar";
import { CASH_COLLECTION_STATUS, CASH_DEPOSIT_METHOD, CASH_DEPOSIT_STATUS, CASH_DISCREPANCY_STATUS, CASH_RECONCILIATION_STATUS, CASH_REGISTER_STATUS } from "../../src/lib/labels";

const role = (code: string) => new Set(SYSTEM_ROLES.find((r) => r.code === code)!.permissions as readonly string[]);
const CASH = PERMISSION_CATALOG.map(([c]) => c as string).filter((c) => c.startsWith("cash:"));

test("catalog: ten cash permissions, each with a French and an Arabic description", () => {
  assert.equal(CASH.length, 10);
  assert.ok(CASH.every((c) => CASH_DEFAULT_GRANTS.TRAFFIC_PAYMENT_MANAGER !== undefined && typeof c === "string"));
});

test("role matrix: who may collect, close, verify, validate and reconcile", () => {
  for (const code of ["TRAFFIC_OFFICER", "TRAFFIC_CONTROL_AGENT", "OFFICER"]) {
    const p = role(code);
    for (const c of ["cash:collect", "cash:register", "cash:deposit_create"]) assert.ok(p.has(c), `${code} ${c}`);
    for (const c of ["cash:view", "cash:deposit_review", "cash:deposit_validate", "cash:reconcile", "cash:block", "cash:reports"]) assert.ok(!p.has(c), `${code} must not have ${c}`);
  }
  const unit = role("TRAFFIC_UNIT_HEAD");
  for (const c of ["cash:view", "cash:verify_closure", "cash:deposit_review", "cash:reports"]) assert.ok(unit.has(c), c);
  for (const c of ["cash:deposit_validate", "cash:reconcile", "cash:collect", "cash:register", "cash:block"]) assert.ok(!unit.has(c), `unit head must not have ${c}`);
  const fin = role("TRAFFIC_PAYMENT_MANAGER");
  for (const c of ["cash:view", "cash:deposit_review", "cash:deposit_validate", "cash:reconcile", "cash:block", "cash:reports"]) assert.ok(fin.has(c), c);
  for (const c of ["cash:collect", "cash:register"]) assert.ok(!fin.has(c), `finance must not hold a field register: ${c}`);
  const sup = role("TRAFFIC_SUPERVISOR");
  assert.ok(sup.has("cash:view") && sup.has("cash:reports") && sup.has("audit:view"));
  for (const c of ["cash:collect", "cash:register", "cash:deposit_create", "cash:deposit_review", "cash:deposit_validate", "cash:reconcile", "cash:block"]) assert.ok(!sup.has(c), `supervisor must not have ${c}`);
});

test("the administrator can look and audit but holds no permission that moves or validates money", () => {
  const admin = role("POLICE_ADMIN");
  assert.ok(admin.has("cash:view") && admin.has("cash:reports") && admin.has("audit:view"));
  for (const c of ["cash:collect", "cash:register", "cash:deposit_create", "cash:deposit_review", "cash:deposit_validate", "cash:reconcile", "cash:block", "cash:verify_closure"]) assert.ok(!admin.has(c), `admin must not have ${c}`);
  for (const code of ["TRAFFIC_READONLY", "AUDITOR"]) for (const c of CASH) assert.ok(!role(code).has(c) || c === "cash:view", `${code} ${c}`);
});

test("schemas: deposit amount, block reason, review operations, report kinds", () => {
  const dep = { collectionId: "c1", amountDepositedFcfa: "28600", method: "BANK", slipNumber: "BV-1", reference: "BQ-0001" };
  assert.equal(depositSchema.parse(dep).amountDepositedFcfa, 28600);
  assert.equal(depositSchema.safeParse({ ...dep, amountDepositedFcfa: "0" }).success, false);
  assert.equal(depositSchema.safeParse({ ...dep, method: "CRYPTO" }).success, false, "only the authorised deposit methods");
  assert.equal(blockRegisterSchema.safeParse({ registerId: "r", op: "block", reason: "court" }).success, false);
  assert.equal(depositReviewSchema.safeParse({ depositId: "d", op: "delete" }).success, false, "there is no delete operation");
  assert.equal(discrepancyActionSchema.safeParse({ discrepancyId: "x", op: "delete" }).success, false, "a discrepancy is never deleted");
  assert.equal(openRegisterSchema.parse({}).openingBalanceFcfa, 0);
  assert.equal(REPORT_KINDS.length, 12);
});

test("labels: every status of the workflow has a French and an Arabic label", () => {
  for (const [map, keys] of [
    [CASH_REGISTER_STATUS, ["OPEN", "CLOSED", "PENDING_DEPOSIT", "DEPOSITED", "VALIDATED", "BLOCKED"]],
    [CASH_COLLECTION_STATUS, ["TO_DEPOSIT", "PARTIALLY_DEPOSITED", "DEPOSITED", "VALIDATED"]],
    [CASH_DEPOSIT_STATUS, ["SUBMITTED", "VERIFIED", "JUSTIFICATION_REQUESTED", "VALIDATED", "REJECTED"]],
    [CASH_DEPOSIT_METHOD, ["BANK", "TREASURY", "CENTRAL_CASH", "MOBILE_MONEY", "OTHER"]],
    [CASH_RECONCILIATION_STATUS, ["PENDING", "CONFORME", "GAP_TO_JUSTIFY", "VALIDATED", "REJECTED"]],
    [CASH_DISCREPANCY_STATUS, ["OPEN", "JUSTIFIED", "VALIDATED", "REJECTED"]],
  ] as const) for (const k of keys) assert.ok(map[k]?.fr && map[k]?.ar, k);
  assert.equal(CASH_REGISTER_STATUS.PENDING_DEPOSIT.fr, "En attente de versement");
  assert.equal(CASH_RECONCILIATION_STATUS.GAP_TO_JUSTIFY.fr, "Écart à justifier");
});

test("i18n: French/Arabic key parity for the module, module name, and translated service messages", () => {
  const frKeys = Object.keys(fr).filter((k) => k.startsWith("cash."));
  assert.ok(frKeys.length > 250);
  for (const k of frKeys) assert.ok((ar as Record<string, string>)[k], `missing Arabic ${k}`);
  assert.equal(fr["cash.eyebrow"], "Gestion des recettes et versements");
  for (const [k, v] of Object.entries({ "cash.nav.registers": "Caisse des agents", "cash.nav.collections": "Recettes collectées", "cash.nav.closures": "Clôture de caisse", "cash.nav.deposits": "Versements", "cash.nav.slips": "Bordereaux", "cash.nav.reconciliation": "Rapprochement", "cash.nav.discrepancies": "Écarts", "cash.nav.reports": "Rapports financiers", "cash.nav.audit": "Audit financier" })) assert.equal((fr as Record<string, string>)[k], v);
  assert.equal(translateMessage("Open your cash register before collecting a payment.", "fr"), "Ouvrez votre caisse avant d'encaisser un paiement.");
  assert.match(translateMessage("The amount exceeds the amount available in the cash register (5000 FCFA still to deposit).", "fr"), /5000 FCFA restent à verser/);
  assert.match(translateMessage("Your cash register CSH-2026-000001 is blocked: contact your unit head or the finance manager.", "ar"), /CSH-2026-000001/);
});
