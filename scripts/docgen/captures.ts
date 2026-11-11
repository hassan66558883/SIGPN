/**
 * Captures complémentaires pour la documentation (écrans absents du dossier d'images).
 *   . scripts/demo/env.sh && npx tsx scripts/docgen/captures.ts      (installation de DÉMONSTRATION uniquement, MFA suspendu)
 * Se connecte avec des comptes fictifs : cela crée des sessions dans la base de démonstration (jamais en production).
 */
import { join } from "node:path";
import { launch, session, sleep, BASE } from "../demo/lib";
import { assertDemoDb } from "../demo/lib";

const OUT = join(process.cwd(), "SIGEC_PN_DOCUMENTATION", "07_ANNEXES", "captures");
type Item = [string, string, string?]; // nom, chemin, lien de détail à ouvrir (préfixe)
const PLAN: Record<string, Item[]> = {
  "chief.cs1": [
    ["doc-incidents", "/incidents", "/incidents/"], ["doc-incident-nouveau", "/incidents/new"], ["doc-patrouilles", "/patrols", "/patrols/"], ["doc-patrouille-nouvelle", "/patrols/new"],
    ["doc-pieces", "/evidence", "/evidence/"], ["doc-piece-nouvelle", "/evidence/new"], ["doc-taches", "/tasks"], ["doc-notifications", "/notifications"], ["doc-agents", "/officers"],
    ["doc-alertes", "/alerts"], ["doc-site-public", "/public-admin"], ["doc-controle-biometrique", "/biometric"],
    ["doc-rh-vue", "/hr"], ["doc-rh-dossiers", "/hr/dossiers"], ["doc-rh-mutations", "/hr/transfers"], ["doc-rh-presences", "/hr/attendance"], ["doc-rh-conges", "/hr/leaves"], ["doc-rh-rotation", "/hr/rotation"],
    ["doc-circ-controles", "/traffic/controls", "/traffic/controls/"], ["doc-circ-pv", "/traffic/tickets", "/traffic/tickets/"], ["doc-circ-amendes", "/traffic/fines", "/traffic/fines/"], ["doc-circ-catalogue", "/traffic/violations"],
  ],
  "finance.central": [
    ["doc-recettes-tableau", "/traffic/cash"], ["doc-recettes-caisses", "/traffic/cash/registers"], ["doc-recettes-versements", "/traffic/cash/deposits"], ["doc-recettes-rapprochements", "/traffic/cash/reconciliation"],
    ["doc-recettes-ecarts", "/traffic/cash/discrepancies"], ["doc-recettes-rapports", "/traffic/cash/reports"], ["doc-paiements-en-ligne", "/traffic/online-payments"],
  ],
  "hr.director": [["doc-rh-discipline", "/hr/discipline"], ["doc-rh-formation", "/hr/training"], ["doc-rh-documents", "/hr/documents"]],
  "traffic.cs1": [["doc-agent-circulation", "/traffic"], ["doc-caisse-agent", "/traffic/cash/registers"]],
};

(async () => {
  assertDemoDb();
  const browser = await launch();
  let n = 0;
  try {
    for (const [account, items] of Object.entries(PLAN)) {
      const p = await session(browser, account);
      for (const [name, path, detail] of items) {
        try {
          await p.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
          await sleep(2200);
          if (p.url().includes("/login") || p.url().includes("/forbidden")) { console.log(`  SKIP ${name}: ${account} n'a pas accès (${p.url().replace(BASE, "")})`); continue; }
          await p.screenshot({ path: join(OUT, `${name}.png`) }); n++;
          console.log(`  ${name}.png  (${account})`);
          if (detail) {
            const href = await p.evaluate((pre) => { const a = [...document.querySelectorAll("a")].map((x) => x.getAttribute("href") || "").find((h) => h.startsWith(pre) && !h.includes("/new") && h.length > pre.length); return a || null; }, detail);
            if (href) {
              await p.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded" }); await sleep(2200);
              await p.screenshot({ path: join(OUT, `${name}-fiche.png`) }); n++; console.log(`  ${name}-fiche.png`);
            }
          }
        } catch (e) { console.log(`  ECHEC ${name}: ${(e as Error).message.slice(0, 80)}`); }
      }
      await p.close();
    }
  } finally { await browser.close(); }
  console.log(n, "captures");
  process.exit(0);
})();
