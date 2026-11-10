# Module 4 — Gestion des plaintes

**Manuel de gestion — Gestion des plaintes**

| Rubrique | Valeur |
|---|---|
| Système | SIGEC-PN / SIGPN-T — Système d'information de gestion de la Police nationale du Tchad |
| Éditeur et développeur | TECHNOTCHAD |
| Version du document | 1.0 — 10 novembre 2026 |
| Statut | Projet pour validation par la hiérarchie : les points marqués « À confirmer » ne sont pas des décisions |
| Source des informations | Lecture seule du système existant (code, catalogue des rôles et droits, écrans) — aucune donnée, aucun compte, aucun rôle, aucune permission n'a été modifié |

**Disponibilité dans le système : Disponible.**  Écran : `/complaints`

## Objectif

Enregistrer, examiner, affecter, convertir en affaire ou clore les plaintes reçues au commissariat ou déposées sur le portail public.

## Utilisateurs concernés

| Profil | Niveau d'accès | Droits du module |
|---|---|---|
| Commandement national (Direction générale) | Consultation et opérations | 8 |
| Délégué provincial de police | Consultation et opérations | 10 |
| Commandant de département (rôle dormant) | Consultation et opérations | 10 |
| Commissaire (chef de commissariat) | Consultation et opérations | 10 |
| Enquêteur | Consultation et opérations | 3 |
| Agent d'accueil / de permanence | Consultation et opérations | 3 |
| Agent de patrouille | Consultation seule | 1 |
| Responsable des scellés et pièces à conviction | Consultation seule | 1 |
| Agent de garde à vue | Consultation seule | 1 |
| Analyste criminel | Consultation seule | 1 |
| Auditeur | Consultation seule | 1 |
| Agent biométrie | Consultation seule | 1 |
| Agent de police technique et scientifique | Consultation seule | 1 |
| Magistrat du parquet (consultation) | Consultation seule | 1 |
| Administrateur de la police (système d'information) | Consultation et opérations | 8 |
| Officier de police (désigné OPJ dans le système) | Consultation seule | 1 |

## Fonctionnalités

- Liste filtrée (statut, priorité, catégorie, période, recherche).
- Création : brouillon ou enregistrement immédiat.
- Examen, affectation, conversion en affaire, clôture ou rejet avec motif.
- Plainte anonyme possible.
- Journal d'audit de chaque action.

## Formulaires

| Formulaire | Champs |
|---|---|
| Nouvelle plainte | Plaignant (ou anonyme) ; catégorie (20) ; titre (5–200 car.) ; description (20–5000 car.) ; date de l'incident ; lieu (≤300 car.) ; commissariat ; priorité (Basse/Normale/Haute/Urgente). |
| Examiner | Observations (≤2000 car.) ; priorité. |
| Affecter | Enquêteur ; observations. |
| Clôturer / rejeter | Issue (Clôturée ou Rejetée) ; motif (5–1000 car.). |
| Convertir en affaire | Titre ; enquêteur responsable ; affaire sensible (case). |

## Étapes d'utilisation

1. Plaintes > Nouvelle plainte.
2. Choisir ou créer le plaignant.
3. Renseigner les faits ; Enregistrer et soumettre.
4. Le commissaire examine, affecte, convertit ou clôture.

## Résultats

Une plainte numérotée CMP-AAAA-NNNNN, avec statut, responsable, historique ; éventuellement une affaire liée.

## Droits du module

| Droit (code) | Opération | Sensible | Profils qui le détiennent |
|---|---|---|---|
| `intake:view` | Voir les dépôts du site public |  | Commandement national (Direction générale), Délégué provincial de police, Commandant de département (rôle dormant), Commissaire (chef de commissariat), Administrateur de la police (système d'information) |
| `intake:manage` | Traiter les dépôts du site public |  | Commandement national (Direction générale), Délégué provincial de police, Commandant de département (rôle dormant), Commissaire (chef de commissariat), Administrateur de la police (système d'information) |
| `public:content` | Gérer le contenu du site public |  | Commandement national (Direction générale), Délégué provincial de police, Commandant de département (rôle dormant), Commissaire (chef de commissariat), Administrateur de la police (système d'information) |
| `complaints:view` | Voir les plaintes |  | 16 profils |
| `complaints:create` | Enregistrer une plainte |  | Délégué provincial de police, Commandant de département (rôle dormant), Commissaire (chef de commissariat), Enquêteur, Agent d'accueil / de permanence |
| `complaints:update` | Modifier une plainte |  | Délégué provincial de police, Commandant de département (rôle dormant), Commissaire (chef de commissariat), Enquêteur, Agent d'accueil / de permanence |
| `complaints:review` | Examiner une plainte |  | Commandement national (Direction générale), Délégué provincial de police, Commandant de département (rôle dormant), Commissaire (chef de commissariat), Administrateur de la police (système d'information) |
| `complaints:assign` | Affecter une plainte |  | Commandement national (Direction générale), Délégué provincial de police, Commandant de département (rôle dormant), Commissaire (chef de commissariat), Administrateur de la police (système d'information) |
| `complaints:convert` | Convertir une plainte en affaire |  | Commandement national (Direction générale), Délégué provincial de police, Commandant de département (rôle dormant), Commissaire (chef de commissariat), Administrateur de la police (système d'information) |
| `complaints:close` | Clôturer ou rejeter une plainte |  | Commandement national (Direction générale), Délégué provincial de police, Commandant de département (rôle dormant), Commissaire (chef de commissariat), Administrateur de la police (système d'information) |

## Circuit A — Circuit d'une plainte

Une plainte est reçue à l'accueil d'un commissariat (ou déposée par un citoyen sur le portail public, voir circuit H), enregistrée dans le système, examinée par le commissaire, affectée à un enquêteur, puis transformée en **affaire** (dossier d'enquête) qui est instruite, transmise ou clôturée.

**Modules concernés :** Plaintes, Personnes, Affaires, Tâches, Preuves

![Diagramme du circuit A](../04_WORKFLOWS/img/A_plainte.png)

### Étapes détaillées

| N° | Qui | Action | Précisions du système | Statut après l'étape |
|---|---|---|---|---|
| 1 | Agent d'accueil | Accueille le plaignant (étape physique, hors système) et lui explique ce qui sera enregistré. | Aucune saisie à cette étape. |  |
| 2 | Agent d'accueil | Identifie le plaignant : Personnes > recherche ; s'il n'existe pas, Nouvelle personne (nom, prénom, naissance, téléphone, pièce d'identité). Une plainte anonyme est possible (case « Plainte anonyme »). | Le système signale un doublon probable ; il faut alors choisir la fiche existante ou confirmer expressément la création (« forcer »). |  |
| 3 | Agent d'accueil | Plaintes > Nouvelle plainte : catégorie (20 catégories), titre (5 à 200 caractères), description des faits (20 à 5000 caractères), date et lieu des faits, priorité (Basse, Normale, Haute, Urgente), commissariat récepteur. | Deux boutons : enregistrer en brouillon, ou enregistrer et soumettre. | Brouillon (DRAFT) ou Enregistrée (REGISTERED) |
| 4 | Système | Attribue le numéro automatique (CMP-AAAA-NNNNN), horodate, journalise, et avertit les titulaires du droit « examiner les plaintes » du commissariat. | Notification : « Nouvelle plainte à examiner » (type Approbation). | Enregistrée |
| 5 | Chef de service / Commissaire | Ouvre la plainte, consulte les faits, ajoute ses observations et ajuste la priorité : action « Examiner ». | Le brouillon doit d'abord être enregistré (soumis). | En examen (UNDER_REVIEW) |
| 6 | Chef de service / Commissaire | Choisit l'enquêteur : action « Affecter ». L'enquêteur doit être actif, dans le périmètre du commissariat et avoir le droit de traiter plaintes ou affaires. | Notification à l'enquêteur : « Plainte affectée à vous » (type Affectation). | Affectée (ASSIGNED) |
| 7 | Chef de service / Commissaire | Les faits justifient-ils une enquête ? OUI : convertir en affaire. NON : classer (Clôturer) ou rejeter, avec un motif écrit d'au moins 5 caractères. | Clôture / rejet : notification de l'enquêteur déjà affecté ; états définitifs. | Clôturée (CLOSED) ou Rejetée (REJECTED) |
| 8 | Chef de service / Commissaire | Action « Convertir en affaire » : titre, enquêteur responsable, case « Affaire sensible ». Le plaignant devient partie « Plaignant » de l'affaire ; la plainte garde le lien vers l'affaire. | Numéro d'affaire CASE-AAAA-NNNNN. Notification au responsable : « Nouvelle affaire qui vous est confiée ». | Plainte : Convertie (CONVERTED) ; Affaire : Affectée (ASSIGNED) ou Ouverte (OPEN) |
| 9 | Enquêteur | Instruit l'affaire : ajoute personnes (victime, témoin, mis en cause…), tâches, notes, pièces à conviction ; fait passer l'affaire « En enquête ». | Le journal chronologique de l'affaire enregistre chaque événement. | En enquête (UNDER_INVESTIGATION) |
| 10 | Enquêteur | Soumet l'affaire au contrôle du responsable : « Soumettre à examen ». | Notification aux titulaires du droit de clôture : « Affaire en attente d'examen du superviseur ». | En attente d'examen (PENDING_REVIEW) |
| 11 | Chef de service / Commissaire | Contrôle le travail. Peut RENVOYER à l'enquête pour correction (retour à En enquête), TRANSMETTRE, ou CLÔTURER. | Seuls les titulaires du droit de clôture peuvent transmettre ou clôturer ; la clôture exige une issue (résolue, non résolue, non fondée, transmise au parquet, transférée, classée). | Retournée / Transmise (REFERRED) / Clôturée (CLOSED) |
| 12 | Chef de service / Commissaire | Transmission : l'affaire passe en « Transmise » avec l'issue « Transmise au parquet » (ou « Transférée »). Le système enregistre la décision ; il n'envoie pas le dossier à une juridiction. | L'envoi réel du dossier à l'autorité judiciaire se fait hors système (voir « À confirmer »). | Transmise (REFERRED) |
| 13 | Chef de service / Commissaire | Clôture puis archivage : une affaire clôturée est en lecture seule ; l'archivage exige un droit distinct. | Statut final : Archivée (ARCHIVED). | Clôturée → Archivée |

### Règles appliquées par le système

- Le brouillon n'est visible que dans le périmètre du commissariat ; seul un brouillon, une plainte enregistrée ou en examen peut encore être modifiée.
- Les transitions de statut sont fixes : Brouillon → Enregistrée → En examen → Affectée → Convertie ; Clôturée et Rejetée sont possibles depuis Enregistrée, En examen ou Affectée ; Convertie, Clôturée et Rejetée sont définitives.
- Aucun enquêteur ne peut être affecté hors du périmètre de celui qui affecte.
- Toute action est inscrite au journal d'audit (qui, quand, avant/après).
- Une affaire marquée « sensible » n'est visible que de son équipe et des titulaires du droit « consulter les affaires sensibles ».

### Statuts

| Code | Libellé affiché | Signification |
|---|---|---|
| DRAFT | Brouillon | Saisie non soumise. |
| REGISTERED | Enregistrée | Soumise ; en attente d'examen. |
| UNDER_REVIEW | En examen | Examinée par le commissaire. |
| ASSIGNED | Affectée | Confiée à un enquêteur. |
| CONVERTED | Convertie | Transformée en affaire (définitif). |
| CLOSED | Clôturée | Classée avec motif (définitif). |
| REJECTED | Rejetée | Rejetée avec motif (définitif). |

| Code | Libellé affiché | Signification |
|---|---|---|
| OPEN | Ouverte | Affaire créée sans responsable. |
| ASSIGNED | Affectée | Responsable désigné. |
| UNDER_INVESTIGATION | En enquête | Instruction en cours. |
| PENDING_REVIEW | En attente d'examen | Soumise au contrôle du responsable. |
| REFERRED | Transmise | Décision de transmission enregistrée. |
| CLOSED | Clôturée | Issue enregistrée ; lecture seule. |
| ARCHIVED | Archivée | Archivage (droit distinct). |

### Notifications envoyées

| Événement | Destinataires | Message |
|---|---|---|
| Plainte enregistrée | Titulaires du droit « examiner les plaintes » du commissariat (sauf l'auteur) | Nouvelle plainte à examiner — CMP-… — titre |
| Plainte affectée | L'enquêteur désigné | Plainte affectée à vous |
| Plainte clôturée ou rejetée | L'enquêteur affecté, s'il y en a un | Plainte clôturée / rejetée — motif |
| Conversion en affaire | Le responsable désigné | Nouvelle affaire qui vous est confiée |
| Affaire créée sans responsable | Titulaires du droit « affecter les affaires » du commissariat | Nouvelle affaire en attente d'affectation |
| Affaire soumise à examen | Titulaires du droit de clôture du commissariat | Affaire en attente d'examen du superviseur |
| Changement de statut d'affaire | Le responsable de l'affaire (sauf l'auteur du changement) | Affaire — nouveau statut |
| Tâche confiée | La personne désignée | Tâche affectée à vous |

### Écrans

![Liste des plaintes (filtres, statuts, boutons)](../07_ANNEXES/captures/theme-complaints.png)

![Formulaire de nouvelle plainte](../07_ANNEXES/captures/theme-complaint-new.png)

![Liste des affaires](../07_ANNEXES/captures/theme-cases.png)

### À confirmer auprès de la hiérarchie

- Qui, dans l'organisation, joue le rôle de « chef de service » entre l'agent d'accueil et le commissaire : le système n'a pas de rôle distinct, c'est le Commissaire (ou toute personne portant le droit « examiner ») qui examine et affecte.
- Les règles de transmission au parquet (délais, pièces obligatoires, forme du bordereau) : le système enregistre seulement la décision de transmission.
- La compétence territoriale exacte pour qu'une plainte soit reçue ailleurs que dans le commissariat du lieu des faits.

### Ce que le système ne fait pas / améliorations recommandées

- Procès-verbaux d'enquête, déclarations et auditions : les écrans correspondants (Déclarations, Auditions, Enquêtes) sont prévus mais NON construits ; aujourd'hui les constats se consignent en notes d'affaire, tâches et pièces à conviction.
- Pas de génération de récépissé de plainte imprimable pour le plaignant.
- Pas de notification au plaignant (sauf via le portail public avec référence et code).

## À confirmer auprès de la hiérarchie

- Voir circuit A.

## Améliorations recommandées

- Aucune relevée.

## Se déconnecter en sécurité

1. Cliquer sur le bouton **Déconnexion** en haut à droite de l'en-tête.
2. Ne pas se contenter de fermer l'onglet, surtout sur un poste partagé.
3. La session se ferme d'elle-même après **60 minutes d'inactivité** (15 minutes pour les comptes qui détiennent un droit sensible) et au plus tard après **10 heures**.

