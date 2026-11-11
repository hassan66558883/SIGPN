# Fiche de profil — Directeur des ressources humaines

**Manuel individuel du profil `HR_DIRECTOR`**

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
| Type de compte (code système) | `HR_DIRECTOR` |
| Fonction | Directeur des ressources humaines |
| Famille | Ressources humaines |
| Niveau hiérarchique (périmètre) | National (tout le pays) |
| Service d'affectation | Celui du compte (commissariat, délégation, direction) : il fixe ce que l'utilisateur voit |
| Second facteur exigé par le rôle | Oui |
| Supérieur hiérarchique (selon le périmètre du système) | Direction générale — organigramme officiel à confirmer |
| Destinataires de ses rapports et transmissions | Direction générale |
| Nombre de droits | 22 sur 157 |
| Droits sensibles détenus | 2 |
| Comptes de démonstration | `hr.director` |

**Responsabilité :** Direction des ressources humaines : dossiers RH et décisions de carrière (promotion, nomination, statut, retraite).

## Modules accessibles (menu)

- **Général** : Tableau de bord
- **Recettes et versements** : Audit financier
- **Ressources** : Agents
- **Ressources humaines** : Vue d'ensemble RH, Dossiers du personnel, Mutations, Affectation automatique, Présences, Congés et absences, Formations, Documents RH, Discipline, Mes congés, Ma solde
- **Administration** : Organisation, Journal d'audit

## Tableau de bord

Ce profil voit, **dans son périmètre**, : Nombre d'agents actifs.

## Opérations autorisées (par module)

| Module | Opérations autorisées |
|---|---|
| Tableau de bord | Voir le tableau de bord |
| Statistiques | Voir les statistiques |
| Journal d'audit | Consulter le journal d'audit |
| Organisation | Voir l'organisation |
| Agents (officiers) | Voir les agents; Gérer les fiches agents |
| Documents | Voir les documents |
| Rapports | Voir les rapports; Produire des rapports |
| Ressources humaines | Voir les dossiers RH; Modifier le dossier RH d'un agent; Enregistrer l'appel quotidien; Enregistrer une décision de carrière; Instruire un dossier disciplinaire (sensible); Voir les dossiers disciplinaires (sensible); Éditer des documents RH; Approuver ou rejeter un congé; Déposer une demande de congé; Gérer les formations et attestations; Proposer une mutation; Examiner les mutations (RH) |
| Clés d'accès (API) | Gérer ses propres clés d'accès |

Les droits marqués *(sensible)* n'agissent que si le compte a l'habilitation requise (droit sensible = habilitation « Sensible » ou « Confidentiel », attribuée par l'administrateur de sécurité).

## Opérations interdites (principales)

Ce profil **ne peut pas** : Exporter en PDF les listes et fiches ; Enregistrer une plainte ; Examiner / affecter une plainte ; Ouvrir une affaire ; Transmettre ou clôturer une affaire ; Voir les affaires sensibles ; Demander un mandat ; Approuver un mandat ; Créer un avis de recherche ; Approuver un avis de recherche ; Publier un avis sur le site public ; Enregistrer une arrestation ; Gérer une garde à vue ; Prolonger une garde à vue ; Enregistrer une pièce à conviction ; Émettre un PV routier ; Enregistrer un paiement d'amende ; Créer un compte ; Modifier les droits d'un rôle ; Décider d'une approbation ; Voir la paie ; Lancer des sauvegardes.

Toute opération qui n'est pas dans la liste des opérations autorisées est refusée par le système.

## Documents

| Il peut… | Documents |
|---|---|
| Créer | Proposition de mutation; Demande de congé; Document RH (attestation, ordre, note de service); Rapport (écran non construit) |
| Consulter | Journal d'audit; Dossiers RH; Dossiers disciplinaires; Fiches agents; Organisation |
| Transmettre | Mutation vers les RH |
| Valider / décider | Examen d'une mutation (RH); Décision sur un congé |

## Notifications reçues

- Mutation à examiner ; propositions automatiques de rotation
- Demande de congé à décider
- Agents bientôt éligibles à la rotation ; officier arrivant / partant

## Procédures — Ressources humaines

### Proposer une mutation

1. Menu **Ressources humaines** > **Mutations** > nouvelle proposition (agent, unité de destination, motif).
2. Les RH sont notifiées.

### Examiner les mutations (RH)

1. Menu **Mutations**, filtre **Proposée** : ouvrir, **Approuver** (transmis à l'autorité) ou **Rejeter** avec note.
2. Exécuter une mutation approuvée par l'autorité.

### Déposer une demande de congé

1. Menu **Congés** : nouvelle demande (type, dates).
2. Le responsable est notifié.

### Décider des congés

1. Menu **Congés**, filtre **Demandé** : **Approuver** ou **Rejeter** (note). Le demandeur est notifié.

### Appel quotidien

1. Menu **Présences** : enregistrer présent, en retard, absent, en congé, permission, indisponible pour chaque agent.

### Instruire un dossier disciplinaire (confidentiel)

1. Menu **Discipline** : ouvrir un dossier, enregistrer les étapes (notification, audition, rapport, note).
2. Chaque lecture est journalisée.

## Procédures — Contrôle

### Consulter le journal d'audit

1. Menu **Journal d'audit** : filtrer par utilisateur, module, action, période.
2. Le bouton de contrôle d'intégrité (Centre de sécurité) vérifie que le journal n'a pas été altéré.

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
