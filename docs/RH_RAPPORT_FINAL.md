# SIGPN-T — Module Ressources humaines : rapport final des modifications

_6 novembre 2026 — branche `feature/rh-police` (9 commits depuis `main`, locale : le dépôt n'a pas de dépôt distant). Document destiné à la Direction et à l'équipe de développement._

[[SOMMAIRE]]

## 1. Synthèse

Le module RH demandé dans le document de directives (« SIGEC PN ») a été réalisé **dans l'application existante** (SIGPN-T), sans la reconstruire et sans supprimer de fonctionnalité ni de donnée. Il couvre les sections 3 à 11 du cahier des charges, y compris la **gestion de la solde et des avantages** (section 8) qui avait été oubliée dans le plan initial et a été ajoutée après la phase 9. Il a été **mesuré à 14 118 agents et 302 structures** et **testé de bout en bout** ; les écarts et les points à décider par la Direction sont listés au §5 et au §6.

| Indicateur | Valeur |
| ---------- | ------ |
| Tests unitaires | **117** réussis (50 au départ) |
| Tests d'intégration (API, base réelle) | **144** réussis (68 au départ) |
| Tests de sécurité | **16** réussis |
| Contrôles de cohérence des données RH | 22, **0 anomalie** sur la base de développement |
| Build de production, serveur autonome | vérifié (base vide, PDF et Word générés) |
| Migrations ajoutées | 7, toutes additives |
| Opérations d'API RH | 69 |
| Lignes de code | environ 17 000 ajoutées sur 159 fichiers |

## 2. Ce qui a été fait, par phase

| Phase | Contenu | Commit |
| ----- | ------- | ------ |
| 1-2 | Audit du système existant et de sa base : l'application avait déjà `Officer`, grades, fonctions, affectations, formations, structures hiérarchiques, rôles, périmètres, audit, notifications, PDF. Manquaient : carrière historisée, circuit de mutation, planificateur, présences, discipline, solde, Word, tableaux de bord RH | diagnostic présenté avant toute modification |
| 3 | Dossier individuel étendu (lieu de naissance, situation matrimoniale, corps, situation administrative, dates), historique de carrière en ajout seul, rôles et permissions RH, type de structure « Délégation » | `614377c` |
| 4 | Mutations : proposition → examen RH → validation d'une autorité couvrant les deux structures → décision numérotée (PDF) → exécution ; aucune mutation sans validation (le changement de structure direct est refusé) | `8cc6471` |
| 5 | Affectation automatique après une durée au poste : interrupteur `AFFECTATION_AUTOMATIQUE` (désactivé par défaut), paramètres, alertes, propositions idempotentes, exceptions, autorités de validation, planificateur | `8c13b46` |
| 6 | Appel quotidien et statistiques de présence, congés / permissions / absences / indisponibilités avec solde et quatre yeux, formations (types, évaluation, compétences, attestation PDF) | `f290c3a` |
| 7 | Discipline confidentielle (droits de la défense, suspension avec réintégration automatique, révocation), distinctions, espace documentaire PDF + Word à contenu figé, téléversements vérifiés, photo d'identité | `83de326` |
| 8 | Tableaux de bord et statistiques avec filtres et graphiques interactifs, export CSV | `4600219` |
| 9 | Test de charge à 14 118 agents, outil d'import, contrôles de cohérence, durcissement et tests de sécurité de toute l'API | `27078b0` |
| Section 8 | Solde et avantages : grille, éléments, états mensuels figés, export, libre-service, séparation des tâches | `d6d58f6` |
| 10 | Déploiement et documentation : démarrage de production autonome (synchronisation des permissions, rôles et provinces, premier administrateur), guide d'exploitation, rapport, documentation de la base et de l'API | ce commit |

## 3. Traçabilité par rapport au cahier des charges

Légende : ✔ réalisé et testé · ◐ réalisé avec une limite indiquée · ✘ non réalisé.

| § | Exigence | État | Où / remarque |
| - | -------- | ---- | ------------- |
| 1 | Mettre à jour l'existant, sans reconstruire | ✔ | Extension de `Officer`, `Station`, `Training`, etc. ; aucune table supprimée |
| 2 | 23 délégations, 300 commissariats, 14 000 policiers, modifiables | ◐ | Paramétrable (organisation, import) et **mesuré à ces volumes** ; les **données réelles ne sont pas chargées** : elles viennent de l'import (`hr:import`) |
| 3.1 | Dossier : matricule, état civil, naissance, sexe, situation matrimoniale, coordonnées, photo, grade, corps, catégorie, fonction, dates, situation, affectation, historique, documents | ✔ | `/hr/dossiers/:id` |
| 3.2 | Carrière : grades, recrutements, nominations, promotions, avancements, fonctions, mutations, détachements, mises à disposition, retraites, cessations, historisation | ◐ | Tout est historisé ; le **recrutement** est le dossier créé ou importé, il n'y a pas de procédure de concours |
| 3.3 | Affectations et mutations, décisions, historique | ◐ | Circuit complet ; l'**affectation initiale** est celle de la création / de l'import, sans circuit |
| 4 | Affectation automatique après 12 mois, activable, configurable, circuit de validation, aucune mutation sans autorité | ✔ | `/hr/rotation` ; règle d'affectation intégrée (même type de structure, moins dotée, même province optionnelle) |
| 5 | Présences, absences, retards, permissions, congés annuels et exceptionnels, autorisations d'absence, indisponibilités, statistiques | ◐ | Pas de jours fériés ni de report du solde de congé (jours calendaires) |
| 6 | Formations initiales, continues, stages, spécialisées ; compétences, évaluations, attestations, historique | ✔ | `/hr/training` |
| 7 | Discipline, avertissements, sanctions, suspensions, décisions, distinctions, procédures, accès strictement limité | ◐ | Pas de recours ni de prescription |
| 8 | Solde, primes, indemnités, avantages, historique financier, états récapitulatifs, export, droits d'accès spécifiques | ◐ | Réalisé ; **montants, taux et formats à fixer par la Direction** (aucun chiffre inventé : modèles à 0) |
| 9 | Espace documentaire, 8 types de documents, PDF et Word | ◐ | Documents générés en **français seulement** |
| 10 | Dix indicateurs, graphiques interactifs, filtres période / grade / délégation / commissariat | ◐ | « Promotions en attente » = éligibilité à l'ancienneté (pas de procédure de promotion) |
| 11 | Rôles (administrateur général, direction générale, directions centrales, direction RH, services administratifs, délégations, commissariats, responsables locaux), permissions, journal, authentification sécurisée, historique des connexions, traçabilité | ◐ | Rôles existants + `HR_DIRECTOR`, `HR_OFFICER`, `HR_PAYROLL`, `HR_PAYROLL_CONTROL` ; **pas de rôle propre aux « directions centrales »** (rôles nationaux avec périmètre) |
| 12 | Identité graphique actuelle, moderne, responsive, français et arabe RTL, menu RH | ◐ | Composants existants ; pages vérifiées sur ordinateur en français et en arabe ; **pas de test visuel dédié sur téléphone** |
| 13 | Examiner l'architecture, préserver les données, migrations, cohérence, performance 14 000, sécurité, tests, documentation | ✔ | Migrations additives, 22 contrôles, mesures, tests, 3 documents |
| 14 | Plan en 10 phases | ✔ | Voir §2 (la solde a été ajoutée) |
| 15 | 12 directives finales (ne pas reconstruire, ne rien supprimer, circuit de validation, sécurité, tester, rapporter, vraies fonctionnalités) | ✔ | Voir §2 et §4 |

## 4. Sécurité et protection des données

- **Cloisonnement** : périmètre territorial sur chaque lecture et écriture ; hors périmètre, la réponse est « introuvable » (pas de fuite d'existence).
- **Séparation des tâches** : aucune validation de sa propre demande (mutations, congés, discipline, solde) ; la solde est réservée à deux rôles dédiés, **hors de portée de l'administrateur système**.
- **Journalisation** de toutes les écritures et des lectures sensibles (dossier, discipline, solde, téléchargements, exports).
- **Intégrité en base** : historiques de carrière, étapes disciplinaires et grilles en ajout seul ; états de solde validés figés ; contraintes et déclencheurs SQL.
- **Surface d'API** : test statique des 69 opérations (toutes passent par la couche d'authentification, aucune publique) et test dynamique : sans identifiants → 401, sans droit RH → jamais de succès, commandant de structure → refus sur toute écriture privilégiée, aucune donnée secrète dans les réponses, limite d'écriture de 60 requêtes par minute vérifiée.
- **Fichiers** : type vérifié sur le contenu, nom hostile neutralisé, en-têtes `nosniff` et `no-store` ; export CSV protégé contre l'injection de formules.
- **Authentification** : double facteur obligatoire pour tous les rôles RH.

## 5. Défauts trouvés et corrigés pendant le travail

1. Une mutation restait ouverte après le départ de l'agent → annulation automatique.
2. L'affectation automatique s'arrêtait après les 500 premiers agents (curseur sur un ensemble qui change) → pagination par clé, test de non-régression.
3. Un agent créé depuis l'interface était invisible de la rotation et des statistiques (pas de date de prise de poste) → valeurs par défaut à la création.
4. Les documents rattachés à une structure étaient invisibles aux utilisateurs nationaux (comportement d'un filtre vide) → corrigé et testé.
5. Un calcul de suspension réduisait deux fois les primes en pourcentage → corrigé avant livraison, test unitaire.
6. Données de démonstration incohérentes (agents recrutés avant 16 ans) → graine et base corrigées.
7. Des tests d'une autre partie de l'application échouaient par épuisement du quota de requêtes causé par un test de sécurité → compte réservé.
8. Le déploiement ne synchronisait ni permissions ni rôles (seule la graine de démonstration le faisait) → synchronisation de démarrage idempotente.

## 6. Limites connues et points à décider

**À décider par la Direction** : âge de départ à la retraite (60 ans supposé), ancienneté pour la promotion (3 ans supposé), droits à congé (30 jours calendaires supposés), grilles et éléments de solde, part de solde pendant une suspension (50 % supposé), traitement des agents détachés et mis à disposition (exclus), format attendu par les services financiers, textes officiels des décisions (modèles génériques), procédures de recours et prescriptions.

**Non réalisé ou non vérifié** : mesure de charge sur le matériel de production et avec plusieurs serveurs ; minuterie interne observée avec un seul serveur ; documents en arabe ; test visuel sur téléphone ; chiffrement des champs personnels au niveau des colonnes (les secrets d'authentification le sont déjà) ; antivirus sur les fichiers téléversés ; envoi de notifications par courriel ou SMS ; rôle propre aux directions centrales.

**Dépendances** : l'audit `npm audit` signale 9 alertes **préexistantes** (Next.js, Zod, Prisma et leur outillage), dont aucune due à la bibliothèque ajoutée (`docx`). L'alerte critique de Next.js concerne `next/og`, que l'application n'utilise pas. `npm audit fix` échoue à cause d'un conflit de versions : une **montée de version planifiée et testée de Next.js, Zod et Prisma est recommandée avant la mise en production**.

**Données de test laissées dans la base de développement** : agents de test retraités, structures de test inactives, quelques états de solde historiques (dont un validé, donc non supprimable) et grades de test. Elles n'affectent ni les contrôles de cohérence ni les statistiques courantes et peuvent être purgées en recréant la base de développement.

## 7. Documents livrés

| Document | Contenu |
| -------- | ------- |
| `docs/RESSOURCES_HUMAINES.md` | Règles métier et décisions, phase par phase |
| `docs/RH_GUIDE_EXPLOITATION.md` | Mise en service, variables, rôles, commandes, dépannage |
| `docs/RH_RAPPORT_FINAL.md` | Le présent rapport |
| `API_DOCUMENTATION.md` | 69 opérations RH (générées depuis le code) |
| `docs/DATABASE_DOCUMENTATION.md` | 117 modèles, 102 énumérations (générés depuis le schéma) |
| `CHANGELOG.md`, `PROJECT_STATUS.md` | Historique et état du projet |

## 8. Prochaines étapes recommandées

1. Faire valider par la Direction les points du §6 (valeurs légales, grilles, textes).
2. Planifier la montée de version des dépendances signalées et rejouer toute la batterie de tests.
3. Charger les données réelles par l'import, corriger les anomalies de `hr:check`, puis ouvrir l'affectation automatique par structures pilotes.
4. Mesurer sur la cible de production avec plusieurs délégations connectées ; décider de la fusion de la branche `feature/rh-police`.
