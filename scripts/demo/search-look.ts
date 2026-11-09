/** Screenshots of the search screen states on whichever server PMS_URL points at (no database access). */
import { launch, session, shot, sleep, BASE } from "./lib";

(async () => {
  const browser = await launch();
  try {
    const p = await session(browser, "commander.national");
    const go = async (path: string) => {
      await p.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
      await sleep(2500);
    };
    await go("/wanted");
    await shot(p, "look-1-first");
    await go(`/wanted?go=1&mode=quick&search=${encodeURIComponent(process.argv[2] ?? "Djimet Ngakoutou")}&src=NATIONAL_DB&src=WANTED`);
    await shot(p, "look-2-match", { full: false });
    await go("/wanted?go=1&mode=quick&search=Zzqxjvw&src=NATIONAL_DB&src=WANTED");
    await shot(p, "look-3-none");
    // the pending panel: click and capture while the request is in flight
    await go("/wanted");
    await p.type('input[name="search"]', "Ngakoutou");
    await p.evaluate(() => (Array.from(document.querySelectorAll("form button[type=submit]")).find((b) => (b.textContent ?? "").trim() === "Rechercher") as HTMLButtonElement).click());
    await sleep(60);
    await shot(p, "look-4-pending");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
