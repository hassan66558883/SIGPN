/**
 * Walkthrough of the enforcement modules through the real interface: warrant → approval (four-eyes) → arrest on that warrant → custody → extension → release.
 *   . scripts/demo/env.sh && npx tsx scripts/demo/enforcement.ts
 * Demonstration database only (refuses any name not ending in _demo). Writes screenshots to docs/demo/screens/enf-*.png.
 */
import type { Page } from "puppeteer-core";
import { assertDemoDb, launch, session, shot, pool, clickText, setValue, submitFormOf, sleep, BASE } from "./lib";

assertDemoDb();
const go = async (p: Page, path: string) => {
  await p.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await sleep(2000);
};
const text = (p: Page) => p.evaluate(() => document.body.innerText);
const local = (ms: number) => {
  const d = new Date(Date.now() + ms);
  const z = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`;
};
async function setDate(p: Page, selector: string, value: string) {
  await p.$eval(selector, (el, v) => {
    const input = el as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    setter.call(input, v as string);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}
async function pickPerson(p: Page, inputSel: string, lastName: string, number: string) {
  await p.type(inputSel, lastName);
  await sleep(1500);
  await p.evaluate((nb) => {
    const opts = [...document.querySelectorAll<HTMLElement>('[role="option"]')];
    (opts.find((o) => (o.textContent ?? "").includes(nb)) ?? opts[0])?.click();
  }, number);
  await sleep(500);
}
const check = (ok: boolean, what: string) => {
  console.log(`  ${ok ? "OK  " : "FAIL"} ${what}`);
  if (!ok) process.exitCode = 1;
};

async function main() {
  const person = (await pool.query(`SELECT p.number nb, p."lastName" ln FROM "Person" p WHERE p."deletedAt" IS NULL AND p."mergedIntoId" IS NULL AND p."stationId"=(SELECT "stationId" FROM "User" WHERE username='inv.diallo') ORDER BY p."createdAt" DESC LIMIT 1`)).rows[0];
  const browser = await launch();
  try {
    console.log("# 1. Investigator requests a warrant");
    const inv = await session(browser, "inv.diallo");
    await go(inv, "/warrants/new");
    await pickPerson(inv, "#w-person", person.ln, person.nb);
    await setValue(inv, "#w-auth", "Parquet de N'Djamena (fictif)");
    await setValue(inv, "#w-ref", "REF-FICTIVE-001");
    await setValue(inv, "#w-grounds", "Mandat fictif de démonstration : motifs suffisamment détaillés pour la validation. Aucune donnée réelle.");
    await setDate(inv, "#w-exp", local(7 * 24 * 3_600_000));
    await shot(inv, "enf-1-warrant-form");
    await submitFormOf(inv, "#w-grounds");
    await sleep(1500);
    const warrantId = inv.url().split("/warrants/")[1]?.split("?")[0];
    check(!!warrantId && /Brouillon|Draft/i.test(await text(inv)), `warrant created as draft (${warrantId})`);
    check(/une autre personne/i.test(await text(inv)), "requester is told someone else must approve (no decision form)");
    await shot(inv, "enf-2-warrant-draft");

    console.log("# 2. Chief approves (second factor)");
    const chief = await session(browser, "chief.cs1");
    await go(chief, `/warrants/${warrantId}`);
    await chief.select("#w-status", "ACTIVE");
    await submitFormOf(chief, "#w-status");
    await go(chief, `/warrants/${warrantId}`);
    check(/Actif/.test(await text(chief)), "warrant is ACTIVE after the chief's approval");
    await shot(chief, "enf-3-warrant-active");

    console.log("# 3. Investigator records an arrest on that warrant");
    await go(inv, "/arrests/new");
    await pickPerson(inv, "#a-person", person.ln, person.nb);
    await setDate(inv, "#a-at", local(-2 * 3_600_000));
    await inv.select("#a-auth", "WARRANT");
    await inv.evaluate(() => {
      const s = document.querySelector<HTMLSelectElement>("#a-warrant")!;
      if (s.options.length > 1) {
        const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")!.set!;
        setter.call(s, s.options[1].value);
        s.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
    await inv.evaluate((id) => {
      const s = document.querySelector<HTMLSelectElement>("#a-warrant")!;
      const o = [...s.options].find((x) => x.value === id);
      if (o) {
        Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")!.set!.call(s, id);
        s.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }, warrantId);
    await inv.evaluate(() => {
      const s = document.querySelector<HTMLSelectElement>("#a-officer")!;
      if (s.required && s.options.length > 1) {
        Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")!.set!.call(s, s.options[1].value);
        s.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
    await setValue(inv, "#a-loc", "Marché central, N'Djamena (fictif)");
    await setValue(inv, "#a-charges", "Vol à main armée — démonstration");
    await shot(inv, "enf-4-arrest-form");
    await submitFormOf(inv, "#a-loc");
    await sleep(1500);
    const arrestUrl = inv.url();
    const arrestId = arrestUrl.split("/arrests/")[1]?.split("?")[0];
    check(!!arrestId, `arrest recorded (${arrestUrl.replace(BASE, "")})`);
    await shot(inv, "enf-5-arrest-detail");

    console.log("# 4. Custody officer places the person in custody, logs a welfare check");
    const cust = await session(browser, "custody.cs1");
    await go(cust, `/detention/new?arrestId=${arrestId}`);
    await setDate(cust, "#d-start", local(-90 * 60_000));
    await setValue(cust, "#d-cell", "C4");
    await submitFormOf(cust, "#d-cell");
    await sleep(1500);
    const detId = cust.url().split("/detention/")[1]?.split("?")[0];
    check(!!detId && /garde à vue/i.test(await text(cust)), `custody opened (${detId})`);
    await setValue(cust, "#l-notes", "Contrôle de bien-être effectué : la personne va bien.");
    await submitFormOf(cust, "#l-notes");
    await go(cust, `/detention/${detId}`);
    check(/bien-être/i.test(await text(cust)), "welfare entry appears in the log");
    await shot(cust, "enf-6-custody-detail");

    console.log("# 5. Chief extends the custody; custody officer cannot");
    check(!(await cust.$("#x-until")), "custody officer has no extension form");
    await go(chief, `/detention/${detId}`);
    const until = await pool.query(`SELECT "legalLimitAt" FROM "Detention" WHERE id=$1`, [detId]);
    const lim = new Date(until.rows[0].legalLimitAt).getTime();
    await setDate(chief, "#x-until", local(lim + 12 * 3_600_000 - Date.now()));
    await setValue(chief, "#x-auth", "Procureur de la République (fictif)");
    await setValue(chief, "#x-reason", "Enquête complexe en cours : prolongation fictive pour la démonstration.");
    await submitFormOf(chief, "#x-auth");
    await go(chief, `/detention/${detId}`);
    check(/Prolong/i.test(await text(chief)) && /Procureur/.test(await text(chief)), "extension recorded with authority");
    await shot(chief, "enf-7-custody-extended");

    console.log("# 6. Custody ends (release) and the warrant is executed");
    await cust.reload({ waitUntil: "domcontentloaded" });
    await sleep(1500);
    await cust.select("#e-reason", "RELEASED_NO_CHARGE");
    await setValue(cust, "#e-notes", "Aucune charge retenue — libération fictive.");
    await submitFormOf(cust, "#e-notes");
    await go(chief, `/arrests/${arrestId}`);
    check(/Libéré/.test(await text(chief)), "arrest follows the custody outcome (Libéré)");
    await go(chief, `/warrants/${warrantId}`);
    await chief.select("#w-status", "EXECUTED");
    await setValue(chief, "#w-notes", "Exécuté : personne appréhendée et présentée.");
    await submitFormOf(chief, "#w-status");
    await go(chief, `/warrants/${warrantId}`);
    check(/Exécuté/.test(await text(chief)), "warrant executed");
    await shot(chief, "enf-8-warrant-executed");
  } finally {
    await browser.close();
    await pool.end();
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
