import { test } from "node:test";
import assert from "node:assert/strict";
import { API_KEY_MAX_DAYS_DEFAULT, keyExpiryDays, keyTooOld } from "../../src/server/auth/api-key-policy";
import { isSensitiveAccount } from "../../src/server/rbac/sensitivity";
import { SYSTEM_ROLES } from "../../src/server/rbac/roles";
import { env } from "../../src/server/env";

/** Lot 7: sessions of sensitive accounts and the rules of an API key. */
test("an API key always expires, within 1 and 90 days", () => {
  assert.equal(API_KEY_MAX_DAYS_DEFAULT, 90);
  assert.equal(keyExpiryDays(null), null, "no expiry is refused");
  assert.equal(keyExpiryDays(undefined), null);
  assert.equal(keyExpiryDays(Number.NaN), null);
  assert.equal(keyExpiryDays(0), null);
  assert.equal(keyExpiryDays(-5), null);
  assert.equal(keyExpiryDays(91), null, "longer than the rotation period");
  assert.equal(keyExpiryDays(365), null);
  assert.equal(keyExpiryDays(1), 1);
  assert.equal(keyExpiryDays(30), 30);
  assert.equal(keyExpiryDays(90), 90);
  assert.equal(keyExpiryDays(30.9), 30);
  assert.equal(keyExpiryDays(45, 30), null, "the maximum is configurable");
});

test("no key outlives the rotation period, whatever its own expiry says", () => {
  const now = Date.UTC(2026, 10, 9);
  const daysAgo = (d: number) => new Date(now - d * 86_400_000);
  assert.equal(keyTooOld(daysAgo(10), now), false);
  assert.equal(keyTooOld(daysAgo(90), now), false);
  assert.equal(keyTooOld(daysAgo(91), now), true);
  assert.equal(keyTooOld(daysAgo(400), now), true);
});

test("a sensitive account is one whose role holds a sensitive permission or whose clearance is above standard", () => {
  const perms = (code: string) => SYSTEM_ROLES.find((r) => r.code === code)!.permissions;
  for (const r of ["STATION_COMMANDER", "NATIONAL_COMMANDER", "HR_DIRECTOR", "AUDITOR", "SUPER_ADMIN", "SECURITY_ADMIN"]) assert.equal(isSensitiveAccount({ permissions: perms(r), clearance: "STANDARD" }), true, r);
  for (const r of ["DESK_OFFICER", "PATROL_OFFICER", "INVESTIGATOR", "OFFICER", "TRAFFIC_CONTROL_AGENT", "CUSTODY_OFFICER"]) assert.equal(isSensitiveAccount({ permissions: perms(r), clearance: "STANDARD" }), false, r);
  assert.equal(isSensitiveAccount({ permissions: perms("DESK_OFFICER"), clearance: "SENSITIVE" }), true, "a clearance makes it sensitive");
});

test("defaults: 60 minutes for an ordinary session, 15 for a sensitive one, 90 days for a key", () => {
  assert.equal(env.session.idleMinutes, 60);
  assert.equal(env.session.sensitiveIdleMinutes, 15);
  assert.ok(env.session.sensitiveIdleMinutes < env.session.idleMinutes);
  assert.equal(env.apiKey.maxDays, 90);
});
