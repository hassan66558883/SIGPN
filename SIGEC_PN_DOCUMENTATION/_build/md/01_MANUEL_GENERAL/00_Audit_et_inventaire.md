# Audit documentaire et inventaire du système

**Modules, comptes, rôles, circuits, notifications, formulaires, recherche et rapports**

| Rubrique | Valeur |
|---|---|
| Système | SIGEC-PN / SIGPN-T — Système d'information de gestion de la Police nationale du Tchad |
| Éditeur et développeur | TECHNOTCHAD |
| Version du document | 1.0 — 10 novembre 2026 |
| Statut | Projet pour validation par la hiérarchie : les points marqués « À confirmer » ne sont pas des décisions |
| Source des informations | Lecture seule du système existant (code, catalogue des rôles et droits, écrans) — aucune donnée, aucun compte, aucun rôle, aucune permission n'a été modifié |

## 1. Méthode

Lecture seule du système existant : code source (services, schémas, droits, navigation), catalogue des 29 rôles et 157 droits, comptes de démonstration, captures d'écran réelles de l'application. **Aucun fichier de production, aucune base de données, aucun compte et aucune permission n'ont été modifiés.** Les circuits sont ceux que le code impose ; ce qui relève d'une décision organisationnelle est marqué « À confirmer ».

## 2. Inventaire des modules du menu

| Rubrique | Module | Écran | Droit d'accès | État |
|---|---|---|---|---|
| Général | Tableau de bord | /dashboard | dashboard:view | Disponible |
| Général | Recherche | /search | persons:view | Prévu, non construit |
| Accueil | Plaintes | /complaints | complaints:view | Disponible |
| Accueil | Incidents | /incidents | incidents:view | Disponible |
| Accueil | Personnes | /persons | persons:view | Disponible |
| Accueil | Personnes recherchées | /wanted | wanted:view | Disponible |
| Accueil | Approbations | /approvals | approvals:view | Disponible |
| Accueil | Site public | /public-admin | intake:view | Disponible |
| Accueil | Alertes nationales | /alerts | alerts:view | Disponible |
| Accueil | Supervision des alertes | /alerts/supervision | alerts:supervise | Disponible |
| Enquête | Affaires | /cases | cases:view | Disponible |
| Enquête | Enquêtes | /investigations | investigations:view | Prévu, non construit |
| Enquête | Mes tâches | /tasks | investigations:view | Disponible |
| Enquête | Pièces & chaîne de possession | /evidence | evidence:view | Disponible |
| Enquête | Déclarations | /statements | statements:view | Prévu, non construit |
| Enquête | Auditions & transcriptions | /interviews | interviews:view | Prévu, non construit |
| Enquête | Biométrie & police scientifique | /biometric | biometric:history_view | Disponible |
| Enquête | Contrôle biométrique | /biometric/control | biometric:control | Disponible |
| Contrainte | Mandats | /warrants | warrants:view | Disponible |
| Contrainte | Arrestations | /arrests | arrests:view | Disponible |
| Contrainte | Garde à vue | /detention | detention:view | Disponible |
| Circulation routière | Tableau de bord trafic | /traffic | traffic:dashboard | Disponible |
| Circulation routière | Contrôles routiers | /traffic/controls | traffic:view | Disponible |
| Circulation routière | Procès-verbaux | /traffic/tickets | traffic:view | Disponible |
| Circulation routière | Amendes & paiements | /traffic/fines | traffic:view | Disponible |
| Circulation routière | Paiements en ligne | /traffic/online-payments | traffic:payment_record | Disponible |
| Circulation routière | Conducteurs | /traffic/drivers | traffic:drivers_view | Disponible |
| Circulation routière | Véhicules & immatriculations | /traffic/vehicles | traffic:vehicles_view | Disponible |
| Circulation routière | Catalogue des infractions | /traffic/violations | traffic:violations_view | Disponible |
| Circulation routière | Recherche circulation | /traffic/search | traffic:view | Disponible |
| Recettes et versements | Tableau de bord des recettes | /traffic/cash | cash:reports | Disponible |
| Recettes et versements | Caisse des agents | /traffic/cash/registers | cash:view | Disponible |
| Recettes et versements | Recettes collectées | /traffic/cash/collections | cash:view | Disponible |
| Recettes et versements | Clôture de caisse | /traffic/cash/closures | cash:view | Disponible |
| Recettes et versements | Versements | /traffic/cash/deposits | cash:view | Disponible |
| Recettes et versements | Bordereaux | /traffic/cash/slips | cash:view | Disponible |
| Recettes et versements | Rapprochement | /traffic/cash/reconciliation | cash:view | Disponible |
| Recettes et versements | Écarts | /traffic/cash/discrepancies | cash:view | Disponible |
| Recettes et versements | Rapports financiers | /traffic/cash/reports | cash:reports | Disponible |
| Recettes et versements | Audit financier | /traffic/cash/audit | audit:view | Disponible |
| Opérations | Patrouilles | /patrols | patrols:view | Disponible |
| Opérations | Opérations | /operations | operations:view | Prévu, non construit |
| Ressources | Agents | /officers | officers:view | Disponible |
| Ressources | Parc & maintenance | /vehicles | vehicles:view | Prévu, non construit |
| Ressources | Documents | /documents | documents:view | Prévu, non construit |
| Ressources | Rapports | /reports | reports:view | Prévu, non construit |
| Ressources | Statistiques | /statistics | statistics:view | Prévu, non construit |
| Ressources humaines | Vue d'ensemble RH | /hr | hr:view | Disponible |
| Ressources humaines | Dossiers du personnel | /hr/dossiers | hr:view | Disponible |
| Ressources humaines | Mutations | /hr/transfers | hr:view | Disponible |
| Ressources humaines | Affectation automatique | /hr/rotation | hr:view | Disponible |
| Ressources humaines | Présences | /hr/attendance | hr:view | Disponible |
| Ressources humaines | Congés et absences | /hr/leaves | hr:view | Disponible |
| Ressources humaines | Formations | /hr/training | hr:view | Disponible |
| Ressources humaines | Documents RH | /hr/documents | hr:view | Disponible |
| Ressources humaines | Discipline | /hr/discipline | hr:discipline_view | Disponible |
| Ressources humaines | Mes congés | /hr/leaves/mine | dashboard:view | Disponible |
| Ressources humaines | Solde et avantages | /hr/pay | hr:pay_view | Disponible |
| Ressources humaines | Ma solde | /hr/pay/mine | dashboard:view | Disponible |
| Administration | Organisation | /admin/organization | org:view | Disponible |
| Administration | Utilisateurs | /admin/users | users:view | Disponible |
| Administration | Rôles & permissions | /admin/roles | roles:view | Disponible |
| Administration | Centre de sécurité | /admin/security | security:view | Disponible |
| Administration | Système & sauvegardes | /admin/system | system:settings | Prévu, non construit |
| Administration | Journal d'audit | /audit | audit:view | Disponible |

## 3. Les 20 modules demandés par la mission

| N° | Module | Disponibilité | Écran réel |
|---|---|---|---|
| 1 | Gestion des utilisateurs et des comptes | Disponible | /admin/users |
| 2 | Gestion des commissariats | Disponible | /admin/organization |
| 3 | Gestion des délégations provinciales | Partiellement disponible | /admin/organization |
| 4 | Gestion des plaintes | Disponible | /complaints |
| 5 | Gestion des plaintes en cours | Partiellement disponible | /complaints |
| 6 | Gestion des mains courantes | Non construit | /incidents (module voisin) |
| 7 | Gestion des infractions | Partiellement disponible | /traffic |
| 8 | Gestion des mandats d'arrêt | Disponible | /warrants |
| 9 | Gestion des personnes recherchées | Disponible | /wanted |
| 10 | Gestion des arrestations | Disponible | /arrests |
| 11 | Gestion des gardes à vue | Disponible | /detention |
| 12 | Gestion des enquêtes | Partiellement disponible | /cases |
| 13 | Gestion des procès-verbaux | Non construit | (prévu : /statements, /interviews) |
| 14 | Gestion des transferts de dossiers | Partiellement disponible | /cases (affectation) |
| 15 | Gestion des interventions | Partiellement disponible | /patrols |
| 16 | Gestion des rapports | Partiellement disponible | /traffic/cash/reports |
| 17 | Gestion des statistiques | Partiellement disponible | /dashboard |
| 18 | Gestion des notifications | Disponible | /notifications |
| 19 | Gestion des archives | Partiellement disponible | /cases (statut Archivée) |
| 20 | Gestion des tableaux de bord | Disponible | /dashboard |

## 4. Inventaire des rôles

| Code | Fonction | Périmètre | 2nd facteur | Droits | Comptes de démonstration |
|---|---|---|---|---|---|
| `SUPER_ADMIN` | Administrateur technique | National (tout le pays) | Oui | 12 | admin |
| `SECURITY_ADMIN` | Administrateur de sécurité | National (tout le pays) | Oui | 16 | security.admin |
| `NATIONAL_COMMANDER` | Commandement national (Direction générale) | National (tout le pays) | Oui | 85 | commander.national |
| `REGIONAL_COMMANDER` | Délégué provincial de police | Provincial (sa province) | Oui | 113 | commander.central |
| `DEPARTMENTAL_COMMANDER` | Commandant de département (rôle dormant) | Départemental (son département) | Oui | 111 | commander.dept |
| `STATION_COMMANDER` | Commissaire (chef de commissariat) | Commissariat (son unité et ses postes rattachés) | Oui | 110 | chief.cs1, chief.arr5, chief.mdu, chief.abe |
| `INVESTIGATOR` | Enquêteur | Commissariat (son unité et ses postes rattachés) | Non | 62 | inv.diallo, inv.mensah |
| `DESK_OFFICER` | Agent d'accueil / de permanence | Commissariat (son unité et ses postes rattachés) | Non | 38 | desk.abe, desk.cs1, desk.post1 |
| `PATROL_OFFICER` | Agent de patrouille | Commissariat (son unité et ses postes rattachés) | Non | 40 | patrol.cs1 |
| `EVIDENCE_CUSTODIAN` | Responsable des scellés et pièces à conviction | Commissariat (son unité et ses postes rattachés) | Oui | 32 | evidence.cs1 |
| `CUSTODY_OFFICER` | Agent de garde à vue | Commissariat (son unité et ses postes rattachés) | Non | 28 | custody.cs1 |
| `FLEET_MANAGER` | Gestionnaire du parc de véhicules | Provincial (sa province) | Non | 14 | fleet.central |
| `ANALYST` | Analyste criminel | National (tout le pays) | Non | 40 | analyst |
| `AUDITOR` | Auditeur | National (tout le pays) | Oui | 40 | auditor |
| `BIOMETRIC_OFFICER` | Agent biométrie | Commissariat (son unité et ses postes rattachés) | Oui | 32 | biometric.cs1 |
| `FORENSIC_OFFICER` | Agent de police technique et scientifique | Commissariat (son unité et ses postes rattachés) | Oui | 33 | forensic.cs1 |
| `PROSECUTOR` | Magistrat du parquet (consultation) | Commissariat (son unité et ses postes rattachés) | Oui | 37 | prosecutor.cs1 |
| `POLICE_ADMIN` | Administrateur de la police (système d'information) | National (tout le pays) | Oui | 90 | police.admin |
| `HR_DIRECTOR` | Directeur des ressources humaines | National (tout le pays) | Oui | 22 | hr.director |
| `HR_PAYROLL` | Gestionnaire de paie | National (tout le pays) | Oui | 7 | payroll.officer |
| `HR_PAYROLL_CONTROL` | Contrôleur de paie | National (tout le pays) | Oui | 8 | payroll.control |
| `HR_OFFICER` | Agent du service des ressources humaines | National (tout le pays) | Oui | 15 | hr.service |
| `OFFICER` | Officier de police (désigné OPJ dans le système) | Commissariat (son unité et ses postes rattachés) | Non | 40 | officer.cs1 |
| `TRAFFIC_OFFICER` | Agent de circulation | Commissariat (son unité et ses postes rattachés) | Non | 21 | traffic.cs1 |
| `TRAFFIC_CONTROL_AGENT` | Agent de contrôle routier | Commissariat (son unité et ses postes rattachés) | Non | 17 | control.cs1, control.cs2 |
| `TRAFFIC_SUPERVISOR` | Superviseur circulation | Commissariat (son unité et ses postes rattachés) | Oui | 23 | traffic.supervisor |
| `TRAFFIC_PAYMENT_MANAGER` | Responsable financier / paiements | Provincial (sa province) | Oui | 22 | finance.central |
| `TRAFFIC_UNIT_HEAD` | Chef d'unité (recettes) | Commissariat (son unité et ses postes rattachés) | Oui | 16 | unit.head |
| `TRAFFIC_READONLY` | Consultation circulation | Commissariat (son unité et ses postes rattachés) | Non | 8 | readonly.traffic |

## 5. Correspondance avec les profils demandés

| Profil demandé | Existe dans le système ? | Profil système |
|---|---|---|
| Directeur général | Oui (commandement national) | NATIONAL_COMMANDER |
| Directeur général adjoint | Non distinct | Même profil que le DG |
| Directeurs centraux | Non | Rôle national attribué par la Direction |
| Délégués provinciaux | Oui | REGIONAL_COMMANDER (23 comptes) |
| Commissaires | Oui | STATION_COMMANDER |
| Commissaires adjoints | Non | — |
| Chefs de service | Non (hors circulation et recettes) | TRAFFIC_SUPERVISOR, TRAFFIC_UNIT_HEAD |
| Officiers de police judiciaire | Oui, mais sans pouvoir judiciaire propre | OFFICER |
| Enquêteurs | Oui | INVESTIGATOR |
| Agents de police | Oui, par fonction | DESK_OFFICER, PATROL_OFFICER, TRAFFIC_*, CUSTODY_OFFICER… |
| Responsables des archives | Non (module Documents/Archives non construit) | — |
| Responsables administratifs | Partiel | POLICE_ADMIN, HR_* |
| Administrateurs techniques | Oui | SUPER_ADMIN, SECURITY_ADMIN, POLICE_ADMIN |

## 6. Comptes de démonstration (36)

| Identifiant | Profil | Rattachement |
|---|---|---|
| `admin` | Administrateur technique | technique · national · MFA required |
| `security.admin` | Administrateur de sécurité | sécurité et audit · national · MFA required |
| `commander.national` | Commandement national (Direction générale) | Direction générale · MFA required |
| `commander.central` | Délégué provincial de police | Province de N'Djamena · MFA required |
| `commander.dept` | Commandant de département (rôle dormant) | Département Ville de N'Djamena · MFA required |
| `chief.cs1` | Commissaire (chef de commissariat) | Commissariat Central N'Djamena · MFA required |
| `chief.arr5` | Commissaire (chef de commissariat) | Commissariat 5e arrondissement · MFA required |
| `chief.mdu` | Commissaire (chef de commissariat) | Commissariat Central Moundou · MFA required |
| `chief.abe` | Commissaire (chef de commissariat) | Commissariat Central Abéché · MFA required |
| `desk.abe` | Agent d'accueil / de permanence | Commissariat Central Abéché |
| `inv.diallo` | Enquêteur | Commissariat Central N'Djamena |
| `inv.mensah` | Enquêteur | Commissariat Central N'Djamena |
| `desk.cs1` | Agent d'accueil / de permanence | Commissariat Central N'Djamena |
| `desk.post1` | Agent d'accueil / de permanence | Poste 1er arrondissement |
| `patrol.cs1` | Agent de patrouille | Commissariat Central N'Djamena |
| `evidence.cs1` | Responsable des scellés et pièces à conviction | Commissariat Central N'Djamena · MFA required |
| `custody.cs1` | Agent de garde à vue | Commissariat Central N'Djamena |
| `fleet.central` | Gestionnaire du parc de véhicules | Province de N'Djamena |
| `analyst` | Analyste criminel | national |
| `auditor` | Auditeur | national · MFA required |
| `biometric.cs1` | Agent biométrie | Commissariat Central N'Djamena · MFA required |
| `forensic.cs1` | Agent de police technique et scientifique | Commissariat Central N'Djamena · MFA required |
| `prosecutor.cs1` | Magistrat du parquet (consultation) | Commissariat Central N'Djamena · MFA required |
| `police.admin` | Administrateur de la police (système d'information) | Administrateur police · national · MFA required |
| `hr.director` | Directeur des ressources humaines | Direction des ressources humaines · national · MFA required |
| `hr.service` | Agent du service des ressources humaines | Service RH · national · MFA required |
| `payroll.officer` | Gestionnaire de paie | Solde et avantages · national · MFA required |
| `payroll.control` | Contrôleur de paie | Contrôle de la solde · national · MFA required |
| `officer.cs1` | Officier de police (désigné OPJ dans le système) | Officier · Commissariat Central N'Djamena |
| `traffic.cs1` | Agent de circulation | Agent de circulation · Commissariat Central N'Djamena |
| `control.cs1` | Agent de contrôle routier | Agent de contrôle · Commissariat Central N'Djamena |
| `control.cs2` | Agent de contrôle routier | Agent de contrôle (2e caisse) · Commissariat Central N'Djamena |
| `unit.head` | Chef d'unité (recettes) | Responsable d'unité · Commissariat Central N'Djamena · MFA required |
| `traffic.supervisor` | Superviseur circulation | Superviseur circulation · Commissariat Central N'Djamena · MFA required |
| `finance.central` | Responsable financier / paiements | Responsable financier / paiement · Province de N'Djamena · MFA required |
| `readonly.traffic` | Consultation circulation | Consultation circulation · Commissariat Central N'Djamena |

## 7. Circuits recensés

| Circuit | Titre | Étapes |
|---|---|---|
| A | Circuit d'une plainte | 13 |
| B | Circuit d'un mandat et d'un avis de recherche | 12 |
| C | Circuit d'une main courante (module Incidents) | 7 |
| D | Circuit des infractions | 7 |
| E | Circuit des plaintes en cours | 7 |
| F | Circuit des transferts de dossiers | 6 |
| G | Circuit des validations | 9 |
| D bis | Circuit d'une arrestation et d'une garde à vue | 6 |
| H | Circuit du portail public (citoyen) | 4 |
| I | Circuit des amendes, paiements et versements | 7 |
| J | Circuit des mutations et congés (ressources humaines) | 5 |

## 8. Circuits de validation

Voir le manuel des validations (dossier 03) : mandats, avis, publication, affaires, plaintes, garde à vue, comptes/rôles/habilitations, mutations, congés, paie, versements.

## 9. Notifications

Voir le catalogue des notifications (dossier 07). Aucune notification par SMS ou courriel n'existe ; seules les notifications internes et le bandeau d'alerte rouge.

## 10. Tableaux de bord, recherche et rapports

- Tableau de bord général (chiffres selon les droits, période réglable).
- Tableau de bord circulation et tableau de bord des recettes.
- Recherche : Personnes recherchées (rapide et avancée), Recherche circulation ; la recherche globale du menu est prévue mais non construite.
- Rapports : 12 rapports de recettes (JSON, CSV, PDF) ; la page Rapports générale est prévue mais non construite.
- Statistiques : la page Statistiques est prévue mais non construite.

## 11. Formulaires principaux (champs relevés dans le code)

| Formulaire | Champs |
|---|---|
| Plainte | plaignant ou anonyme, catégorie (20), titre, description, date, lieu, commissariat, priorité |
| Affaire | titre, catégorie, description, date, lieu, commissariat, département, priorité, sensible, responsable |
| Mandat | type, personne, affaire, autorité, référence, motifs, adresse, expiration |
| Avis de recherche | personne, affaire, infraction, motif, danger, nature, diffusion, base légale, autorité, dernière localisation, expiration |
| Arrestation | personne, affaire, mandat, agent, lieu, fondement, chefs d'accusation, circonstances, droits lus, notes |
| Garde à vue | arrestation, cellule, notes médicales ; journal ; prolongation ; fin |
| Incident | type, gravité, titre, description, lieu, coordonnées, commissariat, patrouille |
| Patrouille | zone, équipe, mission, superviseur, véhicule, agents |
| Pièce à conviction | affaire, catégorie, description, quantité, scellé, provenance, état, lieu |
| Personne | identité, naissance, contacts, signalement, pièce d'identité |

## 12. Ce que l'audit n'a pas pu vérifier

- Le fonctionnement sur le réseau réel des unités, en production : seules la démonstration et les tests le prouvent.
- Les procédures judiciaires et hiérarchiques réelles : aucune supposition n'a été faite.
- Toutes les captures sont réelles (installation de démonstration, données fictives) ; la base de démonstration ne contient aucune recette encaissée, donc les écrans de recettes montrent des compteurs à zéro.
- Le second facteur est suspendu sur l'installation de démonstration (interrupteur temporaire à retirer avant la mise en service).
- Les droits des 29 rôles sont ceux **effectivement enregistrés** dans la base de démonstration, lue en lecture seule (le code des rôles, plus les droits ajoutés à la synchronisation : alertes, site public, contrôle biométrique). Un rôle temporaire de test (TMP_UI_TEST), résidu présent dans la base de développement, n'est pas un rôle du système et n'est pas documenté.

