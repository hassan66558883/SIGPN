/**
 * Every province has its administrator (the provincial authority) — live dev server + seeded database:
 *   npx tsx --test tests/integration/provinces.test.ts
 * Uses temporary API keys inserted directly in the database (removed at the end).
 */
import "dotenv/config";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, createHash } from "node:crypto";
import { Pool } from "pg";

const BASE = process.env.PMS_URL ?? "http://localhost:3300";
const pool = new Pool({ connectionString: process.env.DATABASE_URL, options: "-c timezone=UTC" });
const RUN = Date.now().toString(36);
const keys: Record<string, string> = {};

async function keyFor(username: string): Promise<string> {
  const key = `pms_it${RUN.slice(-4)}_${randomBytes(32).toString("base64url")}`;
  const u = await pool.query(`SELECT id FROM "User" WHERE username=$1`, [username]);
  assert.ok(u.rowCount, `${username} exists`);
  await pool.query(`INSERT INTO "ApiKey"(id,"userId",name,"keyPrefix","keyHash") VALUES ($1,$2,'integration',$3,$4)`, [`apikey_prov_${username}_${RUN}`, u.rows[0].id, `it${RUN.slice(-4)}`, createHash("sha256").update(key).digest("hex")]);
  return key;
}
async function api(who: string, path: string) {
  const res = await fetch(`${BASE}${path}`, { headers: { authorization: `Bearer ${keys[who]}` } });
  const json = (await res.json().catch(() => ({}))) as { data?: any };
  return { res, json };
}

before(async () => {
  for (const u of ["delegue.bat", "delegue.tib", "commander.central", "commander.national"]) keys[u] = await keyFor(u);
});
after(async () => {
  await pool.query(`DELETE FROM "ApiKey" WHERE name='integration' AND "keyPrefix"=$1`, [`it${RUN.slice(-4)}`]);
  await pool.end();
});

test("each of the 23 provinces has an active administrator: its provincial authority, placed in it", async () => {
  const rows = (await pool.query(`SELECT r.code, r.name, (SELECT count(*)::int FROM "User" u JOIN "Role" ro ON ro.id=u."roleId" WHERE u."regionId"=r.id AND ro.code='REGIONAL_COMMANDER' AND u.status='ACTIVE' AND u."deletedAt" IS NULL) AS n FROM "Region" r WHERE r."isActive" ORDER BY r.name`)).rows;
  assert.equal(rows.length, 23, "the 23 provinces of Chad");
  const missing = rows.filter((r) => r.n < 1).map((r) => r.name);
  assert.deepEqual(missing, [], `provinces without their administrator: ${missing.join(", ")}`);
});

test("a provincial authority signs in as such, with a province-wide scope, and may approve inside it", async () => {
  const me = (await api("delegue.bat", "/api/v1/auth/me")).json.data;
  assert.equal(me.role.code, "REGIONAL_COMMANDER");
  assert.equal(me.role.scopeLevel, "REGIONAL");
  const batha = (await pool.query(`SELECT id FROM "Region" WHERE code='BAT'`)).rows[0].id;
  assert.equal(me.regionId, batha, "placed in its own province");
  assert.ok(me.permissions.includes("users:create") && me.permissions.includes("approvals:decide"), "it administers the accounts of its province");
});

test("a province administrator sees its own province only; another province's administrator sees nothing of it", async () => {
  const batha = (await pool.query(`SELECT id FROM "Region" WHERE code='BAT'`)).rows[0].id;
  const inBatha = (await api("delegue.bat", "/api/v1/users?pageSize=100")).json.data as { username: string; regionId: string | null }[];
  assert.ok(inBatha.some((u) => u.username === "delegue.bat"), "it sees itself");
  assert.ok(inBatha.every((u) => u.regionId === batha), "and nobody from another province");
  const inTibesti = (await api("delegue.tib", "/api/v1/users?pageSize=100")).json.data as { username: string }[];
  assert.ok(!inTibesti.some((u) => u.username === "delegue.bat"), "Tibesti's administrator does not see Batha's");
  const ndjamena = (await api("commander.central", "/api/v1/users?pageSize=100")).json.data as { username: string }[];
  assert.ok(!ndjamena.some((u) => u.username.startsWith("delegue.")), "nor does N'Djamena's");
  const national = (await api("commander.national", "/api/v1/users?pageSize=100")).json.data as { username: string }[];
  assert.ok(national.length > 0);
});
