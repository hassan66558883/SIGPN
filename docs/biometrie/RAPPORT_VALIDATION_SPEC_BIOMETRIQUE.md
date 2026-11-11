# SIGPN-T — Rapport de validation des spécifications d'évolution biométrique

**Revue critique avant toute implémentation — Police nationale du Tchad — Éditeur : TECHNOTCHAD — 11 novembre 2026**

| Rubrique | Valeur |
|---|---|
| Document examiné | `docs/biometrie/SPEC_EVOLUTION_BIOMETRIQUE.md` (v1.0, 21 pages, commit `a93a289`) |
| Nature de ce rapport | Revue critique de conception, **sans aucune modification** du code, des tables, des données, des configurations, des marqueurs DEMO ; aucun moteur connecté ; **aucun commit poussé** |
| Méthode | Relecture de la spécification **contre le code réel** (services, schéma, migrations, tests, droits) et recherche des contradictions internes. Les constats portent la référence du fichier vérifié |
| Limites | Aucune information sur un fournisseur précis ; rien n'a été exécuté contre un moteur ; les textes juridiques n'ont pas été consultés |

[[SOMMAIRE]]

<!--pagebreak-->

## 1. Verdict de synthèse

> **La spécification est solide dans son principe, mais elle n'est pas prête pour l'implémentation.** Elle contient **3 points bloquants** et **9 points majeurs** à corriger, et **16 décisions** reviennent à la Direction. Aucun de ces points ne remet en cause l'approche (conserver, étendre, ne pas reconstruire) ; plusieurs viennent d'hypothèses non vérifiées sur le code existant, que la revue a pu contrôler.

| Catégorie | Nombre | Dont bloquants |
|---|---|---|
| **VALIDÉ** | 13 | — |
| **À CORRIGER** | 16 | 3 |
| **EN ATTENTE DE DÉCISION** | 16 | — |

**Les trois bloquants, en une phrase chacun :**

1. **C-01** : modifier `crypto.ts` pour le chiffrement par enveloppe **casserait la connexion à deux facteurs** (les secrets TOTP utilisent la même fonction).
2. **C-02** : la spécification affirme que l'historique des recherches est « en écriture unique » ; **ce n'est pas vrai en base** (aucun déclencheur), et la décision humaine d'une recherche peut être **écrasée et prise par l'opérateur lui-même**.
3. **C-03** : attribuer des droits biométriques à l'administrateur technique et à l'administrateur de sécurité **viole la séparation des fonctions** déjà imposée par un test et par des rôles verrouillés.

## 2. VALIDÉ

Éléments vérifiés dans le code et cohérents avec la spécification.

| N° | Élément validé | Preuve dans le code |
|---|---|---|
| V-01 | **Approche additive** : colonnes et tables nouvelles, aucune table renommée ni supprimée ; retour arrière par migration | Cohérent avec la pratique des 29 migrations existantes (`prisma/migrations`) |
| V-02 | **Fonctionnalités à conserver correctement identifiées** : porte d'entrée affaire + motif + agent, périmètres, gabarits chiffrés non exposés, chaîne de possession des captures, quatre états du contrôle | `schemas.ts` (`searchGateSchema`), `service.ts` (`biometricScopeWhere`, sélections sans `templateSecretEnc`), `control.ts` |
| V-03 | **Les quatre interfaces de `types.ts` peuvent rester inchangées** : les extensions étant dans une interface optionnelle séparée, les quatre `Mock*` compilent sans modification | `providers/types.ts` : interfaces autonomes, `isDemo` déjà présent |
| V-04 | **Interdiction du SHA-256 comme gabarit** et marquage `DEMO_SHA256` : cohérent avec l'état réel (le « gabarit » actuel est un sha256) | `providers/mock-common.ts` |
| V-05 | **Aucune décision automatique** : le système ne produit aujourd'hui que « correspondance potentielle » ou « aucune correspondance » | `service.ts` (`MATCH_THRESHOLD`, résultat `POTENTIAL_MATCH`) |
| V-06 | **« Service indisponible » jamais lu comme « aucune correspondance »** : déjà le comportement du contrôle, repris dans la spécification | `docs/CONTROLE_BIOMETRIQUE.md`, `control.ts` |
| V-07 | **Séparation des environnements** et verrou démo : compatible avec la contrainte `isSimulation = true` et `isDemo = true` existantes | `20261108140000_biometric_control/migration.sql`, `BiometricSearch.isDemo` |
| V-08 | **Journal d'audit à chaîne de hachage** : existe, vérifiable, déclencheur d'écriture seule en place | Migrations `immutability_triggers` et `audit_hash_chain`, `pms_audit_verify()` |
| V-09 | **Modèles nécessaires au lien avis de recherche / véhicules existent** (`WantedVehicle`, `TrafficVehicle` avec statuts volé/saisi/suspendu, `WantedPerson`) | `prisma/schema.prisma` |
| V-10 | **Motif des résultats asynchrones signés et idempotents** : il existe un précédent éprouvé (notifications de paiement signées, idempotentes) | `webhooks/payments`, `TrafficPaymentEvent` |
| V-11 | **Logique générale des phases** : base légale d'abord, mode « ombre » avant l'opérationnel, une modalité à la fois | Principe sain, à compléter (section 5) |
| V-12 | **Minimisation** : sonde non conservée, pas d'image brute par défaut, aucun gabarit dans les journaux | Cohérent avec `enroll*` (« templates only — no raw file retained ») |
| V-13 | **Normes de référence pertinentes** : ISO/IEC 19794-2 et 39794, NFIQ 2, ISO/IEC 30107-3, ISO/IEC 19795, ANSI/NIST-ITL | Choix usuels pour un AFIS et un visage (une norme manque : voir C-11) |

<!--pagebreak-->

## 3. À CORRIGER

**Légende :** gravité **Bloquant** (empêche toute implémentation) · **Majeur** (à corriger avant la phase 1) · **Moyen** · **Mineur**. Nature : *Régression*, *Contradiction*, *Oubli*, *Risque technique*.

### 3.1 Bloquants

| N° | C-01 — Chiffrement par enveloppe : régression sur l'authentification à deux facteurs |
|---|---|
| Nature | Régression |
| Constat | La spécification (§9.1, §13.2) prévoit de modifier `src/server/crypto.ts` (`encryptSecret` / `decryptSecret`). **Ces deux fonctions chiffrent aussi les secrets TOTP des comptes** (`mfaSecretEnc`, utilisés dans `auth/login.ts` aux lignes 100, 198, 205, 231) |
| Risque | Un changement de format ou de clé rend **tous les secrets MFA illisibles** : plus aucun agent ne peut se connecter avec second facteur |
| Correction demandée | Ne **pas** modifier `crypto.ts`. Créer un module dédié (coffre biométrique) avec un **format de chiffrement versionné** (préfixe de version, identifiant de clé, DEK enveloppée) et déchiffrement **rétrocompatible** pour les données existantes. Ajouter un test de non-régression MFA |

| N° | C-02 — « Historique en écriture unique » : affirmation inexacte et indépendance non appliquée |
|---|---|
| Nature | Contradiction |
| Constat | §2.1 classe « historique en écriture unique, sans chemin de suppression » parmi les fonctions **réelles**. Dans les migrations, **seuls `AuditLog` et `CustodyEvent`** ont un déclencheur d'écriture seule (plus des interdictions de suppression côté circulation). **`BiometricSearch` et `BiometricMatch` n'en ont aucun** : la garantie n'est qu'une convention du code. Par ailleurs `recordBiometricAction()` **met à jour** l'action **à chaque appel** (écrasable) et **ne vérifie pas** que celui qui l'enregistre est différent de l'agent qui a fait la recherche. Seul `BiometricControl` a la contrainte « relecteur ≠ agent » |
| Risque | Fausse assurance sur le caractère inviolable ; la « validation humaine indépendante » n'existe **pas** pour les recherches |
| Correction demandée | Corriger §2.1 (classer comme *partiel*). Faire de la phase 1 le lieu des déclencheurs d'écriture seule sur `BiometricSearch`/`BiometricMatch`, d'une décision **enregistrable une seule fois**, et de la contrainte « relecteur ≠ opérateur ≠ demandeur ». Traiter les lignes existantes (voir D-05) |

| N° | C-03 — Droits biométriques sur les administrateurs : violation de la séparation des fonctions |
|---|---|
| Nature | Régression / Contradiction |
| Constat | §8.3 donne `provider_manage` et `device_manage` à l'**administrateur technique** et `key_manage` à l'**administrateur de sécurité**. Or ces deux rôles sont **verrouillés** (`LOCKED_ROLE_CODES`), leurs droits sont **figés et testés à l'identique** (`tests/unit/admin-separation.test.ts` compare `SUPER_ADMIN` à `TECH_ADMIN_PERMISSIONS` et `SECURITY_ADMIN` à `SECURITY_ADMIN_PERMISSIONS`), et le principe du lot 1 est qu'ils ne détiennent **aucun droit sur les données de police** |
| Risque | Test cassé ; principe de séparation érodé pour la donnée la plus sensible du système |
| Correction demandée | **Ne pas toucher** aux deux rôles verrouillés. Créer des **profils dédiés** (administrateur de la plate-forme biométrique, gardien des clés, responsable de la protection des données) — voir D-04 |

### 3.2 Majeurs

| N° | Titre, constat et correction |
|---|---|
| **C-04** Oubli / Contradiction | **Effacement cryptographique incomplet face aux sauvegardes.** §7.4 et §9.1 présentent la destruction de la clé de données comme effacement irréversible. Or les **sauvegardes** de la base contiennent la clé enveloppée ; tant que la clé maîtresse existe, un gabarit « effacé » reste **déchiffrable depuis une sauvegarde**. *Correction :* hiérarchie de clés **par cohorte d'échéance** (une clé maîtresse par période, détruite à son terme), durée maximale de conservation des sauvegardes, procédure d'effacement dans les sauvegardes, preuve de suppression côté moteur |
| **C-05** Contradiction / Risque | **Changement de fournisseur AFIS (axe 6) : verrouillage non traité.** La spécification combine **minimisation** (aucune image brute) et **gabarits propriétaires versionnés** ; or sans image source ni gabarit normalisé, **on ne peut pas ré-enrôler chez un autre fournisseur**. De plus §4.2 place `providerEnrollmentId` **dans** chaque enregistrement : un seul fournisseur par gabarit. *Correction :* (1) stratégie de portabilité explicite : conserver un **gabarit normalisé** (ISO/IEC 19794-2) en plus du gabarit propriétaire, et/ou conserver l'image source sous base légale stricte ; pour le visage, aucune norme de gabarit interopérable : conserver le portrait ; (2) table `BiometricEnrollment(record, fournisseur, identifiant moteur, version, statut)` pour plusieurs fournisseurs en parallèle ; (3) clauses de sortie contractuelles (export de galerie, preuve de suppression) ; (4) **mode double** (deux moteurs en ombre) pour comparer avant bascule ; (5) test de changement de fournisseur dans le plan de tests |
| **C-06** Oubli | **Interopérabilité avec le futur dossier unique national des personnes (axe 5) : absente.** Constats vérifiés : (a) la référence d'une personne est l'identifiant **local** `Person` ; il n'existe pas d'identifiant national d'autorité (`PersonIdentifier` accepte `NATIONAL_ID` mais sans valeur d'autorité) ; (b) **`mergePersons` ne déplace aucun enregistrement biométrique** (gabarits, recherches, lectures de plaques, correspondances restent rattachés à la fiche fusionnée) ; (c) `requirePerson()` accepte une personne **fusionnée** ; (d) aucune **détection de doublons par biométrie** à l'enrôlement ; (e) aucun format d'échange (CBEFF/ISO 19785, ANSI/NIST-ITL) ni contrat d'API avec le futur dossier. *Correction :* introduire un **identifiant de sujet biométrique stable** (distinct de l'identifiant de fiche), traiter fusion et scission de personnes dans la couche biométrique (et dans la galerie du moteur), refuser l'enrôlement d'une fiche fusionnée, ajouter une recherche 1:N de doublons à l'enrôlement, et définir le contrat d'échange (D-07) |
| **C-07** Contradiction | **Trois endroits pour la décision humaine.** Elle est aujourd'hui dans `BiometricSearch.action*`, dans `BiometricControl.reviewed*`, et la spécification ajoute une troisième table `BiometricReview`. L'énumération existante (`SENT_FOR_VERIFICATION`, `VERIFIED_BY_INVESTIGATOR`, `REJECTED`, `LINKED_TO_CASE`) ne correspond pas à `CONFIRMED` / `REJECTED` / `INCONCLUSIVE`. La notion de **demandeur** n'existe pas dans la base (l'agent `officerId` est à la fois demandeur et opérateur). *Correction :* une **source unique** (`BiometricReview`), lecture rétrocompatible des anciens champs, table de correspondance des valeurs, colonne `requestedById` |
| **C-08** Oubli / Risque | **Indépendance du relecteur : blocage possible.** Seuls deux profils détiennent `biometric:verify` (enquêteur, agent biométrie). Dans un poste ou un commissariat sans second agent habilité, **aucune revue indépendante n'est possible** et le processus s'arrête. De même seule la police technique peut enrôler, et l'agent biométrie seul peut valider. *Correction :* définir un **réservoir de relecteurs** (autre unité de la province, astreinte) avec règles d'escalade et d'effectif minimal ; prévoir la couverture de ces profils (D-05) |
| **C-09** Oubli | **API : entités et authentification non définies.** (a) `captureId` (capture signée) n'a **aucune table** ni durée de vie dans §4 ; (b) l'authentification des **appareils** (`/anpr/ingest`) et des **webhooks** ne correspond à aucun mécanisme existant (`withApi` gère sessions et clés `pms_…`, plafonnées à 90 jours) ; (c) le webhook est nommé `/api/v1/biometric/webhooks/{provider}` alors que le précédent est `/api/v1/webhooks/payments/{provider}` (liste des chemins publics du proxy, limite de débit dédiée) ; (d) **deux chemins de recherche** coexisteront (routes synchrones actuelles et `jobs`) avec des audits potentiellement divergents. *Correction :* table `BiometricCapture` (signature, nonce, durée de vie courte), mécanisme d'authentification d'appareil et de fournisseur spécifié, nommage aligné, **routes existantes réécrites comme enveloppes** du même orchestrateur, clés d'idempotence, versionnement |
| **C-10** Contradiction | **Modèle de données : sources de vérité multiples.** (a) `status` ajouté à côté de `isActive` (doublon, sémantique à définir) ; (b) `isDemo` figure à **trois endroits** (interface `types.ts`, table `BiometricProvider`, `capabilities`) **plus** un mode d'environnement `BIOMETRIC_MODE` : en cas de désaccord, lequel l'emporte ? ; (c) les scores sont stockés en `Decimal(5,2)` : un **score brut de moteur** (milliers) ne tient pas, et un score n'est **pas une probabilité** — l'afficher en « % » induit en erreur ; (d) **seul `keyId`** est prévu : la **clé de données enveloppée** et la **version du format** n'ont pas de colonne ; (e) `retentionTrigger` suppose un flux d'événements (clôture d'affaire, décision) non défini. *Correction :* règle de précédence (la base fait foi, l'environnement n'est qu'un plafond), colonnes `scoreRaw` / `scoreScale`, interdiction d'afficher un pourcentage, colonnes de clé enveloppée et de version, définition des déclencheurs |
| **C-11** Risque technique | **Sécurité des données biométriques : lacunes.** (a) La **porte d'entrée** ne vérifie que l'affaire dans le périmètre : une recherche 1:1 peut viser **n'importe quelle personne** du système (`requirePerson`) → exiger un lien personne ↔ affaire ou une justification renforcée ; (b) `biometric:history_view` est détenu par **12 profils** (analyste, auditeur, parquet, agent de patrouille…) : avec des données réelles, l'historique révèle **qui est recherché** → scinder « métadonnées » et « candidats » ; (c) la **protection des gabarits** (ISO/IEC 24745 : irréversibilité, non-liabilité) n'est pas citée ; (d) la **vérification d'identité à l'enrôlement** (pièce d'identité contrôlée) manque : un fraudeur peut enrôler son visage sous l'identité d'autrui ; (e) seuils de **détection d'usage anormal** non chiffrés ; (f) accès **d'urgence** (« bris de glace ») non prévu |
| **C-12** Risque technique | **Plaques : la normalisation supposée n'existe pas.** §7.5 s'appuie sur « la fonction existante de normalisation ». Elle ne fait que **majuscules + espaces** (`traffic/schemas.ts`) ; la recherche dans les avis (`findWantedHits`) est une **égalité stricte** ; `WantedVehicle.plateNumber` est seulement mis en majuscules. « TD-1234-AB », « TD 1234 AB » et « TD1234AB » **ne se correspondent jamais** ; les confusions de lecture (0/O, 1/I, 8/B) ne sont pas traitées. *Correction :* forme canonique unique (séparateurs retirés, confusions mappées), appariement avec **candidats approchés** et confiance, revue humaine de toute indication |

### 3.3 Moyens

| N° | Titre, constat et correction |
|---|---|
| **C-13** Régression | **Déploiement des droits et rôles.** Chaque nouveau droit exige : libellés **français et arabe** (un test unitaire l'impose — il a justement échoué pour le dernier droit ajouté), attribution unique à la synchronisation, mise à jour de la liste des **droits sensibles** (20 aujourd'hui), des matrices de la documentation. Le **nouveau profil** (protection des données) change le décompte « 29 rôles » (documentation, tests). Les nouveaux types d'approbation (activation de fournisseur, rotation de clé) exigent une **migration de l'énumération** et un **exécuteur** dans `approvals/service.ts` : non listés en §13 |
| **C-14** Contradiction | **Hors ligne.** §6.6 interdit toute capture réelle hors connexion. Or le déploiement provincial (phase 7) vise des unités à connectivité faible, que le système sait déjà traiter pour les alertes (unités hors ligne, relances, escalade). *Correction :* soit assumer « en ligne seulement » (décision D-08), soit concevoir une file locale signée pour les lectures de plaques |
| **C-15** Oubli | **Phases de déploiement : critères insuffisants.** Voir la section 5 (critères chiffrés, ordre, volumétrie initiale, hébergement, formation, propriétaires de porte, critères d'arrêt). Deux points sont des **contradictions** : la phase 3 utilise des données de volontaires (légalement sensibles) alors que seule la phase 1 est présentée comme sans prérequis juridique ; l'évaluation indépendante (phase 4) exige un jeu de données **légalement constitué** qui n'apparaît dans aucun préalable |

### 3.4 Mineurs

| N° | Titre, constat et correction |
|---|---|
| **C-16** Contradiction / Oubli | **Erreurs de rédaction et d'interface.** (a) L'en-tête renvoie au « chapitre 12 » pour le retrait des marqueurs DEMO ; la procédure est au **11.3** ; (b) deux sections numérotées « 5.3 » ; (c) `identifyInGallery(probe: string)` ne dit pas si la sonde est un **gabarit ou une image** (la plupart des AFIS attendent des images) → type explicite ; (d) la relation entre `enroll` (nouveau) et `extractTemplate` (existant) n'est pas définie ; (e) `capabilities().isDemo` double l'attribut `readonly isDemo` existant ; (f) le test « chaque route sans droit, mauvais droit, bon droit » doit être étendu aux nouvelles routes ; (g) section 10.1 : ajouter les tests de non-régression MFA et séparation des administrateurs |

<!--pagebreak-->

## 4. EN ATTENTE DE DÉCISION

Décisions **nécessaires avant l'implémentation**. Pour chacune : la question, les options, la recommandation de l'éditeur et qui décide.

| N° | Question | Options | Recommandation de l'éditeur | Décideur |
|---|---|---|---|---|
| **D-01** | Base légale et autorité de contrôle du traitement de données biométriques | Texte existant à identifier · texte spécifique à obtenir · décret d'application | Avis juridique écrit **avant toute phase manipulant des personnes réelles ou volontaires** ; désigner l'autorité de contrôle | Direction générale + Justice |
| **D-02** | Modèle d'hébergement et de fournisseur | Moteur sur site propre · centre de données national mutualisé · un ou plusieurs fournisseurs | **Sur site, souveraineté des données**, un fournisseur principal + exigence de portabilité | Direction + responsable du projet |
| **D-03** | Politique de portabilité des gabarits (C-05) | Gabarit normalisé seul · gabarit + image source · propriétaire seul (verrouillage) | **Gabarit normalisé + gabarit propriétaire** ; image source seulement si la base légale l'autorise | Direction + juridique |
| **D-04** | Profils pour la gouvernance biométrique (C-03) | Droits sur les rôles verrouillés · **profils dédiés** | **Profils dédiés** : administrateur de la plate-forme biométrique, gardien des clés, responsable de la protection des données | Direction |
| **D-05** | Règle d'indépendance et effectifs (C-02, C-08) | Relecteur ≠ opérateur · ≠ demandeur · réservoir provincial · traitement des lignes existantes | Relecteur ≠ opérateur **et** ≠ demandeur ; réservoir de relecteurs par province ; lignes existantes classées « sans revue indépendante » | Direction + commissaires |
| **D-06** | Durées de conservation et conservation des sauvegardes (C-04) | Valeurs du chapitre 9.3 · autres | Valeurs proposées à **confirmer juridiquement** ; sauvegardes ≤ durée maximale de la clé de cohorte | Juridique + DPO |
| **D-07** | Maître de la donnée biométrique face au futur dossier unique national (C-06) | Dossier national maître · système de police maître · fédération | **Fédération** : identifiant de sujet stable, échanges normalisés, dossier national maître de l'identité civile | Direction + porteur du dossier unique |
| **D-08** | Fonctionnement hors ligne (C-14) | En ligne seulement · file locale signée pour les plaques | **En ligne seulement** pour la biométrie ; file signée pour les plaques à étudier | Direction + opérations |
| **D-09** | Périmètre de la reconnaissance faciale | Aide à la vérification seule · identification 1:N · temps réel dans l'espace public | **Aide à la vérification seule** ; interdiction explicite de l'identification de masse en temps réel | Direction + juridique |
| **D-10** | Seuils d'acceptation et organisme d'évaluation indépendant | Seuils usuels · seuils fixés après essais ; organisme national ou étranger | Seuils **fixés après** une évaluation locale, par groupes démographiques pour le visage ; organisme indépendant du fournisseur | Direction |
| **D-11** | Constitution de la galerie initiale | Suspects seuls · personnes arrêtées · personnel de police · import du fichier civil | **Personnes arrêtées et suspects**, sous base légale ; aucun import massif sans décision | Direction + juridique |
| **D-12** | Modalité voix | Abandonner · conserver sans usage | **Abandonner** tant qu'aucun besoin n'est établi (zéro enregistrement) | Direction |
| **D-13** | Budget, matériel de sécurité (HSM) et licences | À chiffrer | Chiffrage avant la phase 0 | Direction |
| **D-14** | Information et recours des personnes concernées ; phase « ombre » | Information publique · note interne | Information **avant** l'ombre ; procédure de contestation publiée | Direction + juridique |
| **D-15** | Notification des incidents (délai, autorité) | 72 h (hypothèse) · autre | Délai à fixer par le juridique | Juridique |
| **D-16** | Gouvernance des portes de phase | Comité de pilotage nommé, décideur par porte | Comité nommé avant la phase 0 ; **chaque porte signée** par écrit | Direction générale |

<!--pagebreak-->

## 5. Revue des neuf phases de déploiement

Pour chaque phase : ce qui est **validé**, ce qui est **à corriger**, et les **critères de passage** proposés. Les valeurs entre crochets sont **indicatives** et doivent être fixées par la Direction et l'évaluation indépendante.

| Phase | Appréciation | Manques relevés | Critères de passage proposés (mesurables) |
|---|---|---|---|
| **0. Préalables** | VALIDÉ dans l'intention · **À CORRIGER** | Pas de budget ni d'hébergement chiffrés (D-13) ; pas de **protocole de collecte** de données pour l'évaluation (C-15) ; comité non nommé (D-16) | Avis juridique signé · analyse d'impact validée · DPO nommé · comité nommé · budget approuvé · protocole de collecte validé |
| **1. Durcissement sans moteur** | **À CORRIGER** | Inclut les déclencheurs d'écriture seule et la revue indépendante (C-02), le coffre dédié et non `crypto.ts` (C-01), les profils dédiés (C-03) ; délai d'acquisition du HSM non pris en compte | Aucune anomalie critique · **non-régression MFA verte** · test admin-separation vert · restauration d'une sauvegarde testée [RTO à fixer] · cérémonie de clés réalisée |
| **2. Passerelle et contrats** | VALIDÉ · à compléter | Dépend du choix du fournisseur (phase 0) ; contrat de portabilité (C-05) et type de sonde (C-16c) à figer | Suite de conformité 100 % sur le simulateur **et** sur le bac à sable du fournisseur · changement de fournisseur simulé avec succès |
| **3. Laboratoire** | **À CORRIGER** | Données de volontaires = données sensibles : consentement écrit, protocole éthique, analyse d'impact **préalables** (contradiction C-15) ; jeu synthétique privilégié | 1:1 p95 ≤ [2 s] · 1:N p95 ≤ [10 s] à la taille cible · disponibilité ≥ [99,5 %] sur 2 semaines · aucune donnée dans les journaux |
| **4. Évaluation indépendante** | **À CORRIGER** | Jeu de données légalement constitué absent des préalables ; seuils non fixés (D-10) ; évaluation face par groupes | Rapport signé : FNMR ≤ [1 %] à FMR = [0,1 %] (empreintes) · écarts entre groupes ≤ [seuil fixé] (visage) · attaques de présentation : taux ≤ [seuil fixé] ; sinon **arrêt** |
| **5. Pilote en mode ombre** | **À CORRIGER** | Base légale et information des personnes (D-14) ; volumétrie ; durée et volume minimaux non fixés | ≥ [8 semaines] et ≥ [N] recherches · écart avec la pratique actuelle ≤ [seuil] · **0 incident de sécurité** · 0 résultat actionné |
| **6. Pilote opérationnel** | VALIDÉ · à compléter | Réservoir de relecteurs (C-08) ; critères d'arrêt (taux de faux positifs confirmés) | Taux de faux positifs confirmés ≤ [seuil] · délai de revue ≤ [seuil] · 100 % des décisions indépendantes · décision écrite de la Direction |
| **7. Extension provinciale** | **À CORRIGER** | Hors ligne et connectivité (C-14) ; logistique des appareils ; formation ; assistance | Appareils inscrits et signés · formation ≥ [95 %] des utilisateurs · indicateurs stables sur [4 semaines] · audit externe |
| **8. Généralisation** | VALIDÉ · à compléter | Réévaluation annuelle sans critère ; plan de sortie fournisseur | Revue annuelle : précision, écarts, sécurité, conformité ; **test annuel de changement de fournisseur** |

**Remarques transversales sur l'ordre et les dépendances**

1. Le **jeu de données légalement constitué** (nécessaire à la phase 4) doit être prévu **dès la phase 0**.
2. La **phase 1** est présentée comme la seule sans prérequis juridique : c'est vrai tant qu'elle ne manipule **aucune donnée biométrique réelle** ; elle doit le dire expressément.
3. Les **critères d'arrêt** (retour arrière) manquent à toutes les phases : chaque porte doit définir quand on **s'arrête** et ce que devient l'existant (désactivation du fournisseur, conservation chiffrée des données enrôlées).
4. **Volumes, haute disponibilité, reprise sur sinistre, licences et formation** de l'AFIS ne figurent pas dans le plan.
5. Chaque phase doit avoir un **propriétaire nommé** et une **durée cible**, validés par le comité (D-16).

## 6. Traçabilité : les sept axes de la revue

| Axe demandé | Résultat | Points validés | Points à corriger | Décisions |
|---|---|---|---|---|
| 1. Compatibilité avec l'architecture existante | **Réservée** | V-01, V-02, V-03, V-07, V-10 | C-01, C-09, C-10, C-13 | D-04 |
| 2. Régressions modules, comptes, rôles, permissions | **À corriger** | V-02 | C-01, C-03, C-13, C-16 | D-04, D-05 |
| 3. Cohérence des API et des interfaces de `types.ts` | **Réservée** | V-03, V-10 | C-09, C-10, C-16 | — |
| 4. Sécurité des données biométriques | **À corriger** | V-04, V-05, V-08, V-12, V-13 | C-02, C-04, C-11 | D-01, D-06, D-09, D-15 |
| 5. Interopérabilité avec le futur dossier unique national | **Non couverte** | — | **C-06**, C-10 | **D-07**, D-11 |
| 6. Changement de fournisseur AFIS | **Non couvert** | V-03 | **C-05**, C-16 | **D-02, D-03** |
| 7. Les neuf phases et leurs critères | **À corriger** | V-11 | C-14, C-15 | D-08, D-10, D-13, D-14, D-16 |

## 7. Suite proposée (sans rien modifier à ce stade)

1. La Direction tranche **D-04, D-05, D-07** (impact structurel sur le modèle) et **D-03** (impact sur le stockage).
2. L'éditeur publie la **version 1.1 de la spécification** intégrant les corrections C-01 à C-16 (document uniquement).
3. Revue de cette version 1.1 ; approbation du responsable du projet.
4. Ouverture de la **phase 0** (préalables juridiques et institutionnels). Aucune implémentation tant que les points **bloquants C-01, C-02, C-03** ne sont pas corrigés dans la spécification et que les **décisions D-01, D-04, D-16** ne sont pas prises.

**Rappel de la consigne.** Cette revue n'a modifié aucun code, aucune table, aucune donnée, aucune configuration ; les marqueurs DEMO sont intacts ; aucun moteur réel n'est connecté ; aucun commit n'a été poussé.
