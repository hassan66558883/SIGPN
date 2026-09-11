/**
 * Database integrity tests — run against the real dev database.
 *   npx tsx --test tests/integration/db-integrity.test.ts
 */
import "dotenv/config";
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
after(async () => pool.end());

test("AuditLog rows cannot be updated (append-only trigger)", async () => {
  const id = `test_${Date.now()}_u`;
  await pool.query(`INSERT INTO "AuditLog"(id, "actorLabel", action, module, summary) VALUES ($1,'test','TEST','test','append-only test')`, [id]);
  await assert.rejects(pool.query(`UPDATE "AuditLog" SET summary='tampered' WHERE id=$1`, [id]), /append-only/);
  const { rows } = await pool.query(`SELECT summary FROM "AuditLog" WHERE id=$1`, [id]);
  assert.equal(rows[0].summary, "append-only test");
});

test("AuditLog rows cannot be deleted (append-only trigger)", async () => {
  const id = `test_${Date.now()}_d`;
  await pool.query(`INSERT INTO "AuditLog"(id, "actorLabel", action, module, summary) VALUES ($1,'test','TEST','test','delete test')`, [id]);
  await assert.rejects(pool.query(`DELETE FROM "AuditLog" WHERE id=$1`, [id]), /append-only/);
  const { rowCount } = await pool.query(`SELECT 1 FROM "AuditLog" WHERE id=$1`, [id]);
  assert.equal(rowCount, 1);
});

test("CustodyEvent has the append-only trigger installed for UPDATE and DELETE", async () => {
  const { rows } = await pool.query(
    `SELECT tgname, tgtype FROM pg_trigger WHERE tgrelid = '"CustodyEvent"'::regclass AND NOT tgisinternal`,
  );
  const names = rows.map((r) => r.tgname);
  assert.ok(names.includes("custody_event_append_only"), `triggers found: ${names.join(",")}`);
  // tgtype bit 4 = UPDATE, bit 3 = DELETE (row-level BEFORE trigger)
  const t = rows.find((r) => r.tgname === "custody_event_append_only")!.tgtype as number;
  assert.ok(t & 16, "fires on UPDATE");
  assert.ok(t & 8, "fires on DELETE");
});

test("all migrations are applied and none is pending", async () => {
  const { rows } = await pool.query(`SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations" ORDER BY started_at`);
  assert.ok(rows.length >= 2);
  for (const r of rows) {
    assert.ok(r.finished_at, `${r.migration_name} not finished`);
    assert.equal(r.rolled_back_at, null);
  }
});

test("pg_trgm extension and search indexes exist", async () => {
  const ext = await pool.query(`SELECT 1 FROM pg_extension WHERE extname='pg_trgm'`);
  assert.equal(ext.rowCount, 1);
  const idx = await pool.query(`SELECT indexname FROM pg_indexes WHERE indexname IN ('person_lastname_trgm','person_firstname_trgm','case_title_trgm')`);
  assert.equal(idx.rowCount, 3);
});
