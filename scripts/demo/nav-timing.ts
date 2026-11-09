/**
 * Measures what a user feels: the time from a click on a sidebar link to the new page being on screen, in a real browser.
 *   PMS_URL=http://localhost:3302 DATABASE_URL=<any> npx tsx scripts/demo/nav-timing.ts [account]
 */
import { launch, session, sleep, BASE } from "./lib";

(async () => {
  const browser = await launch();
  try {
    const p = await session(browser, process.argv[2] ?? "commander.national");
    await p.goto(`${BASE}/dashboard`, { waitUntil: "load" });
    await sleep(2500);
    const hrefs = await p.$$eval("aside nav a", (as) => as.map((a) => (a as HTMLAnchorElement).getAttribute("href") ?? "").filter((h) => h.startsWith("/")));
    const results: { href: string; ms: number }[] = [];
    for (const href of hrefs.slice(0, 14)) {
      const t0 = Date.now();
      await p.evaluate((h) => (document.querySelector(`aside nav a[href="${h}"]`) as HTMLElement).click(), href);
      await p.waitForFunction((h) => location.pathname === h || location.pathname.startsWith(h), { timeout: 20000 }, href).catch(() => null);
      await p.waitForFunction(() => !!document.querySelector("main h1, main h2"), { timeout: 20000 }).catch(() => null);
      results.push({ href, ms: Date.now() - t0 });
      await sleep(400);
    }
    for (const r of results) console.log(`${String(r.ms).padStart(6)} ms  ${r.href}`);
    const avg = Math.round(results.reduce((s, r) => s + r.ms, 0) / results.length);
    console.log(`average ${avg} ms over ${results.length} clicks`);
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
