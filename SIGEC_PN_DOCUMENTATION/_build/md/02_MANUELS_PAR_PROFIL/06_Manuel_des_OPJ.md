# Manuel des officiers de police judiciaire (OPJ)

**Manuel d'utilisation, pas à pas, à partir de ce que le système permet réellement**

| Rubrique | Valeur |
|---|---|
| Système | SIGEC-PN / SIGPN-T — Système d'information de gestion de la Police nationale du Tchad |
| Éditeur et développeur | TECHNOTCHAD |
| Version du document | 1.0 — 10 novembre 2026 |
| Statut | Projet pour validation par la hiérarchie : les points marqués « À confirmer » ne sont pas des décisions |
| Source des informations | Lecture seule du système existant (code, catalogue des rôles et droits, écrans) — aucune donnée, aucun compte, aucun rôle, aucune permission n'a été modifié |

## À qui s'adresse ce manuel

Officiers de police dotés du profil « Officier de police (OPJ) ».

## Responsabilités

- Enregistrer les contrôles et PV routiers, tenir les fiches conducteurs et véhicules.
- Enregistrer les personnes.

> **Point d'attention.** Dans l'état actuel du système, le profil décrit comme « OPJ » **n'a pas** les droits de créer une plainte, d'ouvrir une affaire, de demander un mandat ou d'enregistrer une arrestation : ces actes relèvent d'autres profils (agent d'accueil, enquêteur, commissaire). Les pouvoirs juridiques propres à l'OPJ ne sont **pas** modélisés.

### Se connecter

1. Ouvrir l'adresse du système dans le navigateur (l'adresse vous est communiquée par votre administration).
2. Saisir votre **identifiant** et votre **mot de passe**, puis cliquer sur **Se connecter**.
3. Si votre profil exige un **second facteur**, saisir le code à 6 chiffres de l'application d'authentification de votre téléphone. Le code change toutes les 30 secondes et ne sert qu'une seule fois : si le code est refusé, attendre le suivant.
4. À la première connexion (ou après une réinitialisation), le système demande de **choisir un nouveau mot de passe** : au moins 12 caractères, avec au moins trois types parmi minuscules, majuscules, chiffres et symboles ; il ne doit contenir ni votre identifiant ni votre nom de courriel, ni être un mot de passe courant.
5. Après **5 échecs** de connexion, le compte est verrouillé 15 minutes. Mot de passe oublié : utiliser le lien de la page de connexion ; votre demande est transmise à l'administrateur de sécurité qui vous remet un lien à usage unique valable 60 minutes.

> Ne communiquez jamais votre mot de passe ni votre code : tout ce qui est fait avec votre compte est enregistré à votre nom.

### Présentation du tableau de bord

Après connexion, le **Tableau de bord** résume les chiffres de votre périmètre. Le menu de gauche (ou le bouton de navigation sur téléphone) donne accès aux modules autorisés. Les modules que vous ne voyez pas ne sont pas accessibles à votre profil. Le système est disponible en **français et en arabe** (sélecteur de langue dans l'en-tête).

## Fiche d'identité du profil

| Élément | Valeur |
|---|---|
| Type de compte (code système) | `OFFICER` |
| Fonction | Officier de police (désigné OPJ dans le système) |
| Famille | Terrain et accueil |
| Niveau hiérarchique (périmètre) | Commissariat (son unité et ses postes rattachés) |
| Service d'affectation | Celui du compte (commissariat, délégation, direction) : il fixe ce que l'utilisateur voit |
| Second facteur exigé par le rôle | Non (peut être exigé si l'utilisateur détient un droit sensible) |
| Supérieur hiérarchique (selon le périmètre du système) | Commissaire de son commissariat — organigramme officiel à confirmer |
| Destinataires de ses rapports et transmissions | Commissaire |
| Nombre de droits | 40 sur 157 |
| Droits sensibles détenus | 0 |
| Comptes de démonstration | `officer.cs1` |

**Responsabilité :** Officier de police (désigné « OPJ » dans la description du rôle) : enregistre les contrôles et PV routiers, tient les fiches conducteurs et véhicules, enregistre les personnes. Dans l'état actuel du système ce rôle n'a pas de droit de création de plainte ni de pouvoir judiciaire propre.

## Modules accessibles (menu)

- **Général** : Tableau de bord
- **Accueil** : Plaintes, Incidents, Personnes, Personnes recherchées, Alertes nationales
- **Enquête** : Affaires, Mes tâches, Pièces & chaîne de possession
- **Contrainte** : Mandats, Arrestations, Garde à vue
- **Circulation routière** : Tableau de bord trafic, Contrôles routiers, Procès-verbaux, Amendes & paiements, Conducteurs, Véhicules & immatriculations, Catalogue des infractions, Recherche circulation
- **Recettes et versements** : Caisse des agents, Recettes collectées, Clôture de caisse, Versements, Bordereaux, Écarts
- **Opérations** : Patrouilles
- **Ressources** : Agents
- **Ressources humaines** : Mes congés, Ma solde
- **Administration** : Organisation

## Tableau de bord

Ce profil voit, **dans son périmètre**, : Nombre d'agents actifs; Incidents de la période, répartition par type, tendance, incidents récents; Affaires ouvertes; Plaintes reçues sur la période; Avis de recherche actifs, avis récents; Tableau de bord circulation (menu Circulation).

## Opérations autorisées (par module)

| Module | Opérations autorisées |
|---|---|
| Tableau de bord | Voir le tableau de bord |
| Organisation | Voir l'organisation |
| Agents (officiers) | Voir les agents |
| Personnes | Voir les personnes; Créer une personne; Modifier une personne |
| Personnes recherchées | Voir les personnes recherchées |
| Alertes nationales | Recevoir et lire les alertes de son unité; Acquitter une alerte pour l'unité |
| Plaintes | Voir les plaintes |
| Affaires | Voir les affaires |
| Enquêtes | Voir les enquêtes et tâches |
| Déclarations | Voir les déclarations |
| Auditions | Voir les auditions |
| Transcriptions | Voir les transcriptions |
| Preuves | Voir les preuves |
| Mandats | Voir les mandats |
| Arrestations | Voir les arrestations |
| Gardes à vue | Voir les gardes à vue |
| Patrouilles | Voir les patrouilles |
| Incidents | Voir les incidents |
| Opérations | Voir les opérations |
| Véhicules de service | Voir les véhicules de service |
| Maintenance | Voir la maintenance |
| Documents | Voir les documents; Déposer des documents |
| Rapports | Voir les rapports |
| Circulation | Voir contrôles, PV et amendes; Enregistrer un contrôle et émettre un PV; Voir le tableau de bord circulation; Gérer les conducteurs; Voir les conducteurs; Joindre des preuves à un contrôle; Gérer les véhicules (circulation); Voir les véhicules (circulation); Voir le catalogue des infractions |
| Caisses et recettes | Encaisser une amende sur le terrain; Déclarer un versement; Ouvrir, voir et clore sa propre caisse |
| Clés d'accès (API) | Gérer ses propres clés d'accès |

Les droits marqués *(sensible)* n'agissent que si le compte a l'habilitation requise (droit sensible = habilitation « Sensible » ou « Confidentiel », attribuée par l'administrateur de sécurité).

## Opérations interdites (principales)

Ce profil **ne peut pas** : Exporter en PDF les listes et fiches ; Enregistrer une plainte ; Examiner / affecter une plainte ; Ouvrir une affaire ; Transmettre ou clôturer une affaire ; Voir les affaires sensibles ; Demander un mandat ; Approuver un mandat ; Créer un avis de recherche ; Approuver un avis de recherche ; Publier un avis sur le site public ; Enregistrer une arrestation ; Gérer une garde à vue ; Prolonger une garde à vue ; Enregistrer une pièce à conviction ; Enregistrer un paiement d'amende ; Créer un compte ; Modifier les droits d'un rôle ; Décider d'une approbation ; Consulter le journal d'audit ; Enregistrer une décision de carrière ; Voir les dossiers disciplinaires ; Voir la paie ; Lancer des sauvegardes.

Toute opération qui n'est pas dans la liste des opérations autorisées est refusée par le système.

## Documents

| Il peut… | Documents |
|---|---|
| Créer | Contrôle routier et procès-verbal (PV); Caisse et état journalier; Déclaration de versement; Fiche personne; Document téléversé |
| Consulter | Plaintes; Affaires; Mandats; Avis de recherche; Arrestations; Gardes à vue; Incidents; Patrouilles; Pièces à conviction; Fiches personnes; Contrôles, PV et amendes; Conducteurs; Véhicules; Fiches agents; Organisation; Alertes nationales |
| Transmettre | Versement vers le responsable financier |
| Valider / décider | — |

## Notifications reçues

- Versement rejeté / justification demandée
- Alertes nationales (avis de recherche) de son unité

## Procédures — Personnes

### Enregistrer une personne

1. Menu **Personnes** > bouton **Nouvelle personne**.
2. Chercher d'abord si la personne existe déjà (nom, numéro, pièce d'identité) pour éviter un doublon.
3. Renseigner prénom, nom, sexe, date et lieu de naissance, téléphone, adresse, pièce d'identité.
4. Cliquer **Enregistrer**. Si le système signale un doublon probable, choisir la fiche existante ; ne forcer la création que si c'est réellement une autre personne.

> **À savoir :** Un numéro PID-AAAA-NNNNNN est attribué.

## Procédures — Affaires

### Suivre ses tâches

1. Menu **Mes tâches**.
2. Changer l'état d'une tâche : à faire, en cours, bloquée, terminée, annulée, avec un résultat.

## Procédures — Personnes recherchées

### Rechercher une personne

1. Menu **Personnes recherchées** : saisir nom, alias, numéro ou plaque dans la recherche rapide.
2. Lire le résultat : **correspondance**, **connu** ou **aucun résultat**.
3. Pour affiner : **Recherche avancée**.

> **À savoir :** Une correspondance n'est jamais une preuve : vérifier l'identité avant d'agir.

## Procédures — Alertes

### Recevoir et acquitter une alerte nationale

1. Un bandeau rouge apparaît sur toutes les pages dans les 20 secondes.
2. Menu **Alertes nationales** > ouvrir l'alerte.
3. **Marquer comme lu**, puis **Acquitter**. L'acquittement est horodaté pour votre unité.

> **À savoir :** Sans acquittement, l'alerte est relancée puis remontée à votre hiérarchie.

## Procédures — Circulation

### Contrôle routier et procès-verbal

1. Menu **Circulation routière** > **Contrôles routiers** > **Nouveau contrôle**.
2. Saisir conducteur, véhicule (plaque), lieu, résultat.
3. En cas d'infraction : choisir dans le **catalogue des infractions**, joindre des photos, émettre le **PV**.
4. Si le conducteur ou le véhicule correspond à un avis de recherche, le commandement est averti.

## Procédures — Recettes

### Ouvrir et clore sa caisse

1. Menu **Recettes** > **Caisses** > **Ouvrir ma caisse**.
2. Encaisser les amendes au fil de la journée.
3. En fin de journée : **Clore** ; le montant à verser est calculé.

### Déclarer un versement

1. Menu **Recettes** > **Versements** > **Nouveau versement** : montant, mode, justificatif.
2. Le responsable est notifié pour vérification.

## Procédures — Alertes

### Consulter les alertes de son unité

1. Menu **Alertes nationales** : liste des avis reçus par l'unité.

## Fonctions que le système ne propose pas (encore)

Pour éviter toute confusion, voici ce que vous ne trouverez **pas** dans les menus, même si vous en avez l'habitude dans le travail : un registre de **main courante** distinct (le module Incidents s'en rapproche), les **procès-verbaux d'audition et déclarations**, un écran **Enquêtes** dédié, un transfert de **dossier entre commissariats** avec acceptation ou refus, les **rapports** et **statistiques** généraux (seuls le tableau de bord et les rapports de recettes existent), les **archives/documents**, la recherche globale, l'envoi de SMS ou de courriels.

### Se déconnecter en sécurité

1. Cliquer sur le bouton **Déconnexion** en haut à droite de l'en-tête.
2. Ne pas se contenter de fermer l'onglet, surtout sur un poste partagé.
3. La session se ferme d'elle-même après **60 minutes d'inactivité** (15 minutes pour les comptes qui détiennent un droit sensible) et au plus tard après **10 heures**.

## Points à confirmer auprès de la hiérarchie

- Quels actes l'OPJ doit pouvoir accomplir dans le système (plaintes, procès-verbaux, arrestations, gardes à vue) : décision de la hiérarchie et du ministère de la Justice.
- Distinction OPJ / agent de police judiciaire (APJ) : non modélisée.

## Améliorations recommandées

- Rapports périodiques automatiques vers le niveau supérieur (module Rapports non construit).
- Alerte de relance pour les dossiers sans suite (non construite).

