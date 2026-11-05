# Module Ressources humaines (RH)

Plan en 10 phases (cahier des charges « SIGEC PN » : dossiers, carrière, mutations, affectation automatique après 12 mois, présences, formations, discipline, documents, tableaux de bord). Ce fichier suit l'avancement.

## Phase 3 — Dossier individuel et carrière (fait)

**Réutilisé, non dupliqué :** `Officer` (dossier), `Rank`, `Position`, `OfficerAssignment`, `Training`, `Station`, `SystemSetting`, `AuditLog`.

**Ajouté (migration `20261105170000_hr_dossier_career`, additive, aucune donnée supprimée) :**
- `Officer` : lieu de naissance, situation matrimoniale, corps, situation administrative (`AdministrativeStatus`), date de prise de service, date de prise de fonction au poste actuel (`currentPostSince`, base de la règle des 12 mois), chemin de photo (le dépôt viendra en phase 7).
- `Corps` (référentiel modifiable ; liste par défaut non officielle) et `CareerEvent` (historique de carrière **en ajout seul**, verrouillé par trigger).
- `StationType.DELEGATION` (délégation de police).
- Rattrapage des données existantes : corps déduit de la catégorie du grade, dates de service/poste, un événement `RECRUITMENT` par agent ayant une date de recrutement.

**Permissions :** `hr:view` (consulter, dans le périmètre), `hr:manage` (modifier le dossier), `hr:career` (décisions de carrière). Rôles système `HR_DIRECTOR` (les trois) et `HR_OFFICER` (view + manage, sans décision de carrière) ; `hr:view` aussi pour les commandants (limités à leur périmètre). Comptes de démonstration : `hr.director`, `hr.service` (MFA requise).

**Règles métier (`src/server/hr/service.ts`) :**
- Toute décision exige une référence (n° d'arrêté/décision), une date d'effet cohérente (pas avant le recrutement, pas à plus d'un an) et reste en ajout seul : une erreur se corrige par une nouvelle décision.
- Promotion : grade strictement supérieur ; avancement : grade différent ; nomination/changement de fonction : fonction différente ; détachement / mise à disposition : seulement depuis l'activité ; réintégration : seulement hors activité ; retraite / cessation : l'agent est désactivé et plus aucune décision n'est possible.
- Les **mutations (changement de structure) ne sont pas saisissables ici** : elles passeront par le circuit de validation (phase 4).
- La consultation d'un dossier est journalisée (`HR_DOSSIER_VIEWED`).

**Interface :** menu « Ressources humaines » (vue d'ensemble, dossiers), liste filtrable, dossier avec formulaire d'identité, historique de carrière et saisie de décision. FR/AR.

**API :** `GET /api/v1/hr/dossiers`, `GET|PUT /api/v1/hr/dossiers/:id`, `POST /api/v1/hr/career-events`.

**Mise à jour d'une base existante :** `npx prisma migrate deploy` puis `npm run db:seed` (accorde une fois les permissions `hr:*` aux rôles système).

**Tests :** `tests/integration/hr.test.ts` (7 tests : permissions, périmètre, audit, règles de décision, ajout seul, retraite).

**Non fait / non vérifié :** pages RH non parcourues dans un navigateur (le compte `admin` exige un enrôlement MFA) ; photo d'identité ; administration du référentiel des corps (liste fixe pour l'instant) ; import des 14 000 dossiers et test de charge (phase 9).
