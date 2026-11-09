/**
 * Screenshots of a spread of pages, to check the light content theme and the top bar across the application.
 *   PMS_URL=http://localhost:3300 DATABASE_URL=<any> npx tsx scripts/demo/shell-shots.ts [account]
 * Needs MFA to be off (or the account to have no second factor). Reads nothing from the database. Writes docs/demo/screens/theme-*.png.
 */
import { launch, session, shot, sleep, BASE } from "./lib";

const PAGES: [string, string][] = [
  ["dashboard", "/dashboard"],
  ["wanted", "/wanted"],
  ["cases", "/cases"],
  ["complaints", "/complaints"],
  ["complaint-new", "/complaints/new"],
  ["persons", "/persons"],
  ["users", "/admin/users"],
  ["user-new", "/admin/users/new"],
  ["roles", "/admin/roles"],
  ["approvals", "/approvals"],
  ["security", "/admin/security"],
  ["warrants", "/warrants"],
  ["traffic", "/traffic"],
  ["account", "/account"],
];

(async () => {
  const account = process.argv[2] ?? "commander.national";
  const browser = await launch();
  try {
    const p = await session(browser, account);
    for (const [name, path] of PAGES) {
      await p.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
      await sleep(2200);
      await shot(p, `theme-${name}`);
    }
    const phone = await session(browser, account, { width: 375, height: 812 });
    for (const [name, path] of [["dashboard", "/dashboard"], ["wanted", "/wanted"]] as const) {
      await phone.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
      await sleep(2200);
      await shot(phone, `theme-phone-${name}`);
    }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
