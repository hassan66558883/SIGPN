/**
 * Unit tests for workflow definitions and schemas (no database).
 *   npx tsx --test tests/unit/workflows.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { complaintSchema } from "../../src/server/complaints/schemas";
import { caseSchema, partySchema } from "../../src/server/cases/schemas";
import { personSchema } from "../../src/server/persons/schemas";
import { incidentSchema, patrolSchema, zoneSchema } from "../../src/server/ops/schemas";
import { fr } from "../../src/lib/i18n/fr";
import { en } from "../../src/lib/i18n/en";
import { COMPLAINT_STATUS, CASE_STATUS, PARTY_ROLE, PARTY_STATUS, OFFENSE_CATEGORY, INCIDENT_TYPE, INCIDENT_STATUS, PATROL_STATUS, SHIFT } from "../../src/lib/labels";

test("complaint schema: title/description minimums, defaults, future incident accepted by schema (business rule elsewhere)", () => {
  const bad = complaintSchema.safeParse({ title: "abc", description: "short" });
  assert.equal(bad.success, false);
  const ok = complaintSchema.safeParse({ title: "Vol de téléphone", description: "Description suffisamment longue pour passer.", isAnonymous: "on" });
  assert.equal(ok.success, true);
  if (ok.success) {
    assert.equal(ok.data.isAnonymous, true);
    assert.equal(ok.data.category, "OTHER");
    assert.equal(ok.data.priority, "NORMAL");
  }
});

test("case schema rejects unknown category and accepts sensitive flag from checkbox", () => {
  assert.equal(caseSchema.safeParse({ title: "Titre valide", category: "NOPE", description: "Description suffisamment longue pour passer." }).success, false);
  const ok = caseSchema.safeParse({ title: "Titre valide", category: "THEFT", description: "Description suffisamment longue pour passer.", isSensitive: "on" });
  assert.equal(ok.success, true);
  if (ok.success) assert.equal(ok.data.isSensitive, true);
});

test("party schema: role enum and required person", () => {
  assert.equal(partySchema.safeParse({ caseId: "c", personId: "", role: "VICTIM" }).success, false);
  assert.equal(partySchema.safeParse({ caseId: "c", personId: "p", role: "GUILTY" }).success, false);
  assert.equal(partySchema.safeParse({ caseId: "c", personId: "p", role: "SUSPECT" }).success, true);
});

test("person schema: names required, optional identifier pair, forceCreate flag", () => {
  assert.equal(personSchema.safeParse({ firstName: "", lastName: "X" }).success, false);
  const ok = personSchema.safeParse({ firstName: "Amina", lastName: "Sow", idType: "NATIONAL_ID", idValue: "123", forceCreate: "1" });
  assert.equal(ok.success, true);
  if (ok.success) {
    assert.equal(ok.data.nationality, undefined);
    assert.equal(ok.data.gender, "UNKNOWN");
    assert.equal(ok.data.forceCreate, "1");
  }
});

test("every workflow status and offence category has bilingual labels", () => {
  for (const s of ["DRAFT", "REGISTERED", "UNDER_REVIEW", "ASSIGNED", "CONVERTED", "CLOSED", "REJECTED"]) assert.ok(COMPLAINT_STATUS[s]?.fr && COMPLAINT_STATUS[s]?.en, s);
  for (const s of ["OPEN", "ASSIGNED", "UNDER_INVESTIGATION", "PENDING_REVIEW", "REFERRED", "CLOSED", "ARCHIVED"]) assert.ok(CASE_STATUS[s]?.fr && CASE_STATUS[s]?.en, s);
  for (const r of ["COMPLAINANT", "VICTIM", "WITNESS", "SUSPECT", "PERSON_OF_INTEREST", "ACCUSED", "OTHER"]) assert.ok(PARTY_ROLE[r]?.fr, r);
  for (const r of ["ACTIVE", "UNDER_INVESTIGATION", "CLEARED", "CHARGED", "REFERRED", "WITHDRAWN"]) assert.ok(PARTY_STATUS[r]?.fr, r);
  assert.equal(Object.keys(OFFENSE_CATEGORY).length, 20);
});

test("dictionaries stay in sync after the persons/complaints/cases additions", () => {
  assert.deepEqual(Object.keys(en).sort(), Object.keys(fr).sort());
  for (const k of ["persons.title", "complaints.title", "cases.title", "case.tab.timeline", "person.presumption", "training.title", "pos.title"]) assert.ok(k in fr && k in en, k);
});

test("incident schema: coordinates optional and bounded, location required, defaults", () => {
  const ok = incidentSchema.safeParse({ title: "Accident léger", description: "Description suffisante.", occurredAt: "2026-09-12T10:00", locationText: "Rond-point", latitude: "", longitude: "15.05" });
  assert.equal(ok.success, true, JSON.stringify(ok.error));
  if (ok.success) {
    assert.equal(ok.data.latitude, undefined);
    assert.equal(ok.data.longitude, 15.05);
    assert.equal(ok.data.type, "OTHER");
    assert.equal(ok.data.severity, "MEDIUM");
  }
  assert.equal(incidentSchema.safeParse({ title: "Accident léger", description: "Description suffisante.", occurredAt: "2026-09-12T10:00", locationText: "Rond-point", latitude: "95" }).success, false);
  assert.equal(incidentSchema.safeParse({ title: "Accident léger", description: "Description suffisante.", occurredAt: "2026-09-12T10:00", locationText: "" }).success, false);
});

test("patrol and zone schemas: supervisor required, zone isActive defaults true and accepts form values", () => {
  assert.equal(patrolSchema.safeParse({ mission: "Mission de test", plannedStart: "2026-09-12T06:00", plannedEnd: "2026-09-12T14:00" }).success, false);
  assert.equal(patrolSchema.safeParse({ mission: "Mission de test", plannedStart: "2026-09-12T06:00", plannedEnd: "2026-09-12T14:00", supervisorId: "o1" }).success, true);
  const z = zoneSchema.safeParse({ stationId: "s", code: "Z1", name: "Zone" });
  assert.equal(z.success && z.data.isActive, true);
  const off = zoneSchema.safeParse({ stationId: "s", code: "Z1", name: "Zone", isActive: "0" });
  assert.equal(off.success && off.data.isActive, false);
  assert.equal(zoneSchema.safeParse({ stationId: "s", code: "Z 1", name: "Zone" }).success, false);
});

test("operations enumerations have bilingual labels", () => {
  for (const s of ["DISTURBANCE", "TRAFFIC_ACCIDENT", "ASSAULT", "THEFT", "FIRE", "MEDICAL", "SUSPICIOUS_ACTIVITY", "PUBLIC_ORDER", "DOMESTIC", "NOISE", "MISSING_PERSON", "OTHER"]) assert.ok(INCIDENT_TYPE[s]?.fr && INCIDENT_TYPE[s]?.en, s);
  for (const s of ["REPORTED", "RESPONDING", "ON_SCENE", "RESOLVED", "ESCALATED", "CLOSED"]) assert.ok(INCIDENT_STATUS[s]?.fr, s);
  for (const s of ["PLANNED", "ACTIVE", "COMPLETED", "CANCELLED"]) assert.ok(PATROL_STATUS[s]?.fr, s);
  for (const s of ["MORNING", "AFTERNOON", "NIGHT", "CUSTOM"]) assert.ok(SHIFT[s]?.fr && SHIFT[s]?.en, s);
  for (const k of ["incidents.title", "incident.escalate", "patrols.title", "patrol.plan", "zone.save"]) assert.ok(k in fr && k in en, k);
});
