# Manuel des agents de police

**Manuel d'utilisation, pas à pas, à partir de ce que le système permet réellement**

| Rubrique | Valeur |
|---|---|
| Système | SIGEC-PN / SIGPN-T — Système d'information de gestion de la Police nationale du Tchad |
| Éditeur et développeur | TECHNOTCHAD |
| Version du document | 1.0 — 10 novembre 2026 |
| Statut | Projet pour validation par la hiérarchie : les points marqués « À confirmer » ne sont pas des décisions |
| Source des informations | Lecture seule du système existant (code, catalogue des rôles et droits, écrans) — aucune donnée, aucun compte, aucun rôle, aucune permission n'a été modifié |

## À qui s'adresse ce manuel

Agents d'accueil, de patrouille, de circulation, de contrôle routier, de garde à vue, responsables des scellés, agents biométrie et police technique.

## Responsabilités

- Accomplir les tâches de terrain et d'accueil de leur fonction et en rendre compte au commissaire.

> Chaque fonction a sa propre section ci-dessous avec ses droits exacts. **Le profil « agent de police » générique n'existe pas** : l'agent reçoit le profil de sa fonction.

### Se connecter

1. Ouvrir l'adresse du système dans le navigateur (l'adresse vous est communiquée par votre administration).
2. Saisir votre **identifiant** et votre **mot de passe**, puis cliquer sur **Se connecter**.
3. Si votre profil exige un **second facteur**, saisir le code à 6 chiffres de l'application d'authentification de votre téléphone. Le code change toutes les 30 secondes et ne sert qu'une seule fois : si le code est refusé, attendre le suivant.
4. À la première connexion (ou après une réinitialisation), le système demande de **choisir un nouveau mot de passe** : au moins 12 caractères, avec au moins trois types parmi minuscules, majuscules, chiffres et symboles ; il ne doit contenir ni votre identifiant ni votre nom de courriel, ni être un mot de passe courant.
5. Après **5 échecs** de connexion, le compte est verrouillé 15 minutes. Mot de passe oublié : utiliser le lien de la page de connexion ; votre demande est transmise à l'administrateur de sécurité qui vous remet un lien à usage unique valable 60 minutes.

> Ne communiquez jamais votre mot de passe ni votre code : tout ce qui est fait avec votre compte est enregistré à votre nom.

### Présentation du tableau de bord

Après connexion, le **Tableau de bord** résume les chiffres de votre périmètre. Le menu de gauche (ou le bouton de navigation sur téléphone) donne accès aux modules autorisés. Les modules que vous ne voyez pas ne sont pas accessibles à votre profil. Le système est disponible en **français et en arabe** (sélecteur de langue dans l'en-tête).

# Profil : Agent d'accueil / de permanence

### Fiche d'identité du profil

| Élément | Valeur |
|---|---|
| Type de compte (code système) | `DESK_OFFICER` |
| Fonction | Agent d'accueil / de permanence |
| Famille | Terrain et accueil |
| Niveau hiérarchique (périmètre) | Commissariat (son unité et ses postes rattachés) |
| Service d'affectation | Celui du compte (commissariat, délégation, direction) : il fixe ce que l'utilisateur voit |
| Second facteur exigé par le rôle | Non (peut être exigé si l'utilisateur détient un droit sensible) |
| Supérieur hiérarchique (selon le périmètre du système) | Commissaire de son commissariat — organigramme officiel à confirmer |
| Destinataires de ses rapports et transmissions | Commissaire (plaintes à examiner) |
| Nombre de droits | 38 sur 157 |
| Droits sensibles détenus | 0 |
| Comptes de démonstration | `desk.abe`, `desk.cs1`, `desk.post1` |

**Responsabilité :** Accueil : enregistre les plaintes, les personnes et les incidents.

### Modules accessibles (menu)

- **Général** : Tableau de bord
- **Accueil** : Plaintes, Incidents, Personnes, Personnes recherchées, Alertes nationales
- **Enquête** : Affaires, Mes tâches, Pièces & chaîne de possession
- **Contrainte** : Mandats, Arrestations, Garde à vue
- **Circulation routière** : Tableau de bord trafic, Contrôles routiers, Procès-verbaux, Amendes & paiements, Conducteurs, Véhicules & immatriculations, Catalogue des infractions, Recherche circulation
- **Opérations** : Patrouilles
- **Ressources** : Agents
- **Ressources humaines** : Mes congés, Ma solde
- **Administration** : Organisation

### Tableau de bord

Ce profil voit, **dans son périmètre**, : Nombre d'agents actifs; Incidents de la période, répartition par type, tendance, incidents récents; Affaires ouvertes; Plaintes reçues sur la période; Avis de recherche actifs, avis récents; Tableau de bord circulation (menu Circulation).

### Opérations autorisées (par module)

| Module | Opérations autorisées |
|---|---|
| Tableau de bord | Voir le tableau de bord |
| Organisation | Voir l'organisation |
| Agents (officiers) | Voir les agents |
| Personnes | Voir les personnes; Créer une personne; Modifier une personne |
| Personnes recherchées | Voir les personnes recherchées |
| Alertes nationales | Recevoir et lire les alertes de son unité; Acquitter une alerte pour l'unité |
| Plaintes | Voir les plaintes; Enregistrer une plainte; Modifier une plainte |
| Affaires | Voir les affaires |
| Enquêtes | Voir les enquêtes et tâches |
| Déclarations | Voir les déclarations |
| Auditions | Voir les auditions |
| Transcriptions | Voir les transcriptions |
| Preuves | Voir les preuves |
| Mandats | Voir les mandats |
| Arrestations | Voir les arrestations; Enregistrer une arrestation |
| Gardes à vue | Voir les gardes à vue |
| Patrouilles | Voir les patrouilles |
| Incidents | Voir les incidents; Signaler un incident; Modifier un incident |
| Opérations | Voir les opérations |
| Véhicules de service | Voir les véhicules de service |
| Maintenance | Voir la maintenance |
| Documents | Voir les documents; Déposer des documents |
| Rapports | Voir les rapports |
| Circulation | Voir contrôles, PV et amendes; Voir le tableau de bord circulation; Voir les conducteurs; Voir les véhicules (circulation); Voir le catalogue des infractions |
| Clés d'accès (API) | Gérer ses propres clés d'accès |

Les droits marqués *(sensible)* n'agissent que si le compte a l'habilitation requise (droit sensible = habilitation « Sensible » ou « Confidentiel », attribuée par l'administrateur de sécurité).

### Opérations interdites (principales)

Ce profil **ne peut pas** : Exporter en PDF les listes et fiches ; Examiner / affecter une plainte ; Ouvrir une affaire ; Transmettre ou clôturer une affaire ; Voir les affaires sensibles ; Demander un mandat ; Approuver un mandat ; Créer un avis de recherche ; Approuver un avis de recherche ; Publier un avis sur le site public ; Gérer une garde à vue ; Prolonger une garde à vue ; Enregistrer une pièce à conviction ; Émettre un PV routier ; Enregistrer un paiement d'amende ; Créer un compte ; Modifier les droits d'un rôle ; Décider d'une approbation ; Consulter le journal d'audit ; Enregistrer une décision de carrière ; Voir les dossiers disciplinaires ; Voir la paie ; Lancer des sauvegardes.

Toute opération qui n'est pas dans la liste des opérations autorisées est refusée par le système.

### Documents

| Il peut… | Documents |
|---|---|
| Créer | Plainte; Fiche d'arrestation; Incident; Fiche personne; Document téléversé |
| Consulter | Plaintes; Affaires; Mandats; Avis de recherche; Arrestations; Gardes à vue; Incidents; Patrouilles; Pièces à conviction; Fiches personnes; Contrôles, PV et amendes; Conducteurs; Véhicules; Fiches agents; Organisation; Alertes nationales |
| Transmettre | — |
| Valider / décider | — |

### Notifications reçues

- Incident de gravité élevée ou critique signalé
- Alertes nationales (avis de recherche) de son unité

### Procédures — Personnes

#### Enregistrer une personne

1. Menu **Personnes** > bouton **Nouvelle personne**.
2. Chercher d'abord si la personne existe déjà (nom, numéro, pièce d'identité) pour éviter un doublon.
3. Renseigner prénom, nom, sexe, date et lieu de naissance, téléphone, adresse, pièce d'identité.
4. Cliquer **Enregistrer**. Si le système signale un doublon probable, choisir la fiche existante ; ne forcer la création que si c'est réellement une autre personne.

> **À savoir :** Un numéro PID-AAAA-NNNNNN est attribué.

### Procédures — Plaintes

#### Enregistrer une plainte

1. Menu **Plaintes** > **Nouvelle plainte**.
2. Choisir le plaignant (ou cocher **Plainte anonyme**).
3. Remplir catégorie, titre (5 caractères au moins), description des faits (20 caractères au moins), date et lieu, priorité.
4. **Enregistrer en brouillon** pour finir plus tard, ou **Enregistrer et soumettre** pour l'envoyer au commissaire.
5. Noter le numéro CMP-… affiché.

> **À savoir :** Après soumission, la plainte ne se modifie plus que tant qu'elle est « En examen » au plus.

### Procédures — Affaires

#### Suivre ses tâches

1. Menu **Mes tâches**.
2. Changer l'état d'une tâche : à faire, en cours, bloquée, terminée, annulée, avec un résultat.

### Procédures — Incidents

#### Signaler un incident

1. Menu **Incidents** > **Nouvel incident**.
2. Choisir type et gravité, titre, description (10 caractères au moins), lieu.
3. Enregistrer : numéro INC-… ; en gravité Élevée ou Critique, les responsables sont alertés.

#### Faire évoluer et clôturer un incident

1. Ouvrir l'incident.
2. Changer l'état : **En intervention**, **Sur place**, **Résolu** (rapport d'au moins 10 caractères obligatoire), **Clôturé**.
3. Si une infraction doit être instruite : **Escalader en affaire**.

### Procédures — Personnes recherchées

#### Rechercher une personne

1. Menu **Personnes recherchées** : saisir nom, alias, numéro ou plaque dans la recherche rapide.
2. Lire le résultat : **correspondance**, **connu** ou **aucun résultat**.
3. Pour affiner : **Recherche avancée**.

> **À savoir :** Une correspondance n'est jamais une preuve : vérifier l'identité avant d'agir.

### Procédures — Alertes

#### Recevoir et acquitter une alerte nationale

1. Un bandeau rouge apparaît sur toutes les pages dans les 20 secondes.
2. Menu **Alertes nationales** > ouvrir l'alerte.
3. **Marquer comme lu**, puis **Acquitter**. L'acquittement est horodaté pour votre unité.

> **À savoir :** Sans acquittement, l'alerte est relancée puis remontée à votre hiérarchie.

### Procédures — Arrestations

#### Enregistrer une arrestation

1. Menu **Arrestations** > **Nouvelle arrestation**.
2. Choisir la personne, le fondement (mandat, flagrant délit, ordre du tribunal, cause probable, autre), le lieu, les chefs d'accusation, les circonstances, l'heure de lecture des droits.
3. Si le fondement est un mandat : le sélectionner (il doit être actif, non expiré, et viser la même personne).
4. Enregistrer : statut **Enregistrée**.

### Procédures — Alertes

#### Consulter les alertes de son unité

1. Menu **Alertes nationales** : liste des avis reçus par l'unité.

### Écrans

![Nouvelle plainte](../../07_ANNEXES/captures/theme-complaint-new.png)

![Personnes](../../07_ANNEXES/captures/theme-persons.png)

# Profil : Agent de patrouille

### Fiche d'identité du profil

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

### Modules accessibles (menu)

- **Général** : Tableau de bord
- **Accueil** : Plaintes, Incidents, Personnes, Personnes recherchées, Alertes nationales
- **Enquête** : Affaires, Mes tâches, Pièces & chaîne de possession, Biométrie & police scientifique
- **Contrainte** : Mandats, Arrestations, Garde à vue
- **Circulation routière** : Tableau de bord trafic, Contrôles routiers, Procès-verbaux, Amendes & paiements, Conducteurs, Véhicules & immatriculations, Catalogue des infractions, Recherche circulation
- **Opérations** : Patrouilles
- **Ressources** : Agents
- **Ressources humaines** : Mes congés, Ma solde
- **Administration** : Organisation

### Tableau de bord

Ce profil voit, **dans son périmètre**, : Nombre d'agents actifs; Incidents de la période, répartition par type, tendance, incidents récents; Affaires ouvertes; Plaintes reçues sur la période; Avis de recherche actifs, avis récents; Tableau de bord circulation (menu Circulation).

### Opérations autorisées (par module)

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

### Opérations interdites (principales)

Ce profil **ne peut pas** : Exporter en PDF les listes et fiches ; Enregistrer une plainte ; Examiner / affecter une plainte ; Ouvrir une affaire ; Transmettre ou clôturer une affaire ; Voir les affaires sensibles ; Demander un mandat ; Approuver un mandat ; Créer un avis de recherche ; Approuver un avis de recherche ; Publier un avis sur le site public ; Gérer une garde à vue ; Prolonger une garde à vue ; Enregistrer une pièce à conviction ; Enregistrer un paiement d'amende ; Créer un compte ; Modifier les droits d'un rôle ; Décider d'une approbation ; Consulter le journal d'audit ; Enregistrer une décision de carrière ; Voir les dossiers disciplinaires ; Voir la paie ; Lancer des sauvegardes.

Toute opération qui n'est pas dans la liste des opérations autorisées est refusée par le système.

### Documents

| Il peut… | Documents |
|---|---|
| Créer | Fiche d'arrestation; Incident; Patrouille et son rapport; Contrôle routier et procès-verbal (PV); Fiche personne; Document téléversé |
| Consulter | Plaintes; Affaires; Mandats; Avis de recherche; Arrestations; Gardes à vue; Incidents; Patrouilles; Pièces à conviction; Fiches personnes; Contrôles, PV et amendes; Conducteurs; Véhicules; Fiches agents; Organisation; Alertes nationales |
| Transmettre | — |
| Valider / décider | — |

### Notifications reçues

- Incident de gravité élevée ou critique signalé
- Alertes nationales (avis de recherche) de son unité

### Procédures — Personnes

#### Enregistrer une personne

1. Menu **Personnes** > bouton **Nouvelle personne**.
2. Chercher d'abord si la personne existe déjà (nom, numéro, pièce d'identité) pour éviter un doublon.
3. Renseigner prénom, nom, sexe, date et lieu de naissance, téléphone, adresse, pièce d'identité.
4. Cliquer **Enregistrer**. Si le système signale un doublon probable, choisir la fiche existante ; ne forcer la création que si c'est réellement une autre personne.

> **À savoir :** Un numéro PID-AAAA-NNNNNN est attribué.

### Procédures — Affaires

#### Suivre ses tâches

1. Menu **Mes tâches**.
2. Changer l'état d'une tâche : à faire, en cours, bloquée, terminée, annulée, avec un résultat.

### Procédures — Incidents

#### Signaler un incident

1. Menu **Incidents** > **Nouvel incident**.
2. Choisir type et gravité, titre, description (10 caractères au moins), lieu.
3. Enregistrer : numéro INC-… ; en gravité Élevée ou Critique, les responsables sont alertés.

#### Faire évoluer et clôturer un incident

1. Ouvrir l'incident.
2. Changer l'état : **En intervention**, **Sur place**, **Résolu** (rapport d'au moins 10 caractères obligatoire), **Clôturé**.
3. Si une infraction doit être instruite : **Escalader en affaire**.

### Procédures — Patrouilles

#### Planifier et suivre une patrouille

1. Menu **Patrouilles** > **Nouvelle patrouille** : zone, équipe de poste, mission, superviseur, véhicule, agents.
2. Au départ : **Démarrer** (kilométrage de départ).
3. À la fin : **Terminer** avec le rapport et le kilométrage final. Annulation possible avec motif.

### Procédures — Personnes recherchées

#### Rechercher une personne

1. Menu **Personnes recherchées** : saisir nom, alias, numéro ou plaque dans la recherche rapide.
2. Lire le résultat : **correspondance**, **connu** ou **aucun résultat**.
3. Pour affiner : **Recherche avancée**.

> **À savoir :** Une correspondance n'est jamais une preuve : vérifier l'identité avant d'agir.

### Procédures — Alertes

#### Recevoir et acquitter une alerte nationale

1. Un bandeau rouge apparaît sur toutes les pages dans les 20 secondes.
2. Menu **Alertes nationales** > ouvrir l'alerte.
3. **Marquer comme lu**, puis **Acquitter**. L'acquittement est horodaté pour votre unité.

> **À savoir :** Sans acquittement, l'alerte est relancée puis remontée à votre hiérarchie.

### Procédures — Arrestations

#### Enregistrer une arrestation

1. Menu **Arrestations** > **Nouvelle arrestation**.
2. Choisir la personne, le fondement (mandat, flagrant délit, ordre du tribunal, cause probable, autre), le lieu, les chefs d'accusation, les circonstances, l'heure de lecture des droits.
3. Si le fondement est un mandat : le sélectionner (il doit être actif, non expiré, et viser la même personne).
4. Enregistrer : statut **Enregistrée**.

### Procédures — Circulation

#### Contrôle routier et procès-verbal

1. Menu **Circulation routière** > **Contrôles routiers** > **Nouveau contrôle**.
2. Saisir conducteur, véhicule (plaque), lieu, résultat.
3. En cas d'infraction : choisir dans le **catalogue des infractions**, joindre des photos, émettre le **PV**.
4. Si le conducteur ou le véhicule correspond à un avis de recherche, le commandement est averti.

### Procédures — Alertes

#### Consulter les alertes de son unité

1. Menu **Alertes nationales** : liste des avis reçus par l'unité.

# Profil : Agent de circulation

### Fiche d'identité du profil

| Élément | Valeur |
|---|---|
| Type de compte (code système) | `TRAFFIC_OFFICER` |
| Fonction | Agent de circulation |
| Famille | Circulation et recettes |
| Niveau hiérarchique (périmètre) | Commissariat (son unité et ses postes rattachés) |
| Service d'affectation | Celui du compte (commissariat, délégation, direction) : il fixe ce que l'utilisateur voit |
| Second facteur exigé par le rôle | Non (peut être exigé si l'utilisateur détient un droit sensible) |
| Supérieur hiérarchique (selon le périmètre du système) | Superviseur circulation / Commissaire — organigramme officiel à confirmer |
| Destinataires de ses rapports et transmissions | Superviseur circulation |
| Nombre de droits | 21 sur 157 |
| Droits sensibles détenus | 0 |
| Comptes de démonstration | `traffic.cs1` |

**Responsabilité :** Agent de circulation : contrôles routiers, PV électronique, photos, fiches conducteurs et véhicules.

### Modules accessibles (menu)

- **Général** : Tableau de bord
- **Accueil** : Incidents, Personnes, Personnes recherchées, Alertes nationales
- **Circulation routière** : Tableau de bord trafic, Contrôles routiers, Procès-verbaux, Amendes & paiements, Conducteurs, Véhicules & immatriculations, Catalogue des infractions, Recherche circulation
- **Recettes et versements** : Caisse des agents, Recettes collectées, Clôture de caisse, Versements, Bordereaux, Écarts
- **Opérations** : Patrouilles
- **Ressources humaines** : Mes congés, Ma solde
- **Administration** : Organisation

### Tableau de bord

Ce profil voit, **dans son périmètre**, : Incidents de la période, répartition par type, tendance, incidents récents; Avis de recherche actifs, avis récents; Tableau de bord circulation (menu Circulation).

### Opérations autorisées (par module)

| Module | Opérations autorisées |
|---|---|
| Tableau de bord | Voir le tableau de bord |
| Organisation | Voir l'organisation |
| Personnes | Voir les personnes |
| Personnes recherchées | Voir les personnes recherchées |
| Alertes nationales | Recevoir et lire les alertes de son unité; Acquitter une alerte pour l'unité |
| Patrouilles | Voir les patrouilles |
| Incidents | Voir les incidents |
| Circulation | Voir contrôles, PV et amendes; Enregistrer un contrôle et émettre un PV; Voir le tableau de bord circulation; Gérer les conducteurs; Voir les conducteurs; Joindre des preuves à un contrôle; Gérer les véhicules (circulation); Voir les véhicules (circulation); Voir le catalogue des infractions |
| Caisses et recettes | Encaisser une amende sur le terrain; Déclarer un versement; Ouvrir, voir et clore sa propre caisse |
| Clés d'accès (API) | Gérer ses propres clés d'accès |

Les droits marqués *(sensible)* n'agissent que si le compte a l'habilitation requise (droit sensible = habilitation « Sensible » ou « Confidentiel », attribuée par l'administrateur de sécurité).

### Opérations interdites (principales)

Ce profil **ne peut pas** : Exporter en PDF les listes et fiches ; Enregistrer une plainte ; Examiner / affecter une plainte ; Ouvrir une affaire ; Transmettre ou clôturer une affaire ; Voir les affaires sensibles ; Demander un mandat ; Approuver un mandat ; Créer un avis de recherche ; Approuver un avis de recherche ; Publier un avis sur le site public ; Enregistrer une arrestation ; Gérer une garde à vue ; Prolonger une garde à vue ; Enregistrer une pièce à conviction ; Enregistrer un paiement d'amende ; Créer un compte ; Modifier les droits d'un rôle ; Décider d'une approbation ; Consulter le journal d'audit ; Enregistrer une décision de carrière ; Voir les dossiers disciplinaires ; Voir la paie ; Lancer des sauvegardes.

Toute opération qui n'est pas dans la liste des opérations autorisées est refusée par le système.

### Documents

| Il peut… | Documents |
|---|---|
| Créer | Contrôle routier et procès-verbal (PV); Caisse et état journalier; Déclaration de versement |
| Consulter | Avis de recherche; Incidents; Patrouilles; Fiches personnes; Contrôles, PV et amendes; Conducteurs; Véhicules; Organisation; Alertes nationales |
| Transmettre | Versement vers le responsable financier |
| Valider / décider | — |

### Notifications reçues

- Versement rejeté / justification demandée
- Alertes nationales (avis de recherche) de son unité

### Procédures — Personnes recherchées

#### Rechercher une personne

1. Menu **Personnes recherchées** : saisir nom, alias, numéro ou plaque dans la recherche rapide.
2. Lire le résultat : **correspondance**, **connu** ou **aucun résultat**.
3. Pour affiner : **Recherche avancée**.

> **À savoir :** Une correspondance n'est jamais une preuve : vérifier l'identité avant d'agir.

### Procédures — Alertes

#### Recevoir et acquitter une alerte nationale

1. Un bandeau rouge apparaît sur toutes les pages dans les 20 secondes.
2. Menu **Alertes nationales** > ouvrir l'alerte.
3. **Marquer comme lu**, puis **Acquitter**. L'acquittement est horodaté pour votre unité.

> **À savoir :** Sans acquittement, l'alerte est relancée puis remontée à votre hiérarchie.

### Procédures — Circulation

#### Contrôle routier et procès-verbal

1. Menu **Circulation routière** > **Contrôles routiers** > **Nouveau contrôle**.
2. Saisir conducteur, véhicule (plaque), lieu, résultat.
3. En cas d'infraction : choisir dans le **catalogue des infractions**, joindre des photos, émettre le **PV**.
4. Si le conducteur ou le véhicule correspond à un avis de recherche, le commandement est averti.

### Procédures — Recettes

#### Ouvrir et clore sa caisse

1. Menu **Recettes** > **Caisses** > **Ouvrir ma caisse**.
2. Encaisser les amendes au fil de la journée.
3. En fin de journée : **Clore** ; le montant à verser est calculé.

#### Déclarer un versement

1. Menu **Recettes** > **Versements** > **Nouveau versement** : montant, mode, justificatif.
2. Le responsable est notifié pour vérification.

### Procédures — Alertes

#### Consulter les alertes de son unité

1. Menu **Alertes nationales** : liste des avis reçus par l'unité.

# Profil : Agent de contrôle routier

### Fiche d'identité du profil

| Élément | Valeur |
|---|---|
| Type de compte (code système) | `TRAFFIC_CONTROL_AGENT` |
| Fonction | Agent de contrôle routier |
| Famille | Circulation et recettes |
| Niveau hiérarchique (périmètre) | Commissariat (son unité et ses postes rattachés) |
| Service d'affectation | Celui du compte (commissariat, délégation, direction) : il fixe ce que l'utilisateur voit |
| Second facteur exigé par le rôle | Non (peut être exigé si l'utilisateur détient un droit sensible) |
| Supérieur hiérarchique (selon le périmètre du système) | Superviseur circulation / Commissaire — organigramme officiel à confirmer |
| Destinataires de ses rapports et transmissions | Superviseur circulation |
| Nombre de droits | 17 sur 157 |
| Droits sensibles détenus | 0 |
| Comptes de démonstration | `control.cs1`, `control.cs2` |

**Responsabilité :** Agent de contrôle routier : enregistre les contrôles et émet des PV ; lit les fiches mais ne les modifie pas.

### Modules accessibles (menu)

- **Général** : Tableau de bord
- **Accueil** : Personnes, Personnes recherchées, Alertes nationales
- **Circulation routière** : Tableau de bord trafic, Contrôles routiers, Procès-verbaux, Amendes & paiements, Conducteurs, Véhicules & immatriculations, Catalogue des infractions, Recherche circulation
- **Recettes et versements** : Caisse des agents, Recettes collectées, Clôture de caisse, Versements, Bordereaux, Écarts
- **Ressources humaines** : Mes congés, Ma solde
- **Administration** : Organisation

### Tableau de bord

Ce profil voit, **dans son périmètre**, : Avis de recherche actifs, avis récents; Tableau de bord circulation (menu Circulation).

### Opérations autorisées (par module)

| Module | Opérations autorisées |
|---|---|
| Tableau de bord | Voir le tableau de bord |
| Organisation | Voir l'organisation |
| Personnes | Voir les personnes |
| Personnes recherchées | Voir les personnes recherchées |
| Alertes nationales | Recevoir et lire les alertes de son unité; Acquitter une alerte pour l'unité |
| Circulation | Voir contrôles, PV et amendes; Enregistrer un contrôle et émettre un PV; Voir le tableau de bord circulation; Voir les conducteurs; Joindre des preuves à un contrôle; Voir les véhicules (circulation); Voir le catalogue des infractions |
| Caisses et recettes | Encaisser une amende sur le terrain; Déclarer un versement; Ouvrir, voir et clore sa propre caisse |
| Clés d'accès (API) | Gérer ses propres clés d'accès |

Les droits marqués *(sensible)* n'agissent que si le compte a l'habilitation requise (droit sensible = habilitation « Sensible » ou « Confidentiel », attribuée par l'administrateur de sécurité).

### Opérations interdites (principales)

Ce profil **ne peut pas** : Exporter en PDF les listes et fiches ; Enregistrer une plainte ; Examiner / affecter une plainte ; Ouvrir une affaire ; Transmettre ou clôturer une affaire ; Voir les affaires sensibles ; Demander un mandat ; Approuver un mandat ; Créer un avis de recherche ; Approuver un avis de recherche ; Publier un avis sur le site public ; Enregistrer une arrestation ; Gérer une garde à vue ; Prolonger une garde à vue ; Enregistrer une pièce à conviction ; Enregistrer un paiement d'amende ; Créer un compte ; Modifier les droits d'un rôle ; Décider d'une approbation ; Consulter le journal d'audit ; Enregistrer une décision de carrière ; Voir les dossiers disciplinaires ; Voir la paie ; Lancer des sauvegardes.

Toute opération qui n'est pas dans la liste des opérations autorisées est refusée par le système.

### Documents

| Il peut… | Documents |
|---|---|
| Créer | Contrôle routier et procès-verbal (PV); Caisse et état journalier; Déclaration de versement |
| Consulter | Avis de recherche; Fiches personnes; Contrôles, PV et amendes; Conducteurs; Véhicules; Organisation; Alertes nationales |
| Transmettre | Versement vers le responsable financier |
| Valider / décider | — |

### Notifications reçues

- Versement rejeté / justification demandée
- Alertes nationales (avis de recherche) de son unité

### Procédures — Personnes recherchées

#### Rechercher une personne

1. Menu **Personnes recherchées** : saisir nom, alias, numéro ou plaque dans la recherche rapide.
2. Lire le résultat : **correspondance**, **connu** ou **aucun résultat**.
3. Pour affiner : **Recherche avancée**.

> **À savoir :** Une correspondance n'est jamais une preuve : vérifier l'identité avant d'agir.

### Procédures — Alertes

#### Recevoir et acquitter une alerte nationale

1. Un bandeau rouge apparaît sur toutes les pages dans les 20 secondes.
2. Menu **Alertes nationales** > ouvrir l'alerte.
3. **Marquer comme lu**, puis **Acquitter**. L'acquittement est horodaté pour votre unité.

> **À savoir :** Sans acquittement, l'alerte est relancée puis remontée à votre hiérarchie.

### Procédures — Circulation

#### Contrôle routier et procès-verbal

1. Menu **Circulation routière** > **Contrôles routiers** > **Nouveau contrôle**.
2. Saisir conducteur, véhicule (plaque), lieu, résultat.
3. En cas d'infraction : choisir dans le **catalogue des infractions**, joindre des photos, émettre le **PV**.
4. Si le conducteur ou le véhicule correspond à un avis de recherche, le commandement est averti.

### Procédures — Recettes

#### Ouvrir et clore sa caisse

1. Menu **Recettes** > **Caisses** > **Ouvrir ma caisse**.
2. Encaisser les amendes au fil de la journée.
3. En fin de journée : **Clore** ; le montant à verser est calculé.

#### Déclarer un versement

1. Menu **Recettes** > **Versements** > **Nouveau versement** : montant, mode, justificatif.
2. Le responsable est notifié pour vérification.

### Procédures — Alertes

#### Consulter les alertes de son unité

1. Menu **Alertes nationales** : liste des avis reçus par l'unité.

# Profil : Agent de garde à vue

### Fiche d'identité du profil

| Élément | Valeur |
|---|---|
| Type de compte (code système) | `CUSTODY_OFFICER` |
| Fonction | Agent de garde à vue |
| Famille | Terrain et accueil |
| Niveau hiérarchique (périmètre) | Commissariat (son unité et ses postes rattachés) |
| Service d'affectation | Celui du compte (commissariat, délégation, direction) : il fixe ce que l'utilisateur voit |
| Second facteur exigé par le rôle | Non (peut être exigé si l'utilisateur détient un droit sensible) |
| Supérieur hiérarchique (selon le périmètre du système) | Commissaire de son commissariat — organigramme officiel à confirmer |
| Destinataires de ses rapports et transmissions | Commissaire |
| Nombre de droits | 28 sur 157 |
| Droits sensibles détenus | 0 |
| Comptes de démonstration | `custody.cs1` |

**Responsabilité :** Tient les cellules de garde à vue et le journal de surveillance des gardés à vue.

### Modules accessibles (menu)

- **Général** : Tableau de bord
- **Accueil** : Plaintes, Incidents, Personnes, Personnes recherchées, Alertes nationales
- **Enquête** : Affaires, Mes tâches, Pièces & chaîne de possession
- **Contrainte** : Mandats, Arrestations, Garde à vue
- **Opérations** : Patrouilles
- **Ressources** : Agents
- **Ressources humaines** : Mes congés, Ma solde
- **Administration** : Organisation

### Tableau de bord

Ce profil voit, **dans son périmètre**, : Nombre d'agents actifs; Incidents de la période, répartition par type, tendance, incidents récents; Affaires ouvertes; Plaintes reçues sur la période; Avis de recherche actifs, avis récents.

### Opérations autorisées (par module)

| Module | Opérations autorisées |
|---|---|
| Tableau de bord | Voir le tableau de bord |
| Organisation | Voir l'organisation |
| Agents (officiers) | Voir les agents |
| Personnes | Voir les personnes |
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
| Arrestations | Voir les arrestations; Changer le statut d'une arrestation |
| Gardes à vue | Voir les gardes à vue; Ouvrir, surveiller et clore une garde à vue |
| Patrouilles | Voir les patrouilles |
| Incidents | Voir les incidents |
| Opérations | Voir les opérations |
| Véhicules de service | Voir les véhicules de service |
| Maintenance | Voir la maintenance |
| Documents | Voir les documents; Déposer des documents |
| Rapports | Voir les rapports |
| Clés d'accès (API) | Gérer ses propres clés d'accès |

Les droits marqués *(sensible)* n'agissent que si le compte a l'habilitation requise (droit sensible = habilitation « Sensible » ou « Confidentiel », attribuée par l'administrateur de sécurité).

### Opérations interdites (principales)

Ce profil **ne peut pas** : Exporter en PDF les listes et fiches ; Enregistrer une plainte ; Examiner / affecter une plainte ; Ouvrir une affaire ; Transmettre ou clôturer une affaire ; Voir les affaires sensibles ; Demander un mandat ; Approuver un mandat ; Créer un avis de recherche ; Approuver un avis de recherche ; Publier un avis sur le site public ; Enregistrer une arrestation ; Prolonger une garde à vue ; Enregistrer une pièce à conviction ; Émettre un PV routier ; Enregistrer un paiement d'amende ; Créer un compte ; Modifier les droits d'un rôle ; Décider d'une approbation ; Consulter le journal d'audit ; Enregistrer une décision de carrière ; Voir les dossiers disciplinaires ; Voir la paie ; Lancer des sauvegardes.

Toute opération qui n'est pas dans la liste des opérations autorisées est refusée par le système.

### Documents

| Il peut… | Documents |
|---|---|
| Créer | Garde à vue et son journal; Document téléversé |
| Consulter | Plaintes; Affaires; Mandats; Avis de recherche; Arrestations; Gardes à vue; Incidents; Patrouilles; Pièces à conviction; Fiches personnes; Fiches agents; Organisation; Alertes nationales |
| Transmettre | Garde à vue vers sa fin (parquet, tribunal, autre poste); Arrestation vers transfert / inculpation |
| Valider / décider | — |

### Notifications reçues

- Alertes nationales (avis de recherche) de son unité

### Procédures — Affaires

#### Suivre ses tâches

1. Menu **Mes tâches**.
2. Changer l'état d'une tâche : à faire, en cours, bloquée, terminée, annulée, avec un résultat.

### Procédures — Personnes recherchées

#### Rechercher une personne

1. Menu **Personnes recherchées** : saisir nom, alias, numéro ou plaque dans la recherche rapide.
2. Lire le résultat : **correspondance**, **connu** ou **aucun résultat**.
3. Pour affiner : **Recherche avancée**.

> **À savoir :** Une correspondance n'est jamais une preuve : vérifier l'identité avant d'agir.

### Procédures — Alertes

#### Recevoir et acquitter une alerte nationale

1. Un bandeau rouge apparaît sur toutes les pages dans les 20 secondes.
2. Menu **Alertes nationales** > ouvrir l'alerte.
3. **Marquer comme lu**, puis **Acquitter**. L'acquittement est horodaté pour votre unité.

> **À savoir :** Sans acquittement, l'alerte est relancée puis remontée à votre hiérarchie.

### Procédures — Arrestations

#### Faire évoluer une arrestation

1. Ouvrir l'arrestation > statut **En garde à vue**, **Libérée** (motif obligatoire ; garde à vue terminée au préalable), **Transférée** ou **Inculpée**.

### Procédures — Gardes à vue

#### Ouvrir et surveiller une garde à vue

1. Menu **Garde à vue** > **Ouvrir** : choisir l'arrestation, la cellule, les notes médicales.
2. Ajouter régulièrement des entrées de journal : contrôle de bien-être, repas, médical, visite, avocat, transfert, incident, note.
3. À la fin : **Clore** avec l'issue et les notes.

> **À savoir :** L'échéance légale (48 h) est affichée ; les dépassements sont signalés.

### Procédures — Alertes

#### Consulter les alertes de son unité

1. Menu **Alertes nationales** : liste des avis reçus par l'unité.

# Profil : Responsable des scellés et pièces à conviction

### Fiche d'identité du profil

| Élément | Valeur |
|---|---|
| Type de compte (code système) | `EVIDENCE_CUSTODIAN` |
| Fonction | Responsable des scellés et pièces à conviction |
| Famille | Investigation |
| Niveau hiérarchique (périmètre) | Commissariat (son unité et ses postes rattachés) |
| Service d'affectation | Celui du compte (commissariat, délégation, direction) : il fixe ce que l'utilisateur voit |
| Second facteur exigé par le rôle | Oui |
| Supérieur hiérarchique (selon le périmètre du système) | Commissaire de son commissariat — organigramme officiel à confirmer |
| Destinataires de ses rapports et transmissions | Commissaire et responsable d'affaire |
| Nombre de droits | 32 sur 157 |
| Droits sensibles détenus | 0 |
| Comptes de démonstration | `evidence.cs1` |

**Responsabilité :** Tient la salle des scellés et la chaîne de conservation des pièces à conviction.

### Modules accessibles (menu)

- **Général** : Tableau de bord
- **Accueil** : Plaintes, Incidents, Personnes, Personnes recherchées, Alertes nationales
- **Enquête** : Affaires, Mes tâches, Pièces & chaîne de possession
- **Contrainte** : Mandats, Arrestations, Garde à vue
- **Opérations** : Patrouilles
- **Ressources** : Agents
- **Ressources humaines** : Mes congés, Ma solde
- **Administration** : Organisation

### Tableau de bord

Ce profil voit, **dans son périmètre**, : Nombre d'agents actifs; Incidents de la période, répartition par type, tendance, incidents récents; Affaires ouvertes; Plaintes reçues sur la période; Avis de recherche actifs, avis récents.

### Opérations autorisées (par module)

| Module | Opérations autorisées |
|---|---|
| Tableau de bord | Voir le tableau de bord |
| Organisation | Voir l'organisation |
| Agents (officiers) | Voir les agents |
| Personnes | Voir les personnes |
| Personnes recherchées | Voir les personnes recherchées |
| Alertes nationales | Recevoir et lire les alertes de son unité; Acquitter une alerte pour l'unité |
| Plaintes | Voir les plaintes |
| Affaires | Voir les affaires |
| Enquêtes | Voir les enquêtes et tâches |
| Déclarations | Voir les déclarations |
| Auditions | Voir les auditions |
| Transcriptions | Voir les transcriptions |
| Preuves | Voir les preuves; Enregistrer une preuve; Modifier une preuve; Gérer les lieux de stockage; Restituer / détruire une preuve; Transférer la garde d'une preuve |
| Mandats | Voir les mandats |
| Arrestations | Voir les arrestations |
| Gardes à vue | Voir les gardes à vue |
| Patrouilles | Voir les patrouilles |
| Incidents | Voir les incidents |
| Opérations | Voir les opérations |
| Véhicules de service | Voir les véhicules de service |
| Maintenance | Voir la maintenance |
| Documents | Voir les documents; Déposer des documents |
| Rapports | Voir les rapports; Produire des rapports |
| Clés d'accès (API) | Gérer ses propres clés d'accès |

Les droits marqués *(sensible)* n'agissent que si le compte a l'habilitation requise (droit sensible = habilitation « Sensible » ou « Confidentiel », attribuée par l'administrateur de sécurité).

### Opérations interdites (principales)

Ce profil **ne peut pas** : Exporter en PDF les listes et fiches ; Enregistrer une plainte ; Examiner / affecter une plainte ; Ouvrir une affaire ; Transmettre ou clôturer une affaire ; Voir les affaires sensibles ; Demander un mandat ; Approuver un mandat ; Créer un avis de recherche ; Approuver un avis de recherche ; Publier un avis sur le site public ; Enregistrer une arrestation ; Gérer une garde à vue ; Prolonger une garde à vue ; Émettre un PV routier ; Enregistrer un paiement d'amende ; Créer un compte ; Modifier les droits d'un rôle ; Décider d'une approbation ; Consulter le journal d'audit ; Enregistrer une décision de carrière ; Voir les dossiers disciplinaires ; Voir la paie ; Lancer des sauvegardes.

Toute opération qui n'est pas dans la liste des opérations autorisées est refusée par le système.

### Documents

| Il peut… | Documents |
|---|---|
| Créer | Fiche de pièce à conviction; Document téléversé; Rapport (écran non construit) |
| Consulter | Plaintes; Affaires; Mandats; Avis de recherche; Arrestations; Gardes à vue; Incidents; Patrouilles; Pièces à conviction; Fiches personnes; Fiches agents; Organisation; Alertes nationales |
| Transmettre | Pièce à conviction vers un autre agent ou lieu |
| Valider / décider | — |

### Notifications reçues

- Alertes nationales (avis de recherche) de son unité

### Procédures — Affaires

#### Suivre ses tâches

1. Menu **Mes tâches**.
2. Changer l'état d'une tâche : à faire, en cours, bloquée, terminée, annulée, avec un résultat.

### Procédures — Preuves

#### Enregistrer une pièce à conviction

1. Menu **Pièces & chaîne de possession** > **Nouvelle pièce**, ou depuis l'affaire.
2. Renseigner catégorie, description, quantité, numéro de scellé, provenance, état, lieu de stockage.
3. Joindre une photo si possible.

#### Transférer la garde d'une pièce

1. Ouvrir la pièce > **Transférer la garde**.
2. Choisir l'action (stockée, transférée, sortie, retournée, examinée, restituée, détruite, archivée), le destinataire ou le lieu et le motif.
3. Chaque transfert est tracé.

### Procédures — Personnes recherchées

#### Rechercher une personne

1. Menu **Personnes recherchées** : saisir nom, alias, numéro ou plaque dans la recherche rapide.
2. Lire le résultat : **correspondance**, **connu** ou **aucun résultat**.
3. Pour affiner : **Recherche avancée**.

> **À savoir :** Une correspondance n'est jamais une preuve : vérifier l'identité avant d'agir.

### Procédures — Alertes

#### Recevoir et acquitter une alerte nationale

1. Un bandeau rouge apparaît sur toutes les pages dans les 20 secondes.
2. Menu **Alertes nationales** > ouvrir l'alerte.
3. **Marquer comme lu**, puis **Acquitter**. L'acquittement est horodaté pour votre unité.

> **À savoir :** Sans acquittement, l'alerte est relancée puis remontée à votre hiérarchie.

#### Consulter les alertes de son unité

1. Menu **Alertes nationales** : liste des avis reçus par l'unité.

# Profil : Agent biométrie

### Fiche d'identité du profil

| Élément | Valeur |
|---|---|
| Type de compte (code système) | `BIOMETRIC_OFFICER` |
| Fonction | Agent biométrie |
| Famille | Investigation |
| Niveau hiérarchique (périmètre) | Commissariat (son unité et ses postes rattachés) |
| Service d'affectation | Celui du compte (commissariat, délégation, direction) : il fixe ce que l'utilisateur voit |
| Second facteur exigé par le rôle | Oui |
| Supérieur hiérarchique (selon le périmètre du système) | Commissaire de son commissariat — organigramme officiel à confirmer |
| Destinataires de ses rapports et transmissions | Responsable d'affaire et commissaire |
| Nombre de droits | 32 sur 157 |
| Droits sensibles détenus | 0 |
| Comptes de démonstration | `biometric.cs1` |

**Responsabilité :** Exécute les recherches (empreinte, visage, voix, plaque) et enregistre la vérification humaine des correspondances.

### Modules accessibles (menu)

- **Général** : Tableau de bord
- **Accueil** : Plaintes, Incidents, Personnes, Personnes recherchées, Alertes nationales
- **Enquête** : Affaires, Mes tâches, Pièces & chaîne de possession, Biométrie & police scientifique, Contrôle biométrique
- **Contrainte** : Mandats, Arrestations, Garde à vue
- **Opérations** : Patrouilles
- **Ressources** : Agents
- **Ressources humaines** : Mes congés, Ma solde
- **Administration** : Organisation

### Tableau de bord

Ce profil voit, **dans son périmètre**, : Nombre d'agents actifs; Incidents de la période, répartition par type, tendance, incidents récents; Affaires ouvertes; Plaintes reçues sur la période; Avis de recherche actifs, avis récents.

### Opérations autorisées (par module)

| Module | Opérations autorisées |
|---|---|
| Tableau de bord | Voir le tableau de bord |
| Organisation | Voir l'organisation |
| Agents (officiers) | Voir les agents |
| Personnes | Voir les personnes |
| Personnes recherchées | Voir les personnes recherchées |
| Biométrie | Enregistrer la vérification humaine d'une correspondance; Contrôle d'identité biométrique (simulation); Voir l'historique des recherches biométriques; Recherche par plaque (ANPR); Recherche par visage; Recherche par empreinte; Recherche par voix |
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
| Documents | Voir les documents |
| Rapports | Voir les rapports |
| Clés d'accès (API) | Gérer ses propres clés d'accès |

Les droits marqués *(sensible)* n'agissent que si le compte a l'habilitation requise (droit sensible = habilitation « Sensible » ou « Confidentiel », attribuée par l'administrateur de sécurité).

### Opérations interdites (principales)

Ce profil **ne peut pas** : Exporter en PDF les listes et fiches ; Enregistrer une plainte ; Examiner / affecter une plainte ; Ouvrir une affaire ; Transmettre ou clôturer une affaire ; Voir les affaires sensibles ; Demander un mandat ; Approuver un mandat ; Créer un avis de recherche ; Approuver un avis de recherche ; Publier un avis sur le site public ; Enregistrer une arrestation ; Gérer une garde à vue ; Prolonger une garde à vue ; Enregistrer une pièce à conviction ; Émettre un PV routier ; Enregistrer un paiement d'amende ; Créer un compte ; Modifier les droits d'un rôle ; Décider d'une approbation ; Consulter le journal d'audit ; Enregistrer une décision de carrière ; Voir les dossiers disciplinaires ; Voir la paie ; Lancer des sauvegardes.

Toute opération qui n'est pas dans la liste des opérations autorisées est refusée par le système.

### Documents

| Il peut… | Documents |
|---|---|
| Créer | — |
| Consulter | Plaintes; Affaires; Mandats; Avis de recherche; Arrestations; Gardes à vue; Incidents; Patrouilles; Pièces à conviction; Fiches personnes; Fiches agents; Organisation; Alertes nationales |
| Transmettre | — |
| Valider / décider | Vérification humaine d'une correspondance biométrique |

### Notifications reçues

- Vérification humaine demandée ; erreur signalée
- Alertes nationales (avis de recherche) de son unité

### Procédures — Affaires

#### Suivre ses tâches

1. Menu **Mes tâches**.
2. Changer l'état d'une tâche : à faire, en cours, bloquée, terminée, annulée, avec un résultat.

### Procédures — Personnes recherchées

#### Rechercher une personne

1. Menu **Personnes recherchées** : saisir nom, alias, numéro ou plaque dans la recherche rapide.
2. Lire le résultat : **correspondance**, **connu** ou **aucun résultat**.
3. Pour affiner : **Recherche avancée**.

> **À savoir :** Une correspondance n'est jamais une preuve : vérifier l'identité avant d'agir.

### Procédures — Alertes

#### Recevoir et acquitter une alerte nationale

1. Un bandeau rouge apparaît sur toutes les pages dans les 20 secondes.
2. Menu **Alertes nationales** > ouvrir l'alerte.
3. **Marquer comme lu**, puis **Acquitter**. L'acquittement est horodaté pour votre unité.

> **À savoir :** Sans acquittement, l'alerte est relancée puis remontée à votre hiérarchie.

### Procédures — Biométrie

#### Contrôle d'identité biométrique (simulation)

1. Menu **Contrôle biométrique** : choisir la modalité (empreinte ou visage), saisir le motif du contrôle, lancer.
2. En cas de correspondance possible : **Voir le dossier autorisé**, **Demander vérification**, **Notifier le supérieur** ou **Signaler une erreur**.

> **À savoir :** L'écran est une simulation tant qu'aucun matériel réel n'est branché.

### Procédures — Alertes

#### Consulter les alertes de son unité

1. Menu **Alertes nationales** : liste des avis reçus par l'unité.

# Profil : Agent de police technique et scientifique

### Fiche d'identité du profil

| Élément | Valeur |
|---|---|
| Type de compte (code système) | `FORENSIC_OFFICER` |
| Fonction | Agent de police technique et scientifique |
| Famille | Investigation |
| Niveau hiérarchique (périmètre) | Commissariat (son unité et ses postes rattachés) |
| Service d'affectation | Celui du compte (commissariat, délégation, direction) : il fixe ce que l'utilisateur voit |
| Second facteur exigé par le rôle | Oui |
| Supérieur hiérarchique (selon le périmètre du système) | Commissaire de son commissariat — organigramme officiel à confirmer |
| Destinataires de ses rapports et transmissions | Responsable d'affaire et commissaire |
| Nombre de droits | 33 sur 157 |
| Droits sensibles détenus | 0 |
| Comptes de démonstration | `forensic.cs1` |

**Responsabilité :** Police technique et scientifique : pièces, chaîne de conservation, enrôlement de gabarits et recherche d'empreintes.

### Modules accessibles (menu)

- **Général** : Tableau de bord
- **Accueil** : Plaintes, Incidents, Personnes, Personnes recherchées, Alertes nationales
- **Enquête** : Affaires, Mes tâches, Pièces & chaîne de possession, Biométrie & police scientifique, Contrôle biométrique
- **Contrainte** : Mandats, Arrestations, Garde à vue
- **Opérations** : Patrouilles
- **Ressources** : Agents
- **Ressources humaines** : Mes congés, Ma solde
- **Administration** : Organisation

### Tableau de bord

Ce profil voit, **dans son périmètre**, : Nombre d'agents actifs; Incidents de la période, répartition par type, tendance, incidents récents; Affaires ouvertes; Plaintes reçues sur la période; Avis de recherche actifs, avis récents.

### Opérations autorisées (par module)

| Module | Opérations autorisées |
|---|---|
| Tableau de bord | Voir le tableau de bord |
| Organisation | Voir l'organisation |
| Agents (officiers) | Voir les agents |
| Personnes | Voir les personnes |
| Personnes recherchées | Voir les personnes recherchées |
| Biométrie | Enrôler des gabarits biométriques; Contrôle d'identité biométrique (simulation); Voir l'historique des recherches biométriques; Recherche par empreinte |
| Alertes nationales | Recevoir et lire les alertes de son unité; Acquitter une alerte pour l'unité |
| Plaintes | Voir les plaintes |
| Affaires | Voir les affaires |
| Enquêtes | Voir les enquêtes et tâches |
| Déclarations | Voir les déclarations |
| Auditions | Voir les auditions |
| Transcriptions | Voir les transcriptions |
| Preuves | Voir les preuves; Enregistrer une preuve; Modifier une preuve; Gérer les lieux de stockage; Transférer la garde d'une preuve |
| Mandats | Voir les mandats |
| Arrestations | Voir les arrestations |
| Gardes à vue | Voir les gardes à vue |
| Patrouilles | Voir les patrouilles |
| Incidents | Voir les incidents |
| Opérations | Voir les opérations |
| Véhicules de service | Voir les véhicules de service |
| Maintenance | Voir la maintenance |
| Documents | Voir les documents |
| Rapports | Voir les rapports |
| Clés d'accès (API) | Gérer ses propres clés d'accès |

Les droits marqués *(sensible)* n'agissent que si le compte a l'habilitation requise (droit sensible = habilitation « Sensible » ou « Confidentiel », attribuée par l'administrateur de sécurité).

### Opérations interdites (principales)

Ce profil **ne peut pas** : Exporter en PDF les listes et fiches ; Enregistrer une plainte ; Examiner / affecter une plainte ; Ouvrir une affaire ; Transmettre ou clôturer une affaire ; Voir les affaires sensibles ; Demander un mandat ; Approuver un mandat ; Créer un avis de recherche ; Approuver un avis de recherche ; Publier un avis sur le site public ; Enregistrer une arrestation ; Gérer une garde à vue ; Prolonger une garde à vue ; Émettre un PV routier ; Enregistrer un paiement d'amende ; Créer un compte ; Modifier les droits d'un rôle ; Décider d'une approbation ; Consulter le journal d'audit ; Enregistrer une décision de carrière ; Voir les dossiers disciplinaires ; Voir la paie ; Lancer des sauvegardes.

Toute opération qui n'est pas dans la liste des opérations autorisées est refusée par le système.

### Documents

| Il peut… | Documents |
|---|---|
| Créer | Fiche de pièce à conviction |
| Consulter | Plaintes; Affaires; Mandats; Avis de recherche; Arrestations; Gardes à vue; Incidents; Patrouilles; Pièces à conviction; Fiches personnes; Fiches agents; Organisation; Alertes nationales |
| Transmettre | Pièce à conviction vers un autre agent ou lieu |
| Valider / décider | — |

### Notifications reçues

- Alertes nationales (avis de recherche) de son unité

### Procédures — Affaires

#### Suivre ses tâches

1. Menu **Mes tâches**.
2. Changer l'état d'une tâche : à faire, en cours, bloquée, terminée, annulée, avec un résultat.

### Procédures — Preuves

#### Enregistrer une pièce à conviction

1. Menu **Pièces & chaîne de possession** > **Nouvelle pièce**, ou depuis l'affaire.
2. Renseigner catégorie, description, quantité, numéro de scellé, provenance, état, lieu de stockage.
3. Joindre une photo si possible.

#### Transférer la garde d'une pièce

1. Ouvrir la pièce > **Transférer la garde**.
2. Choisir l'action (stockée, transférée, sortie, retournée, examinée, restituée, détruite, archivée), le destinataire ou le lieu et le motif.
3. Chaque transfert est tracé.

### Procédures — Personnes recherchées

#### Rechercher une personne

1. Menu **Personnes recherchées** : saisir nom, alias, numéro ou plaque dans la recherche rapide.
2. Lire le résultat : **correspondance**, **connu** ou **aucun résultat**.
3. Pour affiner : **Recherche avancée**.

> **À savoir :** Une correspondance n'est jamais une preuve : vérifier l'identité avant d'agir.

### Procédures — Alertes

#### Recevoir et acquitter une alerte nationale

1. Un bandeau rouge apparaît sur toutes les pages dans les 20 secondes.
2. Menu **Alertes nationales** > ouvrir l'alerte.
3. **Marquer comme lu**, puis **Acquitter**. L'acquittement est horodaté pour votre unité.

> **À savoir :** Sans acquittement, l'alerte est relancée puis remontée à votre hiérarchie.

### Procédures — Biométrie

#### Contrôle d'identité biométrique (simulation)

1. Menu **Contrôle biométrique** : choisir la modalité (empreinte ou visage), saisir le motif du contrôle, lancer.
2. En cas de correspondance possible : **Voir le dossier autorisé**, **Demander vérification**, **Notifier le supérieur** ou **Signaler une erreur**.

> **À savoir :** L'écran est une simulation tant qu'aucun matériel réel n'est branché.

### Procédures — Alertes

#### Consulter les alertes de son unité

1. Menu **Alertes nationales** : liste des avis reçus par l'unité.

## Fonctions que le système ne propose pas (encore)

Pour éviter toute confusion, voici ce que vous ne trouverez **pas** dans les menus, même si vous en avez l'habitude dans le travail : un registre de **main courante** distinct (le module Incidents s'en rapproche), les **procès-verbaux d'audition et déclarations**, un écran **Enquêtes** dédié, un transfert de **dossier entre commissariats** avec acceptation ou refus, les **rapports** et **statistiques** généraux (seuls le tableau de bord et les rapports de recettes existent), les **archives/documents**, la recherche globale, l'envoi de SMS ou de courriels.

### Se déconnecter en sécurité

1. Cliquer sur le bouton **Déconnexion** en haut à droite de l'en-tête.
2. Ne pas se contenter de fermer l'onglet, surtout sur un poste partagé.
3. La session se ferme d'elle-même après **60 minutes d'inactivité** (15 minutes pour les comptes qui détiennent un droit sensible) et au plus tard après **10 heures**.

## Points à confirmer auprès de la hiérarchie

- Fonctions non couvertes par un profil (ex. agent de police judiciaire, agent des archives).

## Améliorations recommandées

- Rapports périodiques automatiques vers le niveau supérieur (module Rapports non construit).
- Alerte de relance pour les dossiers sans suite (non construite).

