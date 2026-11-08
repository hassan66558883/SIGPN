/**
 * Shared helpers of the DG demonstration driver (puppeteer-core drives the locally installed Chrome).
 * Fictional data only. Requires the dev server on PMS_URL (default http://localhost:3300).
 */
import "dotenv/config";
import puppeteer, { type Browser, type Page } from "puppeteer-core";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";
import { createHash, randomBytes } from "node:crypto";
import { encryptSecret, decryptSecret } from "../../src/server/crypto";
import { generateTotpSecret, totpCode } from "../../src/server/auth/mfa";

export const BASE = process.env.PMS_URL ?? "http://localhost:3300";
export const PASSWORD = process.env.DEMO_PASSWORD ?? "Demo-Pms-2026!";
export const SHOTS = join(process.cwd(), "docs", "demo", "screens");
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
export const sleep = (ms: number) => new Promise((ok) => setTimeout(ok, ms));
mkdirSync(SHOTS, { recursive: true });

export async function launch(): Promise<Browser> {
  return puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox", "--lang=fr-FR", "--force-device-scale-factor=1"], defaultViewport: { width: 1440, height: 900 } });
}

/** A fresh isolated session per account (own cookies), French interface. */
export async function session(browser: Browser, username: string, viewport = { width: 1440, height: 900 }, lang: "fr" | "ar" = "fr"): Promise<Page> {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport(viewport);
  await page.setCookie({ name: "pms_lang", value: lang, url: BASE });
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle2" });
  await page.type('input[name="username"], input[autocomplete="username"]', username);
  await page.type('input[type="password"]', PASSWORD);
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => null), page.click('button[type="submit"]:not([name="locale"])')]);
  await sleep(2500);
  for (let attempt = 0; attempt < 3; attempt++) {
    const otp = await page.$('input[autocomplete="one-time-code"], input[name="code"]');
    if (!otp) break;
    await sleep(1200); // let the page hydrate before submitting
    if (attempt > 0) await sleep((31 - (Math.floor(Date.now() / 1000) % 30)) * 1000); // a code is single-use: wait for the next window
    await otp.click({ count: 3 });
    await otp.type(await currentTotp(username));
    await otp.evaluate((el) => (el as HTMLInputElement).form?.requestSubmit());
    await page.waitForFunction(() => !location.pathname.startsWith("/login"), { timeout: 8000 }).catch(() => null);
    await sleep(800);
  }
  return page;
}

export async function shot(page: Page, name: string, opts: { full?: boolean } = {}) {
  await sleep(700);
  await page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: opts.full ?? false });
  console.log(`  screenshot ${name}.png  (${page.url().replace(BASE, "")})`);
}

let keyN = 0;
const RUN = Date.now().toString(36).slice(-5);
/** Temporary API key for an account (removed by `cleanup`). */
export async function apiKey(username: string) {
  const u = await pool.query(`SELECT id FROM "User" WHERE username=$1`, [username]);
  if (!u.rowCount) throw new Error(`demo user ${username} missing`);
  const key = `pms_dm${RUN}_${randomBytes(32).toString("base64url")}`;
  await pool.query(`INSERT INTO "ApiKey"(id,"userId",name,"keyPrefix","keyHash") VALUES ($1,$2,'demo-run',$3,$4)`, [`apikey_dm_${username}_${RUN}_${keyN++}`, u.rows[0].id, `dm${RUN}`, createHash("sha256").update(key).digest("hex")]);
  return key;
}
export async function api<T = any>(key: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, { method, headers: { authorization: `Bearer ${key}`, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, json: (await res.json().catch(() => ({}))) as { data?: T; error?: { code: string; message?: string } } };
}
export async function cleanup() {
  await pool.query(`DELETE FROM "ApiKey" WHERE name='demo-run' AND "keyPrefix"=$1`, [`dm${RUN}`]);
}

/** Demonstration accounts whose role requires a second factor get a TOTP secret (demo accounts only; idempotent). */
export function assertDemoDb() {
  const name = new URL(process.env.DATABASE_URL ?? "postgresql://x/none").pathname.slice(1);
  if (!name.endsWith("_demo")) {
    console.error(`Refusing: "${name}" is not a demonstration database (name must end with _demo). Use scripts/demo/reset.ts to build one.`);
    process.exit(2);
  }
}
export async function ensureMfa(usernames: string[]) {
  assertDemoDb();
  for (const u of usernames) {
    const r = await pool.query(`SELECT "mfaSecretEnc" FROM "User" WHERE username=$1`, [u]);
    if (!r.rowCount) continue;
    await pool.query(`UPDATE "User" SET "mfaEnabled"=true, "mfaSecretEnc"=COALESCE("mfaSecretEnc",$2), "mfaEnrolledAt"=COALESCE("mfaEnrolledAt",now()) WHERE username=$1`, [u, encryptSecret(generateTotpSecret())]);
  }
}
export async function currentTotp(username: string) {
  const r = await pool.query(`SELECT "mfaSecretEnc" FROM "User" WHERE username=$1`, [username]);
  const secret = decryptSecret(r.rows[0].mfaSecretEnc as string);
  // never use a code in the last 2 seconds of its window
  if (30 - (Math.floor(Date.now() / 1000) % 30) < 3) await sleep(3500);
  return totpCode(secret);
}

export async function clickText(page: Page, text: string, sel = "button, a") {
  const ok = await page.evaluate(([t, s]) => {
    const el = [...document.querySelectorAll<HTMLElement>(s)].find((e) => (e.textContent ?? "").trim().toLowerCase().includes(t.toLowerCase()) && !(e as HTMLButtonElement).disabled);
    if (!el) return false;
    el.scrollIntoView({ block: "center" });
    el.click();
    return true;
  }, [text, sel] as const);
  if (!ok) throw new Error(`no clickable "${text}" on ${page.url()}`);
  await sleep(1500);
}
export async function setValue(page: Page, selector: string, value: string) {
  await page.$eval(selector, (el) => { (el as HTMLInputElement).value = ""; });
  await page.type(selector, value);
}

/** Submits the <form> that contains the element matching `selector` (React server-action forms). */
export async function submitFormOf(page: Page, selector: string) {
  await page.$eval(selector, (el) => (el.closest("form") as HTMLFormElement).requestSubmit());
  await sleep(2000);
}
