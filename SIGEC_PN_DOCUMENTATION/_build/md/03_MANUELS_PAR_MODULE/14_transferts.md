# Module 14 — Gestion des transferts de dossiers

**Manuel de gestion — Gestion des transferts de dossiers**

| Rubrique | Valeur |
|---|---|
| Système | SIGEC-PN / SIGPN-T — Système d'information de gestion de la Police nationale du Tchad |
| Éditeur et développeur | TECHNOTCHAD |
| Version du document | 1.0 — 10 novembre 2026 |
| Statut | Projet pour validation par la hiérarchie : les points marqués « À confirmer » ne sont pas des décisions |
| Source des informations | Lecture seule du système existant (code, catalogue des rôles et droits, écrans) — aucune donnée, aucun compte, aucun rôle, aucune permission n'a été modifié |

**Disponibilité dans le système : Partiellement disponible.**  Écran : `/cases (affectation)`

## Objectif

Affectation d'une affaire, transmission, transfert de garde des pièces, mutation d'agents. Pas de transfert inter-unités avec acceptation/refus.

## Utilisateurs concernés

| Profil | Niveau d'accès | Droits du module |
|---|---|---|
| Commandement national (Direction générale) | Consultation et opérations | 14 |
| Délégué provincial de police | Consultation et opérations | 16 |
| Commandant de département (rôle dormant) | Consultation et opérations | 12 |
| Commissaire (chef de commissariat) | Consultation et opérations | 11 |
| Enquêteur | Consultation et opérations | 3 |
| Agent d'accueil / de permanence | Consultation seule | 1 |
| Agent de patrouille | Consultation seule | 1 |
| Responsable des scellés et pièces à conviction | Consultation seule | 1 |
| Agent de garde à vue | Consultation seule | 1 |
| Analyste criminel | Consultation seule | 2 |
| Auditeur | Consultation seule | 2 |
| Agent biométrie | Consultation seule | 1 |
| Agent de police technique et scientifique | Consultation seule | 1 |
| Magistrat du parquet (consultation) | Consultation seule | 2 |
| Administrateur de la police (système d'information) | Consultation et opérations | 11 |
| Directeur des ressources humaines | Consultation et opérations | 12 |
| Gestionnaire de paie | Consultation et opérations | 3 |
| Contrôleur de paie | Consultation et opérations | 4 |
| Agent du service des ressources humaines | Consultation et opérations | 8 |
| Officier de police (désigné OPJ dans le système) | Consultation seule | 1 |

## Fonctionnalités

- Affectation d'une affaire à un membre du périmètre.
- Réaffectation signalée en cas de mutation d'un agent.
- Statut Transmise.
- Transfert de garde des pièces.

## Formulaires

| Formulaire | Champs |
|---|---|
| Affecter à l'affaire | Utilisateur ; rôle dans l'affaire. |

## Étapes d'utilisation

1. Ouvrir l'affaire > Affecter.

## Résultats

Équipe d'affaire mise à jour, intéressé notifié.

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
| `hr:view` | Voir les dossiers RH |  | 9 profils |
| `hr:manage` | Modifier le dossier RH d'un agent |  | Directeur des ressources humaines, Agent du service des ressources humaines |
| `hr:career` | Enregistrer une décision de carrière |  | Directeur des ressources humaines |
| `hr:transfer_propose` | Proposer une mutation |  | 7 profils |
| `hr:transfer_review` | Examiner les mutations (RH) |  | Directeur des ressources humaines, Agent du service des ressources humaines |
| `hr:transfer_validate` | Valider une mutation (autorité compétente) |  | Commandement national (Direction générale), Délégué provincial de police, Commandant de département (rôle dormant) |
| `hr:auto_assign_config` | Paramétrer l'affectation automatique |  | Administrateur de la police (système d'information) |
| `hr:attendance_record` | Enregistrer l'appel quotidien |  | 7 profils |
| `hr:leave_request` | Déposer une demande de congé |  | 7 profils |
| `hr:leave_approve` | Approuver ou rejeter un congé |  | 6 profils |
| `hr:training_manage` | Gérer les formations et attestations |  | Directeur des ressources humaines, Agent du service des ressources humaines |
| `hr:discipline_view` | Voir les dossiers disciplinaires (sensible) | Oui | Commandement national (Direction générale), Délégué provincial de police, Directeur des ressources humaines |
| `hr:discipline_manage` | Instruire un dossier disciplinaire (sensible) | Oui | Commandement national (Direction générale), Délégué provincial de police, Directeur des ressources humaines |
| `hr:discipline_decide` | Décider d'une sanction (sensible) | Oui | Commandement national (Direction générale), Délégué provincial de police |
| `hr:document_issue` | Éditer des documents RH |  | Directeur des ressources humaines, Agent du service des ressources humaines |
| `hr:pay_view` | Voir la paie (sensible) | Oui | Gestionnaire de paie, Contrôleur de paie |
| `hr:pay_manage` | Demander des éléments de paie (sensible) | Oui | Gestionnaire de paie |
| `hr:pay_validate` | Valider la paie (sensible) | Oui | Contrôleur de paie |
| `hr:pay_export` | Exporter la paie (sensible) | Oui | Contrôleur de paie |

## Circuit F — Circuit des transferts de dossiers

**Le SIGPN-T ne comporte pas de procédure formelle de transfert d'un dossier entre commissariats avec acceptation ou refus motivé du destinataire.** Ce que le système fait : (1) l'**affectation** d'une affaire à une autre personne de son périmètre ; (2) la **réaffectation du travail** quand un agent est muté ; (3) la **transmission** (statut Transmise) ; (4) le **transfert de garde** des pièces à conviction ; (5) la **mutation des agents** (circuit RH). Les transferts de dossiers entre commissariats, délégations et direction générale sont à confirmer et à construire.

**Modules concernés :** Affaires, Ressources humaines (mutations), Preuves

![Diagramme du circuit F](../04_WORKFLOWS/img/F_transferts.png)

### Étapes détaillées

| N° | Qui | Action | Précisions du système | Statut après l'étape |
|---|---|---|---|---|
| 1 | Chef de service / Commissaire | Affectation interne : Affaire > Affecter : choix d'un utilisateur du périmètre et d'un rôle dans l'affaire (responsable, enquêteur, superviseur, analyste, appui). | Interdit sur une affaire clôturée. L'intéressé est notifié. Entre services d'un même commissariat, c'est ce mécanisme qui s'applique. |  |
| 2 | Système | Quand un agent est muté, le système signale aux titulaires du droit d'affecter de son ancienne unité : « Travail à réaffecter » (nombre d'affaires et de tâches ouvertes). | Les affaires restent attribuées jusqu'à réaffectation manuelle. |  |
| 3 | Chef de service / Commissaire | Transmission : l'affaire peut passer au statut « Transmise » (issue : transmise au parquet ou transférée). | C'est un enregistrement de décision, pas un envoi vers un autre service informatique. |  |
| 4 | Agent | Pièces à conviction : « Transférer la garde » vers un autre agent ou un autre lieu de stockage, avec motif ; l'état de la pièce est consigné. | Chaîne de conservation tracée. |  |
| 5 | RH | Mutation d'agent : voir circuit J (proposition, examen RH, validation, exécution). | Exécutée, la mutation clôt les accès de l'ancien poste et notifie les unités. |  |
| 6 | Chef de service / Commissaire | Pas de circuit « acceptation / refus motivé » entre commissariat, délégation provinciale, direction générale ou services centraux. | À confirmer par la hiérarchie avant développement. |  |

### Règles appliquées par le système

- Toute affectation est inscrite au journal d'audit et au journal de l'affaire.
- Une affaire sensible reste invisible aux personnes hors équipe sans droit particulier.
- La portée territoriale empêche d'affecter quelqu'un hors de son périmètre.

### Statuts

| Code | Libellé affiché | Signification |
|---|---|---|
| REFERRED | Transmise | Décision de transmission enregistrée. |

### Notifications envoyées

| Événement | Destinataires | Message |
|---|---|---|
| Affectation à une affaire | La personne affectée | Affecté à l'affaire en tant que … |
| Travail à réaffecter | Titulaires du droit d'affecter de l'ancienne unité | X a quitté l'unité : N affaire(s) et N tâche(s) ouvertes |

### Écrans

![Pièces à conviction et chaîne de possession](../07_ANNEXES/captures/doc-pieces.png)

![Mutations des agents](../07_ANNEXES/captures/doc-rh-mutations.png)

### À confirmer auprès de la hiérarchie

- Souhaite-t-on un vrai transfert entre unités (demande, réception, acceptation ou refus motivé, traçabilité, notification) ? Qui accepte à chaque niveau (commissariat, délégation, direction générale, services centraux) ?
- Cas des affaires qui dépassent la compétence territoriale du commissariat.

### Ce que le système ne fait pas / améliorations recommandées

- AMÉLIORATION RECOMMANDÉE (non construite) : module de transfert avec statuts Demandé / Reçu / Accepté / Refusé (motif obligatoire), notification de l'expéditeur et du destinataire, historique, et restriction par niveau hiérarchique.

## À confirmer auprès de la hiérarchie

- Voir circuit F.

## Améliorations recommandées

- Transfert formel entre unités non construit.

## Se déconnecter en sécurité

1. Cliquer sur le bouton **Déconnexion** en haut à droite de l'en-tête.
2. Ne pas se contenter de fermer l'onglet, surtout sur un poste partagé.
3. La session se ferme d'elle-même après **60 minutes d'inactivité** (15 minutes pour les comptes qui détiennent un droit sensible) et au plus tard après **10 heures**.

