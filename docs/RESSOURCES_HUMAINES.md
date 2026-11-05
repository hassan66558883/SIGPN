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

## Phase 6 — Présences, absences, congés et formations (fait)

**Réutilisé :** `Training` (étendu : type, note, résultat réussi/échec, date d'évaluation, date de délivrance), le module Agents pour enregistrer une formation (le formulaire gagne le type), les notifications, le journal d'audit, la portée territoriale. Migration `20261105200000_hr_attendance_training` (additive).

**Présences (`src/server/hr/attendance.ts`)** : appel quotidien par structure (`AttendanceRecord`, une ligne par agent et par jour : présent, en retard avec minutes, absent ; les statuts congé / permission / indisponible sont générés par les congés). Saisie par `hr:attendance_record` dans le périmètre, jamais pour un jour futur ni au-delà de 60 jours, uniquement pour des agents actifs de la structure ; un second appel remplace le premier ; un jour couvert par un congé approuvé est **verrouillé** (renvoyé dans `locked`). Statistiques (`/hr/attendance/stats`, `GET /api/v1/hr/attendance/stats`) dans le périmètre : taux de présence (présents + retards sur les jours travaillés, hors absences autorisées), taux d'absence injustifiée, minutes de retard, répartition, 10 agents les plus absents, taux par structure.

**Congés et absences** : types congé annuel, congé exceptionnel, permission, autorisation d'absence, indisponibilité ; circuit demande → décision d'une autorité hiérarchique (`hr:leave_approve` dans le périmètre) ; **quatre yeux** : on ne décide pas une demande qu'on a déposée ni qui nous concerne ; refus motivé. Contrôles : période cohérente, permission / autorisation limitées à 3 jours, motif obligatoire (sauf congé annuel et indisponibilité), pas de chevauchement avec une demande ouverte, **solde annuel** (30 jours calendaires par défaut, modifiable par `PUT /api/v1/hr/leaves/settings`, permission `system:settings`) vérifié au dépôt et à l'approbation. L'approbation génère les jours de présence ; l'annulation d'un congé approuvé supprime ses jours à partir d'aujourd'hui (le passé est conservé). **Libre-service** : un compte lié à une fiche d'agent dépose et annule ses propres demandes (menu « Mes congés ») ; il ne peut ni déposer pour autrui ni décider. Aucune demande n'est supprimée (trigger).

**Formations et compétences (`src/server/hr/training.ts`)** : types initiale / continue / stage / spécialisée ; **évaluation définitive** (`hr:training_manage`) : réussi → formation `COMPLETED` et compétences accordées (référentiel `Skill`, niveau 1-5, validité optionnelle, niveau le plus haut conservé), échec → `FAILED` sans compétence ; **attestation** délivrée une seule fois, uniquement pour une formation réussie (n° `ATT-AAAA-NNNNN`), PDF en français ; liste filtrable, formations arrivant à expiration, historique et compétences sur le dossier. Référentiel de compétences par défaut (PJ, MO, CIRC, PS, TIR, RENS, INFO), extensible (`POST /api/v1/hr/skills`).

**Permissions :** `hr:attendance_record`, `hr:leave_request`, `hr:leave_approve` (commandants ; approbation aussi pour la direction RH), `hr:training_manage` (service RH). Accordées une fois aux rôles existants par `npm run db:seed`.

**API :** `GET|PUT /api/v1/hr/attendance`, `GET …/attendance/stats`, `GET|POST …/leaves`, `POST …/leaves/:id/{decide|cancel}`, `GET …/leaves/balance`, `GET|PUT …/leaves/settings`, `GET …/trainings`, `POST …/trainings/:id/evaluate`, `GET|POST …/trainings/:id/certificate`, `GET|POST …/skills`, `GET …/dossiers/:id/competences`.

**Tests :** `tests/integration/hr-attendance.test.ts` (6 tests : appel, congés et solde, approbation / verrouillage / annulation, libre-service, statistiques, formations).

**Vérifié dans le navigateur** (compte temporaire sans MFA, ensuite désactivé ; sa suppression est impossible car le journal d'audit est en ajout seul) : les 16 pages RH (phases 3 à 6) répondent 200 sans erreur ; captures de la liste des mutations, de la feuille d'appel et de la page d'affectation automatique en arabe (RTL). Les formulaires n'ont pas été soumis depuis le navigateur (cela aurait écrit dans les données de démonstration) : ils sont couverts par les tests d'API.

**Non fait :** téléversement de la photo et des justificatifs (phase 7), import des 14 000 dossiers et test de charge (phase 9), jours fériés et jours ouvrés (le solde compte des jours calendaires), report du solde d'une année sur l'autre.

## Phase 7 — Discipline, distinctions, documents et photo (fait)

**Discipline (`src/server/hr/discipline.ts`) — strictement confidentiel.** Permissions `hr:discipline_view` (lire), `hr:discipline_manage` (ouvrir, enregistrer les étapes), `hr:discipline_decide` (décider) ; accordées à la direction RH (lecture et gestion) et aux commandants national et régional (les trois), jamais au service RH ni aux commandants de structure. **Chaque lecture** (liste, dossier) est journalisée. Procédure : ouverture (faits décrits, date non future) → étapes (notification des griefs, audition, rapport, note ; en ajout seul, pas avant la date des faits) → décision.
- **Droits de la défense** : toute sanction exige une audition enregistrée ; le classement sans suite non.
- **Quatre yeux** : l'autorité qui décide est différente de celle qui a ouvert le dossier ; décision motivée ; périmètre de l'autorité respecté.
- **Effets sur le dossier** : avertissement et blâme n'en ont pas ; **mise à pied** (dates obligatoires, 1 an maximum) : l'agent passe en situation « suspendu » à la date de début et un événement `SUSPENSION` est ajouté à la carrière ; à la fin, le minuteur (ou `npm run hr:rotation`) le **réintègre** automatiquement (événement `REINSTATEMENT`) et clôt le dossier — ce traitement ne dépend pas de l'interrupteur d'affectation automatique ; **révocation** : cessation de service (agent désactivé, affectation close, commandement libéré, compte désactivé). Un agent suspendu ne peut être ni muté ni compté par la rotation.
- Base de données : dossiers jamais supprimés, étapes en ajout seul, une décision porte son numéro (`DDI-AAAA-NNNNN`).
- **Distinctions et récompenses** : félicitations, citation, médaille, récompense ; visibles sur le dossier (`hr:view`), saisie par `hr:manage`.

**Espace documentaire central (`documents.ts`, `doc-render.tsx`)** : registre `HrDocument` (numéro `DRH-AAAA-NNNNNN`). Les documents **générés** — attestation de travail, décision d'affectation, arrêté de nomination / promotion / avancement (depuis une décision de carrière), décision de mutation (depuis une mutation validée), document de formation (formation réussie), décision disciplinaire, note de service — conservent un **contenu figé** (un changement ultérieur du dossier ne modifie pas le document émis) et sont rendus **à la demande en PDF et en Word (.docx)** ; les documents liés à un enregistrement ne sont émis qu'une fois. Les **justificatifs téléversés** (dossier administratif, formation, discipline) sont vérifiés **sur le contenu** (PDF, JPEG, PNG ou .docx ; un fichier texte renommé est refusé). Les documents confidentiels (disciplinaires, ou marqués) exigent `hr:discipline_view` ; tout le reste suit le périmètre territorial ; chaque téléchargement est journalisé ; jamais de suppression (trigger). Permission d'émission : `hr:document_issue` (service RH et direction RH).

**Photo d'identité** : JPEG ou PNG, 2 Mo maximum, type vérifié sur le contenu, affichée sur le dossier (`GET/POST /api/v1/hr/dossiers/:id/photo`).

**API :** `GET|POST /api/v1/hr/discipline`, `GET …/discipline/:id`, `POST …/discipline/:id/{step|decide}`, `GET|POST …/distinctions`, `GET|POST …/documents`, `GET …/documents/:id`, `GET …/documents/:id/file?format=pdf|docx`, `POST …/documents/upload`. **Interface :** menus Documents RH et Discipline, dossier de l'agent (photo, distinctions, documents, discipline). FR/AR.

**Dépendance ajoutée :** `docx` (génération Word). Migration `20261105210000_hr_discipline_documents`. Les nouvelles permissions sont accordées une fois aux rôles existants par `npm run db:seed`.

**Tests :** `tests/integration/hr-discipline.test.ts` (9 tests : confidentialité et audit, procédure et droits de la défense, quatre yeux, mise à pied et réintégration automatique, révocation, distinctions, documents PDF/Word figés et confidentialité, téléversements, photo). Pages vérifiées dans le navigateur (compte temporaire sans MFA, ensuite désactivé).

**Non fait :** recours contre une sanction, délais de prescription disciplinaire, texte juridique officiel des décisions (les modèles de texte sont génériques et à valider par la Direction), documents en arabe (PDF/Word en français uniquement), antivirus sur les fichiers téléversés.
