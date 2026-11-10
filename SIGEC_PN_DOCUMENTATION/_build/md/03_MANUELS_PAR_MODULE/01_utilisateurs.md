# Module 1 — Gestion des utilisateurs et des comptes

**Manuel de gestion — Gestion des utilisateurs et des comptes**

| Rubrique | Valeur |
|---|---|
| Système | SIGEC-PN / SIGPN-T — Système d'information de gestion de la Police nationale du Tchad |
| Éditeur et développeur | TECHNOTCHAD |
| Version du document | 1.0 — 10 novembre 2026 |
| Statut | Projet pour validation par la hiérarchie : les points marqués « À confirmer » ne sont pas des décisions |
| Source des informations | Lecture seule du système existant (code, catalogue des rôles et droits, écrans) — aucune donnée, aucun compte, aucun rôle, aucune permission n'a été modifié |

**Disponibilité dans le système : Disponible.**  Écran : `/admin/users`

## Objectif

Créer et administrer les comptes d'accès, attribuer les rôles et les habilitations, suivre les sessions, réinitialiser les mots de passe, désactiver un compte.

## Utilisateurs concernés

| Profil | Niveau d'accès | Droits du module |
|---|---|---|
| Administrateur technique | Consultation et opérations | 5 |
| Administrateur de sécurité | Consultation et opérations | 10 |
| Commandement national (Direction générale) | Consultation et opérations | 11 |
| Délégué provincial de police | Consultation et opérations | 11 |
| Commandant de département (rôle dormant) | Consultation et opérations | 11 |
| Commissaire (chef de commissariat) | Consultation et opérations | 11 |
| Enquêteur | Consultation et opérations | 1 |
| Agent d'accueil / de permanence | Consultation et opérations | 1 |
| Agent de patrouille | Consultation et opérations | 1 |
| Responsable des scellés et pièces à conviction | Consultation et opérations | 1 |
| Agent de garde à vue | Consultation et opérations | 1 |
| Gestionnaire du parc de véhicules | Consultation et opérations | 1 |
| Analyste criminel | Consultation et opérations | 4 |
| Auditeur | Consultation et opérations | 4 |
| Agent biométrie | Consultation et opérations | 1 |
| Agent de police technique et scientifique | Consultation et opérations | 1 |
| Magistrat du parquet (consultation) | Consultation et opérations | 4 |
| Administrateur de la police (système d'information) | Consultation et opérations | 11 |
| Directeur des ressources humaines | Consultation et opérations | 1 |
| Gestionnaire de paie | Consultation et opérations | 1 |
| Contrôleur de paie | Consultation et opérations | 1 |
| Agent du service des ressources humaines | Consultation et opérations | 1 |
| Officier de police (désigné OPJ dans le système) | Consultation et opérations | 1 |
| Agent de circulation | Consultation et opérations | 1 |
| Agent de contrôle routier | Consultation et opérations | 1 |
| Superviseur circulation | Consultation et opérations | 1 |
| Responsable financier / paiements | Consultation et opérations | 1 |
| Chef d'unité (recettes) | Consultation et opérations | 1 |
| Consultation circulation | Consultation et opérations | 1 |

## Fonctionnalités

- Liste des comptes avec filtres (statut, rôle, commissariat) et recherche.
- Création d'un compte : identifiant, nom, prénom, courriel, rôle, commissariat de rattachement. Le formulaire ne propose que les rôles que l'administrateur connecté a le droit d'attribuer.
- Statuts d'un compte : En attente, Actif, Verrouillé, Suspendu, Désactivé.
- Émission d'un lien de réinitialisation de mot de passe ; réinitialisation du second facteur.
- Voir et révoquer les sessions d'un compte.
- Catalogue des rôles (29 rôles du système) et des droits (157 droits) consultable ; les droits d'un rôle ne se modifient qu'avec approbation.
- Demandes d'approbation (création de compte, changement de rôle, élévation d'habilitation, ajout d'un droit sensible à un rôle) : voir circuit G.

## Formulaires

| Formulaire | Champs |
|---|---|
| Nouveau compte | Identifiant ; prénom ; nom ; courriel ; rôle ; commissariat ; habilitation (fixée à Standard pour les comptes créés par un tiers). |
| Réinitialisation du mot de passe | Émission d'un lien à usage unique ; l'utilisateur choisit son nouveau mot de passe. |

## Étapes d'utilisation

1. Administration > Utilisateurs > Nouveau.
2. Renseigner l'identité et choisir le rôle autorisé.
3. Soumettre : une demande d'approbation est créée (code 202 côté système) et attend la décision d'un commandant habilité.
4. Après approbation, le compte est créé ; l'utilisateur reçoit un mot de passe provisoire à changer à la première connexion (et enrôle son second facteur si son rôle l'exige).
5. Pour désactiver : ouvrir la fiche > changer le statut.

## Résultats

Un compte actif rattaché à un rôle, un commissariat et une habilitation ; trace complète dans le journal d'audit.

## Droits du module

| Droit (code) | Opération | Sensible | Profils qui le détiennent |
|---|---|---|---|
| `users:view` | Voir les comptes |  | 9 profils |
| `users:create` | Créer un compte |  | 6 profils |
| `users:update` | Modifier un compte |  | 6 profils |
| `users:manage_status` | Activer, suspendre, désactiver, débloquer un compte |  | 6 profils |
| `users:reset_password` | Émettre une réinitialisation de mot de passe |  | 6 profils |
| `users:manage_sessions` | Voir et révoquer les sessions d'autrui |  | 6 profils |
| `roles:view` | Voir les rôles |  | 10 profils |
| `roles:manage` | Modifier les droits d'un rôle (sensible) | Oui | Administrateur technique |
| `permissions:view` | Voir le catalogue des droits |  | 10 profils |
| `approvals:view` | Voir les demandes d'approbation |  | 7 profils |
| `approvals:decide` | Décider d'une demande d'approbation (sensible) | Oui | Commandement national (Direction générale), Délégué provincial de police, Commandant de département (rôle dormant), Commissaire (chef de commissariat), Administrateur de la police (système d'information) |
| `apikeys:manage_own` | Gérer ses propres clés d'accès |  | 29 profils |

## Écrans

![Formulaire de nouveau compte](../07_ANNEXES/captures/theme-user-new.png)

![Rôles proposés selon les droits de l'administrateur](../07_ANNEXES/captures/aud-4-user-form.png)

![Demande envoyée en approbation](../07_ANNEXES/captures/aud-5-request-sent.png)

![Catalogue des rôles](../07_ANNEXES/captures/theme-roles.png)

![Rôle verrouillé](../07_ANNEXES/captures/aud-3-role-locked.png)

## À confirmer auprès de la hiérarchie

- Le processus de remise du premier mot de passe aux agents (en main propre, par le chef) est à fixer par la hiérarchie.
- Le circuit de création de comptes pour 14 000 agents (import en masse) n'est pas décrit : un import de masse n'existe pas dans l'interface actuelle.

## Améliorations recommandées

- Aucune relevée.

## Se déconnecter en sécurité

1. Cliquer sur le bouton **Déconnexion** en haut à droite de l'en-tête.
2. Ne pas se contenter de fermer l'onglet, surtout sur un poste partagé.
3. La session se ferme d'elle-même après **60 minutes d'inactivité** (15 minutes pour les comptes qui détiennent un droit sensible) et au plus tard après **10 heures**.

