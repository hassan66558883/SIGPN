/**
 * Static guard over the HR REST surface: every route must go through `withApi` (authentication, CSRF, rate limit,
 * audit of denials), and a route without a declared permission must be on the reviewed allow-list below
 * (its service re-checks permission and scope itself). A new HR route that forgets its permission fails here.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.join(process.cwd(), "src", "app", "api", "v1", "hr");

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = path.join(dir, n);
    return statSync(p).isDirectory() ? routeFiles(p) : n === "route.ts" ? [p] : [];
  });
}

/** Routes whose handler declares no permission because each service enforces its own (reviewed). */
const SERVICE_CHECKED = new Set([
  "leaves/route.ts", // POST: self-service filing, or hr:leave_request for others (service)
  "leaves/balance/route.ts", // own balance, or scope-checked for others
  "leaves/[id]/[action]/route.ts", // decide needs hr:leave_approve; cancel: requester / officer / approver
  "transfers/[id]/[action]/route.ts", // review / validate / execute / cancel: permission + four-eyes + scope in the service
  "discipline/[id]/[action]/route.ts", // step needs hr:discipline_manage, decide needs hr:discipline_decide (service)
  "pay/elements/[id]/[action]/route.ts", // decide needs hr:pay_validate (not the requester), end needs hr:pay_manage (service)
  "pay/me/route.ts", // self-service: only the connected officer's own validated lines
]);

const files = routeFiles(ROOT).map((f) => path.relative(ROOT, f).split(path.sep).join("/"));

test("the HR API has the expected size (a route cannot disappear unnoticed)", () => {
  assert.ok(files.length >= 35, `only ${files.length} HR routes found`);
});

for (const rel of files) {
  test(`route ${rel} is wrapped in withApi and declares its permission`, () => {
    const src = readFileSync(path.join(ROOT, rel), "utf8");
    const handlers = [...src.matchAll(/export\s+(?:const|async function|function)\s+(GET|POST|PUT|PATCH|DELETE)\b/g)].map((m) => m[1]);
    assert.ok(handlers.length > 0, "no HTTP handler");
    assert.ok(!/export\s+(async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)/.test(src), "handlers must be `withApi` constants, not bare functions");
    const wrapped = [...src.matchAll(/export\s+const\s+(GET|POST|PUT|PATCH|DELETE)\s*=\s*withApi/g)].length;
    assert.equal(wrapped, handlers.length, "every handler must be created by withApi");
    assert.ok(!/public\s*:\s*true/.test(src), "no public HR route");
    const noPerm = [...src.matchAll(/withApi(?:<[^>]*>)?\(\s*\{\s*\}/g)].length;
    if (noPerm > 0) assert.ok(SERVICE_CHECKED.has(rel), `${rel} declares no permission and is not on the reviewed allow-list`);
    else assert.ok([...src.matchAll(/permission:\s*"[a-z_:]+"/g)].length >= handlers.length, "every handler declares a permission");
  });
}
