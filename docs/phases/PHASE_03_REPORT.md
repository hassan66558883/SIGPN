# PHASE 3 COMPLETION PACKAGE — Personnel (fonctions, formations), Personnes, Plaintes, Affaires (TPMS)

## A. Phase information

| Field | Value |
| ----- | ----- |
| Phase | 3 (couvre les phases 3 « Person Management », 4 « Complaint Management » et le noyau des phases 5/6 « Case Management / Investigation » de la feuille de route initiale, regroupées selon l'ordre de priorité du propriétaire : personnel → plaintes/dossiers) |
| Name | Personnel : fonctions & formations · Registre des personnes · Plaintes · Affaires & enquête |
| Priority | P0 |
| Start | 2026-09-12 17:20 |
| Completion | 2026-09-12 23:40 |
| Status | **PASS** |

## B. Executive summary

La phase 3 livre le cœur opérationnel de la chaîne « accueil → plainte → affaire → enquête » en s'appuyant sur le socle territorial de la phase 2, **sans modifier ni supprimer** l'existant (migration additive : 2 tables, 3 colonnes, 0 DROP).

- **Personnel** : référentiel des **fonctions** (`Position`, configurable, 10 fonctions DEMO), fonction portée par l'agent et par chaque affectation, **formations** avec cycle de vie (planifiée → en cours → terminée / échouée / annulée), résultat, certificat, expiration.
- **Registre des personnes** : fiche complète (identité, contact, résidence, description physique, décès), **pièces d'identité typées** (unicité type+valeur), **alias**, **relations** entre personnes, **détection de doublons** à la création (pièce d'identité, téléphone, nom + date de naissance, comparaison sans accents via `unaccent_safe()`), création forcée explicite, **fusion** de doublons (redirection des plaintes, parties d'affaire, alias, pièces ; enregistrement `mergedIntoId`, jamais de suppression). Rattachement territorial optionnel (`Person.stationId`) : une personne enregistrée par un commissariat n'est pas visible d'un autre, les personnes « nationales » (sans rattachement) restent partagées.
- **Plaintes** : dépôt (brouillon ou enregistrement direct, plaignant identifié ou anonyme), catégorie d'infraction (20), priorité, lieu, date des faits, **workflow** DRAFT → REGISTERED → UNDER_REVIEW → ASSIGNED → CONVERTED / CLOSED / REJECTED avec transitions verrouillées et gardes de concurrence, examen, attribution à un enquêteur du périmètre, clôture motivée, **conversion en affaire** (création de l'affaire, partie PLAIGNANT, enquêteur principal, chronologie, double audit).
- **Affaires** : création directe ou par conversion, **équipe d'enquête** (principal, superviseur, membres avec historique), **parties** (plaignant, victime, témoin, suspect, personne d'intérêt, mis en cause — avec le **rappel de présomption d'innocence** affiché sur l'écran), statut de chaque partie, **tâches** (assignation, échéance, statut), **notes** (dont confidentielles), **chronologie** automatique, **journal d'audit** de l'affaire, machine d'états OPEN → ASSIGNED → UNDER_INVESTIGATION → PENDING_REVIEW → REFERRED / CLOSED → ARCHIVED avec disposition obligatoire à la clôture et lecture seule ensuite.
- **Autorisation au niveau de l'affaire** : périmètre territorial **ET** (affaire non sensible OU permission `cases:view_sensitive` OU membre de l'équipe) ; écriture réservée à l'équipe ou aux détenteurs de `cases:assign` ; opérations sensibles (mise en cause CHARGED/REFERRED, clôture, archivage) sous permissions dédiées.
- **API REST** : 11 nouveaux endpoints (personnes, plaintes, affaires) avec opérations `PATCH { op }` protégées par la permission propre à chaque opération.
- **Jeu DEMO** réaliste et fictif : 90 personnes, 70 plaintes réparties sur tous les statuts, 16 affaires avec parties, tâches, notes et chronologie ; 118 fonctions attribuées ; 124 formations.

Décisions techniques : les transitions de statut utilisent `updateMany({ where: { id, status: avant } })` (garde de concurrence sans verrou) ; les FK des transitions sont écrites en scalaires (`Prisma.ComplaintUncheckedUpdateInput`) ; les filtres de périmètre, de « mes dossiers » et de recherche, tous exprimés en `OR`, sont combinés via `AND: [...]` pour qu'aucun n'écrase l'autre (bogue détecté par test, voir §Q).

## C. Features implemented

| ID | Feature | Status | Notes |
| -- | ------- | ------ | ----- |
| P3-F1 | Fonctions (référentiel, création, édition, activation) | PASS | `/admin/organization` |
| P3-F2 | Fonction de l'agent (fiche agent, mise à jour de l'affectation courante) | PASS | `OFFICER_POSITION_CHANGED` |
| P3-F3 | Formations de l'agent (enregistrement, statut, résultat, certificat, expiration) | PASS | `TRAINING_RECORDED / UPDATED` |
| P3-F4 | Personnes : liste filtrée/paginée, recherche (nom, n°, téléphone, alias, pièce) | PASS | `PID-AAAA-NNNNN` |
| P3-F5 | Personnes : création avec détection de doublons et création forcée | PASS | blocage dur sur pièce identique (409) |
| P3-F6 | Personnes : fiche, édition, pièces d'identité, alias, relations | PASS | |
| P3-F7 | Fusion de doublons (redirection des liens, trace `mergedIntoId`) | PASS | `PERSON_MERGED` |
| P3-F8 | Plaintes : liste, compteurs, filtres, « mes plaintes » | PASS | `CMP-AAAA-NNNNN` |
| P3-F9 | Plaintes : dépôt (brouillon / enregistrée), plaignant via sélecteur, anonymat | PASS | `PersonPicker` |
| P3-F10 | Plaintes : examen, attribution, clôture / rejet, conversion en affaire | PASS | transitions verrouillées |
| P3-F11 | Affaires : liste, compteurs, création, marquage sensible | PASS | `CASE-AAAA-NNNNN` |
| P3-F12 | Affaires : équipe (principal, superviseur, membres) | PASS | `CASE_ASSIGNED` |
| P3-F13 | Affaires : parties et statut de partie, présomption d'innocence | PASS | `CASE_PARTY_ADDED / STATUS` |
| P3-F14 | Affaires : tâches (création, statut, résultat), « Mes tâches » | PASS | `/tasks` |
| P3-F15 | Affaires : notes (confidentielles), chronologie, journal d'audit | PASS | |
| P3-F16 | Affaires : machine d'états, clôture avec disposition, archivage, lecture seule | PASS | |
| P3-F17 | Autorisation au niveau de l'affaire (sensible / équipe / périmètre) | PASS | 3 tests |
| P3-F18 | API REST personnes / plaintes / affaires | PASS | 11 endpoints |
| P3-F19 | Jeu DEMO opérationnel idempotent | PASS | `seedOperations` |
| P3-F20 | Libellés bilingues (20 catégories, statuts, rôles de partie, types de pièces…) et traduction des messages serveur | PASS | dictionnaires synchronisés (test) |

## D. Screens

| Screen | Route | Status | Responsive | Tested |
| ------ | ----- | ------ | ---------- | ------ |
| Personnes (liste, recherche) | `/persons` | PASS | oui | navigateur |
| Enregistrer une personne (doublons) | `/persons/new` | PASS | oui | navigateur + tests |
| Fiche personne (identité, pièces, alias, relations, plaintes/affaires liées) | `/persons/[id]` | PASS | oui | navigateur |
| Plaintes (compteurs, filtres) | `/complaints` | PASS | oui | navigateur |
| Nouvelle plainte | `/complaints/new` | PASS | oui | tests API |
| Fiche plainte (stepper, faits, traitement, examen/attribution/clôture/conversion) | `/complaints/[id]` | PASS | oui | navigateur |
| Affaires | `/cases` | PASS | oui | navigateur |
| Nouvelle affaire | `/cases/new` | PASS | oui | tests API |
| Affaire : vue d'ensemble, personnes, tâches, notes, chronologie, audit | `/cases/[id]?tab=…` | PASS | oui (375 : onglets défilants, cartes empilées) | navigateur |
| Mes tâches | `/tasks` | PASS | oui | navigateur |
| Fiche agent (fonction, formations) | `/officers/[id]` | PASS | oui | navigateur |
| Organisation (fonctions) | `/admin/organization` | PASS | oui | navigateur |

## E. Workflows

**Dépôt d'une plainte** : `/complaints/new` → `complaintSchema` → `resolveStation` (structure de l'acteur ou choisie dans le périmètre) → plaignant dans le périmètre (ou anonyme) → `nextNumber("CMP")` → statut `DRAFT` ou `REGISTERED` → audit → fiche.

**Traitement** : `registerComplaint` (DRAFT→REGISTERED) → `reviewComplaint` (→UNDER_REVIEW, priorité, notes) → `assignComplaint` (→ASSIGNED, enquêteur du périmètre disposant de `cases:update` ou `investigations:manage`, notification) → `closeComplaint` (→CLOSED/REJECTED, motif obligatoire) **ou** `convertToCase` (transaction : affaire `ASSIGNED` ou `OPEN`, partie COMPLAINANT, affectation LEAD, événements de chronologie, plainte → CONVERTED, audits `COMPLAINT_CONVERTED` + `CASE_CREATED`).

**Enquête** : `assignToCase` (LEAD/SUPERVISOR/MEMBER, clôture de l'affectation précédente du même rôle) → `addParty` (SUSPECT/POI/ACCUSED ⇒ statut de partie UNDER_INVESTIGATION ; première partie ⇒ affaire UNDER_INVESTIGATION) → `createTask` / `setTaskStatus` → `addNote` → `changeCaseStatus` (CLOSED ⇒ `cases:close` + disposition ; ARCHIVED ⇒ `cases:archive`) ; toute écriture passe par `getCaseForWrite` (lecture seule si CLOSED/ARCHIVED, équipe ou `cases:assign`).

**Doublons** : `findDuplicates` (pièce → téléphone → nom+date → nom sans accents) → si candidats et `forceCreate ≠ "1"` : retour des candidats à l'écran (choix « utiliser la fiche existante » ou « créer quand même ») ; pièce d'identité déjà attribuée ⇒ 409 sans contournement.

## F. Database

Migration `20260912161408_personnel_positions_trainings_person_station` (additive) : tables `Position`, `Training` (+ enum `TrainingStatus`) ; colonnes `Officer.positionId`, `OfficerAssignment.positionId`, `Person.stationId` ; index associés ; `CREATE EXTENSION IF NOT EXISTS unaccent` + fonction `unaccent_safe(text)` (repli sur `lower()` si l'extension manque). Les tables Person/Complaint/Case/CaseParty/CaseAssignment/CaseEvent/CaseNote/Task existaient depuis la phase 0 et sont utilisées telles quelles. Total : **69 tables, 61 enums** (`docs/DATABASE_DOCUMENTATION.md` régénéré).

## G. API

Voir `API_DOCUMENTATION.md` (11 endpoints phase 3, opérations `PATCH { op }` et permissions par opération).

## H. Validation

Frontend : champs requis, longueurs, sélecteurs contraints, sélecteur de personne avec recherche serveur. Backend : `positionSchema`, `trainingSchema`, `personSchema` (+ `identifierSchema`, `aliasSchema`, `relationshipSchema`, `mergeSchema`), `complaintSchema` (titre ≥ 5, description ≥ 20, date des faits non future), `reviewSchema`, `assignSchema`, `closeSchema` (motif ≥ 5), `convertSchema`, `caseSchema`, `caseAssignSchema`, `partySchema`, `partyStatusSchema`, `noteSchema`, `taskSchema`, `taskStatusSchema`, `caseStatusSchema` ; tables de transitions ; gardes de concurrence `updateMany` ; unicité type+valeur des pièces ; auto-relation interdite ; fusion d'une personne dans elle-même interdite. Base : uniques, FK, enums, séquences annuelles.

## I. Security

Périmètre territorial sur toutes les listes, lectures et écritures (404 hors périmètre). Personnes : `personScopeWhere` = fiches nationales + fiches du périmètre. Affaires : `caseScopeWhere` ajoute la règle « sensible » ; `getCaseForWrite` restreint l'écriture à l'équipe. Permissions vérifiées par opération dans l'API (`complaints:create/review/assign/close/convert`, `cases:assign/update/close/archive/view_sensitive`). Audit de chaque mutation avec avant/après. Aucune donnée réelle : tout le jeu de données est fictif et marqué DEMO.

## J. Permission matrix

Catalogue inchangé (92 permissions). Permissions utilisées par la phase : `officers:manage` (fonctions, formations), `persons:view/create/update/merge`, `complaints:view/create/update/review/assign/close/convert`, `cases:view/create/update/assign/close/archive/view_sensitive`, `investigations:manage`.

## K. Audit logging

Nouvelles actions : `POSITION_CREATED|UPDATED`, `OFFICER_POSITION_CHANGED`, `TRAINING_RECORDED|UPDATED`, `PERSON_CREATED|UPDATED|IDENTIFIER_ADDED|IDENTIFIER_REMOVED|ALIAS_ADDED|RELATIONSHIP_ADDED|MERGED`, `COMPLAINT_CREATED|REGISTERED|UPDATED|REVIEWED|ASSIGNED|CLOSED|REJECTED|CONVERTED`, `CASE_CREATED|ASSIGNED|PARTY_ADDED|PARTY_STATUS|NOTE_ADDED|TASK_CREATED|TASK_UPDATED|STATUS_CHANGED`. La chronologie d'affaire (`CaseEvent`) est alimentée en parallèle.

## L. Test results

`TEST_REPORT.md` phase 3 : **22 unitaires** (`workflows.test.ts` : 6 nouveaux) + **30 intégration** (`complaints-cases.test.ts` : 8 nouveaux) + **16 sécurité** = **68 tests verts** ; `tsc`, `eslint`, `next build` OK ; 12 écrans vérifiés au navigateur (desktop, 375).

## M. Negative testing

Doublon de pièce d'identité (409), candidats doublons sans `forceCreate` (retour des candidats, pas de création), personne d'un autre commissariat (404 / absente de la recherche), plainte hors périmètre (404), transition invalide (409 STATE), attribution à un enquêteur hors périmètre (422), clôture sans motif (422), conversion d'une plainte déjà convertie (409), affaire sensible non membre (404), écriture par un non-membre (403), écriture sur affaire close (409), clôture sans disposition (422), CHARGED sans `cases:close` (403).

## N. Security test results

| Vulnérabilité | Testé | Résultat |
| ------------- | ----- | -------- |
| Fuite de personnes entre commissariats (liste, recherche, sélecteur) | oui (P3-I2) | bloquée — bogue `OR` écrasé détecté et corrigé |
| Fuite de plaintes / affaires vers un poste rattaché ou un autre commissariat | oui (P3-I5) | bloquée (404) |
| Lecture d'une affaire sensible par un non-membre | oui (P3-I6) | bloquée (404) |
| Écriture par un non-membre / après clôture | oui (P3-I7) | bloquée (403 / 409) |
| Contournement de la machine d'états | oui (P3-I3) | bloqué (409) |
| Permissions par opération de l'API `PATCH` | oui (P3-I3, I4) | 403 |

## O. Responsive testing

Desktop (pane 800–1366) et 375×812 : fiche affaire (onglets défilants horizontalement, cartes de tâches empilées, bandeau DEMO lisible), listes en cartes sous 768 px héritées du design system.

## P. UI/UX review

Stepper de plainte (Réception → Enregistrée → Examen → Attribuée → Affaire), compteurs par statut, badges bilingues, sélecteur de personne accessible (`role="combobox"`), rappel de présomption d'innocence dans l'onglet Personnes. Point d'attention : le journal d'audit d'une affaire DEMO est vide (le seed n'écrit pas d'audit, par conception) ; les affaires créées via l'application affichent leurs événements.

## Q. Bugs

| ID | Bug | Gravité | Statut |
| -- | --- | ------- | ------ |
| P3-B1 | Recherche de personnes : le filtre de périmètre (`OR`) était écrasé par le `OR` de recherche → fuite inter-commissariats | **Élevée** (sécurité) | Corrigé (`AND: [scope]`) ; même motif appliqué aux plaintes/affaires (`mine`) ; couvert par P3-I2 |
| P3-B2 | Examen d'une plainte → 500 (`updateMany` refuse `reviewedBy: { connect }`) | Moyenne | Corrigé (FK scalaires `reviewedById/assignedToId`) |
| P3-B3 | Formulaires serveur passant des fonctions à `ActionForm` (500) | Faible | Déplacés en composants client |
| P3-B4 | Clés dupliquées `officer.position` dans les dictionnaires | Faible | Supprimées ; test de synchronisation |
| P3-B5 | Tests de sécurité intermittents si relancés dans les 15 min (limiteur par identifiant 20/15 min en mémoire) | Faible (test) | Documenté ; relance verte |

## R. Known limitations

- Pièces jointes (photos, documents) des personnes et plaintes : phase Documents.
- Recherche phonétique / floue limitée à `unaccent` + `contains` (pg_trgm disponible, index à ajouter lorsque le volume le justifiera).
- Le journal d'audit de l'affaire n'agrège pas encore les événements des modules à venir (preuves, mandats).
- Notifications internes uniquement (pas de SMS/e-mail).

## S. Technical debt

- `caseAuditTrail` : la seconde branche `OR` (recherche de l'identifiant dans `summary`) est approximative ; à remplacer par une colonne `caseId` dans `AuditLog` ou une table de liaison si nécessaire.
- Le sélecteur de personne charge 10 résultats sans pagination.
- `seedOperations` ne s'exécute que si la table `Person` est vide (pas de mise à jour incrémentale du jeu DEMO).

## T. Files changed

`prisma/schema.prisma`, `prisma/migrations/20260912161408_personnel_positions_trainings_person_station`, `src/server/org/{personnel,actions,service}.ts`, `src/server/persons/**`, `src/server/complaints/**`, `src/server/cases/**`, `src/server/timeline.ts`, `src/server/demo/seed-operations.ts` (+ `seed-foundation.ts`, `prisma/seed.ts`), `src/lib/labels.ts`, `src/lib/i18n/{fr,en,errors}.ts`, `src/components/person-picker.tsx`, `src/app/(app)/{persons,complaints,cases,tasks}/**`, `src/app/(app)/officers/{personnel-forms.tsx,[id]/page.tsx}`, `src/app/(app)/admin/organization/page.tsx`, `src/app/api/v1/{persons,complaints,cases}/**`, `tests/unit/workflows.test.ts`, `tests/integration/complaints-cases.test.ts`, docs.

## U. Configuration changes

Aucune. Extension PostgreSQL `unaccent` requise (installée par la migration, repli automatique sinon).

## V. Deployment status

Development : opérationnel · Testing : 68 tests verts · Staging/Production : non provisionnés.

## W. Rollback plan

`git revert 929d020` ; migration purement additive : l'ancien code fonctionne sur le nouveau schéma ; suppression manuelle des tables `Position`/`Training` et des trois colonnes si un retour complet est exigé.

## X. Phase scorecard

| Category | Score |
| -------- | ----: |
| Functionality | 9/10 |
| Security | 9/10 |
| Validation | 9/10 |
| Database | 9/10 |
| API | 9/10 |
| UI/UX | 8/10 |
| Responsive | 8/10 |
| Testing | 9/10 |
| Performance | 8/10 |
| Documentation | 9/10 |

**PHASE 3 : PASS → suite : opérations (incidents / interventions, patrouilles), puis tableaux de bord par niveau (NATIONAL / PROVINCE / COMMISSARIAT / AGENT).**
