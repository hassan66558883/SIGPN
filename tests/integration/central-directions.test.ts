/**
 * Security audit, lot 2 — central directions of the DGPN (decree 0572/2023). Live database:
 *   npx tsx --test tests/integration/central-directions.test.ts
 */
import "dotenv/config";
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";
import { CENTRAL_DIRECTIONS } from "../../src/server/org/central-directions";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, options: "-c timezone=UTC" });
after(async () => {
  await pool.end();
});

test("the central directions hang under the DGPN headquarters, national, active", async () => {
  const rows = (await pool.query(`SELECT c.code, c.type, c."isActive", c."parentId" = p.id AS under_root FROM "Station" c JOIN "Station" p ON p.code='DGPN' WHERE c.code LIKE 'DGPN-%'`)).rows;
  assert.equal(rows.length, CENTRAL_DIRECTIONS.length);
  for (const r of rows) {
    assert.equal(r.type, "CENTRAL_DIRECTION");
    assert.ok(r.isActive && r.under_root, `${r.code} active and under the DGPN`);
  }
  assert.deepEqual(rows.map((r) => r.code).sort(), CENTRAL_DIRECTIONS.map((d) => d.code).sort());
});

test("the synchronisation is idempotent and never overwrites an administrator's change", async () => {
  await pool.query(`UPDATE "Station" SET name = 'Nom modifié par un administrateur (test)' WHERE code = 'DGPN-DSP'`);
  try {
    const Module = (await import("node:module")).default as unknown as { _resolveFilename: (request: string, ...rest: unknown[]) => string };
    const orig = Module._resolveFilename;
    Module._resolveFilename = function (request: string, ...rest: unknown[]) {
      return request === "server-only" ? require.resolve("../../scripts/empty.cjs") : orig.call(this, request, ...rest);
    };
    const { syncCentralDirections } = await import("../../src/server/org/central");
    const { prisma } = await import("../../src/server/db");
    assert.equal(await syncCentralDirections(), 0, "nothing to create the second time");
    assert.equal((await pool.query(`SELECT name FROM "Station" WHERE code='DGPN-DSP'`)).rows[0].name, "Nom modifié par un administrateur (test)");
    await prisma.$disconnect();
  } finally {
    await pool.query(`UPDATE "Station" SET name = $1 WHERE code = 'DGPN-DSP'`, [CENTRAL_DIRECTIONS.find((d) => d.code === "DGPN-DSP")!.name]);
  }
});

test("a central direction has no duty desk: it never receives an alert of the national network", async () => {
  const n = (await pool.query(`SELECT count(*)::int n FROM "AlertDelivery" d JOIN "Station" s ON s.id = d."stationId" WHERE s.type = 'CENTRAL_DIRECTION'`)).rows[0].n;
  assert.equal(n, 0);
});
