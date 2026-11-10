# Module 13 — Gestion des procès-verbaux

**Manuel de gestion — Gestion des procès-verbaux**

| Rubrique | Valeur |
|---|---|
| Système | SIGEC-PN / SIGPN-T — Système d'information de gestion de la Police nationale du Tchad |
| Éditeur et développeur | TECHNOTCHAD |
| Version du document | 1.0 — 10 novembre 2026 |
| Statut | Projet pour validation par la hiérarchie : les points marqués « À confirmer » ne sont pas des décisions |
| Source des informations | Lecture seule du système existant (code, catalogue des rôles et droits, écrans) — aucune donnée, aucun compte, aucun rôle, aucune permission n'a été modifié |

**Disponibilité dans le système : Non construit.**  Écran : `(prévu : /statements, /interviews)`

> Ce module n'est **pas construit** dans le SIGPN-T actuel. Ce document le dit clairement et décrit ce qui existe de plus proche, sans rien inventer.

## Objectif

**Non construit** pour l'enquête : déclarations, auditions et transcriptions sont prévues (droits et modèle de données existent) mais leurs écrans n'existent pas. Le « PV » existant concerne les contraventions routières.

## Utilisateurs concernés

| Profil | Niveau d'accès | Droits du module |
|---|---|---|
| Commandement national (Direction générale) | Consultation et opérations | 4 |
| Délégué provincial de police | Consultation et opérations | 8 |
| Commandant de département (rôle dormant) | Consultation et opérations | 8 |
| Commissaire (chef de commissariat) | Consultation et opérations | 8 |
| Enquêteur | Consultation et opérations | 7 |
| Agent d'accueil / de permanence | Consultation seule | 3 |
| Agent de patrouille | Consultation seule | 3 |
| Responsable des scellés et pièces à conviction | Consultation seule | 3 |
| Agent de garde à vue | Consultation seule | 3 |
| Analyste criminel | Consultation seule | 3 |
| Auditeur | Consultation seule | 3 |
| Agent biométrie | Consultation seule | 3 |
| Agent de police technique et scientifique | Consultation seule | 3 |
| Magistrat du parquet (consultation) | Consultation seule | 3 |
| Administrateur de la police (système d'information) | Consultation et opérations | 4 |
| Officier de police (désigné OPJ dans le système) | Consultation seule | 3 |

## Fonctionnalités

- PV routier : voir module 7.
- Les constats d'enquête se consignent aujourd'hui en notes d'affaire.

## Étapes d'utilisation

1. —

## Résultats

—

## Droits du module

| Droit (code) | Opération | Sensible | Profils qui le détiennent |
|---|---|---|---|
| `statements:view` | Voir les déclarations |  | 16 profils |
| `statements:create` | Créer une déclaration |  | Délégué provincial de police, Commandant de département (rôle dormant), Commissaire (chef de commissariat), Enquêteur |
| `statements:finalize` | Finaliser une déclaration |  | Délégué provincial de police, Commandant de département (rôle dormant), Commissaire (chef de commissariat), Enquêteur |
| `interviews:view` | Voir les auditions |  | 16 profils |
| `interviews:manage` | Gérer les auditions |  | Délégué provincial de police, Commandant de département (rôle dormant), Commissaire (chef de commissariat), Enquêteur |
| `transcripts:view` | Voir les transcriptions |  | 16 profils |
| `transcripts:review` | Relire une transcription |  | Délégué provincial de police, Commandant de département (rôle dormant), Commissaire (chef de commissariat), Enquêteur |
| `transcripts:approve` | Approuver une transcription |  | Commandement national (Direction générale), Délégué provincial de police, Commandant de département (rôle dormant), Commissaire (chef de commissariat), Administrateur de la police (système d'information) |

## À confirmer auprès de la hiérarchie

- Forme réglementaire du procès-verbal d'enquête (modèle, signatures, visa).

## Améliorations recommandées

- Module à construire sur confirmation de la hiérarchie.

## Se déconnecter en sécurité

1. Cliquer sur le bouton **Déconnexion** en haut à droite de l'en-tête.
2. Ne pas se contenter de fermer l'onglet, surtout sur un poste partagé.
3. La session se ferme d'elle-même après **60 minutes d'inactivité** (15 minutes pour les comptes qui détiennent un droit sensible) et au plus tard après **10 heures**.

