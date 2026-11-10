# Cartographie organisationnelle des responsabilités

**Niveaux, rôles, périmètres et lignes de transmission**

| Rubrique | Valeur |
|---|---|
| Système | SIGEC-PN / SIGPN-T — Système d'information de gestion de la Police nationale du Tchad |
| Éditeur et développeur | TECHNOTCHAD |
| Version du document | 1.0 — 10 novembre 2026 |
| Statut | Projet pour validation par la hiérarchie : les points marqués « À confirmer » ne sont pas des décisions |
| Source des informations | Lecture seule du système existant (code, catalogue des rôles et droits, écrans) — aucune donnée, aucun compte, aucun rôle, aucune permission n'a été modifié |

## Les niveaux du système

| Niveau | Profil dans le système | Périmètre de données | Voit | Transmet à |
|---|---|---|---|---|
| Direction générale (DGPN) | Commandement national | Tout le pays | Toutes les données nationales | Autorité de tutelle (hors système) |
| Directions centrales et unités (14 selon le décret 0572/2023) | Aucun rôle dédié : rôle national attribué par la Direction | Selon le rôle attribué | Selon le rôle | Direction générale |
| Délégations provinciales (23 provinces) | Délégué provincial de police | Sa province | Tous les commissariats de la province | Direction générale |
| Départements (rôle dormant) | Commandant de département | Son département | — | Délégué provincial |
| Commissariats | Commissaire | Son commissariat et ses postes rattachés | Toutes les données du commissariat | Délégué provincial |
| Postes, brigades, unités | Agents (accueil, patrouille, circulation…) | Leur unité | Leurs propres enregistrements et ceux de l'unité selon le droit | Commissaire |
| Services transversaux | RH, paie, finances, audit, analyse, parquet | National ou provincial selon le rôle | Selon le droit | Direction concernée |

## Chaîne de responsabilité d'une plainte

Agent d'accueil → Commissaire → Enquêteur → Commissaire (contrôle) → Parquet (hors système).

## Chaîne de responsabilité d'un avis de recherche

Enquêteur (émet) → Commissaire ou autre vérificateur (vérifie) → Commandement (approuve) → Unités (acquittent) → Superviseurs (escalade).

## Les 14 directions centrales et unités du décret 0572/2023 chargées dans le système

DSP, DLGDEAM, DPTSCI, DIE, DRHM, DITT, DLS, DSPSM, DBCN-IP, DENP, GMIP, GSR, USIP, UNILT (placées sous la Direction générale). **Leur organisation détaillée est fixée par arrêté ministériel (article 91) : elle n'est pas dans le système.**

## Comptes par profil

| Profil | Code | Périmètre | Supérieur (d'après le système) |
|---|---|---|---|
| Administrateur technique | `SUPER_ADMIN` | National (tout le pays) | Direction générale pour l'usage ; aucun lien opérationnel |
| Administrateur de sécurité | `SECURITY_ADMIN` | National (tout le pays) | Direction générale |
| Commandement national (Direction générale) | `NATIONAL_COMMANDER` | National (tout le pays) | Autorité de tutelle (Ministère) — hors système |
| Délégué provincial de police | `REGIONAL_COMMANDER` | Provincial (sa province) | Commandement national (Direction générale) |
| Commandant de département (rôle dormant) | `DEPARTMENTAL_COMMANDER` | Départemental (son département) | Délégué provincial de police |
| Commissaire (chef de commissariat) | `STATION_COMMANDER` | Commissariat (son unité et ses postes rattachés) | Délégué provincial de police de la province |
| Enquêteur | `INVESTIGATOR` | Commissariat (son unité et ses postes rattachés) | Commissaire de son commissariat (superviseur de l'affaire) |
| Agent d'accueil / de permanence | `DESK_OFFICER` | Commissariat (son unité et ses postes rattachés) | Commissaire de son commissariat |
| Agent de patrouille | `PATROL_OFFICER` | Commissariat (son unité et ses postes rattachés) | Commissaire de son commissariat (ou superviseur de patrouille) |
| Responsable des scellés et pièces à conviction | `EVIDENCE_CUSTODIAN` | Commissariat (son unité et ses postes rattachés) | Commissaire de son commissariat |
| Agent de garde à vue | `CUSTODY_OFFICER` | Commissariat (son unité et ses postes rattachés) | Commissaire de son commissariat |
| Gestionnaire du parc de véhicules | `FLEET_MANAGER` | Provincial (sa province) | Délégué provincial de police |
| Analyste criminel | `ANALYST` | National (tout le pays) | Direction générale |
| Auditeur | `AUDITOR` | National (tout le pays) | Direction générale / organe de contrôle |
| Agent biométrie | `BIOMETRIC_OFFICER` | Commissariat (son unité et ses postes rattachés) | Commissaire de son commissariat |
| Agent de police technique et scientifique | `FORENSIC_OFFICER` | Commissariat (son unité et ses postes rattachés) | Commissaire de son commissariat |
| Magistrat du parquet (consultation) | `PROSECUTOR` | Commissariat (son unité et ses postes rattachés) | Autorité judiciaire (hors police) |
| Administrateur de la police (système d'information) | `POLICE_ADMIN` | National (tout le pays) | Direction générale |
| Directeur des ressources humaines | `HR_DIRECTOR` | National (tout le pays) | Direction générale |
| Gestionnaire de paie | `HR_PAYROLL` | National (tout le pays) | Directeur des ressources humaines |
| Contrôleur de paie | `HR_PAYROLL_CONTROL` | National (tout le pays) | Directeur des ressources humaines |
| Agent du service des ressources humaines | `HR_OFFICER` | National (tout le pays) | Directeur des ressources humaines |
| Officier de police (désigné OPJ dans le système) | `OFFICER` | Commissariat (son unité et ses postes rattachés) | Commissaire de son commissariat |
| Agent de circulation | `TRAFFIC_OFFICER` | Commissariat (son unité et ses postes rattachés) | Superviseur circulation / Commissaire |
| Agent de contrôle routier | `TRAFFIC_CONTROL_AGENT` | Commissariat (son unité et ses postes rattachés) | Superviseur circulation / Commissaire |
| Superviseur circulation | `TRAFFIC_SUPERVISOR` | Commissariat (son unité et ses postes rattachés) | Commissaire de son commissariat |
| Responsable financier / paiements | `TRAFFIC_PAYMENT_MANAGER` | Provincial (sa province) | Délégué provincial de police |
| Chef d'unité (recettes) | `TRAFFIC_UNIT_HEAD` | Commissariat (son unité et ses postes rattachés) | Commissaire de son commissariat |
| Consultation circulation | `TRAFFIC_READONLY` | Commissariat (son unité et ses postes rattachés) | Commissaire de son commissariat |

![Hiérarchie de supervision](./hierarchie.png)

## À confirmer

- Organigramme réel des services à l'intérieur des commissariats (non modélisé).
- Rattachement des directions centrales aux rôles du système.
- Qui est « chef de service » entre l'agent et le commissaire.
