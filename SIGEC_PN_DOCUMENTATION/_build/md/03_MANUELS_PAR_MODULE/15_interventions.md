# Module 15 — Gestion des interventions

**Manuel de gestion — Gestion des interventions**

| Rubrique | Valeur |
|---|---|
| Système | SIGEC-PN / SIGPN-T — Système d'information de gestion de la Police nationale du Tchad |
| Éditeur et développeur | TECHNOTCHAD |
| Version du document | 1.0 — 10 novembre 2026 |
| Statut | Projet pour validation par la hiérarchie : les points marqués « À confirmer » ne sont pas des décisions |
| Source des informations | Lecture seule du système existant (code, catalogue des rôles et droits, écrans) — aucune donnée, aucun compte, aucun rôle, aucune permission n'a été modifié |

**Disponibilité dans le système : Partiellement disponible.**  Écran : `/patrols`

## Objectif

Planifier les patrouilles, enregistrer les incidents et les interventions. Le module Opérations est prévu mais non construit.

## Utilisateurs concernés

| Profil | Niveau d'accès | Droits du module |
|---|---|---|
| Commandement national (Direction générale) | Consultation et opérations | 6 |
| Délégué provincial de police | Consultation et opérations | 8 |
| Commandant de département (rôle dormant) | Consultation et opérations | 8 |
| Commissaire (chef de commissariat) | Consultation et opérations | 8 |
| Enquêteur | Consultation et opérations | 5 |
| Agent d'accueil / de permanence | Consultation et opérations | 5 |
| Agent de patrouille | Consultation et opérations | 6 |
| Responsable des scellés et pièces à conviction | Consultation seule | 3 |
| Agent de garde à vue | Consultation seule | 3 |
| Gestionnaire du parc de véhicules | Consultation seule | 2 |
| Analyste criminel | Consultation seule | 3 |
| Auditeur | Consultation seule | 3 |
| Agent biométrie | Consultation seule | 3 |
| Agent de police technique et scientifique | Consultation seule | 3 |
| Magistrat du parquet (consultation) | Consultation seule | 3 |
| Administrateur de la police (système d'information) | Consultation et opérations | 6 |
| Officier de police (désigné OPJ dans le système) | Consultation seule | 3 |
| Agent de circulation | Consultation seule | 2 |

## Fonctionnalités

- Patrouilles : planification (zone, poste, mission, superviseur, véhicule), démarrage avec kilométrage, clôture avec rapport, annulation motivée.
- Incidents : voir module 6.
- Statuts de patrouille : Planifiée, Active, Terminée, Annulée.

## Formulaires

| Formulaire | Champs |
|---|---|
| Patrouille | Zone ; équipe de poste (matin, etc.) ; mission (5–500 car.) ; superviseur ; véhicule ; agents ; notes. |
| Clôture de patrouille | Kilométrage final ; rapport. |

## Étapes d'utilisation

1. Patrouilles > Nouvelle patrouille.
2. Démarrer.
3. Terminer avec rapport.

## Résultats

Patrouille PTL-AAAA-NNNNN avec rapport.

## Droits du module

| Droit (code) | Opération | Sensible | Profils qui le détiennent |
|---|---|---|---|
| `patrols:view` | Voir les patrouilles |  | 18 profils |
| `patrols:manage` | Planifier et gérer les patrouilles |  | 6 profils |
| `incidents:view` | Voir les incidents |  | 17 profils |
| `incidents:create` | Signaler un incident |  | 6 profils |
| `incidents:update` | Modifier un incident |  | 6 profils |
| `operations:view` | Voir les opérations |  | 17 profils |
| `operations:manage` | Planifier les opérations |  | Commandement national (Direction générale), Délégué provincial de police, Commandant de département (rôle dormant), Commissaire (chef de commissariat), Administrateur de la police (système d'information) |
| `operations:approve` | Approuver les opérations |  | Commandement national (Direction générale), Délégué provincial de police, Commandant de département (rôle dormant), Commissaire (chef de commissariat), Administrateur de la police (système d'information) |

## Circuit C — Circuit d'une main courante (module Incidents)

**Le SIGPN-T ne comporte pas de module nommé « main courante ».** Le module le plus proche est **Incidents** : un incident est un évènement signalé (trouble, accident, vol, incendie, personne disparue…) enregistré avec date, lieu, gravité et personnes concernées. Ce circuit décrit l'incident tel que le système le gère ; son équivalence avec la main courante réglementaire est à confirmer par la hiérarchie.

**Modules concernés :** Incidents, Patrouilles, Affaires

![Diagramme du circuit C](../04_WORKFLOWS/img/C_main_courante.png)

### Étapes détaillées

| N° | Qui | Action | Précisions du système | Statut après l'étape |
|---|---|---|---|---|
| 1 | Agent | Reçoit l'information (appel, passant, patrouille) — étape hors système. | Pour une patrouille, l'incident peut être rattaché à la patrouille en cours. |  |
| 2 | Agent | Incidents > Nouvel incident : type (12 types), gravité (Faible, Moyenne, Élevée, Critique), titre (5 à 200 car.), description (10 à 8000 car.), lieu (3 à 300 car.), coordonnées facultatives, commissariat, patrouille éventuelle. | Date et heure : l'heure de survenue et de signalement sont enregistrées. Numéro INC-AAAA-NNNNN. L'agent responsable est l'auteur du signalement. | Signalé (REPORTED) |
| 3 | Système | Pour un incident de gravité Élevée ou Critique, avertit les titulaires du droit de modifier les incidents du commissariat. | Notification de type Alerte : « Incident critique / de gravité élevée signalé ». | Signalé |
| 4 | Agent | Ajoute les personnes concernées (plaignant, victime, témoin, suspect…) et les agents présents. | Chaque rôle est précisé ; les notes sont limitées à 1000 caractères. |  |
| 5 | Agent | Fait évoluer l'incident : En intervention, Sur place, Résolu, puis Clôturé, avec un rapport d'intervention : passer à « Résolu » exige un rapport d'au moins 10 caractères. | Un incident clôturé ne se modifie plus. | En intervention → Sur place → Résolu → Clôturé |
| 6 | Chef de service / Commissaire | Si l'incident révèle une infraction à instruire : « Escalader en affaire » (titre, responsable, sensible ou non). Sinon, clôture. | Création d'une affaire liée ; notifications d'affectation de l'affaire (circuit A). | Escaladé (ESCALATED) |
| 7 | Chef de service / Commissaire | Consultation et suivi : liste filtrée, tableau de bord (nombre d'incidents sur la période, répartition par type, tendance). Clôture. | Pas d'archivage séparé : un incident clôturé reste consultable dans le périmètre. | Clôturé (CLOSED) |

### Règles appliquées par le système

- Les statuts d'un incident : Signalé, En intervention, Sur place, Résolu, Escaladé, Clôturé.
- L'agent n'enregistre que dans son commissariat ; un commandant de périmètre plus large peut choisir un commissariat dans son périmètre.
- Les incidents sont soumis au périmètre territorial comme tous les enregistrements.

### Statuts

| Code | Libellé affiché | Signification |
|---|---|---|
| REPORTED | Signalé | Enregistré. |
| RESPONDING | En intervention | Équipe dépêchée. |
| ON_SCENE | Sur place | Équipe sur les lieux. |
| RESOLVED | Résolu | Situation traitée. |
| ESCALATED | Escaladé | Transformé en affaire. |
| CLOSED | Clôturé | Terminé. |

### Notifications envoyées

| Événement | Destinataires | Message |
|---|---|---|
| Incident de gravité élevée ou critique | Titulaires du droit de modifier les incidents du commissariat (sauf l'auteur) | Incident critique / de gravité élevée signalé — INC-… — lieu |

### Écrans

![Tableau de bord (incidents récents, répartition)](../07_ANNEXES/captures/theme-dashboard.png)

### À confirmer auprès de la hiérarchie

- Si la main courante réglementaire doit être un registre distinct (chronologique, non modifiable, tenu par le poste) ou si le module Incidents suffit.
- Le délai de clôture, la signature du registre et l'obligation de transmission au chef de service.

### Ce que le système ne fait pas / améliorations recommandées

- Pas de module « Main courante » : amélioration recommandée si la hiérarchie confirme un registre dédié (chronologique, un numéro d'ordre par poste, visa du chef de poste).
- Pas de visa électronique du chef de poste sur chaque incident.
- Écran Incidents non capturé dans le dossier d'images actuel (voir annexe).

## À confirmer auprès de la hiérarchie

- Voir circuit C.

## Améliorations recommandées

- Opérations (descentes, barrages, escortes) non construit.

## Se déconnecter en sécurité

1. Cliquer sur le bouton **Déconnexion** en haut à droite de l'en-tête.
2. Ne pas se contenter de fermer l'onglet, surtout sur un poste partagé.
3. La session se ferme d'elle-même après **60 minutes d'inactivité** (15 minutes pour les comptes qui détiennent un droit sensible) et au plus tard après **10 heures**.

