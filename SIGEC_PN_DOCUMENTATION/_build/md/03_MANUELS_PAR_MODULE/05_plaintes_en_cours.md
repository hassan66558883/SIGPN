# Module 5 — Gestion des plaintes en cours

**Manuel de gestion — Gestion des plaintes en cours**

| Rubrique | Valeur |
|---|---|
| Système | SIGEC-PN / SIGPN-T — Système d'information de gestion de la Police nationale du Tchad |
| Éditeur et développeur | TECHNOTCHAD |
| Version du document | 1.0 — 10 novembre 2026 |
| Statut | Projet pour validation par la hiérarchie : les points marqués « À confirmer » ne sont pas des décisions |
| Source des informations | Lecture seule du système existant (code, catalogue des rôles et droits, écrans) — aucune donnée, aucun compte, aucun rôle, aucune permission n'a été modifié |

**Disponibilité dans le système : Partiellement disponible.**  Écran : `/complaints`

## Objectif

Suivre les plaintes et affaires non encore closes : en attente d'examen, affectées, en enquête, en attente de contrôle.

## Utilisateurs concernés

| Profil | Niveau d'accès | Droits du module |
|---|---|---|
| Commandement national (Direction générale) | Consultation et opérations | 12 |
| Délégué provincial de police | Consultation et opérations | 17 |
| Commandant de département (rôle dormant) | Consultation et opérations | 16 |
| Commissaire (chef de commissariat) | Consultation et opérations | 16 |
| Enquêteur | Consultation et opérations | 8 |
| Agent d'accueil / de permanence | Consultation et opérations | 5 |
| Agent de patrouille | Consultation seule | 3 |
| Responsable des scellés et pièces à conviction | Consultation seule | 3 |
| Agent de garde à vue | Consultation seule | 3 |
| Analyste criminel | Consultation seule | 4 |
| Auditeur | Consultation seule | 4 |
| Agent biométrie | Consultation seule | 3 |
| Agent de police technique et scientifique | Consultation seule | 3 |
| Magistrat du parquet (consultation) | Consultation seule | 4 |
| Administrateur de la police (système d'information) | Consultation et opérations | 12 |
| Officier de police (désigné OPJ dans le système) | Consultation seule | 3 |

## Fonctionnalités

- Pas de module séparé : filtres par statut sur Plaintes et Affaires, Mes tâches, compteurs du tableau de bord.
- Notifications d'affectation et de contrôle (circuit E).

## Étapes d'utilisation

1. Filtrer Plaintes par statut (Enregistrée, En examen, Affectée).
2. Filtrer Affaires par statut (Ouverte, Affectée, En enquête, En attente d'examen).
3. Ouvrir Mes tâches pour l'avancement.

## Résultats

Une vue de pilotage des dossiers vivants dans le périmètre.

## Droits du module

| Droit (code) | Opération | Sensible | Profils qui le détiennent |
|---|---|---|---|
| `complaints:view` | Voir les plaintes |  | 16 profils |
| `complaints:create` | Enregistrer une plainte |  | Délégué provincial de police, Commandant de département (rôle dormant), Commissaire (chef de commissariat), Enquêteur, Agent d'accueil / de permanence |
| `complaints:update` | Modifier une plainte |  | Délégué provincial de police, Commandant de département (rôle dormant), Commissaire (chef de commissariat), Enquêteur, Agent d'accueil / de permanence |
| `complaints:review` | Examiner une plainte |  | Commandement national (Direction générale), Délégué provincial de police, Commandant de département (rôle dormant), Commissaire (chef de commissariat), Administrateur de la police (système d'information) |
| `complaints:assign` | Affecter une plainte |  | Commandement national (Direction générale), Délégué provincial de police, Commandant de département (rôle dormant), Commissaire (chef de commissariat), Administrateur de la police (système d'information) |
| `complaints:convert` | Convertir une plainte en affaire |  | Commandement national (Direction générale), Délégué provincial de police, Commandant de département (rôle dormant), Commissaire (chef de commissariat), Administrateur de la police (système d'information) |
| `complaints:close` | Clôturer ou rejeter une plainte |  | Commandement national (Direction générale), Délégué provincial de police, Commandant de département (rôle dormant), Commissaire (chef de commissariat), Administrateur de la police (système d'information) |
| `cases:view` | Voir les affaires |  | 16 profils |
| `cases:view_sensitive` | Voir les affaires sensibles (sensible) | Oui | 8 profils |
| `cases:create` | Ouvrir une affaire |  | Délégué provincial de police, Commandant de département (rôle dormant), Commissaire (chef de commissariat), Enquêteur |
| `cases:update` | Modifier une affaire |  | Délégué provincial de police, Commandant de département (rôle dormant), Commissaire (chef de commissariat), Enquêteur |
| `cases:assign` | Affecter une affaire |  | Commandement national (Direction générale), Délégué provincial de police, Commandant de département (rôle dormant), Commissaire (chef de commissariat), Administrateur de la police (système d'information) |
| `cases:close` | Transmettre ou clôturer une affaire |  | Commandement national (Direction générale), Délégué provincial de police, Commandant de département (rôle dormant), Commissaire (chef de commissariat), Administrateur de la police (système d'information) |
| `cases:archive` | Archiver une affaire |  | Commandement national (Direction générale), Délégué provincial de police, Administrateur de la police (système d'information) |
| `investigations:view` | Voir les enquêtes et tâches |  | 16 profils |
| `investigations:manage` | Gérer les enquêtes |  | Délégué provincial de police, Commandant de département (rôle dormant), Commissaire (chef de commissariat), Enquêteur |
| `investigations:review` | Contrôler les enquêtes |  | Commandement national (Direction générale), Délégué provincial de police, Commandant de département (rôle dormant), Commissaire (chef de commissariat), Administrateur de la police (système d'information) |

## Circuit E — Circuit des plaintes en cours

Ce circuit décrit le suivi quotidien des plaintes déjà enregistrées et des affaires ouvertes : qui voit quoi, qui relance, qui contrôle.

**Modules concernés :** Plaintes, Affaires, Tâches, Tableau de bord

![Diagramme du circuit E](../04_WORKFLOWS/img/E_plaintes_en_cours.png)

### Étapes détaillées

| N° | Qui | Action | Précisions du système | Statut après l'étape |
|---|---|---|---|---|
| 1 | Chef de service / Commissaire | Le commissaire ouvre Plaintes et filtre par statut « Enregistrée » / « En examen » pour voir les plaintes en attente. Le tableau de bord indique le nombre de plaintes de la période et d'affaires ouvertes. | Chiffres calculés dans le périmètre du commissariat ; un chiffre sans droit n'est jamais affiché. |  |
| 2 | Chef de service / Commissaire | Il examine et affecte (circuit A). Pour une affaire sans responsable, il reçoit la notification « en attente d'affectation » et affecte une équipe (responsable, enquêteur, superviseur, analyste, appui). | Affecter à l'affaire : notification de l'intéressé. |  |
| 3 | Enquêteur | Reçoit l'affectation, ouvre Mes tâches, met à jour l'avancement : tâches (à faire, en cours, bloquée, terminée, annulée) avec résultat. | Une tâche confiée à un tiers avertit celui-ci. |  |
| 4 | Enquêteur | Met à jour l'état de l'affaire (En enquête) et ajoute notes, personnes, pièces. | Journal chronologique alimenté automatiquement. |  |
| 5 | Chef de service / Commissaire | Contrôle des résultats : examine l'affaire soumise (En attente d'examen) ; renvoie à l'enquête, transmet ou clôture. | Voir règles de contrôle du circuit A. |  |
| 6 | Délégué provincial | Supervise : voit les plaintes et affaires de toute sa province (périmètre régional) et les commissariats rattachés. | Il ne voit pas les autres provinces. |  |
| 7 | Direction générale | Supervision nationale : vue d'ensemble de toutes les affaires et plaintes (périmètre national). | Aucune validation nationale n'est exigée par le système sur une affaire courante. |  |

### Règles appliquées par le système

- Une affaire clôturée ou archivée est en lecture seule.
- Seule l'équipe de l'affaire ou un titulaire du droit d'affecter peut la modifier.
- Tout changement d'équipe est notifié à la personne concernée.

### Statuts

| Code | Libellé affiché | Signification |
|---|---|---|
| OPEN | Ouverte |  |

### Notifications envoyées

| Événement | Destinataires | Message |
|---|---|---|
| Affectation à une affaire | La personne affectée | Affecté à l'affaire en tant que … |

### Écrans

![Liste des affaires](../07_ANNEXES/captures/theme-cases.png)

![Tableau de bord](../07_ANNEXES/captures/theme-dashboard.png)

### À confirmer auprès de la hiérarchie

- Les délais de traitement attendus par type de plainte (aucun délai automatique n'existe dans le système).

### Ce que le système ne fait pas / améliorations recommandées

- Pas d'alerte automatique de plainte « en retard » ni de relance de l'enquêteur : amélioration recommandée.

## À confirmer auprès de la hiérarchie

- Délais de traitement attendus.

## Améliorations recommandées

- Pas de relance automatique des dossiers en retard.

## Se déconnecter en sécurité

1. Cliquer sur le bouton **Déconnexion** en haut à droite de l'en-tête.
2. Ne pas se contenter de fermer l'onglet, surtout sur un poste partagé.
3. La session se ferme d'elle-même après **60 minutes d'inactivité** (15 minutes pour les comptes qui détiennent un droit sensible) et au plus tard après **10 heures**.

