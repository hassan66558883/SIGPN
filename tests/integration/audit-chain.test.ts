/**
 * Security audit, lot 6 — tamper-evident audit log and audited reads. Live dev server + database:
 *   npx tsx --test tests/integration/audit-chain.test.ts
 * Uses temporary API keys inserted directly in the database (removed at the end). The tamper simulations run inside a
 * transaction that is ALWAYS rolled back, so the real log is never altered.
 */
import "dotenv/config";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, createHash, randomUUID } from "node:crypto";
import { Pool } from "pg";

const BASE = process.env.PMS_URL ?? "http://localhost:3300";
const pool = new Pool({ connectionString: process.env.DATABASE_URL, options: "-c timezone=UTC", max: 12 });
const RUN = Date.now().toString(36);
const keys: Record<string, string> = {};

async function keyFor(username: string): Promise<string> {
  const key = `pms_it${RUN.slice(-4)}_${randomBytes(32).toString("base64url")}`;
  const u = await pool.query(`SELECT id FROM "User" WHERE username=$1`, [username]);
  await pool.query(`INSERT INTO "ApiKey"(id,"userId",name,"keyPrefix","keyHash") VALUES ($1,$2,'integration',$3,$4)`, [`apikey_chain_${username}_${RUN}`, u.rows[0].id, `it${RUN.slice(-4)}`, createHash("sha256").update(key).digest("hex")]);
  return key;
}
async function api(key: string, path: string) {
  const res = await fetch(`${BASE}${path}`, { headers: { authorization: `Bearer ${key}` } });
  const json = (await res.json().catch(() => ({}))) as { data?: any; error?: { code: string } };
  return { res, json };
}
const verifyInDb = async () => (await pool.query(`SELECT * FROM pms_audit_verify()`)).rows[0];

before(async () => {
  for (const u of ["security.admin", "admin", "commander.national", "desk.cs1"]) keys[u] = await keyFor(u);
});
after(async () => {
  await pool.query(`DELETE FROM "ApiKey" WHERE name='integration' AND "keyPrefix"=$1`, [`it${RUN.slice(-4)}`]);
  await pool.end();
});

test("the whole audit log is one intact chain, and the verification is reachable by the security administrator only", async () => {
  const ok = await api(keys["security.admin"], "/api/v1/audit/verify");
  assert.equal(ok.res.status, 200, JSON.stringify(ok.json));
  assert.equal(ok.json.data.intact, true, JSON.stringify(ok.json.data));
  assert.ok(ok.json.data.checked >= 24000, "the history was chained by the migration");
  assert.match(ok.json.data.headHash, /^[0-9a-f]{64}$/);
  assert.equal(ok.json.data.brokenSeq, null);
  for (const who of ["admin", "desk.cs1"]) assert.equal((await api(keys[who], "/api/v1/audit/verify")).res.status, 403, `${who} cannot verify`);
  assert.equal((await fetch(`${BASE}/api/v1/audit/verify`)).status, 401);
});

test("the verification is itself audited and joins the chain", async () => {
  const before = (await pool.query(`SELECT max("chainSeq")::int s FROM "AuditLog"`)).rows[0].s;
  await api(keys["security.admin"], "/api/v1/audit/verify");
  const row = (await pool.query(`SELECT action, "chainSeq", "prevHash", hash FROM "AuditLog" WHERE action='AUDIT_CHAIN_VERIFIED' ORDER BY "chainSeq" DESC LIMIT 1`)).rows[0];
  assert.ok(row.chainSeq > before);
  assert.match(row.hash, /^[0-9a-f]{64}$/);
  assert.match(row.prevHash, /^[0-9a-f]{64}$/);
});

test("every row has a position, a link and a hash; no position is used twice", async () => {
  const r = (await pool.query(`SELECT count(*)::int n, count("chainSeq")::int s, count("hash")::int h, count(DISTINCT "chainSeq")::int d, min("chainSeq")::int lo, max("chainSeq")::int hi FROM "AuditLog"`)).rows[0];
  assert.equal(r.s, r.n);
  assert.equal(r.h, r.n);
  assert.equal(r.d, r.n);
  assert.equal(r.lo, 1);
  assert.equal(r.hi, r.n, "positions are contiguous");
});

test("sixty concurrent writers neither share a position nor break the chain", async () => {
  const before = (await pool.query(`SELECT max("chainSeq")::int s FROM "AuditLog"`)).rows[0].s;
  await Promise.all(
    Array.from({ length: 60 }, (_, i) =>
      pool.query(`INSERT INTO "AuditLog"(id, "actorLabel", action, module, summary) VALUES ($1, 'chain-test', 'CHAIN_TEST', 'audit', $2)`, [`chain_${RUN}_${i}_${randomUUID().slice(0, 8)}`, `concurrent write ${i}`]),
    ),
  );
  const v = await verifyInDb();
  assert.equal(v.broken_seq, null, JSON.stringify(v));
  assert.equal(v.head_seq - before >= 60, true);
  const mine = (await pool.query(`SELECT count(*)::int n, count(DISTINCT "chainSeq")::int d FROM "AuditLog" WHERE action='CHAIN_TEST' AND id LIKE $1`, [`chain_${RUN}_%`])).rows[0];
  assert.deepEqual(mine, { n: 60, d: 60 });
});

test("the log is append-only, and an alteration or a removal is detected and located (simulated, rolled back)", async () => {
  await assert.rejects(() => pool.query(`UPDATE "AuditLog" SET summary='x' WHERE "chainSeq"=100`), /append-only/);
  await assert.rejects(() => pool.query(`DELETE FROM "AuditLog" WHERE "chainSeq"=100`), /append-only/);

  const simulate = async (mutate: string) => {
    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      await c.query(`ALTER TABLE "AuditLog" DISABLE TRIGGER audit_log_append_only`);
      await c.query(mutate);
      return (await c.query(`SELECT * FROM pms_audit_verify()`)).rows[0];
    } finally {
      await c.query("ROLLBACK").catch(() => undefined);
      c.release();
    }
  };
  const altered = await simulate(`UPDATE "AuditLog" SET summary = 'falsifié' WHERE "chainSeq" = 100`);
  assert.equal(altered.broken_seq, 100);
  assert.match(altered.reason, /altered/);
  const removed = await simulate(`DELETE FROM "AuditLog" WHERE "chainSeq" = 100`);
  assert.equal(removed.broken_seq, 100);
  assert.match(removed.reason, /missing/);
  const relinked = await simulate(`UPDATE "AuditLog" SET "prevHash" = repeat('0', 64) WHERE "chainSeq" = 100`);
  assert.equal(relinked.broken_seq, 100, "rewriting the link is detected too");
  const content = await simulate(`UPDATE "AuditLog" SET after = '{"forged":true}'::jsonb WHERE "chainSeq" = 100`);
  assert.equal(content.broken_seq, 100);

  const real = await verifyInDb();
  assert.equal(real.broken_seq, null, "the simulations were rolled back: the real chain is intact");
  const trig = (await pool.query(`SELECT tgenabled FROM pg_trigger WHERE tgname = 'audit_log_append_only'`)).rows[0];
  assert.equal(trig.tgenabled, "O", "the append-only trigger is enabled again");
});

test("consulting a sensitive case or a warrant is audited with the reader's identity; an ordinary case is not", async () => {
  const sensitive = (await pool.query(`SELECT id, number FROM "Case" WHERE "isSensitive" AND "deletedAt" IS NULL LIMIT 1`)).rows[0];
  const ordinary = (await pool.query(`SELECT id FROM "Case" WHERE NOT "isSensitive" AND "deletedAt" IS NULL LIMIT 1`)).rows[0];
  const warrant = (await pool.query(`SELECT id, number FROM "Warrant" LIMIT 1`)).rows[0];
  assert.ok(sensitive && ordinary && warrant, "the dev data holds a sensitive case, an ordinary case and a warrant");
  const reader = (await pool.query(`SELECT id FROM "User" WHERE username='commander.national'`)).rows[0].id;
  const count = async (action: string, entityId: string) => (await pool.query(`SELECT count(*)::int n FROM "AuditLog" WHERE action=$1 AND "entityId"=$2 AND "actorId"=$3`, [action, entityId, reader])).rows[0].n;

  const s0 = await count("CASE_VIEWED", sensitive.id);
  assert.equal((await api(keys["commander.national"], `/api/v1/cases/${sensitive.id}`)).res.status, 200);
  assert.equal(await count("CASE_VIEWED", sensitive.id), s0 + 1);

  const o0 = (await pool.query(`SELECT count(*)::int n FROM "AuditLog" WHERE action='CASE_VIEWED' AND "entityId"=$1`, [ordinary.id])).rows[0].n;
  assert.equal((await api(keys["commander.national"], `/api/v1/cases/${ordinary.id}`)).res.status, 200);
  assert.equal((await pool.query(`SELECT count(*)::int n FROM "AuditLog" WHERE action='CASE_VIEWED' AND "entityId"=$1`, [ordinary.id])).rows[0].n, o0, "an ordinary case read is not logged");

  const w0 = await count("WARRANT_VIEWED", warrant.id);
  assert.equal((await api(keys["commander.national"], `/api/v1/warrants/${warrant.id}`)).res.status, 200);
  assert.equal(await count("WARRANT_VIEWED", warrant.id), w0 + 1);
});
