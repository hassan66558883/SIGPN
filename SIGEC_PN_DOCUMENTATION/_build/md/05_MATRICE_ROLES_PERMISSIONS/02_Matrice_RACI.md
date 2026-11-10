# Matrice RACI

**Responsable (R), Approbateur (A), Consulté (C), Informé (I) pour chaque procédure**

| Rubrique | Valeur |
|---|---|
| Système | SIGEC-PN / SIGPN-T — Système d'information de gestion de la Police nationale du Tchad |
| Éditeur et développeur | TECHNOTCHAD |
| Version du document | 1.0 — 10 novembre 2026 |
| Statut | Projet pour validation par la hiérarchie : les points marqués « À confirmer » ne sont pas des décisions |
| Source des informations | Lecture seule du système existant (code, catalogue des rôles et droits, écrans) — aucune donnée, aucun compte, aucun rôle, aucune permission n'a été modifié |

> **Méthode.** Cette matrice est **calculée automatiquement à partir des droits** réellement attribués aux rôles du système ; elle n'exprime pas l'organigramme officiel. R = peut accomplir l'acte ; A = peut le valider ou en décider (le demandeur lui-même est exclu par le système pour mandats, avis et approbations : règle des quatre yeux) ; C = peut consulter ; I = reçoit une notification. « R/A » = le même profil accomplit et décide (ex. commissaire pour une affectation). Une case vide = aucun rôle. **L'attribution officielle des responsabilités doit être confirmée par la hiérarchie.**

Rôles (colonnes) : **1** = Administrateur technique ; **2** = Administrateur de sécurité ; **3** = Administrateur de la police (système d'information) ; **4** = Commandement national (Direction générale) ; **5** = Délégué provincial de police ; **6** = Commissaire (chef de commissariat) ; **7** = Enquêteur ; **8** = Agent d'accueil / de permanence ; **9** = Agent de patrouille ; **10** = Officier de police (désigné OPJ dans le système) ; **11** = Agent de garde à vue ; **12** = Responsable des scellés et pièces à conviction ; **13** = Agent de circulation ; **14** = Superviseur circulation ; **15** = Responsable financier / paiements ; **16** = Directeur des ressources humaines ; **17** = Auditeur ; **18** = Magistrat du parquet (consultation)

| Procédure | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|---|---|---|---|
| Enregistrer une plainte |  |  | A | A | R/A | R/A | R | R | C |
| Examiner, affecter, convertir une plainte |  |  | R/A | R/A | R/A | R/A | C | C | C |
| Instruire une affaire |  |  | A | A | R/A | R/A | R | C | C |
| Transmettre ou clôturer une affaire |  |  | R/A | R/A | R/A | R/A | C | C | C |
| Archiver une affaire |  |  | R/A | R/A | R/A | C | C | C | C |
| Demander un mandat |  |  | A | A | R/A | R/A | R | C | C |
| Approuver / exécuter un mandat |  |  | R/A | R/A | R/A | R/A | R | C | C |
| Émettre un avis de recherche |  |  | A | A | R/A | R/A | R | I | I |
| Vérifier un avis de recherche |  |  | R/A | R/A | R/A | R/A | C | C | C |
| Publier un avis sur le site public |  |  | R/A | R/A | R/A | R/A | C | C | C |
| Recevoir et acquitter une alerte |  |  | R/A | R/A | R/A | R/A | R | R | R |
| Enregistrer une arrestation |  |  | C | C | R/A | R/A | R/A | R | R |
| Ouvrir et surveiller une garde à vue |  |  | R/A | R/A | R/A | R/A | C | C | C |
| Prolonger une garde à vue |  |  | R/A | R/A | R/A | R/A | C | C | C |
| Signaler et clore un incident |  |  | C | C | R/A | R/A | R/A | R/A | R/A |
| Planifier une patrouille |  |  | R/A | R/A | R/A | R/A | C | C | R/A |
| Enregistrer une pièce à conviction |  |  | C | C | R | R | R | C | C |
| Contrôle routier et PV |  |  | R/A | A | R/A | R/A | C | C | R |
| Encaisser une amende |  |  | R |  |  |  |  |  |  |
| Versement de recettes |  |  | C |  |  |  |  |  |  |
| Créer un compte utilisateur |  | R | R/A | R/A | R/A | R/A |  |  |  |
| Modifier les droits d'un rôle | R | C | A | A | A | A |  |  |  |
| Proposer et exécuter une mutation |  |  | R | R/A | R/A | R |  |  |  |
| Demande et décision de congé |  |  | R/A | R/A | R/A | R/A |  |  |  |
| Paie |  |  |  |  |  |  |  |  |  |
| Traiter un dépôt du site public |  |  | R/A | R/A | R/A | R/A |  |  |  |
| Consulter le journal d'audit |  | C | C | C |  |  |  |  |  |

| Procédure | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 |
|---|---|---|---|---|---|---|---|---|---|
| Enregistrer une plainte | C | C | C |  |  |  |  | C | C |
| Examiner, affecter, convertir une plainte | C | C | C |  |  |  |  | C | C |
| Instruire une affaire | C | C | C |  |  |  |  | C | C |
| Transmettre ou clôturer une affaire | C | C | C |  |  |  |  | C | C |
| Archiver une affaire | C | C | C |  |  |  |  | C | C |
| Demander un mandat | C | C | C |  |  |  |  | C | C |
| Approuver / exécuter un mandat | C | C | C |  |  |  |  | C | C |
| Émettre un avis de recherche | I | I | I | I | I |  |  | I | I |
| Vérifier un avis de recherche | C | C | C | C | C |  |  | C | C |
| Publier un avis sur le site public | C | C | C | C | C |  |  | C | C |
| Recevoir et acquitter une alerte | R | R | R | R | R |  |  | R | R |
| Enregistrer une arrestation | C | A | C |  |  |  |  | C | C |
| Ouvrir et surveiller une garde à vue | C | R | C |  |  |  |  | C | C |
| Prolonger une garde à vue | C | C | C |  |  |  |  | C | C |
| Signaler et clore un incident | C | C | C | C |  |  |  | C | C |
| Planifier une patrouille | C | C | C | C |  |  |  | C | C |
| Enregistrer une pièce à conviction | C | C | R/A |  |  |  |  | C | C |
| Contrôle routier et PV | R |  |  | R | A | A |  | C | C |
| Encaisser une amende | R |  |  | R | C | R/A |  |  |  |
| Versement de recettes | R |  |  | R | C | R/A |  |  |  |
| Créer un compte utilisateur |  |  |  |  |  |  |  | C | C |
| Modifier les droits d'un rôle |  |  |  |  |  |  |  | C | C |
| Proposer et exécuter une mutation |  |  |  |  |  |  | R |  |  |
| Demande et décision de congé |  |  |  |  |  |  | R/A |  |  |
| Paie |  |  |  |  |  |  |  |  |  |
| Traiter un dépôt du site public |  |  |  |  |  |  |  |  |  |
| Consulter le journal d'audit |  |  |  |  | C | C | C | C |  |

