# Module 20 — Gestion des tableaux de bord

**Manuel de gestion — Gestion des tableaux de bord**

| Rubrique | Valeur |
|---|---|
| Système | SIGEC-PN / SIGPN-T — Système d'information de gestion de la Police nationale du Tchad |
| Éditeur et développeur | TECHNOTCHAD |
| Version du document | 1.0 — 10 novembre 2026 |
| Statut | Projet pour validation par la hiérarchie : les points marqués « À confirmer » ne sont pas des décisions |
| Source des informations | Lecture seule du système existant (code, catalogue des rôles et droits, écrans) — aucune donnée, aucun compte, aucun rôle, aucune permission n'a été modifié |

**Disponibilité dans le système : Disponible.**  Écran : `/dashboard`

## Objectif

Présenter à chaque profil les chiffres de son périmètre : national, province, commissariat.

## Utilisateurs concernés

| Profil | Niveau d'accès | Droits du module |
|---|---|---|
| Administrateur technique | Consultation seule | 1 |
| Administrateur de sécurité | Consultation seule | 1 |
| Commandement national (Direction générale) | Consultation et opérations | 13 |
| Délégué provincial de police | Consultation et opérations | 16 |
| Commandant de département (rôle dormant) | Consultation et opérations | 16 |
| Commissaire (chef de commissariat) | Consultation et opérations | 16 |
| Enquêteur | Consultation et opérations | 8 |
| Agent d'accueil / de permanence | Consultation et opérations | 8 |
| Agent de patrouille | Consultation et opérations | 10 |
| Responsable des scellés et pièces à conviction | Consultation et opérations | 3 |
| Agent de garde à vue | Consultation et opérations | 3 |
| Gestionnaire du parc de véhicules | Consultation seule | 1 |
| Analyste criminel | Consultation et opérations | 9 |
| Auditeur | Consultation et opérations | 8 |
| Agent biométrie | Consultation et opérations | 3 |
| Agent de police technique et scientifique | Consultation et opérations | 3 |
| Magistrat du parquet (consultation) | Consultation et opérations | 8 |
| Administrateur de la police (système d'information) | Consultation et opérations | 19 |
| Directeur des ressources humaines | Consultation seule | 1 |
| Gestionnaire de paie | Consultation seule | 1 |
| Contrôleur de paie | Consultation seule | 1 |
| Agent du service des ressources humaines | Consultation seule | 1 |
| Officier de police (désigné OPJ dans le système) | Consultation et opérations | 12 |
| Agent de circulation | Consultation et opérations | 12 |
| Agent de contrôle routier | Consultation et opérations | 10 |
| Superviseur circulation | Consultation et opérations | 13 |
| Responsable financier / paiements | Consultation et opérations | 10 |
| Chef d'unité (recettes) | Consultation et opérations | 6 |
| Consultation circulation | Consultation et opérations | 6 |

## Fonctionnalités

- Cartes de chiffres : agents, unités, incidents, affaires ouvertes, plaintes de la période, avis actifs.
- Graphiques : incidents par type, tendance.
- Listes : incidents récents, avis récents.
- Filtre de province pour le national.

## Étapes d'utilisation

1. Ouvrir Tableau de bord.

## Résultats

Vue d'ensemble adaptée au profil.

## Droits du module

| Droit (code) | Opération | Sensible | Profils qui le détiennent |
|---|---|---|---|
| `dashboard:view` | Voir le tableau de bord |  | 29 profils |
| `alerts:view` | Recevoir et lire les alertes de son unité |  | 19 profils |
| `alerts:ack` | Acquitter une alerte pour l'unité |  | 19 profils |
| `alerts:supervise` | Superviser la diffusion des alertes |  | Commandement national (Direction générale), Délégué provincial de police, Commandant de département (rôle dormant), Commissaire (chef de commissariat), Administrateur de la police (système d'information) |
| `alerts:simulate` | Publier des alertes fictives (exercice) |  | Commandement national (Direction générale) |
| `traffic:view` | Voir contrôles, PV et amendes |  | 18 profils |
| `traffic:control_create` | Enregistrer un contrôle et émettre un PV |  | 8 profils |
| `traffic:evidence_upload` | Joindre des preuves à un contrôle |  | 8 profils |
| `traffic:ticket_cancel` | Annuler un PV |  | 6 profils |
| `traffic:fine_manage` | Gérer le statut des amendes |  | 7 profils |
| `traffic:payment_record` | Enregistrer un paiement d'amende et délivrer le reçu |  | Administrateur de la police (système d'information), Responsable financier / paiements |
| `traffic:payment_void` | Annuler un paiement saisi par erreur |  | Administrateur de la police (système d'information), Responsable financier / paiements |
| `traffic:drivers_view` | Voir les conducteurs |  | 18 profils |
| `traffic:drivers_manage` | Gérer les conducteurs |  | 7 profils |
| `traffic:vehicles_view` | Voir les véhicules (circulation) |  | 18 profils |
| `traffic:vehicles_manage` | Gérer les véhicules (circulation) |  | 7 profils |
| `traffic:violations_view` | Voir le catalogue des infractions |  | 18 profils |
| `traffic:catalog_manage` | Activer ou désactiver une infraction du catalogue |  | Administrateur de la police (système d'information) |
| `traffic:dashboard` | Voir le tableau de bord circulation |  | 18 profils |
| `traffic:export` | Exporter listes et statistiques de circulation (sensible) | Oui | 8 profils |

## Écrans

![Tableau de bord](../07_ANNEXES/captures/theme-dashboard.png)

![Sur téléphone](../07_ANNEXES/captures/theme-phone-dashboard.png)

## À confirmer auprès de la hiérarchie

- —

## Améliorations recommandées

- Aucune relevée.

## Se déconnecter en sécurité

1. Cliquer sur le bouton **Déconnexion** en haut à droite de l'en-tête.
2. Ne pas se contenter de fermer l'onglet, surtout sur un poste partagé.
3. La session se ferme d'elle-même après **60 minutes d'inactivité** (15 minutes pour les comptes qui détiennent un droit sensible) et au plus tard après **10 heures**.

