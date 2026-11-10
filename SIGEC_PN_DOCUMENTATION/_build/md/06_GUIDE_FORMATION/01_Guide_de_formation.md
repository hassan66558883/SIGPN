# Guide de formation des utilisateurs

**Formation des policiers au SIGEC-PN / SIGPN-T — cascade nationale**

| Rubrique | Valeur |
|---|---|
| Système | SIGEC-PN / SIGPN-T — Système d'information de gestion de la Police nationale du Tchad |
| Éditeur et développeur | TECHNOTCHAD |
| Version du document | 1.0 — 10 novembre 2026 |
| Statut | Projet pour validation par la hiérarchie : les points marqués « À confirmer » ne sont pas des décisions |
| Source des informations | Lecture seule du système existant (code, catalogue des rôles et droits, écrans) — aucune donnée, aucun compte, aucun rôle, aucune permission n'a été modifié |

> Les durées, effectifs et dispositifs de ce guide sont des **propositions** de l'éditeur, à valider par la Direction. Les procédures décrites, elles, sont celles du système.

## 1. Objectifs

À l'issue de la formation, chaque agent sait se connecter en sécurité, utiliser les modules de son profil, respecter les règles de validation et reconnaître ce que le système ne fait pas.

## 2. Environnement de formation

Toujours sur l'installation de **démonstration** (données fictives) ; **jamais en production**. Les comptes de démonstration sont listés ci-dessous ; le mot de passe de démonstration est remis séparément aux formateurs. Un script de remise à zéro restaure l'installation avant chaque session.

## 3. Dispositif en cascade proposé (14 000 policiers)

| Niveau | Qui | Effectif indicatif | Durée proposée | Contenu |
|---|---|---|---|---|
| 1 — Formateurs nationaux | Équipe TECHNOTCHAD + cadres désignés par la Direction | 20 à 30 | 5 jours | Tous les manuels, circuits, sécurité, animation |
| 2 — Formateurs relais | Un à deux par province (23 provinces) et par direction centrale | 50 à 80 | 3 jours | Manuel de leur public + pédagogie |
| 3 — Sessions de commissariat | Tous les agents, par groupes de 15 à 20 | ≈ 14 000 | 1 jour (agents) à 2 jours (commissaires, enquêteurs) | Parcours de leur profil (section 4) |
| 4 — Accompagnement | Période de double commande puis assistance | — | À définir | Questions, corrections, retours d'expérience |

## 4. Parcours par profil

| Profil | Manuel | Travaux pratiques | Durée proposée |
|---|---|---|---|
| Direction générale / directeurs centraux | 01, 02 | TP1, TP8, TP10 | ½ jour |
| Délégués provinciaux | 03 | TP1, TP4, TP8, TP10 | 1 jour |
| Commissaires | 04 | TP1–TP5, TP8, TP9 | 2 jours |
| Enquêteurs | 07 | TP1–TP3, TP5, TP9 | 2 jours |
| Agents d'accueil | 08 | TP1, TP2, TP6, TP9 | 1 jour |
| Agents de patrouille | 08 | TP1, TP6, TP9 | 1 jour |
| Agents de circulation et recettes | 08, 09 (fiches) | TP1, TP7, TP9 | 1 jour |
| Garde à vue et scellés | 08 | TP1, TP5, TP9 | 1 jour |
| Administrateurs | 09 | TP1, TP8, TP9 | 2 jours |

## 5. Travaux pratiques

### TP1 — Connexion, navigation, déconnexion

**Public :** Tout public. **Comptes :** `desk.cs1`.

1. Se connecter et changer de langue.
2. Repérer le menu, la cloche, Mon compte.
3. Ouvrir le tableau de bord.
4. Se déconnecter.

**Résultat attendu :** Le stagiaire sait où il est et se déconnecte sans aide.

### TP2 — Une plainte de bout en bout

**Public :** Accueil, commissaires, enquêteurs. **Comptes :** `desk.cs1`, `chief.cs1`, `inv.diallo`.

1. Accueil : créer la personne puis la plainte, soumettre.
2. Commissaire : examiner, affecter à l'enquêteur.
3. Enquêteur : lire la notification, convertir en affaire, ajouter une tâche, soumettre à examen.
4. Commissaire : contrôler et clôturer avec une issue.

**Résultat attendu :** La plainte atteint Clôturée, l'affaire Clôturée ; l'historique montre chaque acteur.

### TP3 — Un avis de recherche à quatre yeux

**Public :** Enquêteurs, commissaires, direction. **Comptes :** `inv.diallo`, `chief.cs1`, `commander.national`.

1. Enquêteur : créer l'avis en brouillon.
2. Constater qu'il ne peut ni le vérifier ni l'approuver.
3. Commissaire : vérifier. Commandement : approuver.
4. Observer la diffusion de l'alerte.

**Résultat attendu :** L'avis est Actif et diffusé ; les refus du système sont compris.

### TP4 — Recevoir et acquitter une alerte

**Public :** Tous les agents d'unité, délégués. **Comptes :** `desk.abe`, `chief.abe`, `commander.central`.

1. Voir le bandeau rouge.
2. Marquer comme lu puis acquitter.
3. Superviseur : suivre l'état de chaque unité.

**Résultat attendu :** L'alerte est acquittée, l'horodatage est visible.

### TP5 — Arrestation et garde à vue

**Public :** Enquêteurs, gardes à vue, commissaires. **Comptes :** `inv.diallo`, `custody.cs1`, `chief.cs1`.

1. Enregistrer une arrestation sur mandat actif.
2. Ouvrir la garde à vue et remplir le journal.
3. Commissaire : prolonger avec autorité et motif.
4. Clore avec une issue ; vérifier le statut du mandat.

**Résultat attendu :** Arrestation et mandat mis à jour ; la prolongation n'est pas possible pour l'agent de garde.

### TP6 — Incident et patrouille

**Public :** Accueil, patrouille. **Comptes :** `patrol.cs1`, `desk.cs1`.

1. Signaler un incident de gravité élevée : constater la notification.
2. Passer l'incident à Résolu avec un rapport.
3. Créer, démarrer et terminer une patrouille.

**Résultat attendu :** Incident Clôturé ; patrouille Terminée avec rapport.

### TP7 — Contrôle routier, PV et paiement

**Public :** Circulation et recettes. **Comptes :** `traffic.cs1`, `traffic.supervisor`, `finance.central`.

1. Enregistrer un contrôle et émettre un PV avec preuve.
2. Enregistrer le paiement et vérifier le reçu.
3. Superviseur : annuler un PV (observer la notification).
4. Recettes : clôturer une caisse, déclarer et valider un versement.

**Résultat attendu :** Amende Payée, reçu REC-… ; versement validé.

### TP8 — Validations et approbations

**Public :** Administration, commandement. **Comptes :** `police.admin`, `security.admin`, `commander.national`.

1. Demander la création d'un compte.
2. Constater que le demandeur ne peut pas l'approuver.
3. Faire approuver par le commandant puis exécuter.
4. Consulter le journal d'audit.

**Résultat attendu :** Compte créé après approbation ; trace complète.

### TP9 — Sécurité au quotidien

**Public :** Tous. **Comptes :** —.

1. Choisir un mot de passe conforme.
2. Repérer les tentatives d'hameçonnage (ne jamais communiquer son mot de passe ni son code).
3. Verrouiller et fermer sa session.
4. Comprendre pourquoi tout est journalisé.

**Résultat attendu :** Le stagiaire énonce les 10 règles d'or.

### TP10 — Supervision d'une province

**Public :** Délégués, commandement. **Comptes :** `commander.central`, `commander.national`.

1. Comparer ce que voit un délégué et ce que voit le national.
2. Filtrer par commissariat.
3. Constater qu'un délégué ne voit pas les autres provinces.

**Résultat attendu :** Périmètre compris.

## 6. Les 10 règles d'or

1. Mon compte est personnel : je ne prête ni mot de passe ni code.
2. Je me déconnecte en quittant le poste.
3. Je cherche avant de créer (personnes, avis) pour éviter les doublons.
4. Je saisis les faits tels qu'ils sont, sans jugement.
5. Une alerte ou une correspondance n'est pas une preuve : je vérifie l'identité.
6. Celui qui demande ne valide pas : je respecte les quatre yeux.
7. Je motive toujours un rejet, une annulation, une libération, une prolongation.
8. Je n'efface rien : je change le statut.
9. Une affaire sensible reste entre les membres de son équipe.
10. En cas de doute : je demande à mon supérieur ou à l'administrateur de sécurité.

## 7. Évaluation — QCM (20 questions)

**1.** Combien de caractères au minimum pour un mot de passe ?

- 6
- 8
- 12
- 20

**2.** Après combien d'échecs de connexion le compte est-il verrouillé ?

- 3
- 5
- 10
- jamais

**3.** Qui peut approuver un mandat que vous avez demandé ?

- Vous-même
- Une autre personne habilitée
- Personne
- L'administrateur technique

**4.** Un avis de recherche peut-il être vérifié par son émetteur ?

- Oui
- Non
- Seulement le soir
- Seulement le DG

**5.** Que signifie « Convertie » pour une plainte ?

- Elle est supprimée
- Elle est devenue une affaire
- Elle est publiée
- Elle est rejetée

**6.** Peut-on supprimer un paiement saisi par erreur ?

- Oui
- Non, on l'annule
- Oui avec mot de passe
- Oui après 24 h

**7.** Une alerte de correspondance prouve-t-elle la culpabilité ?

- Oui
- Non, vérification humaine obligatoire
- Oui si urgente
- Oui si nationale

**8.** Quelle est l'échéance légale de garde à vue enregistrée dans le système ?

- 12 heures
- 24 heures
- 48 heures (à confirmer)
- 72 heures

**9.** Qui peut prolonger une garde à vue ?

- Tout agent
- Un titulaire du droit de prolongation
- Le plaignant
- Personne

**10.** L'administrateur technique peut-il approuver un mandat ?

- Oui
- Non
- Oui en urgence
- Oui s'il est national

**11.** Un délégué provincial voit-il les autres provinces ?

- Oui
- Non
- Seulement les voisines
- Seulement en lecture

**12.** Que faire si le code du second facteur est refusé ?

- Réessayer le même
- Attendre le code suivant
- Changer de téléphone
- Appeler le DG

**13.** Combien de temps un compte sensible peut-il rester inactif ?

- 5 minutes
- 15 minutes
- 60 minutes
- 10 heures

**14.** Le module « Main courante » existe-t-il ?

- Oui
- Non, seul le module Incidents s'en rapproche
- Oui pour les OPJ
- Oui pour le DG

**15.** Le système envoie-t-il des SMS ?

- Oui
- Non
- Oui pour les alertes
- Oui pour les plaintes

**16.** Qui est notifié quand une plainte est soumise ?

- Le plaignant
- Les titulaires du droit d'examen du commissariat
- Le DG
- Personne

**17.** Que devient une affaire clôturée ?

- Elle est supprimée
- Elle passe en lecture seule
- Elle est rouverte automatiquement
- Elle est publiée

**18.** Un dépôt du portail public crée-t-il une plainte officielle automatiquement ?

- Oui
- Non, un agent le convertit
- Oui si urgent
- Oui après 24 h

**19.** Que doit contenir un rejet de mandat ?

- Rien
- Un motif
- Une photo
- Une signature papier

### Corrigé

1. 12
2. 5
3. Une autre personne habilitée
4. Non
5. Elle est devenue une affaire
6. Non, on l'annule
7. Non, vérification humaine obligatoire
8. 48 heures (à confirmer)
9. Un titulaire du droit de prolongation
10. Non
11. Non
12. Attendre le code suivant
13. 15 minutes
14. Non, seul le module Incidents s'en rapproche
15. Non
16. Les titulaires du droit d'examen du commissariat
17. Elle passe en lecture seule
18. Non, un agent le convertit
19. Un motif

## 8. Grille d'évaluation pratique

| Critère | Acquis | À revoir |
|---|---|---|
| Se connecte et se déconnecte seul |  |  |
| Retrouve un dossier avec les filtres |  |  |
| Réalise la procédure de son profil sans aide |  |  |
| Respecte la règle des quatre yeux |  |  |
| Motive correctement une décision |  |  |
| Explique ce qu'une alerte n'établit pas |  |  |

## 9. Supports

Manuels du dossier `02_MANUELS_PAR_PROFIL`, circuits du dossier `04_WORKFLOWS`, glossaire, catalogue des notifications, fiche des 10 règles d'or à afficher en poste.
