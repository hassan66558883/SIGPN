/**
 * Walkthrough of the security-audit screens through the real interface: administrator separation, role locks, audit-chain
 * verification, API-key oversight, the approval workflow (one and two approvers), the clearance field, French / Arabic / phone views.
 *   . scripts/demo/env.sh && npx tsx scripts/demo/audit-lots.ts
 * Demonstration database only (refuses any name not ending in _demo). Writes screenshots to docs/demo/screens/aud-*.png.
 * Needs the demo build on :3302 (see docs/DEMO_DG.md) and the demonstration accounts with a second factor (done here).
 */
import type { Page } from "puppeteer-core";
import { assertDemoDb, launch, session, shot, pool, clickText, setValue, submitFormOf, sleep, ensureMfa, BASE } from "./lib";

assertDemoDb();
const RUN = Date.now().toString(36).slice(-5);
const text = (p: Page) => p.evaluate(() => document.body.innerText);
const go = async (p: Page, path: string) => {
  await p.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await sleep(2200);
};
const check = (ok: boolean, what: string) => {
  console.log(`  ${ok ? "OK  " : "FAIL"} ${what}`);
  if (!ok) process.exitCode = 1;
};
async function selectText(p: Page, sel: string, re: RegExp) {
  const val = await p.$eval(sel, (el, src) => ([...(el as HTMLSelectElement).options].find((o) => new RegExp(src).test(o.textContent ?? ""))?.value ?? null), re.source);
  if (!val) throw new Error(`no option matching ${re} in ${sel}`);
  await p.select(sel, val);
}
async function requestAccount(sec: Page, tag: string, rolePattern: RegExp) {
  const username = `it.walk.${tag}.${RUN}`;
  await go(sec, "/admin/users/new");
  await setValue(sec, "#firstName", "Test");
  await setValue(sec, "#lastName", `Parcours ${tag}`);
  await setValue(sec, "#username", username);
  await setValue(sec, "#email", `${username}@pms.example`);
  await selectText(sec, "#roleId", rolePattern);
  await sleep(600);
  await selectText(sec, "#stationId", /^CS-01/);
  await setValue(sec, "#temporaryPassword", "Temp-Password-2026!x");
  return username;
}

async function main() {
  const accounts = ["security.admin", "admin", "chief.cs1", "commander.dept", "commander.national"];
  await ensureMfa(accounts);
  const browser = await launch();
  try {
    console.log("# 0. Sign in (second factor included)");
    const sec = await session(browser, "security.admin");
    const chief = await session(browser, "chief.cs1");
    const dept = await session(browser, "commander.dept");
    check(!sec.url().includes("/login") && !chief.url().includes("/login") && !dept.url().includes("/login"), "the security administrator and two commanders are signed in");

    console.log("# 1. Security page: verify the audit chain, see every API key");
    await go(sec, "/admin/security");
    check(/Intégrité du journal d'audit/.test(await text(sec)), "the integrity card is on the security page");
    check(/Clés d'API actives/.test(await text(sec)), "the API-key oversight card is on the security page");
    await clickText(sec, "Vérifier maintenant", "button");
    await sleep(1500);
    check(/Chaîne intacte : \d+ lignes vérifiées/.test(await text(sec)), "the chain verifies as intact");
    check(/empreinte/.test(await text(sec)), "the head position and hash are shown for recording elsewhere");
    check(/compte sensible/.test(await text(sec)), "the session policy line mentions the sensitive-account rule (15 minutes, single session)");
    await shot(sec, "aud-1-chain-and-keys", { full: true });

    console.log("# 2. Roles: the two administrator roles are locked");
    await go(sec, "/admin/roles");
    check(/Administrateur technique/.test(await text(sec)) && /Administrateur sécurité/.test(await text(sec)), "both administrator roles are listed with their new names");
    await shot(sec, "aud-2-roles");
    const supId = (await pool.query(`SELECT id FROM "Role" WHERE code='SUPER_ADMIN'`)).rows[0].id;
    await go(sec, `/admin/roles/${supId}`);
    check(/fixés par le système/.test(await text(sec)), "the technical administrator role page explains that it is fixed");
    await shot(sec, "aud-3-role-locked");

    console.log("# 3. An ordinary account is a REQUEST; the commander of the station approves it");
    const ord = await requestAccount(sec, "ord", /Agent d'accueil/);
    check((await sec.$("#clearance")) !== null, "the security administrator sees the clearance field in the user form");
    await shot(sec, "aud-4-user-form");
    await submitFormOf(sec, "#username");
    await sleep(1500);
    check(sec.url().includes("/approvals"), "the form ends on the approvals page");
    check(/Demande envoyée/.test(await text(sec)), "the requester is told the account will exist once approved");
    check((await pool.query(`SELECT 1 FROM "User" WHERE username=$1`, [ord])).rowCount === 0, "the account does not exist yet");
    await shot(sec, "aud-5-request-sent");

    await go(chief, "/approvals");
    check((await text(chief)).includes(ord), "the commissaire of the station sees the request in 'À décider'");
    check(/0 \/ 1 approbation/.test(await text(chief)), "one approval is needed");
    check(/Créer le compte/.test(await text(chief)) && !/Create account/.test(await text(chief)), "the request is described in French, not in English");
    await shot(chief, "aud-6-commander-todo");
    await chief.select(`select[name="vote"]`, "APPROVE");
    await submitFormOf(chief, `select[name="vote"]`);
    await sleep(1500);
    check((await pool.query(`SELECT 1 FROM "User" WHERE username=$1`, [ord])).rowCount === 1, "the account exists after the approval");

    console.log("# 4. A sensitive account needs two approvers from two levels");
    const sens = await requestAccount(sec, "sens", /Commissaire de poste/);
    await submitFormOf(sec, "#username");
    await sleep(1500);
    await go(chief, "/approvals");
    check(/0 \/ 2 approbation/.test(await text(chief)), "a commander role needs two approvals");
    await chief.select(`select[name="vote"]`, "APPROVE");
    await submitFormOf(chief, `select[name="vote"]`);
    await sleep(1500);
    check((await pool.query(`SELECT 1 FROM "User" WHERE username=$1`, [sens])).rowCount === 0, "one approval is not enough");
    await go(chief, "/approvals?view=mine");
    await go(dept, "/approvals");
    check(/1 \/ 2 approbation/.test(await text(dept)) && (await text(dept)).includes(sens), "the departmental commander sees it with 1/2");
    await shot(dept, "aud-7-second-approver");
    await dept.select(`select[name="vote"]`, "APPROVE");
    await submitFormOf(dept, `select[name="vote"]`);
    await sleep(1500);
    check((await pool.query(`SELECT 1 FROM "User" WHERE username=$1`, [sens])).rowCount === 1, "the account exists after the second approval");
    await go(sec, "/approvals?view=mine");
    check(/Exécutée/.test(await text(sec)), "the requester sees both requests as executed");
    await shot(sec, "aud-8-requests-executed", { full: true });

    console.log("# 5. Raising a clearance is itself a request");
    const sensId = (await pool.query(`SELECT id FROM "User" WHERE username=$1`, [sens])).rows[0].id;
    await go(sec, `/admin/users/${sensId}`);
    await selectText(sec, "#clearance", /Sensible/);
    await submitFormOf(sec, "#clearance");
    await sleep(1500);
    const msg = await text(sec);
    check(/attend une approbation/.test(msg) && !/awaits approval/.test(msg), "the user form says, in French, that the change awaits approval");
    check((await pool.query(`SELECT clearance FROM "User" WHERE id=$1`, [sensId])).rows[0].clearance === "STANDARD", "the clearance has not changed yet");
    await shot(sec, "aud-9-clearance-request");

    console.log("# 6. The technical administrator sees no police operation");
    const tech = await session(browser, "admin");
    await go(tech, "/dashboard");
    const menu = await text(tech);
    check(!/Mandats|Affaires|Arrestations|Garde à vue/.test(menu), "no warrants, cases, arrests or custody in the technical administrator's menu");
    await shot(tech, "aud-10-tech-admin-menu");
    await go(tech, "/warrants");
    check(!/Mandats d'arrêt|Demander un mandat|Nouveau mandat/.test(await text(tech)) || /refus|interdit|403|autorisé/i.test(await text(tech)), "the warrants page is refused to the technical administrator");
    await shot(tech, "aud-11-tech-admin-refused");

    console.log("# 7. Arabic and phone views");
    const nat = await session(browser, "commander.national", { width: 1440, height: 900 }, "ar");
    await go(nat, "/approvals");
    check(/الموافقات/.test(await text(nat)), "the approvals page is in Arabic");
    check((await nat.evaluate(() => document.documentElement.dir)) === "rtl", "and laid out right to left");
    check(/رفع التصريح الأمني لـ/.test(await text(nat)) && !/Raise the security|Create account/.test(await text(nat)), "the requests are described in Arabic, not in English");
    await shot(nat, "aud-12-approvals-ar");
    const phone = await session(browser, "chief.cs1", { width: 375, height: 812 });
    await go(phone, "/approvals");
    const overflow = await phone.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
    check(!overflow, "no horizontal scroll at phone width");
    await shot(phone, "aud-13-approvals-phone");
    await go(phone, "/admin/security");
  } finally {
    await browser.close();
    await pool.query(`DELETE FROM "ApiKey" WHERE name='demo-run'`);
    await pool.end();
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
