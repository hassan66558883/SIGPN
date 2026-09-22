/**
 * Unit tests for the wanted-persons schemas (no database).
 *   npx tsx --test tests/unit/wanted.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createWarrantSchema, sightingSchema, wantedPersonSchema, wantedStatusSchema, wantedVehicleSchema } from "../../src/server/wanted/schemas";
import { fr } from "../../src/lib/i18n/fr";
import { ar } from "../../src/lib/i18n/ar";
import { DANGER_LEVEL, WANTED_STATUS } from "../../src/lib/labels";

test("wanted person schema requires a person, an offense and a substantial reason; defaults priority to MEDIUM", () => {
  assert.equal(wantedPersonSchema.safeParse({ personId: "", offense: "Vol", reason: "Motif suffisamment long pour passer" }).success, false);
  assert.equal(wantedPersonSchema.safeParse({ personId: "p1", offense: "V", reason: "Motif suffisamment long pour passer" }).success, false);
  const ok = wantedPersonSchema.safeParse({ personId: "p1", offense: "Vol à main armée", reason: "Suspect impliqué dans plusieurs vols à main armée" });
  assert.equal(ok.success, true);
  if (ok.success) assert.equal(ok.data.dangerLevel, "MEDIUM");
});

test("wanted status schema only accepts the seven known statuses", () => {
  assert.equal(wantedStatusSchema.safeParse({ id: "w1", status: "NOPE" }).success, false);
  assert.equal(wantedStatusSchema.safeParse({ id: "w1", status: "ARRESTED" }).success, true);
});

test("sighting schema requires a location and a valid date", () => {
  assert.equal(sightingSchema.safeParse({ wantedPersonId: "w1", location: "N", occurredAt: "2026-09-22T10:00" }).success, false);
  assert.equal(sightingSchema.safeParse({ wantedPersonId: "w1", location: "N'Djamena", occurredAt: "not-a-date" }).success, false);
  assert.equal(sightingSchema.safeParse({ wantedPersonId: "w1", location: "N'Djamena", occurredAt: "2026-09-22T10:00" }).success, true);
});

test("vehicle association schema allows a fully empty vehicle (all fields optional except the link)", () => {
  assert.equal(wantedVehicleSchema.safeParse({ wantedPersonId: "w1" }).success, true);
  assert.equal(wantedVehicleSchema.safeParse({ wantedPersonId: "" }).success, false);
});

test("warrant creation schema requires an issuing authority and grounds", () => {
  assert.equal(createWarrantSchema.safeParse({ wantedPersonId: "w1", issuingAuthority: "AB", grounds: "Motifs suffisamment longs pour passer la validation" }).success, false);
  const ok = createWarrantSchema.safeParse({ wantedPersonId: "w1", issuingAuthority: "Procureur de la République", grounds: "Motifs suffisamment longs pour passer la validation" });
  assert.equal(ok.success, true);
  if (ok.success) assert.equal(ok.data.type, "ARREST");
});

test("every WantedStatus and DangerLevel key has a bilingual label, and ar.ts stays in sync with fr.ts for wanted.*", () => {
  for (const map of [WANTED_STATUS, DANGER_LEVEL]) {
    for (const [key, def] of Object.entries(map)) {
      assert.ok(def.fr.length > 0, `${key} missing a French label`);
      assert.ok(def.ar.length > 0, `${key} missing an Arabic label`);
    }
  }
  const frKeys = Object.keys(fr).filter((k) => k.startsWith("wanted."));
  const arKeys = Object.keys(ar).filter((k) => k.startsWith("wanted."));
  assert.deepEqual(new Set(frKeys), new Set(arKeys));
  assert.ok(frKeys.length > 50, "expected a substantial number of wanted.* i18n keys");
});
