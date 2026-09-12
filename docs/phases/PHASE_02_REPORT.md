# PHASE 2 COMPLETION PACKAGE — Structures nationales & territoire (TPMS)

## A. Phase information

| Field | Value |
| ----- | ----- |
| Phase | 2 |
| Name | Organization & Master Data → évolution nationale TPMS (territoire, structures policières, agents) |
| Priority | P0 |
| Start | 2026-09-12 09:00 |
| Completion | 2026-09-12 17:15 |
| Status | **PASS** |

## B. Executive summary

La phase 2 a d'abord livré le socle « organisation & données de référence » (organisation, régions, commissariats, services, grades, agents, affectations), puis — sur mandat du propriétaire (« CONTINUATION DU DÉVELOPPEMENT — TPMS TCHAD ») — l'a fait évoluer, **sans rien supprimer ni casser**, vers une plateforme nationale :

- **Hiérarchie territoriale configurable** : Tchad (organisation) → Province (table `Region` conservée, présentée « Province ») → Département administratif (`AdminDepartment`) → Commune / Sous-préfecture / Arrondissement (`Commune`) → Quartier / Localité (`Locality`). Aucun nombre de provinces ou de commissariats n'est codé en dur.
- **Hiérarchie policière** : Direction générale, directions provinciales/départementales, commissariats centraux, commissariats, **postes et unités rattachés à une structure parente** (`Station.parentId`, récursif, anti-cycle), services, agents. Statuts `ACTIVE / INACTIVE / UNDER_CONSTRUCTION / PLANNED`.
- **Principe Role + périmètre organisationnel + permission** généralisé : nouveau niveau `DEPARTMENTAL`, et le périmètre d'un commissariat inclut désormais **ses postes et unités rattachés** (calcul récursif à chaque requête). 8 tests d'isolation prouvent qu'un commissariat ne voit pas son voisin, qu'un poste ne voit que lui-même, qu'un responsable provincial voit toute sa province et rien d'autre, et que la Direction générale voit les 23 provinces.
- **Référentiel Tchad** : les 23 provinces officielles (chef-lieux) et les 10 arrondissements de N'Djamena sont chargés comme référentiel ; tout le reste (départements, communes, localités, 14 structures policières, 118 agents, 17 comptes) est **DEMO**, marqué `isDemo` et affiché avec un badge, sous un bandeau « ENVIRONNEMENT DE DÉMONSTRATION ».
- Produit renommé **TPMS – Tchad Police Management System**.

Décisions techniques : migration additive uniquement (31 instructions, 0 DROP, colonnes nullables) pour préserver les données ; les deux anciennes régions fictives ont été **converties** en provinces réelles en conservant leurs identifiants (les comptes existants restent rattachés) ; le périmètre est matérialisé dans l'acteur (`stationIds`) une fois par requête plutôt que par jointure récursive dans chaque requête métier.

## C. Features implemented

| ID | Feature | Status | Notes |
| -- | ------- | ------ | ----- |
| P2-F1 | Organisation nationale (édition) | PASS | national uniquement |
| P2-F2 | Provinces (liste, fiche, création, édition, désactivation protégée) | PASS | 23 provinces officielles |
| P2-F3 | Départements administratifs (fiche, création, édition) | PASS | nouveau |
| P2-F4 | Communes / sous-préfectures / arrondissements + localités | PASS | nouveau, édition inline |
| P2-F5 | Structures policières : types étendus, statuts, rattachement territorial (département, commune, localité), parent/enfants, anti-cycle, commandant | PASS | `stationSchema`, `validateStationLinks` |
| P2-F6 | Fiche commissariat : compteurs postes/services/agents/comptes + véhicules/plaintes/affaires/interventions (modules à venir) | PASS | compteurs réels (0 tant que les modules n'existent pas) |
| P2-F7 | Services (départements internes) par structure, chef de service | PASS | gérable par le commissariat lui-même |
| P2-F8 | Grades (référentiel, niveaux, catégories) | PASS | 12 grades DEMO |
| P2-F9 | Agents : liste filtrée/paginée, fiche, création, édition, affectation/mutation/promotion avec historique, statut de service (machine d'états), désactivation/réactivation, lien compte utilisateur | PASS | 118 agents DEMO |
| P2-F10 | Périmètre `DEPARTMENTAL` + rôle `DEPARTMENTAL_COMMANDER` ; descendance de commissariat dans le périmètre | PASS | 8 tests d'isolation |
| P2-F11 | Utilisateurs : rattachement département + pré-remplissage depuis une fiche agent | PASS | |
| P2-F12 | API REST : provinces, stations, officers | PASS | 6 endpoints |
| P2-F13 | Référentiel Tchad + seed DEMO idempotent | PASS | `npm run db:seed` |
| P2-F14 | Renommage TPMS, bandeau DEMO (`DEMO_MODE`) | PASS | |

## D. Screens

| Screen | Route | Status | Responsive | Tested |
| ------ | ----- | ------ | ---------- | ------ |
| Organisation (provinces, grades, KPI) | `/admin/organization` | PASS | oui | navigateur |
| Province (départements, structures, création) | `/admin/organization/regions/[id]` | PASS | oui (1366, mobile) | navigateur |
| Département (communes, localités, structures) | `/admin/organization/departments/[id]` | PASS | oui | navigateur |
| Commissariat / structure (ressources, rattachements, postes/unités, services) | `/admin/organization/stations/[id]` | PASS | oui (mobile) | navigateur |
| Agents (liste) | `/officers` | PASS | oui | navigateur |
| Nouvel agent | `/officers/new` | PASS | oui | navigateur (rendu) ; création via API testée |
| Fiche agent (profil, affectation, historique, statut, compte) | `/officers/[id]` | PASS | oui | navigateur |
| Utilisateurs / nouvel utilisateur (département, pré-remplissage agent) | `/admin/users`, `/admin/users/new` | PASS | oui | navigateur + API |

## E. Workflows

**Création d'une structure** : fiche province → « Nouvelle structure » → `createStationAction` → `stationSchema` → `validateStationLinks` (province active, département ∈ province, commune ∈ département, localité ∈ commune, POST/UNIT ⇒ parent obligatoire, parent dans la même province, pas de cycle) → `assertRegionAdmin` → création (`isActive = status === ACTIVE`) → `STATION_CREATED` → redirection fiche.

**Mutation d'un agent** : fiche agent → « Nouvelle affectation » → `assignOfficer` → validation grade/structure/service → périmètre → transaction : clôture de l'affectation courante, nouvelle affectation, mise à jour de l'agent **et du compte utilisateur lié** (province, département, commissariat) → `OFFICER_ASSIGNED` / `OFFICER_PROMOTED` → notification à l'agent.

**Résolution du périmètre** (chaque requête) : `buildActor` → `scopeLevel` du rôle → STATION/OWN : `stationDescendantIds(stationId)` (CTE récursive) ; DEPARTMENTAL : toutes les structures du département ; REGIONAL : province ; NATIONAL : tout → `scopeWhere()` sur les listes, `inScope()` sur les lectures unitaires (404 hors périmètre).

## F. Database

Migration `20260912102414_national_territory` (additive, 31 instructions, 0 DROP) : tables `AdminDepartment`, `Commune`, `Locality` ; `Station` + `adminDepartmentId`, `communeId`, `localityId`, `parentId`, `status`, `isDemo` ; `Region.isDemo` ; `User.adminDepartmentId` ; enums `ScopeLevel + DEPARTMENTAL`, `StationType + PROVINCIAL_DIRECTION, DEPARTMENTAL_DIRECTION, UNIT`, `StationStatus`, `CommuneType`, `LocalityType` ; 4 index (`adminDepartmentId`, `communeId`, `parentId`, `status`). Total : 67 tables, 60 enums (`docs/DATABASE_DOCUMENTATION.md` régénéré). Intégrité vérifiée par test : aucun POST/UNIT orphelin, aucun cycle.

## G. API

Voir `API_DOCUMENTATION.md` (section « Territorial scope » + 6 endpoints phase 2).

## H. Validation

Frontend : contraintes HTML, sélecteurs en cascade (province → département → commune, structure → service). Backend : schémas zod (`regionSchema`, `adminDepartmentSchema`, `communeSchema`, `localitySchema`, `stationSchema`, `departmentSchema`, `rankSchema`, `officerSchema`, `assignmentSchema`, `dutyStatusSchema`), unicité des codes, cohérence des rattachements, machine d'états `DUTY_TRANSITIONS`, protections de désactivation (agents/postes actifs). Base : uniques, FK `SET NULL` sur les rattachements territoriaux, enums.

## I. Security

Périmètre appliqué côté serveur sur toutes les listes, lectures unitaires et écritures ; 404 sans fuite d'existence ; gardes `assertRegionAdmin` / `assertStationAdmin` / `assertOfficerScope` ; audit de chaque mutation (`PROVINCE_*`, `ADMIN_DEPARTMENT_*`, `COMMUNE_*`, `LOCALITY_CREATED`, `STATION_*`, `STATION_STATUS_CHANGED`, `DEPARTMENT_*`, `RANK_*`, `OFFICER_*`). Aucun nouveau secret. `DEMO_MODE` est un simple indicateur d'affichage.

## J. Permission matrix

Inchangée (92 permissions) ; nouveau rôle système `DEPARTMENTAL_COMMANDER` (périmètre DEPARTMENTAL, MFA requise, mêmes droits que le commissaire de poste). Matrice vivante : `/admin/permissions` (92 × 13).

## K. Audit logging

Nouvelles actions : `ORGANIZATION_UPDATED`, `PROVINCE_CREATED|UPDATED|DEACTIVATED`, `ADMIN_DEPARTMENT_CREATED|UPDATED`, `COMMUNE_CREATED|UPDATED`, `LOCALITY_CREATED`, `STATION_CREATED|UPDATED|STATUS_CHANGED`, `DEPARTMENT_CREATED|UPDATED|DEACTIVATED`, `RANK_CREATED|UPDATED`, `OFFICER_CREATED|UPDATED|ASSIGNED|PROMOTED|STATUS_CHANGED|DEACTIVATED|REACTIVATED`.

## L. Test results

`TEST_REPORT.md` phase 2 : 16 unitaires + 22 intégration (dont 8 d'isolation territoriale) + 16 sécurité = **54 tests verts** ; `tsc`, `eslint`, `next build` OK ; 8 pages vérifiées au navigateur (desktop 1366, mobile 375).

## M. Negative testing

Structure hors périmètre (404), agent hors périmètre (404), POST sans parent (422), cycle parent/enfant (422), doublon de code (409), désactivation avec agents/postes actifs (409), transition de statut invalide (409), province inexistante/inactive (422).

## N. Security test results

| Vulnérabilité | Testé | Résultat |
| ------------- | ----- | -------- |
| Fuite inter-commissariats (agents, structures, comptes) | oui (P2-S1..S3, S7) | bloquée, 404 |
| Fuite inter-provinces | oui (P2-S4, S7) | bloquée |
| Débordement de périmètre départemental | oui (P2-S5) | bloqué |
| Poste voyant son parent / ses frères | oui (P2-S2) | bloqué |
| Cycle dans la hiérarchie (déni de service récursif) | oui (P2-S8 + validation) | impossible |

## O. Responsive testing

1366×768 (fiche province 3 colonnes), 375×812 (fiche commissariat : compteurs empilés, bandeau DEMO sur deux lignes lisible). Les autres largeurs héritent des composants déjà validés en phase 1.

## P. UI/UX review

Design system respecté (cartes, badges, tableaux responsives, formulaires inline en `<details>` pour l'édition rapide). Badge « DEMO » sur chaque donnée fictive, badge « Référentiel » sur les données officielles. Point d'attention : les formulaires inline nombreux sur la fiche département peuvent s'alourdir avec des dizaines de communes ; prévoir une pagination si le référentiel officiel est chargé.

## Q. Bugs

| ID | Bug | Gravité | Statut |
| -- | --- | ------- | ------ |
| P2-B1 | Serveur de dev conservant l'ancien client Prisma après migration (500 « Unknown field adminDepartmentId ») | Faible (dev) | Corrigé (redémarrage) |
| P2-B2 | Test « station commander only sees their station » obsolète après l'ajout de la descendance | Faible | Corrigé (assertion sur CS-01 + descendants) |
| P2-B3 | Base embarquée arrêtée avec la session précédente (health 503) | Faible (dev) | Redémarrée ; documenté |

## R. Known limitations

- Référentiel officiel limité aux 23 provinces et aux arrondissements de N'Djamena ; départements, communes et localités officiels non chargés (données non disponibles ici) — le modèle les accepte tels quels.
- Le nom des rôles personnalisés reste monolingue.
- Les compteurs « véhicules / plaintes / affaires / interventions » de la fiche commissariat restent à 0 jusqu'à la livraison des modules concernés.

## S. Technical debt

- `stationIds` est recalculé à chaque requête (CTE récursive) : négligeable aujourd'hui, à mettre en cache par session si la hiérarchie dépasse quelques milliers de structures.
- `orgReferences()` charge toutes les communes de la province pour les sélecteurs : passer à un chargement par département au-delà de ~500 communes.
- Les anciens codes `Region` (CEN/NOR) ont été convertis ; la table garde le nom `Region` (renommage évité pour ne pas casser 20 relations).

## T. Files changed

`prisma/schema.prisma`, `prisma/migrations/20260912102414_national_territory`, `src/server/auth/dal.ts`, `src/server/org/{schemas,service,queries,actions}.ts`, `src/server/admin/{users,queries}.ts`, `src/server/rbac/roles.ts`, `src/server/demo/{accounts,seed-foundation,seed-territory}.ts`, `src/server/env.ts`, `src/lib/labels.ts`, `src/lib/i18n/{fr,en,catalog}.ts`, `src/components/app-shell/header.tsx`, `src/app/(app)/admin/organization/**`, `src/app/(app)/officers/**`, `src/app/(app)/admin/users/**`, `src/app/api/v1/{provinces,stations,officers}/**`, `tests/integration/{territory-scope,users-api}.test.ts`, `scripts/demo-totp.ts`, docs.

## U. Configuration changes

`DEMO_MODE=1` (bandeau de démonstration ; mettre 0 en production). Aucun secret.

## V. Deployment status

Development : opérationnel · Testing : 54 tests verts · Staging/Production : non provisionnés.

## W. Rollback plan

`git revert d0add9d` + migration inverse manuelle (suppression des colonnes/tables ajoutées) — la migration étant purement additive, l'ancien code fonctionne aussi tel quel sur le nouveau schéma.

## X. Phase scorecard

| Category | Score |
| -------- | ----: |
| Functionality | 9/10 |
| Security | 9/10 |
| Validation | 9/10 |
| Database | 9/10 |
| API | 8/10 |
| UI/UX | 8/10 |
| Responsive | 8/10 |
| Testing | 9/10 |
| Performance | 8/10 |
| Documentation | 9/10 |

**PHASE 2 : PASS → suite : personnel (fonctions, formations) puis plaintes / dossiers.**
