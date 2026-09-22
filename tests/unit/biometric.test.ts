/**
 * Unit tests for the biometric & evidence schemas (no database).
 *   npx tsx --test tests/unit/biometric.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { anprSearchSchema, enrollFingerprintSchema, fingerprintSearchSchema, recordActionSchema, searchGateSchema } from "../../src/server/biometric/schemas";
import { custodyTransferSchema, evidenceSchema } from "../../src/server/evidence/schemas";
import { fr } from "../../src/lib/i18n/fr";
import { en } from "../../src/lib/i18n/en";
import { BIOMETRIC_ACTION, BIOMETRIC_SEARCH_MODE, BIOMETRIC_SEARCH_RESULT, BIOMETRIC_TYPE, EVIDENCE_CATEGORY, EVIDENCE_STATUS, FINGER_POSITION, LPR_STATUS } from "../../src/lib/labels";

test("biometric search gate rejects an anonymous/case-less search and a too-short reason (spec §10)", () => {
  assert.equal(searchGateSchema.safeParse({ caseId: "", reason: "a reason long enough" }).success, false);
  assert.equal(searchGateSchema.safeParse({ caseId: "case1", reason: "short" }).success, false);
  const ok = searchGateSchema.safeParse({ caseId: "case1", reason: "Vérification d'identité suite à interpellation" });
  assert.equal(ok.success, true);
});

test("fingerprint search schema: mode enum, optional personId (required only for VERIFY_1_1, enforced in the service)", () => {
  const base = { caseId: "case1", reason: "Vérification d'identité suite à interpellation" };
  assert.equal(fingerprintSearchSchema.safeParse({ ...base, mode: "NOPE" }).success, false);
  const identify = fingerprintSearchSchema.safeParse({ ...base, mode: "IDENTIFY_1_N" });
  assert.equal(identify.success, true);
  if (identify.success) assert.equal(identify.data.position, "UNKNOWN");
  const verify = fingerprintSearchSchema.safeParse({ ...base, mode: "VERIFY_1_1", personId: "p1", position: "RIGHT_THUMB" });
  assert.equal(verify.success, true);
});

test("enroll fingerprint schema requires a person and defaults position to UNKNOWN", () => {
  assert.equal(enrollFingerprintSchema.safeParse({ personId: "" }).success, false);
  const ok = enrollFingerprintSchema.safeParse({ personId: "p1" });
  assert.equal(ok.success, true);
  if (ok.success) assert.equal(ok.data.position, "UNKNOWN");
});

test("ANPR search schema requires a plausible plate string", () => {
  assert.equal(anprSearchSchema.safeParse({ caseId: "c1", reason: "Contrôle routier — vérification du véhicule", plateNumber: "T" }).success, false);
  assert.equal(anprSearchSchema.safeParse({ caseId: "c1", reason: "Contrôle routier — vérification du véhicule", plateNumber: "TD-1234-AB" }).success, true);
});

test("recordActionSchema only accepts a post-creation action, never NONE and never a delete", () => {
  assert.equal(recordActionSchema.safeParse({ searchId: "s1", action: "NONE" }).success, false);
  assert.equal(recordActionSchema.safeParse({ searchId: "s1", action: "VERIFIED_BY_INVESTIGATOR" }).success, true);
});

test("evidence schema requires a case, a description and a collection date", () => {
  assert.equal(evidenceSchema.safeParse({ caseId: "", description: "Couteau retrouvé sur les lieux", collectedAt: "2026-09-22T10:00" }).success, false);
  assert.equal(evidenceSchema.safeParse({ caseId: "c1", description: "Couteau", collectedAt: "2026-09-22T10:00" }).success, true);
  const ok = evidenceSchema.safeParse({ caseId: "c1", description: "Couteau retrouvé sur les lieux", collectedAt: "2026-09-22T10:00" });
  if (ok.success) assert.equal(ok.data.category, "PHYSICAL");
});

test("custody transfer schema rejects the terminal COLLECTED/REGISTERED actions (those only happen at intake)", () => {
  const custodyActions = custodyTransferSchema.shape.action;
  assert.equal(custodyActions.safeParse("COLLECTED").success, false);
  assert.equal(custodyActions.safeParse("REGISTERED").success, false);
  assert.equal(custodyActions.safeParse("STORED").success, true);
});

test("every biometric and evidence enum has a bilingual label, and en.ts stays in sync with fr.ts", () => {
  for (const map of [BIOMETRIC_TYPE, BIOMETRIC_SEARCH_MODE, BIOMETRIC_SEARCH_RESULT, BIOMETRIC_ACTION, FINGER_POSITION, LPR_STATUS, EVIDENCE_CATEGORY, EVIDENCE_STATUS]) {
    for (const [key, def] of Object.entries(map)) {
      assert.ok(def.fr.length > 0, `${key} missing a French label`);
      assert.ok(def.en.length > 0, `${key} missing an English label`);
    }
  }
  const frKeys = Object.keys(fr).filter((k) => k.startsWith("biometric.") || k.startsWith("evidence."));
  const enKeys = Object.keys(en).filter((k) => k.startsWith("biometric.") || k.startsWith("evidence."));
  assert.deepEqual(new Set(frKeys), new Set(enKeys));
  assert.ok(frKeys.length > 50, "expected a substantial number of biometric/evidence i18n keys");
});
