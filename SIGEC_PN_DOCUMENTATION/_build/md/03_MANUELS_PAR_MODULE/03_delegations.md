# Module 3 — Gestion des délégations provinciales

**Manuel de gestion — Gestion des délégations provinciales**

| Rubrique | Valeur |
|---|---|
| Système | SIGEC-PN / SIGPN-T — Système d'information de gestion de la Police nationale du Tchad |
| Éditeur et développeur | TECHNOTCHAD |
| Version du document | 1.0 — 10 novembre 2026 |
| Statut | Projet pour validation par la hiérarchie : les points marqués « À confirmer » ne sont pas des décisions |
| Source des informations | Lecture seule du système existant (code, catalogue des rôles et droits, écrans) — aucune donnée, aucun compte, aucun rôle, aucune permission n'a été modifié |

**Disponibilité dans le système : Partiellement disponible.**  Écran : `/admin/organization`

## Objectif

Rattacher chaque commissariat à sa province et disposer d'un délégué provincial qui supervise tous les commissariats de sa province.

## Utilisateurs concernés

| Profil | Niveau d'accès | Droits du module |
|---|---|---|
| Administrateur technique | Consultation et opérations | 2 |
| Administrateur de sécurité | Consultation seule | 1 |
| Commandement national (Direction générale) | Consultation seule | 1 |
| Délégué provincial de police | Consultation et opérations | 2 |
| Commandant de département (rôle dormant) | Consultation seule | 1 |
| Commissaire (chef de commissariat) | Consultation seule | 1 |
| Enquêteur | Consultation seule | 1 |
| Agent d'accueil / de permanence | Consultation seule | 1 |
| Agent de patrouille | Consultation seule | 1 |
| Responsable des scellés et pièces à conviction | Consultation seule | 1 |
| Agent de garde à vue | Consultation seule | 1 |
| Gestionnaire du parc de véhicules | Consultation seule | 1 |
| Analyste criminel | Consultation seule | 1 |
| Auditeur | Consultation seule | 1 |
| Agent biométrie | Consultation seule | 1 |
| Agent de police technique et scientifique | Consultation seule | 1 |
| Magistrat du parquet (consultation) | Consultation seule | 1 |
| Administrateur de la police (système d'information) | Consultation et opérations | 2 |
| Directeur des ressources humaines | Consultation seule | 1 |
| Gestionnaire de paie | Consultation seule | 1 |
| Contrôleur de paie | Consultation seule | 1 |
| Agent du service des ressources humaines | Consultation seule | 1 |
| Officier de police (désigné OPJ dans le système) | Consultation seule | 1 |
| Agent de circulation | Consultation seule | 1 |
| Agent de contrôle routier | Consultation seule | 1 |
| Superviseur circulation | Consultation seule | 1 |
| Responsable financier / paiements | Consultation seule | 1 |
| Chef d'unité (recettes) | Consultation seule | 1 |
| Consultation circulation | Consultation seule | 1 |

## Fonctionnalités

- 23 provinces au référentiel ; chaque province a un compte de délégué provincial (rôle « Délégué provincial de police », périmètre provincial).
- L'écran Organisation affiche la colonne « Délégué provincial » et alerte si une province n'en a pas.
- Le délégué voit toutes les données de sa province (plaintes, affaires, mandats, arrestations, agents, etc.) et aucune autre.

## Étapes d'utilisation

1. Administration > Organisation : consulter la couverture par province.
2. Le compte du délégué est créé comme tout compte (module 1), avec le rôle Délégué provincial et la province.

## Résultats

Une supervision provinciale à périmètre strict, prouvée par test automatique (le délégué ne voit pas les autres provinces).

## Droits du module

| Droit (code) | Opération | Sensible | Profils qui le détiennent |
|---|---|---|---|
| `org:view` | Voir l'organisation |  | 29 profils |
| `org:manage` | Gérer la structure organisationnelle |  | Administrateur technique, Délégué provincial de police, Administrateur de la police (système d'information) |

## Écrans

![Couverture par province](../07_ANNEXES/captures/prov-1-organization.png)

## À confirmer auprès de la hiérarchie

- Il n'existe pas de module « Délégations provinciales » à part : c'est l'écran Organisation et le rôle Délégué provincial qui en tiennent lieu.
- La nomination du délégué est faite par décret (art. 94) : le système ne gère que son compte.

## Améliorations recommandées

- Aucune relevée.

## Se déconnecter en sécurité

1. Cliquer sur le bouton **Déconnexion** en haut à droite de l'en-tête.
2. Ne pas se contenter de fermer l'onglet, surtout sur un poste partagé.
3. La session se ferme d'elle-même après **60 minutes d'inactivité** (15 minutes pour les comptes qui détiennent un droit sensible) et au plus tard après **10 heures**.

