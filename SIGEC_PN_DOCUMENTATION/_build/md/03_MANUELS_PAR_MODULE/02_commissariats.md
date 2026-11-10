# Module 2 — Gestion des commissariats

**Manuel de gestion — Gestion des commissariats**

| Rubrique | Valeur |
|---|---|
| Système | SIGEC-PN / SIGPN-T — Système d'information de gestion de la Police nationale du Tchad |
| Éditeur et développeur | TECHNOTCHAD |
| Version du document | 1.0 — 10 novembre 2026 |
| Statut | Projet pour validation par la hiérarchie : les points marqués « À confirmer » ne sont pas des décisions |
| Source des informations | Lecture seule du système existant (code, catalogue des rôles et droits, écrans) — aucune donnée, aucun compte, aucun rôle, aucune permission n'a été modifié |

**Disponibilité dans le système : Disponible.**  Écran : `/admin/organization`

## Objectif

Tenir la structure organisationnelle de la police : unités (siège, délégations, directions centrales, commissariats, postes, brigades, unités spéciales), leur hiérarchie, leur statut et leurs agents.

## Utilisateurs concernés

| Profil | Niveau d'accès | Droits du module |
|---|---|---|
| Administrateur technique | Consultation et opérations | 2 |
| Administrateur de sécurité | Consultation seule | 1 |
| Commandement national (Direction générale) | Consultation et opérations | 3 |
| Délégué provincial de police | Consultation et opérations | 4 |
| Commandant de département (rôle dormant) | Consultation et opérations | 3 |
| Commissaire (chef de commissariat) | Consultation et opérations | 3 |
| Enquêteur | Consultation seule | 2 |
| Agent d'accueil / de permanence | Consultation seule | 2 |
| Agent de patrouille | Consultation seule | 2 |
| Responsable des scellés et pièces à conviction | Consultation seule | 2 |
| Agent de garde à vue | Consultation seule | 2 |
| Gestionnaire du parc de véhicules | Consultation seule | 2 |
| Analyste criminel | Consultation seule | 2 |
| Auditeur | Consultation seule | 2 |
| Agent biométrie | Consultation seule | 2 |
| Agent de police technique et scientifique | Consultation seule | 2 |
| Magistrat du parquet (consultation) | Consultation seule | 2 |
| Administrateur de la police (système d'information) | Consultation et opérations | 4 |
| Directeur des ressources humaines | Consultation et opérations | 3 |
| Gestionnaire de paie | Consultation seule | 2 |
| Contrôleur de paie | Consultation seule | 2 |
| Agent du service des ressources humaines | Consultation et opérations | 3 |
| Officier de police (désigné OPJ dans le système) | Consultation seule | 2 |
| Agent de circulation | Consultation seule | 1 |
| Agent de contrôle routier | Consultation seule | 1 |
| Superviseur circulation | Consultation seule | 2 |
| Responsable financier / paiements | Consultation seule | 1 |
| Chef d'unité (recettes) | Consultation seule | 2 |
| Consultation circulation | Consultation seule | 1 |

## Fonctionnalités

- Arborescence des unités : une unité est rattachée à une unité parente.
- Types d'unité : Siège, Délégation, Direction centrale, Direction provinciale, Direction départementale, Commissariat central, Commissariat, Poste, Unité, Brigade, Unité spéciale.
- Statuts : Actif, Inactif, En construction, Planifié.
- Référentiel territorial : provinces, départements, communes, sous-préfectures, arrondissements, localités (quartiers, villages, cantons).
- Fiches agents rattachées à une unité (grade, matricule, statut de service).
- Départements internes d'une unité (commandement, enquête, patrouille, circulation, police technique, renseignement, garde à vue, logistique, administration, spécial).

## Formulaires

| Formulaire | Champs |
|---|---|
| Unité | Code ; nom ; type ; unité parente ; commune ou localité ; statut ; coordonnées. |
| Département d'unité | Code (lettres, chiffres, _ -) ; nom ; description ; actif. |

## Étapes d'utilisation

1. Administration > Organisation.
2. Choisir l'unité dans l'arborescence.
3. Créer ou modifier l'unité (droit « gérer l'organisation »).
4. Rattacher les agents.

## Résultats

Une structure à jour qui détermine le périmètre de chaque agent (ce qu'il voit et ce qu'il peut faire).

## Droits du module

| Droit (code) | Opération | Sensible | Profils qui le détiennent |
|---|---|---|---|
| `org:view` | Voir l'organisation |  | 29 profils |
| `org:manage` | Gérer la structure organisationnelle |  | Administrateur technique, Délégué provincial de police, Administrateur de la police (système d'information) |
| `officers:view` | Voir les agents |  | 23 profils |
| `officers:manage` | Gérer les fiches agents |  | 7 profils |

## Écrans

![Écran Organisation : provinces, délégués provinciaux et couverture](../07_ANNEXES/captures/prov-1-organization.png)

## À confirmer auprès de la hiérarchie

- L'organigramme détaillé de chaque direction et service est fixé par arrêté ministériel (art. 91 du décret 0572/2023) : seule l'arborescence générale (14 directions centrales et unités du décret) est chargée ; la structure détaillée au niveau commissariat doit être fournie.
- Les unités de niveau 'service' d'un commissariat ne sont pas des unités distinctes dans le système (départements internes seulement).

## Améliorations recommandées

- Aucune relevée.

## Se déconnecter en sécurité

1. Cliquer sur le bouton **Déconnexion** en haut à droite de l'en-tête.
2. Ne pas se contenter de fermer l'onglet, surtout sur un poste partagé.
3. La session se ferme d'elle-même après **60 minutes d'inactivité** (15 minutes pour les comptes qui détiennent un droit sensible) et au plus tard après **10 heures**.

