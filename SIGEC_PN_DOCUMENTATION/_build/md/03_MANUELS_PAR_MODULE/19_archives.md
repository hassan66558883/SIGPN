# Module 19 — Gestion des archives

**Manuel de gestion — Gestion des archives**

| Rubrique | Valeur |
|---|---|
| Système | SIGEC-PN / SIGPN-T — Système d'information de gestion de la Police nationale du Tchad |
| Éditeur et développeur | TECHNOTCHAD |
| Version du document | 1.0 — 10 novembre 2026 |
| Statut | Projet pour validation par la hiérarchie : les points marqués « À confirmer » ne sont pas des décisions |
| Source des informations | Lecture seule du système existant (code, catalogue des rôles et droits, écrans) — aucune donnée, aucun compte, aucun rôle, aucune permission n'a été modifié |

**Disponibilité dans le système : Partiellement disponible.**  Écran : `/cases (statut Archivée)`

## Objectif

Une affaire clôturée peut être archivée (droit distinct). Le module Documents est prévu mais non construit.

## Utilisateurs concernés

| Profil | Niveau d'accès | Droits du module |
|---|---|---|
| Commandement national (Direction générale) | Consultation et opérations | 7 |
| Délégué provincial de police | Consultation et opérations | 10 |
| Commandant de département (rôle dormant) | Consultation et opérations | 9 |
| Commissaire (chef de commissariat) | Consultation et opérations | 9 |
| Enquêteur | Consultation et opérations | 5 |
| Agent d'accueil / de permanence | Consultation et opérations | 3 |
| Agent de patrouille | Consultation et opérations | 3 |
| Responsable des scellés et pièces à conviction | Consultation et opérations | 3 |
| Agent de garde à vue | Consultation et opérations | 3 |
| Gestionnaire du parc de véhicules | Consultation et opérations | 2 |
| Analyste criminel | Consultation et opérations | 4 |
| Auditeur | Consultation et opérations | 4 |
| Agent biométrie | Consultation seule | 2 |
| Agent de police technique et scientifique | Consultation seule | 2 |
| Magistrat du parquet (consultation) | Consultation et opérations | 4 |
| Administrateur de la police (système d'information) | Consultation et opérations | 7 |
| Directeur des ressources humaines | Consultation seule | 1 |
| Agent du service des ressources humaines | Consultation seule | 1 |
| Officier de police (désigné OPJ dans le système) | Consultation et opérations | 3 |

## Fonctionnalités

- Statut Archivée (lecture seule).
- Documents RH (module Ressources humaines).
- Droits documents (voir, confidentiel, déposer, archiver) existent sans écran.

## Étapes d'utilisation

1. Affaire clôturée > Archiver.

## Résultats

Affaire en lecture seule.

## Droits du module

| Droit (code) | Opération | Sensible | Profils qui le détiennent |
|---|---|---|---|
| `cases:view` | Voir les affaires |  | 16 profils |
| `cases:view_sensitive` | Voir les affaires sensibles (sensible) | Oui | 8 profils |
| `cases:create` | Ouvrir une affaire |  | Délégué provincial de police, Commandant de département (rôle dormant), Commissaire (chef de commissariat), Enquêteur |
| `cases:update` | Modifier une affaire |  | Délégué provincial de police, Commandant de département (rôle dormant), Commissaire (chef de commissariat), Enquêteur |
| `cases:assign` | Affecter une affaire |  | Commandement national (Direction générale), Délégué provincial de police, Commandant de département (rôle dormant), Commissaire (chef de commissariat), Administrateur de la police (système d'information) |
| `cases:close` | Transmettre ou clôturer une affaire |  | Commandement national (Direction générale), Délégué provincial de police, Commandant de département (rôle dormant), Commissaire (chef de commissariat), Administrateur de la police (système d'information) |
| `cases:archive` | Archiver une affaire |  | Commandement national (Direction générale), Délégué provincial de police, Administrateur de la police (système d'information) |
| `documents:view` | Voir les documents |  | 19 profils |
| `documents:view_confidential` | Voir les documents confidentiels (sensible) | Oui | 8 profils |
| `documents:upload` | Déposer des documents |  | 10 profils |
| `documents:archive` | Archiver des documents |  |  |

## À confirmer auprès de la hiérarchie

- Durées de conservation et règles d'archivage.

## Améliorations recommandées

- Module Documents/Archives non construit.

## Se déconnecter en sécurité

1. Cliquer sur le bouton **Déconnexion** en haut à droite de l'en-tête.
2. Ne pas se contenter de fermer l'onglet, surtout sur un poste partagé.
3. La session se ferme d'elle-même après **60 minutes d'inactivité** (15 minutes pour les comptes qui détiennent un droit sensible) et au plus tard après **10 heures**.

