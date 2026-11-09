/**
 * Walkthrough of the "Personnes recherchées" search screen through the real interface: quick and advanced search, the sources, the
 * three outcomes (match found, known but not wanted, no result), Arabic and phone views.
 *   . scripts/demo/env.sh && npx tsx scripts/demo/search-wanted.ts
 * Demonstration database only (refuses any name not ending in _demo). Writes screenshots to docs/demo/screens/srch-*.png.
 */
import type { Page } from "puppeteer-core";
import { assertDemoDb, launch, session, shot, pool, sleep, ensureMfa, BASE } from "./lib";

assertDemoDb();
const text = (p: Page) => p.evaluate(() => document.body.innerText);
const go = async (p: Page, path: string) => {
  await p.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await sleep(2200);
};
const check = (ok: boolean, what: string) => {
  console.log(`  ${ok ? "OK  " : "FAIL"} ${what}`);
  if (!ok) process.exitCode = 1;
};
async function quick(p: Page, q: string) {
  await go(p, "/wanted");
  await p.click('input[name="search"]', { count: 3 });
  await p.type('input[name="search"]', q);
  await clickSearch(p);
}
async function clickSearch(p: Page) {
  await p.evaluate(() => (Array.from(document.querySelectorAll("form button[type=submit]")).find((b) => (b.textContent ?? "").trim() === "Rechercher" || (b.textContent ?? "").trim() === "بحث") as HTMLButtonElement).click());
  await p.waitForFunction(() => location.search.includes("go=1"), { timeout: 8000 }).catch(() => null);
  await sleep(2500);
}

async function main() {
  await ensureMfa(["commander.national"]);
  const wanted = (await pool.query(`SELECT p."lastName" ln, p."firstName" fn, p.id pid, p."dateOfBirth" dob FROM "WantedPerson" w JOIN "Person" p ON p.id=w."personId" WHERE w.status='ACTIVE' AND w.kind='SEARCH_WARRANT' ORDER BY w."issuedAt" DESC LIMIT 1`)).rows[0];
  const plain = (await pool.query(`SELECT "lastName" ln, "firstName" fn FROM "Person" p WHERE "deletedAt" IS NULL AND "mergedIntoId" IS NULL AND NOT EXISTS (SELECT 1 FROM "WantedPerson" w WHERE w."personId"=p.id AND w.status IN ('ACTIVE','LOCATED')) ORDER BY "createdAt" LIMIT 1`)).rows[0];
  console.log(`  wanted person used: ${wanted.fn} ${wanted.ln}; known person used: ${plain.fn} ${plain.ln}`);
  const browser = await launch();
  try {
    const nat = await session(browser, "commander.national");
    console.log("# 1. The screen, first visit");
    await go(nat, "/wanted");
    const first = await text(nat);
    check(/Recherche rapide/.test(first) && /Recherche avancée/.test(first), "quick and advanced tabs");
    check(/Base nationale \(SIGPN-T\)/.test(first) && /Personnes recherchées/.test(first), "the two real sources");
    check(/Frontières & Immigration/.test(first) && /Vidéosurveillance/.test(first) && /Interopérabilité/.test(first), "the three other sources are listed");
    check((await nat.$$eval('input[name="src"]', (els) => els.filter((e) => (e as HTMLInputElement).disabled).length)) === 3, "and the three that are not connected are disabled");
    check((first.match(/non connecté/gi) ?? []).length >= 3, "labelled 'non connecté', never offered as if they worked");
    check(/Saisissez un nom/.test(first), "a hint, no fake result");
    await shot(nat, "srch-1-first-visit");

    console.log("# 2. Match found");
    await quick(nat, `${wanted.fn} ${wanted.ln}`);
    const m = await text(nat);
    check(/match trouvé/i.test(m), "MATCH TROUVÉ");
    check(new RegExp(wanted.ln, "i").test(m) && /Date de naissance/.test(m) && /Motif/.test(m) && /Date de mandat/.test(m), "identity, offence and warrant date");
    check(/RECHERCHÉ/i.test(m) && /Personne recherchée/.test(m), "the stamp and the status");
    check(/Interpellation et notification immédiate au parquet/.test(m), "the procedure banner");
    check(await nat.$$eval("button", (bs) => bs.some((b) => /Localiser/.test(b.textContent ?? "") && (b as HTMLButtonElement).disabled)), "'Localiser (caméras)' is disabled: video is not connected");
    check(/Voir le dossier/.test(m), "'Voir le dossier'");
    check(/Journal de la recherche/i.test(m) && /Sources non interrogées/i.test(m) && /\d+ ms/.test(m), "the search journal states what was queried and what was not");
    check((await nat.$$eval('input[name="search"]', (els) => (els[0] as HTMLInputElement).value)) === `${wanted.fn} ${wanted.ln}`, "the query stays in the box");
    await shot(nat, "srch-2-match", { full: true });

    console.log("# 3. Known, not wanted");
    await quick(nat, `${plain.fn} ${plain.ln}`);
    const k = await text(nat);
    check(/Personne connue, non recherchée/i.test(k) && !/match trouvé/i.test(k), "a known person is not reported as wanted nor as 'no result'");
    await shot(nat, "srch-3-known");

    console.log("# 4. No result");
    await quick(nat, "Zzqxjvw Nonexistent");
    const n = await text(nat);
    check(/Aucune correspondance trouvée/.test(n) && /Zzqxjvw Nonexistent/.test(n), "no result, with the criteria echoed");
    check(/Nouvelle recherche/.test(n), "'Nouvelle recherche'");
    await shot(nat, "srch-4-none");

    console.log("# 5. Advanced search");
    await go(nat, "/wanted?mode=advanced");
    await nat.evaluate(() => (Array.from(document.querySelectorAll("button[role=tab]")).find((b) => /avancée/i.test(b.textContent ?? "")) as HTMLButtonElement).click());
    await sleep(500);
    await nat.type('input[name="lastName"]', wanted.ln);
    if (wanted.dob) await nat.$eval('input[name="dateOfBirth"]', (el, v) => { (el as HTMLInputElement).value = v as string; el.dispatchEvent(new Event("input", { bubbles: true })); }, new Date(wanted.dob).toISOString().slice(0, 10));
    await shot(nat, "srch-5-advanced-form");
    await clickSearch(nat);
    check(/match trouvé/i.test(await text(nat)), "an advanced search by surname and date of birth finds the notice");
    await shot(nat, "srch-6-advanced-result", { full: true });

    console.log("# 6. A source ticked off, a criterion missing");
    await go(nat, `/wanted?go=1&search=${encodeURIComponent(wanted.ln)}&src=NATIONAL_DB`);
    check(/Personne connue|Aucune correspondance/i.test(await text(nat)) && !/match trouvé/i.test(await text(nat)), "without the wanted-notices source, nobody is reported as wanted");
    await go(nat, "/wanted?go=1&search=a&src=WANTED");
    check(/au moins deux caractères/.test(await text(nat)), "one character is refused with a reason");

    console.log("# 7. Arabic and phone");
    const ar = await session(browser, "commander.national", { width: 1440, height: 900 }, "ar");
    await quick(ar, `${wanted.fn} ${wanted.ln}`);
    check(/تم العثور على تطابق/.test(await text(ar)), "the match state is in Arabic");
    check((await ar.evaluate(() => document.documentElement.dir)) === "rtl", "laid out right to left");
    await shot(ar, "srch-7-match-ar", { full: true });
    const phone = await session(browser, "commander.national", { width: 375, height: 812 });
    await quick(phone, `${wanted.fn} ${wanted.ln}`);
    check(!(await phone.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2)), "no horizontal scroll at phone width");
    await shot(phone, "srch-8-match-phone", { full: true });
  } finally {
    await browser.close();
    await pool.end();
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
