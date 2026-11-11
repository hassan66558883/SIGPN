# Fiche de profil — Administrateur de la police (système d'information)

**Manuel individuel du profil `POLICE_ADMIN`**

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
| Type de compte (code système) | `POLICE_ADMIN` |
| Fonction | Administrateur de la police (système d'information) |
| Famille | Administration et sécurité |
| Niveau hiérarchique (périmètre) | National (tout le pays) |
| Service d'affectation | Celui du compte (commissariat, délégation, direction) : il fixe ce que l'utilisateur voit |
| Second facteur exigé par le rôle | Oui |
| Supérieur hiérarchique (selon le périmètre du système) | Direction générale — organigramme officiel à confirmer |
| Destinataires de ses rapports et transmissions | Direction générale |
| Nombre de droits | 90 sur 157 |
| Droits sensibles détenus | 10 |
| Comptes de démonstration | `police.admin` |

**Responsabilité :** Administration nationale du système d'information de la police : utilisateurs, organisation et toutes les fonctions de circulation, avec des droits de commandement.

## Modules accessibles (menu)

- **Général** : Tableau de bord
- **Accueil** : Plaintes, Incidents, Personnes, Personnes recherchées, Approbations, Site public, Alertes nationales, Supervision des alertes
- **Enquête** : Affaires, Mes tâches, Pièces & chaîne de possession, Biométrie & police scientifique
- **Contrainte** : Mandats, Arrestations, Garde à vue
- **Circulation routière** : Tableau de bord trafic, Contrôles routiers, Procès-verbaux, Amendes & paiements, Paiements en ligne, Conducteurs, Véhicules & immatriculations, Catalogue des infractions, Recherche circulation
- **Recettes et versements** : Tableau de bord des recettes, Caisse des agents, Recettes collectées, Clôture de caisse, Versements, Bordereaux, Rapprochement, Écarts, Rapports financiers, Audit financier
- **Opérations** : Patrouilles
- **Ressources** : Agents
- **Ressources humaines** : Vue d'ensemble RH, Dossiers du personnel, Mutations, Affectation automatique, Présences, Congés et absences, Formations, Documents RH, Mes congés, Ma solde
- **Administration** : Organisation, Utilisateurs, Rôles & permissions, Journal d'audit

## Tableau de bord

Ce profil voit, **dans son périmètre**, : Nombre d'agents actifs; Incidents de la période, répartition par type, tendance, incidents récents; Affaires ouvertes; Plaintes reçues sur la période; Avis de recherche actifs, avis récents; Tableau de bord circulation (menu Circulation); Tableau de bord des recettes.

## Opérations autorisées (par module)

| Module | Opérations autorisées |
|---|---|
| Tableau de bord | Voir le tableau de bord |
| Statistiques | Voir les statistiques |
| Utilisateurs | Voir les comptes; Créer un compte; Modifier un compte; Voir et révoquer les sessions d'autrui; Activer, suspendre, désactiver, débloquer un compte; Émettre une réinitialisation de mot de passe |
| Rôles | Voir les rôles |
| Droits | Voir le catalogue des droits |
| Journal d'audit | Consulter le journal d'audit |
| Organisation | Voir l'organisation; Gérer la structure organisationnelle |
| Agents (officiers) | Voir les agents; Gérer les fiches agents |
| Personnes | Voir les personnes |
| Personnes recherchées | Voir les personnes recherchées; Approuver / annuler un avis (sensible); Vérifier un avis (quatre yeux); Exporter l'avis public (sensible); Publier un avis sur le site public (sensible) |
| Biométrie | Voir l'historique des recherches biométriques |
| Dépôts du site public | Voir les dépôts du site public; Traiter les dépôts du site public |
| Site public | Gérer le contenu du site public |
| Alertes nationales | Recevoir et lire les alertes de son unité; Acquitter une alerte pour l'unité; Superviser la diffusion des alertes |
| Plaintes | Voir les plaintes; Affecter une plainte; Examiner une plainte; Convertir une plainte en affaire; Clôturer ou rejeter une plainte |
| Affaires | Voir les affaires; Affecter une affaire; Transmettre ou clôturer une affaire; Archiver une affaire; Voir les affaires sensibles (sensible) |
| Enquêtes | Voir les enquêtes et tâches; Contrôler les enquêtes |
| Déclarations | Voir les déclarations |
| Auditions | Voir les auditions |
| Transcriptions | Voir les transcriptions; Approuver une transcription |
| Preuves | Voir les preuves |
| Mandats | Voir les mandats; Approuver ou rejeter un mandat (sensible); Annuler un mandat |
| Arrestations | Voir les arrestations |
| Gardes à vue | Voir les gardes à vue; Ouvrir, surveiller et clore une garde à vue; Prolonger une garde à vue (sensible) |
| Patrouilles | Voir les patrouilles; Planifier et gérer les patrouilles |
| Incidents | Voir les incidents |
| Opérations | Voir les opérations; Planifier les opérations; Approuver les opérations |
| Véhicules de service | Voir les véhicules de service |
| Maintenance | Voir la maintenance |
| Documents | Voir les documents; Voir les documents confidentiels (sensible) |
| Rapports | Voir les rapports; Exporter rapports et données (sensible) |
| Circulation | Voir contrôles, PV et amendes; Activer ou désactiver une infraction du catalogue; Enregistrer un contrôle et émettre un PV; Voir le tableau de bord circulation; Gérer les conducteurs; Voir les conducteurs; Joindre des preuves à un contrôle; Exporter listes et statistiques de circulation (sensible); Gérer le statut des amendes; Enregistrer un paiement d'amende et délivrer le reçu; Annuler un paiement saisi par erreur; Annuler un PV; Gérer les véhicules (circulation); Voir les véhicules (circulation); Voir le catalogue des infractions |
| Caisses et recettes | Voir caisses, recettes, versements et rapprochements; Voir et exporter les rapports de recettes |
| Ressources humaines | Voir les dossiers RH; Enregistrer l'appel quotidien; Paramétrer l'affectation automatique; Approuver ou rejeter un congé; Déposer une demande de congé; Proposer une mutation |
| Approbations | Voir les demandes d'approbation; Décider d'une demande d'approbation (sensible) |
| Clés d'accès (API) | Gérer ses propres clés d'accès |

Les droits marqués *(sensible)* n'agissent que si le compte a l'habilitation requise (droit sensible = habilitation « Sensible » ou « Confidentiel », attribuée par l'administrateur de sécurité).

## Opérations interdites (principales)

Ce profil **ne peut pas** : Exporter en PDF les listes et fiches ; Enregistrer une plainte ; Ouvrir une affaire ; Demander un mandat ; Créer un avis de recherche ; Enregistrer une arrestation ; Enregistrer une pièce à conviction ; Modifier les droits d'un rôle ; Enregistrer une décision de carrière ; Voir les dossiers disciplinaires ; Voir la paie ; Lancer des sauvegardes.

Toute opération qui n'est pas dans la liste des opérations autorisées est refusée par le système.

## Documents

| Il peut… | Documents |
|---|---|
| Créer | Garde à vue et son journal; Patrouille et son rapport; Contrôle routier et procès-verbal (PV); Paiement d'amende et reçu; Demande de création de compte; Proposition de mutation; Demande de congé |
| Consulter | Plaintes; Affaires; Affaires sensibles; Mandats; Avis de recherche; Arrestations; Gardes à vue; Incidents; Patrouilles; Pièces à conviction; Fiches personnes; Contrôles, PV et amendes; Conducteurs; Véhicules; Caisses, recettes et versements; Rapports de recettes; Journal d'audit; Dossiers RH; Fiches agents; Organisation; Alertes nationales; Dépôts du site public |
| Transmettre | Plainte vers un enquêteur; Plainte vers une affaire; Affaire vers un membre de l'équipe; Affaire vers le parquet (statut Transmise) ou clôture; Mutation vers les RH; Dépôt public converti en plainte interne; Garde à vue vers sa fin (parquet, tribunal, autre poste) |
| Valider / décider | Examen d'une plainte; Approbation / rejet d'un mandat; Vérification d'un avis; Approbation d'un avis; Publication publique d'un avis; Clôture d'une affaire; Archivage d'une affaire; Prolongation d'une garde à vue; Décision sur une demande d'approbation; Décision sur un congé; Annulation d'un PV; Annulation d'un paiement; Gestion du statut d'une amende; Approbation de transcription (écran non construit) |

## Notifications reçues

- Nouvelle plainte à examiner (commissariat)
- Nouvelle affaire en attente d'affectation ; travail à réaffecter après une mutation
- Affaire en attente d'examen du superviseur
- Demande d'approbation à décider
- Contrôle routier : correspondance avec un avis de recherche
- PV comportant un délit
- Demande de congé à décider
- Agents bientôt éligibles à la rotation ; officier arrivant / partant
- Demande de réinitialisation de mot de passe reçue
- Alertes nationales (avis de recherche) de son unité
- Escalade : avis du réseau sans prise en compte

## Procédures — Plaintes

### Examiner une plainte

1. Menu **Plaintes**, filtrer sur **Enregistrée**.
2. Ouvrir la plainte, lire les faits.
3. Cliquer **Examiner**, saisir ses observations, ajuster la priorité.
4. Le statut devient **En examen**.

### Affecter une plainte à un enquêteur

1. Ouvrir la plainte > **Affecter**.
2. Choisir l'enquêteur dans la liste (seuls les agents de votre périmètre habilités apparaissent).
3. Valider : l'enquêteur reçoit une notification.

### Convertir une plainte en affaire

1. Ouvrir la plainte examinée ou affectée > **Convertir en affaire**.
2. Vérifier le titre, choisir le responsable d'enquête, cocher **Affaire sensible** si nécessaire.
3. Valider : la plainte passe à **Convertie** et l'affaire CASE-… est créée.

### Clôturer ou rejeter une plainte

1. Ouvrir la plainte > **Clôturer** ou **Rejeter**.
2. Saisir un motif (5 caractères au moins).
3. Valider : l'état est définitif.

> **À savoir :** Un motif clair protège le service : il figure dans l'historique.

## Procédures — Affaires

### Affecter une personne à une affaire

1. Ouvrir l'affaire > onglet équipe > **Affecter**.
2. Choisir la personne et son rôle (responsable, enquêteur, superviseur, analyste, appui).
3. Valider : la personne est notifiée. Impossible sur une affaire clôturée.

### Contrôler, transmettre ou clôturer une affaire

1. Ouvrir une affaire **En attente d'examen**.
2. Lire le travail ; si insuffisant, la renvoyer **En enquête** avec vos observations.
3. Sinon **Transmettre** (statut Transmise) ou **Clôturer** en choisissant l'issue (résolue, non résolue, non fondée, transmise au parquet, transférée, classée).
4. Le système enregistre la décision ; l'envoi physique du dossier à la justice reste à faire selon la procédure habituelle.

### Archiver une affaire clôturée

1. Ouvrir l'affaire **Clôturée** > **Archiver**.
2. Elle passe en lecture seule.

### Suivre ses tâches

1. Menu **Mes tâches**.
2. Changer l'état d'une tâche : à faire, en cours, bloquée, terminée, annulée, avec un résultat.

## Procédures — Patrouilles

### Planifier et suivre une patrouille

1. Menu **Patrouilles** > **Nouvelle patrouille** : zone, équipe de poste, mission, superviseur, véhicule, agents.
2. Au départ : **Démarrer** (kilométrage de départ).
3. À la fin : **Terminer** avec le rapport et le kilométrage final. Annulation possible avec motif.

## Procédures — Mandats

### Approuver ou rejeter un mandat

1. Ouvrir le mandat en **Brouillon**.
2. Contrôler l'autorité, la référence, les motifs et la date d'expiration.
3. Choisir **Actif** (approbation) ou **Rejeté** (motif obligatoire).

> **À savoir :** Un mandat expiré ne peut pas être approuvé.

### Annuler un mandat

1. Ouvrir le mandat > statut **Annulé** avec motif obligatoire.

## Procédures — Personnes recherchées

### Vérifier un avis (quatre yeux)

1. Ouvrir l'avis en brouillon.
2. Contrôler pièces et base légale, saisir ses observations.
3. Cliquer **Valider la vérification** : l'avis passe en attente d'approbation. Vous ne pouvez pas vérifier votre propre avis.

### Approuver un avis et le diffuser

1. Ouvrir l'avis vérifié > statut **Actif**.
2. Le système diffuse l'alerte aux unités du périmètre choisi.

> **À savoir :** L'émetteur ne peut pas approuver son avis.

### Publier un avis sur le site public

1. Sur la fiche d'un avis **actif et vérifié** : rédiger le texte public (20 caractères au moins).
2. Cocher la **validation expresse** et publier. Seuls nom, alias, âge approximatif, signalement, motif et texte sont publiés.
3. Le retrait est automatique dès que l'avis cesse d'être actif.

> **À savoir :** L'émetteur ne peut pas publier son propre avis.

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

### Superviser la diffusion des alertes

1. Menu **Supervision des alertes** : filtrer par période, province, unité, statut, type.
2. Ouvrir une alerte : état de chaque unité (reçue, lue, acquittée, tentatives, escalade).
3. **Relancer les unités** pour forcer une relance.

## Procédures — Gardes à vue

### Ouvrir et surveiller une garde à vue

1. Menu **Garde à vue** > **Ouvrir** : choisir l'arrestation, la cellule, les notes médicales.
2. Ajouter régulièrement des entrées de journal : contrôle de bien-être, repas, médical, visite, avocat, transfert, incident, note.
3. À la fin : **Clore** avec l'issue et les notes.

> **À savoir :** L'échéance légale (48 h) est affichée ; les dépassements sont signalés.

### Prolonger une garde à vue

1. Ouvrir la garde à vue > **Prolonger**.
2. Indiquer l'autorité qui autorise, le motif (10 caractères au moins) et la nouvelle échéance (au plus 48 h au-delà de l'échéance légale).

## Procédures — Circulation

### Contrôle routier et procès-verbal

1. Menu **Circulation routière** > **Contrôles routiers** > **Nouveau contrôle**.
2. Saisir conducteur, véhicule (plaque), lieu, résultat.
3. En cas d'infraction : choisir dans le **catalogue des infractions**, joindre des photos, émettre le **PV**.
4. Si le conducteur ou le véhicule correspond à un avis de recherche, le commandement est averti.

### Annuler un procès-verbal

1. Ouvrir le PV > **Annuler** avec un motif. L'agent émetteur est notifié.

### Gérer une amende

1. Menu **Amendes & paiements** : ouvrir l'amende.
2. Mettre en attente, contestée ou annulée selon le cas.

### Enregistrer un paiement d'amende

1. Menu **Amendes & paiements** > ouvrir l'amende > **Enregistrer un paiement**.
2. Choisir le mode, le montant ; le reçu REC-… est édité.
3. Menu **Paiements en ligne** : suivre les paiements du portail public et les remboursements à traiter.

### Annuler un paiement saisi par erreur

1. Ouvrir le paiement > **Annuler** avec motif (le paiement n'est pas effacé : il devient « annulé »).

## Procédures — Recettes

### Produire un rapport de recettes

1. Menu **Recettes** > **Rapports** : choisir le rapport et la période.
2. Afficher, ou exporter en CSV / PDF (l'export est journalisé).

## Procédures — Ressources humaines

### Proposer une mutation

1. Menu **Ressources humaines** > **Mutations** > nouvelle proposition (agent, unité de destination, motif).
2. Les RH sont notifiées.

### Déposer une demande de congé

1. Menu **Congés** : nouvelle demande (type, dates).
2. Le responsable est notifié.

### Décider des congés

1. Menu **Congés**, filtre **Demandé** : **Approuver** ou **Rejeter** (note). Le demandeur est notifié.

### Appel quotidien

1. Menu **Présences** : enregistrer présent, en retard, absent, en congé, permission, indisponible pour chaque agent.

## Procédures — Administration

### Créer un compte

1. Administration > **Utilisateurs** > **Nouveau**.
2. Renseigner l'identité et choisir le rôle (seuls les rôles que vous pouvez attribuer sont proposés).
3. Soumettre : une demande d'approbation est créée.

### Suspendre, désactiver ou débloquer un compte

1. Ouvrir la fiche > changer le statut : Actif, Suspendu, Désactivé ; débloquer un compte verrouillé.

### Réinitialiser un mot de passe

1. Ouvrir la fiche > **Émettre un lien de réinitialisation** ; le transmettre à l'utilisateur par un canal sûr.

### Décider d'une demande d'approbation

1. Menu **Approbations** : ouvrir la demande.
2. Lire le résumé ; **Approuver** ou **Rejeter**. Vous ne pouvez pas décider d'une demande que vous avez déposée.

## Procédures — Contrôle

### Consulter le journal d'audit

1. Menu **Journal d'audit** : filtrer par utilisateur, module, action, période.
2. Le bouton de contrôle d'intégrité (Centre de sécurité) vérifie que le journal n'a pas été altéré.

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
