# Module 10-11 — Gestion des arrestations et des gardes à vue

**Manuel de gestion — Gestion des arrestations et des gardes à vue**

| Rubrique | Valeur |
|---|---|
| Système | SIGEC-PN / SIGPN-T — Système d'information de gestion de la Police nationale du Tchad |
| Éditeur et développeur | TECHNOTCHAD |
| Version du document | 1.0 — 10 novembre 2026 |
| Statut | Projet pour validation par la hiérarchie : les points marqués « À confirmer » ne sont pas des décisions |
| Source des informations | Lecture seule du système existant (code, catalogue des rôles et droits, écrans) — aucune donnée, aucun compte, aucun rôle, aucune permission n'a été modifié |

**Disponibilité dans le système : Disponible.**  Écran : `/arrests et /detention`

## Objectif

Enregistrer les arrestations avec leur fondement légal et suivre leur issue. Ouvrir, surveiller, prolonger et clore les gardes à vue avec le contrôle des délais.

## Utilisateurs concernés

| Profil | Niveau d'accès | Droits du module |
|---|---|---|
| Commandement national (Direction générale) | Consultation et opérations | 4 |
| Délégué provincial de police | Consultation et opérations | 6 |
| Commandant de département (rôle dormant) | Consultation et opérations | 6 |
| Commissaire (chef de commissariat) | Consultation et opérations | 6 |
| Enquêteur | Consultation et opérations | 4 |
| Agent d'accueil / de permanence | Consultation et opérations | 3 |
| Agent de patrouille | Consultation et opérations | 3 |
| Responsable des scellés et pièces à conviction | Consultation seule | 2 |
| Agent de garde à vue | Consultation et opérations | 4 |
| Analyste criminel | Consultation seule | 2 |
| Auditeur | Consultation seule | 2 |
| Agent biométrie | Consultation seule | 2 |
| Agent de police technique et scientifique | Consultation seule | 2 |
| Magistrat du parquet (consultation) | Consultation seule | 2 |
| Administrateur de la police (système d'information) | Consultation et opérations | 4 |
| Officier de police (désigné OPJ dans le système) | Consultation seule | 2 |

## Fonctionnalités

- Fondements : mandat, flagrant délit, ordre du tribunal, cause probable, autre.
- Contrôle du mandat (actif, non expiré, même personne).
- Statuts : Enregistrée, En garde à vue, Libérée, Transférée, Inculpée.
- Échéance légale à 48 h (constante à confirmer) ; prolongation de 48 h au plus ; signalement des dépassements.
- Journal de surveillance (bien-être, repas, médical, visite, avocat, transfert, incident, note).
- Issues : libéré sans charge, libéré sous caution, transféré au parquet, transféré à un poste, présenté au tribunal, médical, autre.

## Formulaires

| Formulaire | Champs |
|---|---|
| Nouvelle arrestation | Personne ; affaire ; mandat ; agent arrêtant ; lieu ; fondement ; chefs d'accusation ; circonstances ; heure de lecture des droits ; notes. |
| Ouverture | Arrestation ; cellule ; notes médicales. |
| Entrée de journal | Type ; notes (3–2000 car.). |
| Prolongation | Autorité ; motif (10–2000 car.) ; nouvelle échéance. |
| Fin | Issue ; notes. |

## Étapes d'utilisation

1. Arrestations > Nouvelle arrestation.
2. Ouvrir la garde à vue si nécessaire.
3. Clore avec une issue.
4. Gardes à vue > Ouvrir.
5. Journaliser les contrôles.
6. Prolonger si autorisé.
7. Clore.

## Résultats

Arrestation ARR-AAAA-NNNNN. Garde à vue DET-AAAA-NNNNN et arrestation mise à jour.

## Droits du module

| Droit (code) | Opération | Sensible | Profils qui le détiennent |
|---|---|---|---|
| `arrests:view` | Voir les arrestations |  | 16 profils |
| `arrests:create` | Enregistrer une arrestation |  | 6 profils |
| `arrests:update` | Changer le statut d'une arrestation |  | Délégué provincial de police, Commandant de département (rôle dormant), Commissaire (chef de commissariat), Enquêteur, Agent de garde à vue |
| `detention:view` | Voir les gardes à vue |  | 16 profils |
| `detention:manage` | Ouvrir, surveiller et clore une garde à vue |  | 6 profils |
| `detention:extend` | Prolonger une garde à vue (sensible) | Oui | Commandement national (Direction générale), Délégué provincial de police, Commandant de département (rôle dormant), Commissaire (chef de commissariat), Administrateur de la police (système d'information) |

## Circuit D bis — Circuit d'une arrestation et d'une garde à vue

L'arrestation est enregistrée avec son fondement (mandat, flagrant délit, ordre du tribunal, cause probable, autre). La garde à vue démarre avec une échéance légale fixée à 48 heures (constante du code, à confirmer) ; elle est surveillée par un journal, peut être prolongée par le commissaire et se termine par une issue.

**Modules concernés :** Arrestations, Gardes à vue, Mandats, Personnes

![Diagramme du circuit D bis](../04_WORKFLOWS/img/Dbis_arrestation_gav.png)

### Étapes détaillées

| N° | Qui | Action | Précisions du système | Statut après l'étape |
|---|---|---|---|---|
| 1 | Agent | Arrestations > Nouvelle arrestation : personne, affaire éventuelle, fondement (Mandat, Flagrant délit, Ordre du tribunal, Cause probable, Autre), lieu, chefs d'accusation, circonstances, heure de lecture des droits, agent arrêtant. | Sur mandat : le mandat doit être actif, non expiré et viser la même personne. L'heure ne peut pas être dans le futur. Numéro ARR-AAAA-NNNNN. | Enregistrée (RECORDED) |
| 2 | Agent de garde | Gardes à vue > Ouvrir : arrestation, numéro de cellule, notes médicales. Une seule garde à vue ouverte par arrestation ; début non antérieur à l'arrestation. | Échéance légale = arrestation + 48 h. Numéro DET-AAAA-NNNNN. | Garde à vue active (ACTIVE) ; Arrestation : En garde à vue (IN_CUSTODY) |
| 3 | Agent de garde | Journal de surveillance : contrôle de bien-être, repas, médical, visite, avocat, transfert, incident, note. | Impossible sur une garde à vue terminée. |  |
| 4 | Chef de service / Commissaire | Prolongation (si nécessaire) : autorité qui autorise et motif obligatoires, au plus 48 h au-delà de l'échéance légale ; la nouvelle échéance doit dépasser l'ancienne. Droit distinct et sensible. | L'agent de garde ne voit pas ce formulaire. | Prolongée (EXTENDED) |
| 5 | Chef de service / Commissaire | Fin de garde à vue : issue (libéré sans charge, libéré sous caution, transféré au parquet, transféré à un autre poste, présenté au tribunal, médical, autre) et notes. | L'arrestation suit l'issue ; le mandat éventuel est marqué exécuté. | Terminée (ENDED) |
| 6 | Chef de service / Commissaire | Statut final de l'arrestation : Libérée (motif obligatoire ; impossible tant qu'une garde à vue est ouverte), Transférée ou Inculpée. | États finaux définitifs. Les gardes à vue dont le délai est dépassé sont signalées dans la liste. | Libérée / Transférée / Inculpée |

### Règles appliquées par le système

- Libérer une personne exige un motif et la fin préalable de la garde à vue.
- Le délai de 48 h est une constante du code : à confirmer avec la Direction et le parquet.
- Chaque étape est au journal d'audit.

### Statuts

| Code | Libellé affiché | Signification |
|---|---|---|
| RECORDED | Enregistrée | Arrestation saisie. |
| IN_CUSTODY | En garde à vue | Personne gardée. |
| RELEASED | Libérée | Fin sans suite (définitif). |
| TRANSFERRED | Transférée | Transfert (définitif). |
| CHARGED | Inculpée | Inculpation (définitif). |

| Code | Libellé affiché | Signification |
|---|---|---|
| ACTIVE | Active | Garde à vue en cours. |
| EXTENDED | Prolongée | Délai prolongé. |
| ENDED | Terminée | Issue enregistrée. |

### Notifications envoyées

| Événement | Destinataires | Message |
|---|---|---|
| (aucune notification automatique) | — | Les gardes à vue en dépassement sont signalées dans la liste ; aucune notification n'est envoyée |

### Écrans

![Formulaire d'arrestation](../07_ANNEXES/captures/enf-4-arrest-form.png)

![Fiche d'arrestation](../07_ANNEXES/captures/enf-5-arrest-detail.png)

![Garde à vue](../07_ANNEXES/captures/enf-6-custody-detail.png)

![Prolongation](../07_ANNEXES/captures/enf-7-custody-extended.png)

![Mandat exécuté](../07_ANNEXES/captures/enf-8-warrant-executed.png)

### À confirmer auprès de la hiérarchie

- Durée légale de la garde à vue et durée maximale de prolongation (48 h + 48 h dans le code).
- Qui autorise une prolongation (champ libre « autorité » dans le formulaire).

### Ce que le système ne fait pas / améliorations recommandées

- Aucune notification automatique d'une garde à vue qui dépasse son délai : amélioration recommandée.

## À confirmer auprès de la hiérarchie

- Voir circuit D bis.

## Améliorations recommandées

- Aucune relevée.

## Se déconnecter en sécurité

1. Cliquer sur le bouton **Déconnexion** en haut à droite de l'en-tête.
2. Ne pas se contenter de fermer l'onglet, surtout sur un poste partagé.
3. La session se ferme d'elle-même après **60 minutes d'inactivité** (15 minutes pour les comptes qui détiennent un droit sensible) et au plus tard après **10 heures**.

