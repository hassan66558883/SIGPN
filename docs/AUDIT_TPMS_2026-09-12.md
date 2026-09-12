# AUDIT DU PROJET EXISTANT — TPMS (Tchad Police Management System)

Date : 2026-09-12 · Périmètre : dépôt `police managment  system` (commit `640e0a4` + travaux non commités de la phase 2)
Méthode : lecture du code, `next build` (production), `tsc --noEmit`, `eslint`, exécution des 46 tests automatisés, inspection de la base PostgreSQL de développement, parcours manuel de toutes les pages dans le navigateur.

---

## 1. Architecture actuelle

| Couche | État constaté |
| ------ | ------------- |
| Frontend | Next.js 16.3 App Router, React 19, TypeScript strict, Tailwind 4. Server Components par défaut ; Client Components uniquement pour les formulaires interactifs. Design system maison (`src/components/ui.tsx`, `forms.tsx`) : Card, Table responsive (cartes empilées < 768 px), Badge, Alert, Field, Select, Stepper, Pagination. Shell : sidebar desktop + tiroir mobile, en-tête avec sélecteur FR/EN. |
| Backend | Même application Next.js : Server Actions (`src/server/<module>/actions.ts`) et API REST `/api/v1/**` (Route Handlers enveloppés par `withApi`) appellent la **même couche service** (`src/server/<module>/service.ts`). Aucun accès Prisma direct depuis les pages pour les mutations. |
| Base de données | PostgreSQL 18, Prisma 7 (adaptateur `pg`). Schéma complet de 64 tables / 57 énumérations couvrant les 42 modules du cahier des charges. 2 migrations versionnées (`init`, `immutability_triggers`). 206 index. Triggers `append-only` sur `AuditLog` et `CustodyEvent`. Dev : PostgreSQL embarqué (port 5436) ; prod : conteneur `postgres:18` (compose). |
| Authentification | Sessions en base (jeton 256 bits, SHA-256 stocké, cookie HttpOnly/SameSite=Lax/Secure en prod), inactivité 60 min / absolue 10 h, révocation instantanée. bcrypt coût 12, politique ≥ 12 caractères + 3 classes, historique 5, rotation 90 j, changement forcé au 1er accès. MFA TOTP (RFC 6238, secret chiffré AES-256-GCM, 8 codes de récupération hachés), obligatoire pour les rôles privilégiés. Verrouillage 5 échecs / 15 min, limiteurs par identifiant et par IP, journal des tentatives. Clés API personnelles (Bearer) portant les permissions du propriétaire. |
| Rôles & permissions | Catalogue de **92 permissions** `module:action` (code) synchronisé en base ; **12 rôles système** en base avec jeu de permissions éditable ; **4 niveaux de périmètre** (NATIONAL / REGIONAL / STATION / OWN) portés par le rôle et résolus par `scopeWhere()` / `inScope()`. Garde anti-escalade : on ne peut accorder que des rôles/permissions que l'on détient ; on ne peut pas changer son propre rôle/statut ; dernier SUPER_ADMIN protégé ; changement de rôle = révocation des sessions. |
| Audit | `logAudit()` sur chaque événement d'authentification, mutation, refus d'accès et export ; masquage des secrets ; table inviolable (UPDATE/DELETE refusés par trigger). Visualiseur filtrable + export CSV (lui-même audité). |
| i18n | Français par défaut (cookie `pms_lang`), anglais en seconde langue. Dictionnaires typés (`fr.ts` référence, `en.ts` contrôlé par TypeScript), libellés d'énumérations bilingues, dates/titres localisés, messages serveur traduits à l'affichage. |
| Déploiement | Dockerfile multi-étapes, `docker-compose` (nginx TLS + app + postgres + sauvegarde quotidienne `pg_dump`), config Nginx (HSTS, limites de débit), scripts backup/restore. **Non exécuté** sur cette machine (pas de Docker) — prévu en phase 15 sur le serveur Ubuntu. |

Vérifications : `next build` **OK** (33 routes, compilation 10 s) · `tsc --noEmit` **OK** · `eslint` : **1 erreur** (`prefer-const` dans un fichier de la phase 2 non commité) · tests : **46/46** (16 unitaires, 14 intégration, 16 sécurité en conditions réelles).

## 2. Modules existants et état

| Module (cahier des charges) | État | Détail |
| --------------------------- | ---- | ------ |
| 2 Authentification | **TERMINÉ** | login/logout/MFA/reset/politique/verrouillage, testés |
| 3 Utilisateurs | **TERMINÉ** | liste filtrée/paginée, création, édition, statuts, sessions, réinitialisation, reset MFA, périmètre |
| 4 Rôles · 5 Permissions | **TERMINÉ** | éditeur de rôle, matrice 92 × 12, rôles personnalisés |
| 35 Notifications | **TERMINÉ (socle)** | boîte de réception, marquage lu, génération par événements sécurité |
| 38 Journal d'audit | **TERMINÉ** | visualiseur, filtres, export CSV, immuabilité |
| 41 Administration sécurité | **TERMINÉ (socle)** | centre de sécurité (sessions, verrouillages, refus, IP en échec, politique) |
| 1 Tableau de bord | **SOCLE** | KPI réels (utilisateurs, sessions, notifications, audit) ; KPI opérationnels à venir avec les modules |
| 6–11 Organisations, Régions, Commissariats, Services, Grades, Agents | **EN COURS (phase 2, non commité)** | services + actions + 6 pages écrits (`src/server/org`, `/admin/organization/**`, `/officers/**`), compilent, **non testés** ; modèle actuel : Organisation → Région → Commissariat → Service → Agent |
| 12–16 Personnes, victimes, témoins, suspects, recherchés | MANQUANT (schéma prêt) | |
| 17 Plaintes · 18–22 Affaires, enquêtes, tâches, déclarations, auditions | MANQUANT (schéma prêt) | |
| 23–24 Pièces & chaîne de possession | MANQUANT (schéma + trigger prêts) | |
| 25–27 Arrestations, garde à vue, mandats | MANQUANT (schéma prêt) | |
| 28–30 Patrouilles, incidents/interventions, opérations | MANQUANT (schéma prêt) | |
| 31–32 Véhicules, maintenance | MANQUANT (schéma prêt) | |
| 33–34, 36–37 Documents, versions, rapports, statistiques | MANQUANT (schéma prêt) | |
| 39 Voix / transcription | MANQUANT (schéma prêt) | |
| 40, 42 Système, sauvegardes | MANQUANT (scripts prêts, écran absent) | |

## 3. Rapport de synthèse

### EXISTANT — fonctionne correctement
- Socle sécurité complet et **testé en conditions réelles** (46 tests + parcours navigateur : enrôlement MFA réel avec code TOTP calculé, connexion à deux facteurs, verrouillage, CSRF, escalade de privilèges).
- Modèle de données complet pour tous les modules, migrations versionnées, journal d'audit et chaîne de possession inviolables au niveau SGBD.
- Couche service partagée Server Actions / API REST : une seule implémentation des règles métier et des contrôles d'accès.
- RBAC en base + catalogue typé + périmètre organisationnel (national / régional / commissariat / propre) appliqué dans les listes (`scopeWhere`) et les accès unitaires (`inScope`).
- Interface bilingue FR (défaut) / EN, responsive (390 → 1920 px vérifiés), design system cohérent.
- Documentation continue : architecture (ADR), base de données générée, API, tests, sécurité, rapports de phase 0 et 1.

### À AMÉLIORER — fonctionne mais doit évoluer
1. **Hiérarchie territoriale trop plate** : Organisation → Région → Commissariat → Service. Il manque département administratif, commune/sous-préfecture, quartier/localité, et la relation Commissariat → Poste → Unité. La « Région » doit devenir la **Province** (23 provinces) sans casser la table `Region` existante.
2. **Périmètre** : 4 niveaux suffisent pour agent/commissariat/province/national, mais il manque (a) un niveau **départemental** et (b) la **descendance** d'un commissariat (postes et unités rattachés) dans `scopeWhere`.
3. **Statut des structures** : `isActive` booléen seulement ; il faut `ACTIVE / INACTIVE / UNDER_CONSTRUCTION / PLANNED`.
4. Tableau de bord unique : à décliner en vues NATIONAL / PROVINCE / COMMISSARIAT / AGENT.
5. Données de démonstration minimales (2 régions fictives, 2 commissariats, 13 comptes) : à remplacer par un référentiel Tchad (provinces officielles) + données DEMO clairement marquées.
6. Limiteur de débit en mémoire (par instance) et IP client inconnue sans proxy de confiance : suffisant en dev, à compléter par les zones Nginx (déjà configurées) en production.
7. Pas de passerelle e-mail/SMS : les liens de réinitialisation sont remis hors-ligne par un administrateur (assumé, audité).
8. Messages métier en anglais côté service, traduits à l'affichage par table de correspondance : fonctionnel, mais un modèle par clés serait plus robuste à long terme.
9. Nom du produit : « PMS / SGP » à renommer **TPMS – Tchad Police Management System**.

### MANQUANT — à développer (dans l'ordre de priorité demandé)
1. Référentiel territorial national configurable (provinces, départements, communes/sous-préfectures, localités) et structures policières hiérarchisées (commissariat → poste → unité → service), avec statuts.
2. Périmètre territorial étendu (`DEPARTMENTAL`, descendance de commissariat) appliqué à tous les modules.
3. Personnel complet : agents (en cours), fonctions, formations.
4. Plaintes → dossiers/affaires → enquêtes (tâches, déclarations, auditions).
5. Personnes (victimes, témoins, mis en cause, recherchés, disparus).
6. Pièces à conviction + chaîne de possession ; mandats, arrestations, garde à vue.
7. Opérations : interventions/incidents, patrouilles, opérations planifiées.
8. Véhicules, affectations, maintenance ; équipements.
9. Documents, pièces jointes, versions, archivage (upload sécurisé).
10. Dashboards par niveau, statistiques, rapports, exports PDF.
11. Écran Système & sauvegardes ; environnement DEMO explicite (bandeau + rechargement des données).
12. Transcription vocale (optionnel), durcissement final, QA/déploiement.

### RISQUES — à corriger / surveiller
| # | Risque | Gravité | Action |
| - | ------ | ------- | ------ |
| R1 | Un agent de commissariat verrait les postes/unités **non** rattachés tant que la descendance n'est pas dans le périmètre → aujourd'hui aucun risque de fuite (pas de hiérarchie), mais à traiter **avant** d'ajouter postes/unités | Élevée (future) | intégrer la descendance dans `scopeWhere`/`inScope` avec la migration territoriale |
| R2 | CSP `script-src 'unsafe-inline'` (contrainte Next.js sans nonces) | Moyenne | passer aux nonces via `proxy.ts` en phase de durcissement |
| R3 | Limiteur par IP inopérant sans proxy de confiance (IP inconnue) | Moyenne | `TRUST_PROXY=1` derrière Nginx (configuré) ; verrouillage par compte toujours actif |
| R4 | Code de la phase 2 non commité et non testé (6 pages, services organisation/agents) ; 1 erreur lint | Faible | terminer, tester, corriger, commiter avant l'évolution territoriale |
| R5 | Données de démonstration fictives (« Central Region ») pouvant être confondues avec des données réelles | Faible | marquer DEMO, remplacer par les provinces officielles |
| R6 | Déploiement (Docker/Nginx/TLS/sauvegarde) jamais exécuté | Moyenne | validation obligatoire sur le serveur Ubuntu (phase 15) |
| R7 | Aucun téléversement de fichier encore implémenté : la sécurité upload (type MIME, taille, antivirus) reste à concevoir | Moyenne (future) | module Documents avec validation stricte + stockage hors racine web |

## 4. Structure de la base (résumé)
64 tables en 12 groupes : identité/accès (User, Role, Permission, RolePermission, Session, LoginChallenge, MfaRecoveryCode, PasswordResetToken, PasswordHistory, LoginAttempt, ApiKey) · organisation (Organization, Region, Station, Department, Rank, Officer, OfficerAssignment) · personnes (Person, PersonIdentifier, PersonAlias, PersonRelationship, WantedPerson) · plaintes (Complaint) · affaires (Case, CaseAssignment, CaseParty, CaseEvent, CaseNote) · enquête (Task, Investigation, InvestigationReport, Statement, Interview, Transcript) · pièces (StorageLocation, Evidence, CustodyEvent) · contrainte (Warrant, Arrest, Detention, DetentionLog) · opérations (Zone, Patrol, PatrolOfficer, Incident, IncidentOfficer, IncidentPerson, Operation, OperationTeam, OperationMember, OperationResource) · parc (Vehicle, VehicleAssignment, MaintenanceRecord, FuelLog) · documents (Document, DocumentVersion, GeneratedReport, Notification) · système (AuditLog, DocumentSequence, SystemSetting, BackupRecord). Données présentes : 12 tables non vides (comptes, rôles, permissions, audit, sessions, tentatives, 1 organisation, 2 régions, 2 commissariats). Détail complet : `docs/DATABASE_DOCUMENTATION.md`.

## 5. Prochaines étapes prioritaires (plan d'évolution TPMS)
1. **Stabiliser la phase 2** : corriger le lint, tester et commiter les écrans Organisation/Agents existants (aucune perte).
2. **Migration territoriale (non destructive)** : nouvelles tables `AdminDepartment`, `Commune` (COMMUNE | SOUS_PREFECTURE), `Locality` ; sur `Station` : `status` (ACTIVE/INACTIVE/UNDER_CONSTRUCTION/PLANNED), `parentId` (poste/unité → commissariat), `adminDepartmentId`, `communeId`, `localityId` (tous nullables) ; types `PROVINCIAL_DIRECTION`, `DEPARTMENTAL_DIRECTION`, `UNIT` ; niveau de périmètre `DEPARTMENTAL` + `User.adminDepartmentId`. La table `Region` est conservée et présentée comme **Province**.
3. **Périmètre territorial** : `Role + périmètre + permission` généralisé (descendance de commissariat, département, province, national) dans `scopeWhere`/`inScope` ; tests d'isolation (agent A ≠ commissariat B ; responsable provincial ; DG).
4. **Référentiel Tchad** : 23 provinces officielles (chef-lieux), arrondissements de N'Djamena ; le reste (départements, communes, commissariats, agents) en données **DEMO** explicitement marquées.
5. **Écrans structures** : arbre national → province → département → commune → commissariat → postes/unités → services ; fiche commissariat (rattachements, unités, services, agents, véhicules, dossiers…).
6. Renommage produit **TPMS**, bandeau DEMO, puis reprise de la feuille de route : personnel → plaintes/dossiers → opérations → dashboards par niveau → reporting → modules spécialisés → optimisation → déploiement.
