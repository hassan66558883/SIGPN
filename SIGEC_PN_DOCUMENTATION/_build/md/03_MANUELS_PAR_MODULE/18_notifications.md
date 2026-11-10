# Module 18 — Gestion des notifications

**Manuel de gestion — Gestion des notifications**

| Rubrique | Valeur |
|---|---|
| Système | SIGEC-PN / SIGPN-T — Système d'information de gestion de la Police nationale du Tchad |
| Éditeur et développeur | TECHNOTCHAD |
| Version du document | 1.0 — 10 novembre 2026 |
| Statut | Projet pour validation par la hiérarchie : les points marqués « À confirmer » ne sont pas des décisions |
| Source des informations | Lecture seule du système existant (code, catalogue des rôles et droits, écrans) — aucune donnée, aucun compte, aucun rôle, aucune permission n'a été modifié |

**Disponibilité dans le système : Disponible.**  Écran : `/notifications`

## Objectif

Informer chaque utilisateur des tâches qui l'attendent : affectations, validations, alertes, sécurité.

## Utilisateurs concernés

| Profil | Niveau d'accès | Droits du module |
|---|---|---|
| Commandement national (Direction générale) | Consultation et opérations | 4 |
| Délégué provincial de police | Consultation et opérations | 3 |
| Commandant de département (rôle dormant) | Consultation et opérations | 3 |
| Commissaire (chef de commissariat) | Consultation et opérations | 3 |
| Enquêteur | Consultation et opérations | 2 |
| Agent d'accueil / de permanence | Consultation et opérations | 2 |
| Agent de patrouille | Consultation et opérations | 2 |
| Responsable des scellés et pièces à conviction | Consultation et opérations | 2 |
| Agent de garde à vue | Consultation et opérations | 2 |
| Analyste criminel | Consultation et opérations | 2 |
| Auditeur | Consultation et opérations | 2 |
| Agent biométrie | Consultation et opérations | 2 |
| Agent de police technique et scientifique | Consultation et opérations | 2 |
| Magistrat du parquet (consultation) | Consultation et opérations | 2 |
| Administrateur de la police (système d'information) | Consultation et opérations | 3 |
| Officier de police (désigné OPJ dans le système) | Consultation et opérations | 2 |
| Agent de circulation | Consultation et opérations | 2 |
| Agent de contrôle routier | Consultation et opérations | 2 |
| Superviseur circulation | Consultation et opérations | 2 |

## Fonctionnalités

- Cloche et page Notifications avec types : Information, Affectation, Échéance, Approbation, Alerte, Sécurité.
- Lecture / marquage comme lu.
- Alertes nationales avec bandeau rouge.

## Étapes d'utilisation

1. Ouvrir la cloche.
2. Cliquer la notification pour aller à l'élément.

## Résultats

Liste des notifications reçues.

## Droits du module

| Droit (code) | Opération | Sensible | Profils qui le détiennent |
|---|---|---|---|
| `alerts:view` | Recevoir et lire les alertes de son unité |  | 19 profils |
| `alerts:ack` | Acquitter une alerte pour l'unité |  | 19 profils |
| `alerts:supervise` | Superviser la diffusion des alertes |  | Commandement national (Direction générale), Délégué provincial de police, Commandant de département (rôle dormant), Commissaire (chef de commissariat), Administrateur de la police (système d'information) |
| `alerts:simulate` | Publier des alertes fictives (exercice) |  | Commandement national (Direction générale) |

## À confirmer auprès de la hiérarchie

- Aucune notification par SMS ou courriel.

## Améliorations recommandées

- Pas d'envoi hors application.

## Se déconnecter en sécurité

1. Cliquer sur le bouton **Déconnexion** en haut à droite de l'en-tête.
2. Ne pas se contenter de fermer l'onglet, surtout sur un poste partagé.
3. La session se ferme d'elle-même après **60 minutes d'inactivité** (15 minutes pour les comptes qui détiennent un droit sensible) et au plus tard après **10 heures**.

