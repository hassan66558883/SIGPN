# Fiche de profil — Agent de patrouille

**Manuel individuel du profil `PATROL_OFFICER`**

| Rubrique | Valeur |
|---|---|
| Système | SIGEC-PN / SIGPN-T — Système d'information de gestion de la Police nationale du Tchad |
| Éditeur et développeur | TECHNOTCHAD |
| Version du document | 1.0 — 10 novembre 2026 |
| Statut | Projet pour validation par la hiérarchie : les points marqués « À confirmer » ne sont pas des décisions |
| Source des informations | Lecture seule du système existant (code, catalogue des rôles et droits, écrans) — aucune donnée, aucun compte, aucun rôle, aucune permission n'a été modifié |

## Fiche d'identité du profil

| Élément | Valeur |
|---|---|
| Type de compte (code système) | `PATROL_OFFICER` |
| Fonction | Agent de patrouille |
| Famille | Terrain et accueil |
| Niveau hiérarchique (périmètre) | Commissariat (son unité et ses postes rattachés) |
| Service d'affectation | Celui du compte (commissariat, délégation, direction) : il fixe ce que l'utilisateur voit |
| Second facteur exigé par le rôle | Non (peut être exigé si l'utilisateur détient un droit sensible) |
| Supérieur hiérarchique (selon le périmètre du système) | Commissaire de son commissariat (ou superviseur de patrouille) — organigramme officiel à confirmer |
| Destinataires de ses rapports et transmissions | Superviseur de patrouille et commissaire |
| Nombre de droits | 40 sur 157 |
| Droits sensibles détenus | 0 |
| Comptes de démonstration | `patrol.cs1` |

**Responsabilité :** Agent de terrain : patrouilles et signalement d'incidents.

## Modules accessibles (menu)

- **Général** : Tableau de bord
- **Accueil** : Plaintes, Incidents, Personnes, Personnes recherchées, Alertes nationales
- **Enquête** : Affaires, Mes tâches, Pièces & chaîne de possession, Biométrie & police scientifique
- **Contrainte** : Mandats, Arrestations, Garde à vue
- **Circulation routière** : Tableau de bord trafic, Contrôles routiers, Procès-verbaux, Amendes & paiements, Conducteurs, Véhicules & immatriculations, Catalogue des infractions, Recherche circulation
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
| Personnes | Voir les personnes; Créer une personne |
| Personnes recherchées | Voir les personnes recherchées |
| Biométrie | Voir l'historique des recherches biométriques; Recherche par plaque (ANPR) |
| Alertes nationales | Recevoir et lire les alertes de son unité; Acquitter une alerte pour l'unité |
| Plaintes | Voir les plaintes |
| Affaires | Voir les affaires |
| Enquêtes | Voir les enquêtes et tâches |
| Déclarations | Voir les déclarations |
| Auditions | Voir les auditions |
| Transcriptions | Voir les transcriptions |
| Preuves | Voir les preuves |
| Mandats | Voir les mandats |
| Arrestations | Voir les arrestations; Enregistrer une arrestation |
| Gardes à vue | Voir les gardes à vue |
| Patrouilles | Voir les patrouilles; Planifier et gérer les patrouilles |
| Incidents | Voir les incidents; Signaler un incident; Modifier un incident |
| Opérations | Voir les opérations |
| Véhicules de service | Voir les véhicules de service |
| Maintenance | Voir la maintenance |
| Documents | Voir les documents; Déposer des documents |
| Rapports | Voir les rapports |
| Circulation | Voir contrôles, PV et amendes; Enregistrer un contrôle et émettre un PV; Voir le tableau de bord circulation; Voir les conducteurs; Joindre des preuves à un contrôle; Voir les véhicules (circulation); Voir le catalogue des infractions |
| Clés d'accès (API) | Gérer ses propres clés d'accès |

Les droits marqués *(sensible)* n'agissent que si le compte a l'habilitation requise (droit sensible = habilitation « Sensible » ou « Confidentiel », attribuée par l'administrateur de sécurité).

## Opérations interdites (principales)

Ce profil **ne peut pas** : Exporter en PDF les listes et fiches ; Enregistrer une plainte ; Examiner / affecter une plainte ; Ouvrir une affaire ; Transmettre ou clôturer une affaire ; Voir les affaires sensibles ; Demander un mandat ; Approuver un mandat ; Créer un avis de recherche ; Approuver un avis de recherche ; Publier un avis sur le site public ; Gérer une garde à vue ; Prolonger une garde à vue ; Enregistrer une pièce à conviction ; Enregistrer un paiement d'amende ; Créer un compte ; Modifier les droits d'un rôle ; Décider d'une approbation ; Consulter le journal d'audit ; Enregistrer une décision de carrière ; Voir les dossiers disciplinaires ; Voir la paie ; Lancer des sauvegardes.

Toute opération qui n'est pas dans la liste des opérations autorisées est refusée par le système.

## Documents

| Il peut… | Documents |
|---|---|
| Créer | Fiche d'arrestation; Incident; Patrouille et son rapport; Contrôle routier et procès-verbal (PV); Fiche personne; Document téléversé |
| Consulter | Plaintes; Affaires; Mandats; Avis de recherche; Arrestations; Gardes à vue; Incidents; Patrouilles; Pièces à conviction; Fiches personnes; Contrôles, PV et amendes; Conducteurs; Véhicules; Fiches agents; Organisation; Alertes nationales |
| Transmettre | — |
| Valider / décider | — |

## Notifications reçues

- Incident de gravité élevée ou critique signalé
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

## Procédures — Incidents

### Signaler un incident

1. Menu **Incidents** > **Nouvel incident**.
2. Choisir type et gravité, titre, description (10 caractères au moins), lieu.
3. Enregistrer : numéro INC-… ; en gravité Élevée ou Critique, les responsables sont alertés.

### Faire évoluer et clôturer un incident

1. Ouvrir l'incident.
2. Changer l'état : **En intervention**, **Sur place**, **Résolu** (rapport d'au moins 10 caractères obligatoire), **Clôturé**.
3. Si une infraction doit être instruite : **Escalader en affaire**.

## Procédures — Patrouilles

### Planifier et suivre une patrouille

1. Menu **Patrouilles** > **Nouvelle patrouille** : zone, équipe de poste, mission, superviseur, véhicule, agents.
2. Au départ : **Démarrer** (kilométrage de départ).
3. À la fin : **Terminer** avec le rapport et le kilométrage final. Annulation possible avec motif.

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

## Procédures — Arrestations

### Enregistrer une arrestation

1. Menu **Arrestations** > **Nouvelle arrestation**.
2. Choisir la personne, le fondement (mandat, flagrant délit, ordre du tribunal, cause probable, autre), le lieu, les chefs d'accusation, les circonstances, l'heure de lecture des droits.
3. Si le fondement est un mandat : le sélectionner (il doit être actif, non expiré, et viser la même personne).
4. Enregistrer : statut **Enregistrée**.

## Procédures — Circulation

### Contrôle routier et procès-verbal

1. Menu **Circulation routière** > **Contrôles routiers** > **Nouveau contrôle**.
2. Saisir conducteur, véhicule (plaque), lieu, résultat.
3. En cas d'infraction : choisir dans le **catalogue des infractions**, joindre des photos, émettre le **PV**.
4. Si le conducteur ou le véhicule correspond à un avis de recherche, le commandement est averti.

## Procédures — Alertes

### Consulter les alertes de son unité

1. Menu **Alertes nationales** : liste des avis reçus par l'unité.

### Se connecter

1. Ouvrir l'adresse du système dans le navigateur (l'adresse vous est communiquée par votre administration).
2. Saisir votre **identifiant** et votre **mot de passe**, puis cliquer sur **Se connecter**.
3. Si votre profil exige un **second facteur**, saisir le code à 6 chiffres de l'application d'authentification de votre téléphone. Le code change toutes les 30 secondes et ne sert qu'une seule fois : si le code est refusé, attendre le suivant.
4. À la première connexion (ou après une réinitialisation), le système demande de **choisir un nouveau mot de passe** : au moins 12 caractères, avec au moins trois types parmi minuscules, majuscules, chiffres et symboles ; il ne doit contenir ni votre identifiant ni votre nom de courriel, ni être un mot de passe courant.
5. Après **5 échecs** de connexion, le compte est verrouillé 15 minutes. Mot de passe oublié : utiliser le lien de la page de connexion ; votre demande est transmise à l'administrateur de sécurité qui vous remet un lien à usage unique valable 60 minutes.

> Ne communiquez jamais votre mot de passe ni votre code : tout ce qui est fait avec votre compte est enregistré à votre nom.

### Se déconnecter en sécurité

1. Cliquer sur le bouton **Déconnexion** en haut à droite de l'en-tête.
2. Ne pas se contenter de fermer l'onglet, surtout sur un poste partagé.
3. La session se ferme d'elle-même après **60 minutes d'inactivité** (15 minutes pour les comptes qui détiennent un droit sensible) et au plus tard après **10 heures**.

## Points à confirmer

- Intitulé officiel de la fonction et rattachement hiérarchique exact.
