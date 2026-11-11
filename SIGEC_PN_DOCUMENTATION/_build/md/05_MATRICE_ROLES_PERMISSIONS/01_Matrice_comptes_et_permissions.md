# Matrice complète des comptes et permissions

**29 rôles × 157 droits — lecture seule du catalogue du système**

| Rubrique | Valeur |
|---|---|
| Système | SIGEC-PN / SIGPN-T — Système d'information de gestion de la Police nationale du Tchad |
| Éditeur et développeur | TECHNOTCHAD |
| Version du document | 1.0 — 10 novembre 2026 |
| Statut | Projet pour validation par la hiérarchie : les points marqués « À confirmer » ne sont pas des décisions |
| Source des informations | Lecture seule du système existant (code, catalogue des rôles et droits, écrans) — aucune donnée, aucun compte, aucun rôle, aucune permission n'a été modifié |

Lecture : ● = le rôle détient le droit ; ◆ = droit sensible détenu (n'agit qu'avec l'habilitation requise). Les colonnes sont les 29 rôles (codes). Un droit absent est **refusé**.

## Légende des rôles

| N° | Code | Fonction | Périmètre | 2nd facteur | Droits |
|---|---|---|---|---|---|
| 1 | `SUPER_ADMIN` | Administrateur technique | National (tout le pays) | Oui | 12 |
| 2 | `SECURITY_ADMIN` | Administrateur de sécurité | National (tout le pays) | Oui | 16 |
| 3 | `NATIONAL_COMMANDER` | Commandement national (Direction générale) | National (tout le pays) | Oui | 85 |
| 4 | `REGIONAL_COMMANDER` | Délégué provincial de police | Provincial (sa province) | Oui | 113 |
| 5 | `DEPARTMENTAL_COMMANDER` | Commandant de département (rôle dormant) | Départemental (son département) | Oui | 111 |
| 6 | `STATION_COMMANDER` | Commissaire (chef de commissariat) | Commissariat (son unité et ses postes rattachés) | Oui | 110 |
| 7 | `INVESTIGATOR` | Enquêteur | Commissariat (son unité et ses postes rattachés) | Non | 62 |
| 8 | `DESK_OFFICER` | Agent d'accueil / de permanence | Commissariat (son unité et ses postes rattachés) | Non | 38 |
| 9 | `PATROL_OFFICER` | Agent de patrouille | Commissariat (son unité et ses postes rattachés) | Non | 40 |
| 10 | `EVIDENCE_CUSTODIAN` | Responsable des scellés et pièces à conviction | Commissariat (son unité et ses postes rattachés) | Oui | 32 |
| 11 | `CUSTODY_OFFICER` | Agent de garde à vue | Commissariat (son unité et ses postes rattachés) | Non | 28 |
| 12 | `FLEET_MANAGER` | Gestionnaire du parc de véhicules | Provincial (sa province) | Non | 14 |
| 13 | `ANALYST` | Analyste criminel | National (tout le pays) | Non | 40 |
| 14 | `AUDITOR` | Auditeur | National (tout le pays) | Oui | 40 |
| 15 | `BIOMETRIC_OFFICER` | Agent biométrie | Commissariat (son unité et ses postes rattachés) | Oui | 32 |
| 16 | `FORENSIC_OFFICER` | Agent de police technique et scientifique | Commissariat (son unité et ses postes rattachés) | Oui | 33 |
| 17 | `PROSECUTOR` | Magistrat du parquet (consultation) | Commissariat (son unité et ses postes rattachés) | Oui | 37 |
| 18 | `POLICE_ADMIN` | Administrateur de la police (système d'information) | National (tout le pays) | Oui | 90 |
| 19 | `HR_DIRECTOR` | Directeur des ressources humaines | National (tout le pays) | Oui | 22 |
| 20 | `HR_PAYROLL` | Gestionnaire de paie | National (tout le pays) | Oui | 7 |
| 21 | `HR_PAYROLL_CONTROL` | Contrôleur de paie | National (tout le pays) | Oui | 8 |
| 22 | `HR_OFFICER` | Agent du service des ressources humaines | National (tout le pays) | Oui | 15 |
| 23 | `OFFICER` | Officier de police (désigné OPJ dans le système) | Commissariat (son unité et ses postes rattachés) | Non | 40 |
| 24 | `TRAFFIC_OFFICER` | Agent de circulation | Commissariat (son unité et ses postes rattachés) | Non | 21 |
| 25 | `TRAFFIC_CONTROL_AGENT` | Agent de contrôle routier | Commissariat (son unité et ses postes rattachés) | Non | 17 |
| 26 | `TRAFFIC_SUPERVISOR` | Superviseur circulation | Commissariat (son unité et ses postes rattachés) | Oui | 23 |
| 27 | `TRAFFIC_PAYMENT_MANAGER` | Responsable financier / paiements | Provincial (sa province) | Oui | 22 |
| 28 | `TRAFFIC_UNIT_HEAD` | Chef d'unité (recettes) | Commissariat (son unité et ses postes rattachés) | Oui | 16 |
| 29 | `TRAFFIC_READONLY` | Consultation circulation | Commissariat (son unité et ses postes rattachés) | Non | 8 |

## Tableau de bord

| Droit | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Voir le tableau de bord | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● |

## Statistiques

| Droit | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Voir les statistiques |  |  | ● | ● | ● | ● |  |  |  |  |  |  | ● | ● |  |  | ● | ● | ● |  |  | ● |  |  |  | ● |  | ● |  |

## Utilisateurs

| Droit | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Voir les comptes |  | ● | ● | ● | ● | ● |  |  |  |  |  |  | ● | ● |  |  | ● | ● |  |  |  |  |  |  |  |  |  |  |  |
| Créer un compte |  | ● | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  | ● |  |  |  |  |  |  |  |  |  |  |  |
| Modifier un compte |  | ● | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  | ● |  |  |  |  |  |  |  |  |  |  |  |
| Activer, suspendre, désactiver, débloquer un compte |  | ● | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  | ● |  |  |  |  |  |  |  |  |  |  |  |
| Émettre une réinitialisation de mot de passe |  | ● | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  | ● |  |  |  |  |  |  |  |  |  |  |  |
| Voir et révoquer les sessions d'autrui |  | ● | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  | ● |  |  |  |  |  |  |  |  |  |  |  |

## Rôles

| Droit | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Voir les rôles | ● | ● | ● | ● | ● | ● |  |  |  |  |  |  | ● | ● |  |  | ● | ● |  |  |  |  |  |  |  |  |  |  |  |
| Modifier les droits d'un rôle (sensible) | ◆ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

## Droits

| Droit | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Voir le catalogue des droits | ● | ● | ● | ● | ● | ● |  |  |  |  |  |  | ● | ● |  |  | ● | ● |  |  |  |  |  |  |  |  |  |  |  |

## Sécurité

| Droit | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Voir la sécurité | ● | ● |  |  |  |  |  |  |  |  |  |  |  | ● |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Gérer les paramètres de sécurité |  | ● |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

## Journal d'audit

| Droit | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Consulter le journal d'audit |  | ● | ● |  |  |  |  |  |  |  |  |  |  | ● |  |  |  | ● | ● |  |  |  |  |  |  | ● | ● |  |  |
| Exporter le journal d'audit (sensible) |  | ◆ |  |  |  |  |  |  |  |  |  |  |  | ◆ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

## Système

| Droit | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Modifier les paramètres système | ● |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Lancer et restaurer les sauvegardes (sensible) | ◆ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Charger les données de démonstration | ● |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

## Organisation

| Droit | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Voir l'organisation | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● |
| Gérer la structure organisationnelle | ● |  |  | ● |  |  |  |  |  |  |  |  |  |  |  |  |  | ● |  |  |  |  |  |  |  |  |  |  |  |

## Agents (officiers)

| Droit | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Voir les agents |  |  | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● |  |  | ● |  | ● |  |
| Gérer les fiches agents |  |  | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  | ● | ● |  |  | ● |  |  |  |  |  |  |  |

## Personnes

| Droit | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Voir les personnes |  |  | ● | ● | ● | ● | ● | ● | ● | ● | ● |  | ● | ● | ● | ● | ● | ● |  |  |  |  | ● | ● | ● | ● |  | ● |  |
| Créer une personne |  |  |  | ● | ● | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  |  |  | ● |  |  |  |  |  |  |
| Modifier une personne |  |  |  | ● | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  |  |  |  | ● |  |  |  |  |  |  |
| Fusionner des fiches en doublon |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

## Personnes recherchées

| Droit | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Voir les personnes recherchées |  |  | ● | ● | ● | ● | ● | ● | ● | ● | ● |  | ● | ● | ● | ● | ● | ● |  |  |  |  | ● | ● | ● | ● |  |  |  |
| Créer un avis de recherche |  |  |  | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Approuver / annuler un avis (sensible) |  |  | ◆ | ◆ | ◆ | ◆ |  |  |  |  |  |  |  |  |  |  |  | ◆ |  |  |  |  |  |  |  |  |  |  |  |
| Vérifier un avis (quatre yeux) |  |  | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  | ● |  |  |  |  |  |  |  |  |  |  |  |
| Modifier un avis |  |  |  | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Changer le statut d'un avis |  |  |  | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Publier un avis sur le site public (sensible) |  |  | ◆ | ◆ | ◆ | ◆ |  |  |  |  |  |  |  |  |  |  |  | ◆ |  |  |  |  |  |  |  |  |  |  |  |
| Exporter l'avis public (sensible) |  |  | ◆ | ◆ | ◆ | ◆ |  |  |  |  |  |  |  |  |  |  |  | ◆ |  |  |  |  |  |  |  |  |  |  |  |

## Biométrie

| Droit | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Contrôle d'identité biométrique (simulation) |  |  |  |  |  |  | ● |  |  |  |  |  |  |  | ● | ● |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Recherche par empreinte |  |  |  |  |  |  | ● |  |  |  |  |  |  |  | ● | ● |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Recherche par visage |  |  |  |  |  |  | ● |  |  |  |  |  |  |  | ● |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Recherche par voix |  |  |  |  |  |  | ● |  |  |  |  |  |  |  | ● |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Recherche par plaque (ANPR) |  |  |  |  |  |  | ● |  | ● |  |  |  |  |  | ● |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Enrôler des gabarits biométriques |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | ● |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Voir l'historique des recherches biométriques |  |  | ● | ● | ● | ● | ● |  | ● |  |  |  | ● | ● | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  |
| Enregistrer la vérification humaine d'une correspondance |  |  |  |  |  |  | ● |  |  |  |  |  |  |  | ● |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

## Dépôts du site public

| Droit | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Voir les dépôts du site public |  |  | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  | ● |  |  |  |  |  |  |  |  |  |  |  |
| Traiter les dépôts du site public |  |  | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  | ● |  |  |  |  |  |  |  |  |  |  |  |

## Site public

| Droit | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Gérer le contenu du site public |  |  | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  | ● |  |  |  |  |  |  |  |  |  |  |  |

## Alertes nationales

| Droit | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Recevoir et lire les alertes de son unité |  |  | ● | ● | ● | ● | ● | ● | ● | ● | ● |  | ● | ● | ● | ● | ● | ● |  |  |  |  | ● | ● | ● | ● |  |  |  |
| Acquitter une alerte pour l'unité |  |  | ● | ● | ● | ● | ● | ● | ● | ● | ● |  | ● | ● | ● | ● | ● | ● |  |  |  |  | ● | ● | ● | ● |  |  |  |
| Superviser la diffusion des alertes |  |  | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  | ● |  |  |  |  |  |  |  |  |  |  |  |
| Publier des alertes fictives (exercice) |  |  | ● |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

## Plaintes

| Droit | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Voir les plaintes |  |  | ● | ● | ● | ● | ● | ● | ● | ● | ● |  | ● | ● | ● | ● | ● | ● |  |  |  |  | ● |  |  |  |  |  |  |
| Enregistrer une plainte |  |  |  | ● | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Modifier une plainte |  |  |  | ● | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Examiner une plainte |  |  | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  | ● |  |  |  |  |  |  |  |  |  |  |  |
| Affecter une plainte |  |  | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  | ● |  |  |  |  |  |  |  |  |  |  |  |
| Convertir une plainte en affaire |  |  | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  | ● |  |  |  |  |  |  |  |  |  |  |  |
| Clôturer ou rejeter une plainte |  |  | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  | ● |  |  |  |  |  |  |  |  |  |  |  |

## Affaires

| Droit | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Voir les affaires |  |  | ● | ● | ● | ● | ● | ● | ● | ● | ● |  | ● | ● | ● | ● | ● | ● |  |  |  |  | ● |  |  |  |  |  |  |
| Voir les affaires sensibles (sensible) |  |  | ◆ | ◆ | ◆ | ◆ |  |  |  |  |  |  | ◆ | ◆ |  |  | ◆ | ◆ |  |  |  |  |  |  |  |  |  |  |  |
| Ouvrir une affaire |  |  |  | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Modifier une affaire |  |  |  | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Affecter une affaire |  |  | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  | ● |  |  |  |  |  |  |  |  |  |  |  |
| Transmettre ou clôturer une affaire |  |  | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  | ● |  |  |  |  |  |  |  |  |  |  |  |
| Archiver une affaire |  |  | ● | ● |  |  |  |  |  |  |  |  |  |  |  |  |  | ● |  |  |  |  |  |  |  |  |  |  |  |

## Enquêtes

| Droit | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Voir les enquêtes et tâches |  |  | ● | ● | ● | ● | ● | ● | ● | ● | ● |  | ● | ● | ● | ● | ● | ● |  |  |  |  | ● |  |  |  |  |  |  |
| Gérer les enquêtes |  |  |  | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Contrôler les enquêtes |  |  | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  | ● |  |  |  |  |  |  |  |  |  |  |  |

## Déclarations

| Droit | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Voir les déclarations |  |  | ● | ● | ● | ● | ● | ● | ● | ● | ● |  | ● | ● | ● | ● | ● | ● |  |  |  |  | ● |  |  |  |  |  |  |
| Créer une déclaration |  |  |  | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Finaliser une déclaration |  |  |  | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

## Auditions

| Droit | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Voir les auditions |  |  | ● | ● | ● | ● | ● | ● | ● | ● | ● |  | ● | ● | ● | ● | ● | ● |  |  |  |  | ● |  |  |  |  |  |  |
| Gérer les auditions |  |  |  | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

## Transcriptions

| Droit | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Voir les transcriptions |  |  | ● | ● | ● | ● | ● | ● | ● | ● | ● |  | ● | ● | ● | ● | ● | ● |  |  |  |  | ● |  |  |  |  |  |  |
| Relire une transcription |  |  |  | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Approuver une transcription |  |  | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  | ● |  |  |  |  |  |  |  |  |  |  |  |

## Preuves

| Droit | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Voir les preuves |  |  | ● | ● | ● | ● | ● | ● | ● | ● | ● |  | ● | ● | ● | ● | ● | ● |  |  |  |  | ● |  |  |  |  |  |  |
| Enregistrer une preuve |  |  |  | ● | ● | ● | ● |  |  | ● |  |  |  |  |  | ● |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Modifier une preuve |  |  |  | ● | ● | ● | ● |  |  | ● |  |  |  |  |  | ● |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Transférer la garde d'une preuve |  |  |  | ● | ● | ● | ● |  |  | ● |  |  |  |  |  | ● |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Restituer / détruire une preuve |  |  |  |  |  |  |  |  |  | ● |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Gérer les lieux de stockage |  |  |  |  | ● | ● |  |  |  | ● |  |  |  |  |  | ● |  |  |  |  |  |  |  |  |  |  |  |  |  |

## Mandats

| Droit | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Voir les mandats |  |  | ● | ● | ● | ● | ● | ● | ● | ● | ● |  | ● | ● | ● | ● | ● | ● |  |  |  |  | ● |  |  |  |  |  |  |
| Demander un mandat |  |  |  | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Approuver ou rejeter un mandat (sensible) |  |  | ◆ | ◆ | ◆ | ◆ |  |  |  |  |  |  |  |  |  |  |  | ◆ |  |  |  |  |  |  |  |  |  |  |  |
| Marquer un mandat exécuté |  |  |  | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Annuler un mandat |  |  | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  | ● |  |  |  |  |  |  |  |  |  |  |  |

## Arrestations

| Droit | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Voir les arrestations |  |  | ● | ● | ● | ● | ● | ● | ● | ● | ● |  | ● | ● | ● | ● | ● | ● |  |  |  |  | ● |  |  |  |  |  |  |
| Enregistrer une arrestation |  |  |  | ● | ● | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Changer le statut d'une arrestation |  |  |  | ● | ● | ● | ● |  |  |  | ● |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

## Gardes à vue

| Droit | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Voir les gardes à vue |  |  | ● | ● | ● | ● | ● | ● | ● | ● | ● |  | ● | ● | ● | ● | ● | ● |  |  |  |  | ● |  |  |  |  |  |  |
| Ouvrir, surveiller et clore une garde à vue |  |  | ● | ● | ● | ● |  |  |  |  | ● |  |  |  |  |  |  | ● |  |  |  |  |  |  |  |  |  |  |  |
| Prolonger une garde à vue (sensible) |  |  | ◆ | ◆ | ◆ | ◆ |  |  |  |  |  |  |  |  |  |  |  | ◆ |  |  |  |  |  |  |  |  |  |  |  |

## Patrouilles

| Droit | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Voir les patrouilles |  |  | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● |  |  |  |  | ● | ● |  |  |  |  |  |
| Planifier et gérer les patrouilles |  |  | ● | ● | ● | ● |  |  | ● |  |  |  |  |  |  |  |  | ● |  |  |  |  |  |  |  |  |  |  |  |

## Incidents

| Droit | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Voir les incidents |  |  | ● | ● | ● | ● | ● | ● | ● | ● | ● |  | ● | ● | ● | ● | ● | ● |  |  |  |  | ● | ● |  |  |  |  |  |
| Signaler un incident |  |  |  | ● | ● | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Modifier un incident |  |  |  | ● | ● | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

## Opérations

| Droit | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Voir les opérations |  |  | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● |  |  |  |  | ● |  |  |  |  |  |  |
| Planifier les opérations |  |  | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  | ● |  |  |  |  |  |  |  |  |  |  |  |
| Approuver les opérations |  |  | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  | ● |  |  |  |  |  |  |  |  |  |  |  |

## Véhicules de service

| Droit | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Voir les véhicules de service |  |  | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● |  |  |  |  | ● |  |  |  |  |  |  |
| Gérer les véhicules de service |  |  |  |  | ● | ● |  |  |  |  |  | ● |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

## Maintenance

| Droit | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Voir la maintenance |  |  | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● |  |  |  |  | ● |  |  |  |  |  |  |
| Gérer la maintenance |  |  |  |  | ● | ● |  |  |  |  |  | ● |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

## Documents

| Droit | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Voir les documents |  |  | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● |  |  | ● | ● |  |  |  |  |  |  |
| Voir les documents confidentiels (sensible) |  |  | ◆ | ◆ | ◆ | ◆ |  |  |  |  |  |  | ◆ | ◆ |  |  | ◆ | ◆ |  |  |  |  |  |  |  |  |  |  |  |
| Déposer des documents |  |  |  | ● | ● | ● | ● | ● | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  | ● |  |  |  |  |  |  |
| Archiver des documents |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

## Rapports

| Droit | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Voir les rapports |  |  | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● |  |  |  | ● |  |  | ● | ● | ● |  |
| Produire des rapports |  |  |  | ● | ● | ● | ● |  |  | ● |  | ● | ● |  |  |  |  |  | ● |  |  |  |  |  |  |  |  |  |  |
| Exporter rapports et données (sensible) |  |  | ◆ | ◆ | ◆ | ◆ |  |  |  |  |  |  | ◆ |  |  |  |  | ◆ |  |  |  |  |  |  |  |  |  |  |  |

## Circulation

| Droit | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Voir contrôles, PV et amendes |  |  | ● | ● | ● | ● | ● | ● | ● |  |  |  | ● | ● |  |  | ● | ● |  |  |  |  | ● | ● | ● | ● | ● | ● | ● |
| Enregistrer un contrôle et émettre un PV |  |  |  | ● | ● | ● |  |  | ● |  |  |  |  |  |  |  |  | ● |  |  |  |  | ● | ● | ● |  |  |  |  |
| Joindre des preuves à un contrôle |  |  |  | ● | ● | ● |  |  | ● |  |  |  |  |  |  |  |  | ● |  |  |  |  | ● | ● | ● |  |  |  |  |
| Annuler un PV |  |  | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  | ● |  |  |  |  |  |  |  | ● |  |  |  |
| Gérer le statut des amendes |  |  | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  | ● |  |  |  |  |  |  |  | ● | ● |  |  |
| Enregistrer un paiement d'amende et délivrer le reçu |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | ● |  |  |  |  |  |  |  |  | ● |  |  |
| Annuler un paiement saisi par erreur |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | ● |  |  |  |  |  |  |  |  | ● |  |  |
| Voir les conducteurs |  |  | ● | ● | ● | ● | ● | ● | ● |  |  |  | ● | ● |  |  | ● | ● |  |  |  |  | ● | ● | ● | ● | ● | ● | ● |
| Gérer les conducteurs |  |  |  | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  | ● |  |  |  |  | ● | ● |  | ● |  |  |  |
| Voir les véhicules (circulation) |  |  | ● | ● | ● | ● | ● | ● | ● |  |  |  | ● | ● |  |  | ● | ● |  |  |  |  | ● | ● | ● | ● | ● | ● | ● |
| Gérer les véhicules (circulation) |  |  |  | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  | ● |  |  |  |  | ● | ● |  | ● |  |  |  |
| Voir le catalogue des infractions |  |  | ● | ● | ● | ● | ● | ● | ● |  |  |  | ● | ● |  |  | ● | ● |  |  |  |  | ● | ● | ● | ● | ● | ● | ● |
| Activer ou désactiver une infraction du catalogue |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | ● |  |  |  |  |  |  |  |  |  |  |  |
| Voir le tableau de bord circulation |  |  | ● | ● | ● | ● | ● | ● | ● |  |  |  | ● | ● |  |  | ● | ● |  |  |  |  | ● | ● | ● | ● | ● | ● | ● |
| Exporter listes et statistiques de circulation (sensible) |  |  | ◆ | ◆ | ◆ | ◆ |  |  |  |  |  |  | ◆ |  |  |  |  | ◆ |  |  |  |  |  |  |  | ◆ | ◆ |  |  |

## Caisses et recettes

| Droit | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Encaisser une amende sur le terrain |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | ● | ● | ● |  |  |  |  |
| Ouvrir, voir et clore sa propre caisse |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | ● | ● | ● |  |  |  |  |
| Voir caisses, recettes, versements et rapprochements |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | ● |  |  |  |  |  |  |  | ● | ● | ● |  |
| Vérifier la clôture d'une caisse |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | ● | ● |  |
| Déclarer un versement |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | ● | ● | ● |  | ● |  |  |
| Examiner un versement (accepter, rejeter, demander justification) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | ● | ● |  |
| Valider définitivement un versement |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | ● |  |  |
| Gérer les rapprochements et écarts |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | ● |  |  |
| Voir et exporter les rapports de recettes |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | ● |  |  |  |  |  |  |  | ● | ● | ● |  |
| Bloquer ou débloquer une caisse |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | ● |  |  |

## Export PDF

| Droit | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Exporter en PDF les listes et fiches (chefs de chaque niveau ; chaque export est journalisé) |  |  | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

## Ressources humaines

| Droit | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Voir les dossiers RH |  |  | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  | ● | ● | ● | ● | ● |  |  |  |  |  |  |  |
| Modifier le dossier RH d'un agent |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | ● |  |  | ● |  |  |  |  |  |  |  |
| Enregistrer une décision de carrière |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | ● |  |  |  |  |  |  |  |  |  |  |
| Proposer une mutation |  |  | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  | ● | ● |  |  | ● |  |  |  |  |  |  |  |
| Examiner les mutations (RH) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | ● |  |  | ● |  |  |  |  |  |  |  |
| Valider une mutation (autorité compétente) |  |  | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Paramétrer l'affectation automatique |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | ● |  |  |  |  |  |  |  |  |  |  |  |
| Enregistrer l'appel quotidien |  |  | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  | ● | ● |  |  | ● |  |  |  |  |  |  |  |
| Déposer une demande de congé |  |  | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  | ● | ● |  |  | ● |  |  |  |  |  |  |  |
| Approuver ou rejeter un congé |  |  | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  | ● | ● |  |  |  |  |  |  |  |  |  |  |
| Gérer les formations et attestations |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | ● |  |  | ● |  |  |  |  |  |  |  |
| Voir les dossiers disciplinaires (sensible) |  |  | ◆ | ◆ |  |  |  |  |  |  |  |  |  |  |  |  |  |  | ◆ |  |  |  |  |  |  |  |  |  |  |
| Instruire un dossier disciplinaire (sensible) |  |  | ◆ | ◆ |  |  |  |  |  |  |  |  |  |  |  |  |  |  | ◆ |  |  |  |  |  |  |  |  |  |  |
| Décider d'une sanction (sensible) |  |  | ◆ | ◆ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Éditer des documents RH |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | ● |  |  | ● |  |  |  |  |  |  |  |
| Voir la paie (sensible) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | ◆ | ◆ |  |  |  |  |  |  |  |  |
| Demander des éléments de paie (sensible) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | ◆ |  |  |  |  |  |  |  |  |  |
| Valider la paie (sensible) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | ◆ |  |  |  |  |  |  |  |  |
| Exporter la paie (sensible) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | ◆ |  |  |  |  |  |  |  |  |

## Approbations

| Droit | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Voir les demandes d'approbation | ● | ● | ● | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |  | ● |  |  |  |  |  |  |  |  |  |  |  |
| Décider d'une demande d'approbation (sensible) |  |  | ◆ | ◆ | ◆ | ◆ |  |  |  |  |  |  |  |  |  |  |  | ◆ |  |  |  |  |  |  |  |  |  |  |  |

## Clés d'accès (API)

| Droit | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Gérer ses propres clés d'accès | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● |

