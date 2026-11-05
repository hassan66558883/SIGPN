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

## Phase 4 — Mutations et circuit de validation (fait)

**Règle de sécurité appliquée :** aucun agent n'est déplacé avant la validation de l'autorité compétente. Le changement de structure de `assignOfficer` (ancien chemin direct) est désormais refusé : il faut une mutation. Les changements de service/fonction/grade dans la même structure restent possibles comme avant.

**Circuit (`src/server/hr/transfers.ts`)** : proposition (`PROPOSED`) → examen RH (`HR_APPROVED` ou `REJECTED`) → validation de l'autorité (`APPROVED` + n° de décision `DAF-AAAA-NNNNN`, ou `REJECTED`) → exécution (`EXECUTED`) ; annulation possible tant que rien n'est exécuté.
- **Autorité compétente** = acteur avec `hr:transfer_validate` dont le périmètre couvre **la structure d'origine ET celle de destination** (un commandant régional ne valide donc pas une sortie de sa province ; le national, si). Elle doit être différente du proposant et du service RH qui a examiné. Les autorités configurables arrivent en phase 5.
- **Exécution** : si la date d'effet est atteinte, elle a lieu dans la transaction de validation ; sinon la mutation reste `APPROVED` (la décision PDF est déjà disponible) et un acteur RH l'exécute à partir de la date (le planificateur de la phase 5 le fera automatiquement). À l'exécution, tout est revérifié sur l'état actuel (agent toujours en activité, toujours à l'origine, ni commandant ni chef de service, destination active).
- **Effets** : affectation précédente clôturée, nouvelle ouverte, dossier (structure, service, fonction, `currentPostSince`) et compte utilisateur mis à jour, événement `TRANSFER` dans l'historique de carrière (référence = n° de décision), notifications (agent, proposant, utilisateurs RH des deux structures).
- **Base de données** : un seul circuit ouvert par agent (index unique partiel), une mutation `APPROVED/EXECUTED` doit avoir son n° de décision (contrainte CHECK), aucune suppression (trigger).

**Permissions :** `hr:transfer_propose` (commandants, service RH), `hr:transfer_review` (service RH : examiner, annuler, exécuter), `hr:transfer_validate` (commandants national, régional, départemental). Attribuées une fois aux rôles système existants par `npm run db:seed`.

**Décision :** `GET /api/v1/hr/transfers/:id/decision` (PDF, français ; la consultation est journalisée).

**API :** `GET|POST /api/v1/hr/transfers`, `GET /api/v1/hr/transfers/:id`, `POST /api/v1/hr/transfers/:id/{review|validate|execute|cancel}`. **Interface :** menu Mutations, liste, proposition (depuis le dossier ou par recherche), page de suivi avec les étapes et les formulaires de chaque acteur. FR/AR.

**Tests :** `tests/integration/hr-transfers.test.ts` (9 tests : permissions, impossibilité de court-circuiter, périmètre de l'autorité, exécution et historique, date future, rejets, contraintes SQL).

**Non fait / non vérifié :** pages non parcourues dans un navigateur ; l'affectation initiale reste celle de la création de l'agent (pas de circuit) ; le refus du changement de structure par `assignOfficer` n'est pas couvert par un test automatisé (pas d'API REST associée).

## Phase 5 — Affectation automatique après une durée au poste (fait)

**Interrupteur :** `AFFECTATION_AUTOMATIQUE` = ACTIVÉE / DÉSACTIVÉE, **désactivée par défaut**, réglée dans `SystemSetting` (`hr.auto_assignment`) par un détenteur de `hr:auto_assign_config` (administrateur système et administrateur police) depuis *RH → Affectation automatique* ou `PUT /api/v1/hr/rotation/settings`. Chaque changement est journalisé (`HR_ROTATION_ENABLED` / `_DISABLED`). Désactivée : le traitement automatique s'arrête (aucune alerte, aucune proposition, aucune exécution planifiée) ; mutations et affectations manuelles, données et historiques restent intacts.

**Paramètres :** durée de référence (12 mois), préavis « bientôt éligibles » (30 j), catégories de grades concernées, fonctions exclues, règle d'affectation (même province ou non, délai avant la date d'effet), autorités de validation (codes de rôle ; vide = toute autorité compétente), exceptions administratives (par agent, avec motif et fin), déploiement progressif par structures (`pilotStationIds`, pour ouvrir le traitement délégation par délégation) et plafond de propositions par exécution.

**Moteur (`src/server/hr/rotation.ts`, `runRotation`)** — une passe idempotente :
1. alerte une seule fois par agent et par période de poste les agents qui atteindront la durée (notification par structure et aux RH) ;
2. crée **une seule** proposition automatique (`origin = AUTOMATIC`, statut `PROPOSED`, proposée par le système) par agent et par période de poste (registre `RotationAlert` à clé unique : une proposition rejetée n'est pas re-proposée pendant la même période) ;
3. destination : même type de structure, même province si demandé, la moins dotée d'abord, en évitant les structures où l'agent a servi ces 2 dernières années ; sans destination possible, l'agent est compté (`noDestination`) et réessayé plus tard ;
4. exécute les mutations **déjà validées par l'autorité** dont la date d'effet est arrivée (uniquement si la fonction est activée ; sinon un acteur RH les exécute à la main).
Sont ignorés : agents hors activité, suspendus, commandants de structure, chefs de service, agents avec exception active ou mutation en cours. Le moteur ne déplace jamais personne de sa propre initiative : la proposition suit le circuit de la phase 4 (examen RH, validation d'une autorité couvrant les deux structures ; pour une proposition automatique, l'autorité doit en plus figurer dans la liste configurée si elle n'est pas vide). L'exécution d'une mutation démarre une nouvelle période de poste et efface les alertes de la précédente.

**Planification :** minuterie interne démarrée par `src/instrumentation.ts` (toutes les `HR_SCHEDULER_INTERVAL_MINUTES`, 60 par défaut, première passe 1 min après le démarrage ; `HR_SCHEDULER=off` pour la couper), ou `npm run hr:rotation` depuis un cron. Plusieurs instances ne créent pas de doublons (clés uniques). Passage manuel : bouton « Lancer maintenant » ou `POST /api/v1/hr/rotation/run` (`hr:transfer_review`).

**Interface :** page *Affectation automatique* (état ACTIVÉE/DÉSACTIVÉE, agents échus et bientôt éligibles dans le périmètre, dernière exécution, paramètres) et carte « Exceptions » sur le dossier de chaque agent. FR/AR.

**À savoir avant d'activer en production :** `currentPostSince` est initialisé depuis la date de début de l'affectation en cours (ou la date de recrutement). Avec des dates d'import anciennes, la première passe peut proposer beaucoup de mutations : commencer par une structure pilote et un plafond bas, et corriger les dates au besoin. Sur la base de démonstration, la plupart des agents seraient « échus » pour cette raison.

**Tests :** `tests/integration/hr-rotation.test.ts` (8 tests : droit de configurer, désactivée = rien, alertes uniques, une seule proposition, destination, exceptions et catégories, autorités de validation, exécution planifiée, aucune pollution). Les tests d'intégration partagent un limiteur de requêtes par compte : relancer plusieurs fois de suite le même fichier peut produire des 429.

**Non fait / non vérifié :** pages non parcourues dans un navigateur ; minuterie interne observée seulement au démarrage du serveur de développement (pas de test de charge ni de multi-instances) ; notifications par e-mail/SMS non prévues.
