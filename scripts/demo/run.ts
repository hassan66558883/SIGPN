/**
 * DG demonstration — five scenarios driven through the real interface (Chrome, headless) with screenshots.
 *   PMS_URL=http://localhost:3302 DATABASE_URL=…/pms_demo npx tsx scripts/demo/run.ts [1 2 3 4 5]
 * Fictional data only. Each run creates new fictitious records; use a fresh demonstration database for the final run.
 */
import type { Browser, Page } from "puppeteer-core";
import { assertDemoDb, launch, session, shot, cleanup, pool, ensureMfa, clickText, setValue, submitFormOf, sleep, BASE, apiKey, api } from "./lib";

const wanted = (process.argv.slice(2).length ? process.argv.slice(2) : ["0", "1", "2", "3", "4", "5"]).map(String);
const go = async (p: Page, path: string) => {
  await p.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await sleep(2000);
};
const state: { wantedId?: string; alertId?: string; alertNumber?: string; ref?: string; code?: string } = {};
const UNITS = ["chief.cs1", "chief.abe", "chief.arr5", "chief.mdu", "desk.post1"];

async function heartbeats() {
  for (const u of UNITS) await api(await apiKey(u), "POST", "/api/v1/alerts/heartbeat");
}
async function latestAlert() {
  const r = (await pool.query(`SELECT id, number FROM "NationalAlert" WHERE "isSimulation"=false ORDER BY seq DESC LIMIT 1`)).rows[0];
  state.alertId = r?.id;
  state.alertNumber = r?.number;
}

/** Fictitious public content: a verified directory of a few units and two news items (no invented official phone numbers). */
async function prepare() {
  console.log("# Préparation — annuaire et actualités fictifs");
  await pool.query(`UPDATE "Station" SET "publicVisible"=true, "publicAddress"='Adresse fictive de démonstration', "publicHours"='Lun–Ven 08h–16h (fictif)', "publicVerifiedAt"=now() WHERE code IN ('CS-01','CC-ABE','NS-01','CA-NDJ-05','CC-SRH')`);
  const author = await apiKey("chief.cs1");
  const publisher = await apiKey("commander.national");
  const items = [
    { title: "Démonstration : ouverture du portail citoyen", summary: "Le portail public permet de déposer une plainte et de suivre sa demande.", body: "Texte fictif de démonstration. Le portail permet de déposer une plainte ou un signalement, de recevoir une référence et un code de suivi, et de consulter les avis de recherche publiés. Aucune donnée réelle." },
    { title: "Démonstration : conseils de prévention", summary: "Quelques gestes simples pour limiter les vols dans les marchés.", body: "Texte fictif de démonstration. Gardez vos effets personnels près de vous et signalez toute situation suspecte au commissariat le plus proche. Aucune donnée réelle." },
  ];
  for (const it of items) {
    const r = await api<{ id: string }>(author, "POST", "/api/v1/public-content/news", it);
    const id = r.json.data?.id;
    if (id) await api(publisher, "PATCH", `/api/v1/public-content/news/${id}`, { published: true });
  }
}

/** Sign-in page (official emblem), French, Arabic (right-to-left) and phone. */
async function s0(b: Browser) {
  console.log("# Écran de connexion");
  for (const [lang, vp, name] of [["fr", { width: 1672, height: 941 }, "s0-1-connexion-fr"], ["ar", { width: 1672, height: 941 }, "s0-2-connexion-ar-rtl"], ["fr", { width: 375, height: 812 }, "s0-3-connexion-mobile"]] as const) {
    const p = await (await b.createBrowserContext()).newPage();
    await p.setViewport(vp);
    await p.setCookie({ name: "pms_lang", value: lang, url: BASE });
    await p.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
    await sleep(2500);
    await shot(p, name);
  }
}

async function s1(b: Browser) {
  console.log("# Scénario 1 — création et approbation d'un avis fictif (N'Djamena)");
  const person = (await pool.query(`SELECT p.number nb, p."lastName" ln FROM "Person" p WHERE p."deletedAt" IS NULL AND p."mergedIntoId" IS NULL AND p."stationId"=(SELECT "stationId" FROM "User" WHERE username='inv.diallo') AND NOT EXISTS (SELECT 1 FROM "WantedPerson" w WHERE w."personId"=p.id AND w.status IN ('DRAFT','PENDING_APPROVAL','ACTIVE','LOCATED','SUSPENDED')) ORDER BY p."createdAt" DESC LIMIT 1`)).rows[0];
  const inv = await session(b, "inv.diallo");
  await go(inv, "/wanted/new");
  await inv.type("#wt-person", person.ln);
  await sleep(1500);
  await inv.evaluate((nb) => {
    const opts = [...document.querySelectorAll<HTMLElement>('[role="option"]')];
    (opts.find((o) => (o.textContent ?? "").includes(nb)) ?? opts[0])?.click();
  }, person.nb);
  await sleep(500);
  await setValue(inv, "#wt-offense", "Vol à main armée — dossier de démonstration");
  await inv.select("#wt-diffusion", "NATIONAL");
  await inv.select("#wt-danger", "HIGH");
  await setValue(inv, "#wt-authority", "Parquet de N'Djamena (fictif)");
  await setValue(inv, "#wt-legal", "Référence fictive — usage de démonstration uniquement");
  await setValue(inv, "#wt-reason", "Personne fictive recherchée pour la démonstration du système. Aucune donnée réelle.");
  await setValue(inv, "#wt-lastseen", "Marché central, N'Djamena");
  await shot(inv, "s1-1-formulaire-enqueteur");
  await clickText(inv, "Créer l'avis", "button");
  await inv.waitForFunction(() => /\/wanted\/c[a-z0-9]{10,}/.test(location.pathname), { timeout: 20000 }).catch(async () => {
    console.log("  create did not redirect:", await inv.evaluate(() => [...document.querySelectorAll('[role="alert"], .text-danger')].map((e) => e.textContent).join(" | ")));
  });
  await sleep(1500);
  state.wantedId = inv.url().match(/wanted\/([^?/]+)/)?.[1];
  await shot(inv, "s1-2-brouillon-cree");

  // the notice is a search warrant: the investigator requests the warrant, the provincial commander activates it
  await inv.waitForSelector("#wt-wr-auth", { timeout: 10000 });
  await setValue(inv, "#wt-wr-auth", "Parquet de N'Djamena (fictif)");
  await setValue(inv, "#wt-wr-ref", "MR-DEMO-2026-001");
  await setValue(inv, "#wt-wr-grounds", "Mandat fictif de démonstration : suspect d'un vol à main armée. Aucune donnée réelle.");
  await inv.$eval("#wt-wr-grounds", (el) => el.scrollIntoView({ block: "center" }));
  await shot(inv, "s1-3-demande-de-mandat");
  await submitFormOf(inv, "#wt-wr-grounds");

  const prov = await session(b, "commander.central");
  await go(prov, `/wanted/${state.wantedId}`);
  await prov.$eval('input[name="warrantId"]', (el) => el.scrollIntoView({ block: "center" }));
  await prov.select('select[name="status"]:not(#wt-next-status)', "ACTIVE");
  await shot(prov, "s1-4-activation-mandat");
  await submitFormOf(prov, 'input[name="warrantId"]');

  const chief = await session(b, "chief.cs1");
  await go(chief, `/wanted/${state.wantedId}`);
  await clickText(chief, "Valider la vérification", "button");
  await shot(chief, "s1-5-verification-chef");

  await heartbeats();
  await go(prov, `/wanted/${state.wantedId}`);
  await prov.select("#wt-next-status", "ACTIVE");
  await prov.$eval("#wt-next-status", (el) => el.scrollIntoView({ block: "center" }));
  await shot(prov, "s1-6-approbation-commandement");
  await submitFormOf(prov, "#wt-next-status");
  await go(prov, `/wanted/${state.wantedId}`);
  await shot(prov, "s1-7-avis-actif-diffuse");
  await latestAlert();
  console.log("  alerte", state.alertNumber);
}

async function s2(b: Browser) {
  console.log("# Scénario 2 — réception à Abéché et dans plusieurs unités");
  if (!state.alertId) await latestAlert();
  await heartbeats();
  const abe = await session(b, "chief.abe");
  await go(abe, "/alerts");
  await shot(abe, "s2-1-abeche-liste-alertes");
  await go(abe, `/alerts/${state.alertId}`);
  await shot(abe, "s2-2-abeche-alerte-recue");
  await clickText(abe, "Acquitter", "button").catch(() => console.log("  (déjà acquittée)"));
  await shot(abe, "s2-3-abeche-acquittee");
  for (const u of ["chief.mdu", "chief.arr5", "desk.post1"]) {
    const k = await apiKey(u);
    await api(k, "POST", `/api/v1/alerts/${state.alertId}/ack`);
  }
  const mdu = await session(b, "chief.mdu");
  await go(mdu, `/alerts/${state.alertId}`);
  await shot(mdu, "s2-4-moundou-alerte");
  const abeAr = await session(b, "chief.abe", undefined, "ar");
  await go(abeAr, `/alerts/${state.alertId}`);
  await shot(abeAr, "s2-5-abeche-alerte-arabe-rtl");
}

async function s3(b: Browser) {
  console.log("# Scénario 3 — correspondance biométrique simulée");
  const bio = await session(b, "inv.diallo");
  await go(bio, "/biometric/control");
  await shot(bio, "s3-1-console-simulation");
  await bio.select("#bc-scenario", "POSSIBLE_MATCH");
  await bio.$eval("#bc-reason", (el) => {
    (el as HTMLInputElement).value = "";
  });
  await bio.type("#bc-reason", "Contrôle d'identité — démonstration");
  await clickText(bio, "Lancer la vérification", "button");
  await sleep(1500);
  await bio.evaluate(() => window.scrollTo(0, 0));
  await shot(bio, "s3-2-alerte-rouge-correspondance");
  await bio.evaluate(() => document.querySelector('[role="alert"], [role="status"]')?.scrollIntoView({ block: "start" }));
  await bio.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await shot(bio, "s3-3-detail-et-confirmation-humaine");
}

async function s4(b: Browser) {
  console.log("# Scénario 4 — supervision nationale, unité hors ligne, reprise");
  const adminKey = await apiKey("commander.national");
  const abeId = (await pool.query(`SELECT id FROM "Station" WHERE code='CC-ABE'`)).rows[0].id as string;
  await heartbeats();
  const sup = await session(b, "commander.national");
  await go(sup, "/alerts/supervision");
  await shot(sup, "s4-1-supervision-nationale");
  await api(adminKey, "POST", `/api/v1/alerts/units/${abeId}/presence`, { offline: true });
  const made = await api(adminKey, "POST", "/api/v1/alerts/simulate", { title: "Exercice national — liaison coupée (démonstration)", diffusion: "NATIONAL", stationId: (await pool.query(`SELECT id FROM "Station" WHERE code='CS-01'`)).rows[0].id });
  const simId = (made.json.data as { id: string }).id;
  // the connected units synchronise (every 20 s in production); Abéché is cut off and keeps its notice in the durable queue
  for (const u of UNITS.filter((x) => x !== "chief.abe")) await api(await apiKey(u), "GET", "/api/v1/alerts?limit=50");
  await go(sup, `/alerts/supervision/${simId}`);
  await shot(sup, "s4-2-unite-hors-ligne-avis-retenu");
  await api(adminKey, "POST", `/api/v1/alerts/units/${abeId}/presence`, { offline: false });
  const abeKey = await apiKey("chief.abe");
  await api(abeKey, "GET", "/api/v1/alerts?limit=50");
  await go(sup, `/alerts/supervision/${simId}`);
  await shot(sup, "s4-3-reprise-apres-reconnexion");
  await go(sup, "/alerts/supervision");
  await shot(sup, "s4-4-supervision-apres-reprise");
}

async function s5(b: Browser) {
  console.log("# Scénario 5 — site public : plainte, suivi, publication d'un avis");
  const ctx = await b.createBrowserContext();
  const pub = await ctx.newPage();
  await pub.setViewport({ width: 1440, height: 900 });
  await pub.setCookie({ name: "pms_lang", value: "fr", url: BASE });
  await pub.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await sleep(1500);
  await shot(pub, "s5-1-accueil-public");
  await pub.goto(`${BASE}/plaintes`, { waitUntil: "domcontentloaded" });
  await sleep(1500);
  await pub.select("#pf-category", "THEFT").catch(() => null);
  await setValue(pub, "#pf-subject", "Vol de téléphone au marché — démonstration");
  await setValue(pub, "#pf-message", "Message fictif de démonstration : un téléphone a été volé au marché. Aucune donnée réelle.");
  await setValue(pub, "#pf-location", "Marché central, N'Djamena");
  await pub.evaluate(() => {
    const sel = document.querySelector<HTMLSelectElement>("#pf-station");
    const opt = [...(sel?.options ?? [])].find((o) => o.textContent?.includes("CS-01") || o.textContent?.includes("Commissariat Central de N'Djamena"));
    if (sel && opt) { sel.value = opt.value; sel.dispatchEvent(new Event("change", { bubbles: true })); }
  });
  await setValue(pub, "#pf-name", "Citoyen Démo");
  await setValue(pub, "#pf-phone", "+235 60 00 00 00");
  await pub.click('input[name="consent"]');
  await shot(pub, "s5-2-formulaire-plainte");
  await clickText(pub, "Envoyer", "button");
  await sleep(2500);
  const mono = await pub.$$eval(".font-mono, strong, code", (els) => els.map((e) => (e.textContent ?? "").trim()));
  state.ref = mono.find((t) => /^PUB-\d{4}-\d{6}$/.test(t));
  state.code = mono.find((t) => /^[A-Z0-9]{8,12}$/.test(t) && t !== state.ref);
  await shot(pub, "s5-3-plainte-recue");
  console.log("  ref", state.ref, "code", state.code ? "(lu)" : "(non lu)");
  const track = async () => {
    await pub.goto(`${BASE}/suivi`, { waitUntil: "domcontentloaded" });
    await sleep(1500);
    await pub.type("#tr-ref", state.ref ?? "");
    await pub.type("#tr-code", state.code ?? "");
    await clickText(pub, "Consulter", "button");
    await sleep(1500);
  };
  await track();
  await shot(pub, "s5-4-suivi-recu");

  const chief = await session(b, "chief.cs1");
  await go(chief, "/public-admin");
  await shot(chief, "s5-5-bureau-public-file");
  const link = await chief.evaluate((ref) => [...document.querySelectorAll<HTMLAnchorElement>("a")].find((a) => (a.textContent ?? "").includes(ref ?? "~"))?.getAttribute("href") ?? null, state.ref);
  if (link) {
    await go(chief, link);
    await shot(chief, "s5-6-traitement-plainte");
    await chief.select("#pa-status", "IN_REVIEW").catch(() => null);
    await setValue(chief, "#pa-reply", "Votre signalement est enregistré. Présentez-vous au commissariat central muni de votre référence. (réponse fictive)");
    await clickText(chief, "Enregistrer", "button");
    await sleep(1500);
  }
  await track();
  await shot(pub, "s5-7-suivi-reponse");

  if (!state.wantedId) state.wantedId = (await pool.query(`SELECT id FROM "WantedPerson" WHERE status='ACTIVE' ORDER BY "createdAt" DESC LIMIT 1`)).rows[0]?.id;
  await go(chief, `/wanted/${state.wantedId}`);
  await chief.evaluate(() => document.querySelector("#wt-pubnotice")?.scrollIntoView({ block: "center" }));
  await setValue(chief, "#wt-pubnotice", "Avis fictif de démonstration : toute personne ayant des informations est invitée à contacter le commissariat le plus proche.");
  await chief.click('input[name="confirm"]');
  await shot(chief, "s5-8-publication-expresse");
  await clickText(chief, "Publier sur le site public", "button");
  await sleep(1500);
  await pub.goto(`${BASE}/avis-de-recherche`, { waitUntil: "domcontentloaded" });
  await sleep(1500);
  await shot(pub, "s5-9-avis-public-publie");

  // same portal in Arabic (right-to-left) and on a phone
  const ar = await b.createBrowserContext();
  const pa = await ar.newPage();
  await pa.setViewport({ width: 1440, height: 900 });
  await pa.setCookie({ name: "pms_lang", value: "ar", url: BASE });
  await pa.goto(`${BASE}/avis-de-recherche`, { waitUntil: "domcontentloaded" });
  await sleep(1500);
  await shot(pa, "s5-10-portail-arabe-rtl");
  const mob = await b.createBrowserContext();
  const pm = await mob.newPage();
  await pm.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
  await pm.setCookie({ name: "pms_lang", value: "fr", url: BASE });
  await pm.goto(`${BASE}/plaintes`, { waitUntil: "domcontentloaded" });
  await sleep(1500);
  await shot(pm, "s5-11-portail-mobile");
}

(async () => {
  assertDemoDb();
  await ensureMfa(["admin", "chief.cs1", "chief.abe", "chief.arr5", "chief.mdu", "commander.national", "commander.central"]);
  const b = await launch();
  try {
    await prepare();
    if (wanted.includes("0") || process.argv.slice(2).length === 0) await s0(b);
    if (wanted.includes("1")) await s1(b);
    if (wanted.includes("2")) await s2(b);
    if (wanted.includes("3")) await s3(b);
    if (wanted.includes("4")) await s4(b);
    if (wanted.includes("5")) await s5(b);
  } finally {
    await b.close();
    await cleanup();
    await pool.end();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
