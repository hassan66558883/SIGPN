# Module 17 — Gestion des statistiques

**Manuel de gestion — Gestion des statistiques**

| Rubrique | Valeur |
|---|---|
| Système | SIGEC-PN / SIGPN-T — Système d'information de gestion de la Police nationale du Tchad |
| Éditeur et développeur | TECHNOTCHAD |
| Version du document | 1.0 — 10 novembre 2026 |
| Statut | Projet pour validation par la hiérarchie : les points marqués « À confirmer » ne sont pas des décisions |
| Source des informations | Lecture seule du système existant (code, catalogue des rôles et droits, écrans) — aucune donnée, aucun compte, aucun rôle, aucune permission n'a été modifié |

**Disponibilité dans le système : Partiellement disponible.**  Écran : `/dashboard`

## Objectif

Chiffres du tableau de bord (agents, unités, incidents, affaires, plaintes, avis), statistiques de circulation et de recettes. La page « Statistiques » est prévue mais non construite.

## Utilisateurs concernés

| Profil | Niveau d'accès | Droits du module |
|---|---|---|
| Administrateur technique | Consultation seule | 1 |
| Administrateur de sécurité | Consultation seule | 1 |
| Commandement national (Direction générale) | Consultation et opérations | 10 |
| Délégué provincial de police | Consultation et opérations | 14 |
| Commandant de département (rôle dormant) | Consultation et opérations | 14 |
| Commissaire (chef de commissariat) | Consultation et opérations | 14 |
| Enquêteur | Consultation et opérations | 6 |
| Agent d'accueil / de permanence | Consultation et opérations | 6 |
| Agent de patrouille | Consultation et opérations | 8 |
| Responsable des scellés et pièces à conviction | Consultation seule | 1 |
| Agent de garde à vue | Consultation seule | 1 |
| Gestionnaire du parc de véhicules | Consultation seule | 1 |
| Analyste criminel | Consultation et opérations | 8 |
| Auditeur | Consultation et opérations | 7 |
| Agent biométrie | Consultation seule | 1 |
| Agent de police technique et scientifique | Consultation seule | 1 |
| Magistrat du parquet (consultation) | Consultation et opérations | 7 |
| Administrateur de la police (système d'information) | Consultation et opérations | 17 |
| Directeur des ressources humaines | Consultation seule | 2 |
| Gestionnaire de paie | Consultation seule | 1 |
| Contrôleur de paie | Consultation seule | 1 |
| Agent du service des ressources humaines | Consultation seule | 2 |
| Officier de police (désigné OPJ dans le système) | Consultation et opérations | 10 |
| Agent de circulation | Consultation et opérations | 10 |
| Agent de contrôle routier | Consultation et opérations | 8 |
| Superviseur circulation | Consultation et opérations | 12 |
| Responsable financier / paiements | Consultation et opérations | 10 |
| Chef d'unité (recettes) | Consultation et opérations | 7 |
| Consultation circulation | Consultation et opérations | 6 |

## Fonctionnalités

- Tableau de bord : période réglable, répartition des incidents par type, tendance.
- Tableau de bord circulation et recettes.
- Chaque chiffre est calculé dans le périmètre de l'utilisateur ; un chiffre sans droit n'est jamais montré.

## Étapes d'utilisation

1. Ouvrir Tableau de bord.
2. Choisir la période.

## Résultats

Indicateurs en lecture seule.

## Droits du module

| Droit (code) | Opération | Sensible | Profils qui le détiennent |
|---|---|---|---|
| `dashboard:view` | Voir le tableau de bord |  | 29 profils |
| `statistics:view` | Voir les statistiques |  | 12 profils |
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

## À confirmer auprès de la hiérarchie

- Indicateurs attendus par niveau.

## Améliorations recommandées

- Module de statistiques détaillées non construit.

## Se déconnecter en sécurité

1. Cliquer sur le bouton **Déconnexion** en haut à droite de l'en-tête.
2. Ne pas se contenter de fermer l'onglet, surtout sur un poste partagé.
3. La session se ferme d'elle-même après **60 minutes d'inactivité** (15 minutes pour les comptes qui détiennent un droit sensible) et au plus tard après **10 heures**.

