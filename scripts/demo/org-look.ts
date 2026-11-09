import { launch, session, shot, sleep, BASE } from "./lib";
(async () => {
  const browser = await launch();
  try {
    const p = await session(browser, "security.admin");
    await p.goto(`${BASE}/admin/organization`, { waitUntil: "domcontentloaded" });
    await sleep(3000);
    await shot(p, "prov-1-organization");
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
