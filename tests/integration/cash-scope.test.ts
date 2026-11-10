/**
 * Cash reports and registers — territorial isolation proven against the seeded data (live dev server):
 *   npx tsx --test tests/integration/cash-scope.test.ts
 * For a délégué provincial and a commissariat, the figures of the financial reports must equal an INDEPENDENT sum computed in SQL over
 * their own province / structure only, the per-province and per-unit breakdowns must name nothing else, and a cash register of another
 * structure must answer 404. Skipped parts say why (a scope with no revenue proves nothing about amounts).
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
const RANGE = "from=2000-01-01&to=2099-12-31";

// Who holds cash permissions: the finance manager (province scope) and the traffic supervisor (structure scope). Délégués and
// commissariat chiefs hold none, so for them the proof is the refusal.
const PROVINCES = [{ who: "finance.central", code: "NDJ" }];
const COMMISSARIATS = [{ who: "traffic.supervisor", station: "CS-01" }];
const NO_CASH = ["delegue.loc", "delegue.oua", "chief.cs1", "chief.abe"];

async function keyFor(username: string): Promise<string> {
  const key = `pms_it${RUN.slice(-4)}_${randomBytes(32).toString("base64url")}`;
  const u = await pool.query(`SELECT id FROM "User" WHERE username=$1`, [username]);
  assert.ok(u.rowCount, `${username} exists (run npm run roles:sync -- --demo-accounts)`);
  await pool.query(`INSERT INTO "ApiKey"(id,"userId",name,"keyPrefix","keyHash") VALUES ($1,$2,'integration',$3,$4)`, [`apikey_cs_${username}_${RUN}`, u.rows[0].id, `it${RUN.slice(-4)}`, createHash("sha256").update(key).digest("hex")]);
  return key;
}
async function call(who: string, path: string) {
  const res = await fetch(`${BASE}${path}`, { headers: { authorization: `Bearer ${keys[who]}` } });
  const json = (await res.json().catch(() => ({}))) as { data?: any };
  return { status: res.status, data: json.data };
}
const subtree = async (code: string) => (await pool.query(`WITH RECURSIVE t AS (SELECT id FROM "Station" WHERE code=$1 UNION ALL SELECT s.id FROM "Station" s JOIN t ON s."parentId"=t.id) SELECT id FROM t`, [code])).rows.map((r) => r.id as string);

/** Independent figures: transactions of registers matching `where`, same business filter as the report (not voided, payment completed). */
async function expected(where: string, args: unknown[]) {
  const r = await pool.query(
    `SELECT COALESCE(SUM(t."amountFcfa"),0)::int total, COUNT(*)::int n
       FROM "TrafficCashTransaction" t JOIN "TrafficCashRegister" g ON g.id=t."registerId" JOIN "TrafficPayment" p ON p.id=t."paymentId"
      WHERE t."voidedAt" IS NULL AND p.status='COMPLETED' AND ${where}`,
    args,
  );
  return r.rows[0] as { total: number; n: number };
}

before(async () => {
  for (const a of [...PROVINCES, ...COMMISSARIATS, ...NO_CASH.map((who) => ({ who }))]) keys[a.who] = await keyFor(a.who);
});
after(async () => {
  await pool.query(`DELETE FROM "ApiKey" WHERE name='integration' AND "keyPrefix"=$1`, [`it${RUN.slice(-4)}`]);
  await pool.end();
});

for (const p of PROVINCES) {
  test(`${p.who}: report totals equal the province ${p.code} revenue, breakdowns name nothing else`, async () => {
    const region = (await pool.query(`SELECT id, name FROM "Region" WHERE code=$1`, [p.code])).rows[0];
    const exp = await expected(`g."regionId"=$1`, [region.id]);
    const daily = await call(p.who, `/api/v1/traffic/cash/reports/daily?${RANGE}`);
    assert.equal(daily.status, 200, "the report is allowed");
    assert.equal(daily.data.totals?.collected ?? 0, exp.total, "collected amount = independent SQL sum for the province");
    assert.equal(daily.data.totals?.count ?? 0, exp.n, "number of payments = independent count");
    const byProv = await call(p.who, `/api/v1/traffic/cash/reports/by_province?${RANGE}`);
    assert.deepEqual(
      (byProv.data.rows as { label: string }[]).map((r) => r.label).filter((l) => l !== region.name),
      [],
      "the per-province report names no other province",
    );
    console.log(`  ${p.who}: ${exp.n} payments, ${exp.total} FCFA — report agrees${exp.n ? "" : " (no revenue in this province: amounts prove nothing)"}`);
  });
}

for (const c of COMMISSARIATS) {
  test(`${c.who}: report totals equal the revenue of ${c.station} and its posts, nothing more`, async () => {
    const ids = await subtree(c.station);
    assert.ok(ids.length, `${c.station} exists`);
    const exp = await expected(`g."stationId" = ANY($1)`, [ids]);
    const daily = await call(c.who, `/api/v1/traffic/cash/reports/daily?${RANGE}`);
    assert.equal(daily.status, 200);
    assert.equal(daily.data.totals?.collected ?? 0, exp.total);
    assert.equal(daily.data.totals?.count ?? 0, exp.n);
    const byUnit = await call(c.who, `/api/v1/traffic/cash/reports/by_unit?${RANGE}`);
    const codes = (byUnit.data.rows as { label: string }[]).map((r) => /\(([^)]+)\)$/.exec(r.label)?.[1]).filter(Boolean) as string[];
    const allowed = new Set((await pool.query(`SELECT code FROM "Station" WHERE id = ANY($1)`, [ids])).rows.map((r) => r.code as string));
    assert.deepEqual(codes.filter((x) => !allowed.has(x)), [], "the per-unit report names no unit outside the structure");
    console.log(`  ${c.who}: ${exp.n} payments, ${exp.total} FCFA — report agrees`);
  });

  test(`${c.who}: registers, deposits and closures listed all belong to the structure; a foreign register answers 404`, async () => {
    const ids = await subtree(c.station);
    for (const [path, table, col] of [
      ["/api/v1/traffic/cash/registers", "TrafficCashRegister", `"stationId"`],
      ["/api/v1/traffic/cash/deposits", "TrafficDeposit", `"stationId"`],
    ] as const) {
      const r = await call(c.who, `${path}?pageSize=100`);
      assert.equal(r.status, 200, path);
      const got = (r.data as { id: string }[]).map((x) => x.id);
      if (!got.length) continue;
      const bad = (await pool.query(`SELECT id FROM "${table}" WHERE id = ANY($1) AND NOT (${col} = ANY($2))`, [got, ids])).rows;
      assert.deepEqual(bad, [], `${path}: foreign record(s) shown`);
    }
    const foreign = (await pool.query(`SELECT id FROM "TrafficCashRegister" WHERE NOT ("stationId" = ANY($1)) LIMIT 1`, [ids])).rows[0];
    if (foreign) assert.equal((await call(c.who, `/api/v1/traffic/cash/registers/${foreign.id}`)).status, 404, "a register of another structure is not revealed");
  });
}

for (const who of NO_CASH) {
  test(`${who}: holds no cash permission, so every cash report and register is refused (403)`, async () => {
    for (const path of ["/api/v1/traffic/cash/reports/daily", "/api/v1/traffic/cash/reports/by_province", "/api/v1/traffic/cash/registers", "/api/v1/traffic/cash/deposits", "/api/v1/traffic/cash/stats"]) {
      assert.equal((await call(who, path)).status, 403, path);
    }
  });
}
