# Manuel des enquêteurs

**Manuel d'utilisation, pas à pas, à partir de ce que le système permet réellement**

| Rubrique | Valeur |
|---|---|
| Système | SIGEC-PN / SIGPN-T — Système d'information de gestion de la Police nationale du Tchad |
| Éditeur et développeur | TECHNOTCHAD |
| Version du document | 1.0 — 10 novembre 2026 |
| Statut | Projet pour validation par la hiérarchie : les points marqués « À confirmer » ne sont pas des décisions |
| Source des informations | Lecture seule du système existant (code, catalogue des rôles et droits, écrans) — aucune donnée, aucun compte, aucun rôle, aucune permission n'a été modifié |

## À qui s'adresse ce manuel

Enquêteurs affectés à des affaires.

## Responsabilités

- Instruire les affaires qui leur sont affectées.
- Enregistrer personnes, tâches, notes et pièces à conviction.
- Demander des mandats et enregistrer les arrestations.
- Soumettre l'affaire au contrôle du commissaire.

> Les écrans de procès-verbaux, déclarations et auditions ne sont pas encore construits : les constats se consignent en notes d'affaire.

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
| Type de compte (code système) | `INVESTIGATOR` |
| Fonction | Enquêteur |
| Famille | Investigation |
| Niveau hiérarchique (périmètre) | Commissariat (son unité et ses postes rattachés) |
| Service d'affectation | Celui du compte (commissariat, délégation, direction) : il fixe ce que l'utilisateur voit |
| Second facteur exigé par le rôle | Non (peut être exigé si l'utilisateur détient un droit sensible) |
| Supérieur hiérarchique (selon le périmètre du système) | Commissaire de son commissariat (superviseur de l'affaire) — organigramme officiel à confirmer |
| Destinataires de ses rapports et transmissions | Commissaire et responsable d'affaire |
| Nombre de droits | 62 sur 157 |
| Droits sensibles détenus | 0 |
| Comptes de démonstration | `inv.diallo`, `inv.mensah` |

**Responsabilité :** Mène les enquêtes sur les affaires qui lui sont affectées : personnes, preuves, demandes de mandat, arrestations.

## Modules accessibles (menu)

- **Général** : Tableau de bord
- **Accueil** : Plaintes, Incidents, Personnes, Personnes recherchées, Alertes nationales
- **Enquête** : Affaires, Mes tâches, Pièces & chaîne de possession, Biométrie & police scientifique, Contrôle biométrique
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
| Personnes | Voir les personnes; Créer une personne; Modifier une personne |
| Personnes recherchées | Voir les personnes recherchées; Créer un avis de recherche; Modifier un avis; Changer le statut d'un avis |
| Biométrie | Enregistrer la vérification humaine d'une correspondance; Contrôle d'identité biométrique (simulation); Voir l'historique des recherches biométriques; Recherche par plaque (ANPR); Recherche par visage; Recherche par empreinte; Recherche par voix |
| Alertes nationales | Recevoir et lire les alertes de son unité; Acquitter une alerte pour l'unité |
| Plaintes | Voir les plaintes; Enregistrer une plainte; Modifier une plainte |
| Affaires | Voir les affaires; Ouvrir une affaire; Modifier une affaire |
| Enquêtes | Voir les enquêtes et tâches; Gérer les enquêtes |
| Déclarations | Voir les déclarations; Créer une déclaration; Finaliser une déclaration |
| Auditions | Voir les auditions; Gérer les auditions |
| Transcriptions | Voir les transcriptions; Relire une transcription |
| Preuves | Voir les preuves; Enregistrer une preuve; Modifier une preuve; Transférer la garde d'une preuve |
| Mandats | Voir les mandats; Demander un mandat; Marquer un mandat exécuté |
| Arrestations | Voir les arrestations; Enregistrer une arrestation; Changer le statut d'une arrestation |
| Gardes à vue | Voir les gardes à vue |
| Patrouilles | Voir les patrouilles |
| Incidents | Voir les incidents; Signaler un incident; Modifier un incident |
| Opérations | Voir les opérations |
| Véhicules de service | Voir les véhicules de service |
| Maintenance | Voir la maintenance |
| Documents | Voir les documents; Déposer des documents |
| Rapports | Voir les rapports; Produire des rapports |
| Circulation | Voir contrôles, PV et amendes; Voir le tableau de bord circulation; Voir les conducteurs; Voir les véhicules (circulation); Voir le catalogue des infractions |
| Clés d'accès (API) | Gérer ses propres clés d'accès |

Les droits marqués *(sensible)* n'agissent que si le compte a l'habilitation requise (droit sensible = habilitation « Sensible » ou « Confidentiel », attribuée par l'administrateur de sécurité).

## Opérations interdites (principales)

Ce profil **ne peut pas** : Examiner / affecter une plainte ; Transmettre ou clôturer une affaire ; Voir les affaires sensibles ; Approuver un mandat ; Approuver un avis de recherche ; Publier un avis sur le site public ; Gérer une garde à vue ; Prolonger une garde à vue ; Émettre un PV routier ; Enregistrer un paiement d'amende ; Créer un compte ; Modifier les droits d'un rôle ; Décider d'une approbation ; Consulter le journal d'audit ; Enregistrer une décision de carrière ; Voir les dossiers disciplinaires ; Voir la paie ; Lancer des sauvegardes.

Toute opération qui n'est pas dans la liste des opérations autorisées est refusée par le système.

## Documents

| Il peut… | Documents |
|---|---|
| Créer | Plainte; Affaire; Demande de mandat; Avis de recherche; Fiche d'arrestation; Incident; Fiche de pièce à conviction; Fiche personne; Déclaration (écran non construit); Document téléversé; Rapport (écran non construit) |
| Consulter | Plaintes; Affaires; Mandats; Avis de recherche; Arrestations; Gardes à vue; Incidents; Patrouilles; Pièces à conviction; Fiches personnes; Contrôles, PV et amendes; Conducteurs; Véhicules; Fiches agents; Organisation; Alertes nationales |
| Transmettre | Pièce à conviction vers un autre agent ou lieu; Arrestation vers transfert / inculpation |
| Valider / décider | Vérification humaine d'une correspondance biométrique |

## Notifications reçues

- Incident de gravité élevée ou critique signalé
- Vérification humaine demandée ; erreur signalée
- Alertes nationales (avis de recherche) de son unité

## Procédures — Personnes

### Enregistrer une personne

1. Menu **Personnes** > bouton **Nouvelle personne**.
2. Chercher d'abord si la personne existe déjà (nom, numéro, pièce d'identité) pour éviter un doublon.
3. Renseigner prénom, nom, sexe, date et lieu de naissance, téléphone, adresse, pièce d'identité.
4. Cliquer **Enregistrer**. Si le système signale un doublon probable, choisir la fiche existante ; ne forcer la création que si c'est réellement une autre personne.

> **À savoir :** Un numéro PID-AAAA-NNNNNN est attribué.

## Procédures — Plaintes

### Enregistrer une plainte

1. Menu **Plaintes** > **Nouvelle plainte**.
2. Choisir le plaignant (ou cocher **Plainte anonyme**).
3. Remplir catégorie, titre (5 caractères au moins), description des faits (20 caractères au moins), date et lieu, priorité.
4. **Enregistrer en brouillon** pour finir plus tard, ou **Enregistrer et soumettre** pour l'envoyer au commissaire.
5. Noter le numéro CMP-… affiché.

> **À savoir :** Après soumission, la plainte ne se modifie plus que tant qu'elle est « En examen » au plus.

## Procédures — Affaires

### Ouvrir une affaire

1. Menu **Affaires** > **Nouvelle affaire** (ou convertir une plainte).
2. Remplir titre, catégorie, description, date et lieu des faits, commissariat, priorité, responsable.
3. Cocher **Affaire sensible** si elle doit être limitée à l'équipe (réservé aux habilités).

### Conduire l'enquête sur une affaire

1. Ouvrir l'affaire depuis **Affaires**.
2. Ajouter les personnes concernées avec leur rôle (victime, témoin, suspect…).
3. Ajouter des notes, créer des tâches (menu **Mes tâches** pour le suivi).
4. Faire passer l'affaire à **En enquête**, puis **Soumettre à examen** quand le travail est terminé.

> **À savoir :** Le journal chronologique de l'affaire se remplit tout seul.

### Suivre ses tâches

1. Menu **Mes tâches**.
2. Changer l'état d'une tâche : à faire, en cours, bloquée, terminée, annulée, avec un résultat.

## Procédures — Preuves

### Enregistrer une pièce à conviction

1. Menu **Pièces & chaîne de possession** > **Nouvelle pièce**, ou depuis l'affaire.
2. Renseigner catégorie, description, quantité, numéro de scellé, provenance, état, lieu de stockage.
3. Joindre une photo si possible.

### Transférer la garde d'une pièce

1. Ouvrir la pièce > **Transférer la garde**.
2. Choisir l'action (stockée, transférée, sortie, retournée, examinée, restituée, détruite, archivée), le destinataire ou le lieu et le motif.
3. Chaque transfert est tracé.

## Procédures — Incidents

### Signaler un incident

1. Menu **Incidents** > **Nouvel incident**.
2. Choisir type et gravité, titre, description (10 caractères au moins), lieu.
3. Enregistrer : numéro INC-… ; en gravité Élevée ou Critique, les responsables sont alertés.

### Faire évoluer et clôturer un incident

1. Ouvrir l'incident.
2. Changer l'état : **En intervention**, **Sur place**, **Résolu** (rapport d'au moins 10 caractères obligatoire), **Clôturé**.
3. Si une infraction doit être instruite : **Escalader en affaire**.

## Procédures — Mandats

### Demander l'enregistrement d'un mandat

1. Menu **Mandats** > **Nouveau mandat**.
2. Choisir le type, la personne, l'affaire liée, l'autorité émettrice et sa référence, les motifs, la date d'expiration.
3. Enregistrer : le mandat est en **Brouillon** et attend l'approbation d'un autre responsable.

> **À savoir :** Vous ne pouvez pas approuver votre propre demande.

### Marquer un mandat exécuté

1. Ouvrir le mandat **Actif** > statut **Exécuté**.
2. Un mandat exécuté est définitif.

## Procédures — Personnes recherchées

### Créer un avis de recherche

1. Menu **Personnes recherchées** > **Nouvel avis**.
2. Choisir la personne, l'infraction, la nature, le niveau de danger, le périmètre de diffusion, la base légale, l'autorité, le motif.
3. Pour un mandat de recherche : lier un mandat **actif**.
4. Enregistrer : l'avis est en brouillon.

> **À savoir :** Une personne ne peut avoir qu'un seul avis vivant.

### Changer le statut d'un avis

1. Ouvrir l'avis > choisir **Localisé**, **Arrêté**, **Suspendu**, **Annulé** ou **Expiré**.
2. Suspension et annulation exigent un motif.

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

## Procédures — Biométrie

### Contrôle d'identité biométrique (simulation)

1. Menu **Contrôle biométrique** : choisir la modalité (empreinte ou visage), saisir le motif du contrôle, lancer.
2. En cas de correspondance possible : **Voir le dossier autorisé**, **Demander vérification**, **Notifier le supérieur** ou **Signaler une erreur**.

> **À savoir :** L'écran est une simulation tant qu'aucun matériel réel n'est branché.

## Procédures — Arrestations

### Enregistrer une arrestation

1. Menu **Arrestations** > **Nouvelle arrestation**.
2. Choisir la personne, le fondement (mandat, flagrant délit, ordre du tribunal, cause probable, autre), le lieu, les chefs d'accusation, les circonstances, l'heure de lecture des droits.
3. Si le fondement est un mandat : le sélectionner (il doit être actif, non expiré, et viser la même personne).
4. Enregistrer : statut **Enregistrée**.

### Faire évoluer une arrestation

1. Ouvrir l'arrestation > statut **En garde à vue**, **Libérée** (motif obligatoire ; garde à vue terminée au préalable), **Transférée** ou **Inculpée**.

## Procédures — Alertes

### Consulter les alertes de son unité

1. Menu **Alertes nationales** : liste des avis reçus par l'unité.

## Écrans

![Formulaire de l'enquêteur](../../07_ANNEXES/captures/s1-1-formulaire-enqueteur.png)

![Affaires](../../07_ANNEXES/captures/theme-cases.png)

## Fonctions que le système ne propose pas (encore)

Pour éviter toute confusion, voici ce que vous ne trouverez **pas** dans les menus, même si vous en avez l'habitude dans le travail : un registre de **main courante** distinct (le module Incidents s'en rapproche), les **procès-verbaux d'audition et déclarations**, un écran **Enquêtes** dédié, un transfert de **dossier entre commissariats** avec acceptation ou refus, les **rapports** et **statistiques** généraux (seuls le tableau de bord et les rapports de recettes existent), les **archives/documents**, la recherche globale, l'envoi de SMS ou de courriels.

### Se déconnecter en sécurité

1. Cliquer sur le bouton **Déconnexion** en haut à droite de l'en-tête.
2. Ne pas se contenter de fermer l'onglet, surtout sur un poste partagé.
3. La session se ferme d'elle-même après **60 minutes d'inactivité** (15 minutes pour les comptes qui détiennent un droit sensible) et au plus tard après **10 heures**.

## Points à confirmer auprès de la hiérarchie

- Forme réglementaire des procès-verbaux d'audition (non construits).

## Améliorations recommandées

- Rapports périodiques automatiques vers le niveau supérieur (module Rapports non construit).
- Alerte de relance pour les dossiers sans suite (non construite).

