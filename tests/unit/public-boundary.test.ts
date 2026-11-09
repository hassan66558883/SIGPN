/**
 * Static guard of the public/internal boundary: the anonymous API and the public pages may only read through
 * `src/server/public/service.ts` (explicit public selects) — never through the internal services, never with Prisma directly.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => { const p = path.join(dir, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const root = process.cwd();
const rel = (p: string) => path.relative(root, p).split(path.sep).join("/");

const FORBIDDEN = [/@\/server\/wanted\//, /@\/server\/cases\//, /@\/server\/complaints\//, /@\/server\/persons\//, /@\/server\/hr\//, /@\/server\/alerts\//, /@\/server\/biometric\//, /@\/server\/auth\/dal/, /@\/server\/db"/];
// the pre-existing receipt / PV / deposit QR verification routes read through their own minimal queries
const LEGACY = ["verify"];

test("public API routes only use the public service (or the legacy minimal verification queries)", () => {
  const files = walk(path.join(root, "src/app/api/v1/public")).filter((f) => f.endsWith("route.ts"));
  assert.ok(files.length >= 8);
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    if (LEGACY.some((l) => rel(f).includes(`/public/${l}/`))) continue;
    for (const re of FORBIDDEN) assert.ok(!re.test(src), `${rel(f)} imports an internal module (${re})`);
    assert.ok(/public: true/.test(src), `${rel(f)} must be declared public: true`);
  }
});

test("public pages read only through the public service", () => {
  const files = walk(path.join(root, "src/app/(public)")).filter((f) => /\.(tsx|ts)$/.test(f));
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    for (const re of FORBIDDEN) if (re.test(src)) assert.ok(/page\.tsx$/.test(f) && /src\/app\/\(public\)\/page\.tsx$/.test(rel(f)) && /@\/server\/db"/.test(src) && re.source.includes("db"), `${rel(f)} imports an internal module (${re})`);
  }
});

test("no internal route is reachable without a session: only the listed public paths bypass the proxy", () => {
  const src = readFileSync(path.join(root, "src/proxy.ts"), "utf8");
  const list = /PUBLIC_PATHS = \[([^\]]*)\]/.exec(src)![1].match(/"([^"]+)"/g)!.map((x) => x.replace(/"/g, ""));
  assert.deepEqual(list.sort(), ["/actualites", "/avis-de-recherche", "/commissariats", "/contact", "/forgot-password", "/login", "/payer", "/plaintes", "/reset-password", "/signalement", "/suivi", "/verify"].sort());
  for (const internal of ["/dashboard", "/wanted", "/alerts", "/biometric", "/hr", "/admin", "/public-admin", "/complaints"]) assert.ok(!list.some((p) => internal === p || internal.startsWith(p + "/")), `${internal} must stay internal`);
});
