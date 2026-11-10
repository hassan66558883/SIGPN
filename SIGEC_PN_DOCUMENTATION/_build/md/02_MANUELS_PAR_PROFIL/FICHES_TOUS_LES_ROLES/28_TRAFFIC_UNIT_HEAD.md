# Fiche de profil — Chef d'unité (recettes)

**Manuel individuel du profil `TRAFFIC_UNIT_HEAD`**

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
| Type de compte (code système) | `TRAFFIC_UNIT_HEAD` |
| Fonction | Chef d'unité (recettes) |
| Famille | Circulation et recettes |
| Niveau hiérarchique (périmètre) | Commissariat (son unité et ses postes rattachés) |
| Service d'affectation | Celui du compte (commissariat, délégation, direction) : il fixe ce que l'utilisateur voit |
| Second facteur exigé par le rôle | Oui |
| Supérieur hiérarchique (selon le périmètre du système) | Commissaire de son commissariat — organigramme officiel à confirmer |
| Destinataires de ses rapports et transmissions | Responsable financier de la province |
| Nombre de droits | 16 sur 157 |
| Droits sensibles détenus | 0 |
| Comptes de démonstration | `unit.head` |

**Responsabilité :** Chef d'unité (recettes) : suit les recettes de ses agents, vérifie les clôtures journalières et contrôle les versements.

## Modules accessibles (menu)

- **Général** : Tableau de bord
- **Accueil** : Personnes
- **Circulation routière** : Tableau de bord trafic, Contrôles routiers, Procès-verbaux, Amendes & paiements, Conducteurs, Véhicules & immatriculations, Catalogue des infractions, Recherche circulation
- **Recettes et versements** : Tableau de bord des recettes, Caisse des agents, Recettes collectées, Clôture de caisse, Versements, Bordereaux, Rapprochement, Écarts, Rapports financiers
- **Ressources** : Agents
- **Ressources humaines** : Mes congés, Ma solde
- **Administration** : Organisation

## Tableau de bord

Ce profil voit, **dans son périmètre**, : Nombre d'agents actifs; Tableau de bord circulation (menu Circulation); Tableau de bord des recettes.

## Opérations autorisées (par module)

| Module | Opérations autorisées |
|---|---|
| Tableau de bord | Voir le tableau de bord |
| Statistiques | Voir les statistiques |
| Organisation | Voir l'organisation |
| Agents (officiers) | Voir les agents |
| Personnes | Voir les personnes |
| Rapports | Voir les rapports |
| Circulation | Voir contrôles, PV et amendes; Voir le tableau de bord circulation; Voir les conducteurs; Voir les véhicules (circulation); Voir le catalogue des infractions |
| Caisses et recettes | Voir caisses, recettes, versements et rapprochements; Examiner un versement (accepter, rejeter, demander justification); Voir et exporter les rapports de recettes; Vérifier la clôture d'une caisse |
| Clés d'accès (API) | Gérer ses propres clés d'accès |

Les droits marqués *(sensible)* n'agissent que si le compte a l'habilitation requise (droit sensible = habilitation « Sensible » ou « Confidentiel », attribuée par l'administrateur de sécurité).

## Opérations interdites (principales)

Ce profil **ne peut pas** : Enregistrer une plainte ; Examiner / affecter une plainte ; Ouvrir une affaire ; Transmettre ou clôturer une affaire ; Voir les affaires sensibles ; Demander un mandat ; Approuver un mandat ; Créer un avis de recherche ; Approuver un avis de recherche ; Publier un avis sur le site public ; Enregistrer une arrestation ; Gérer une garde à vue ; Prolonger une garde à vue ; Enregistrer une pièce à conviction ; Émettre un PV routier ; Enregistrer un paiement d'amende ; Créer un compte ; Modifier les droits d'un rôle ; Décider d'une approbation ; Consulter le journal d'audit ; Enregistrer une décision de carrière ; Voir les dossiers disciplinaires ; Voir la paie ; Lancer des sauvegardes.

Toute opération qui n'est pas dans la liste des opérations autorisées est refusée par le système.

## Documents

| Il peut… | Documents |
|---|---|
| Créer | — |
| Consulter | Fiches personnes; Contrôles, PV et amendes; Conducteurs; Véhicules; Caisses, recettes et versements; Rapports de recettes; Fiches agents; Organisation |
| Transmettre | — |
| Valider / décider | Vérification de clôture de caisse; Examen d'un versement |

## Notifications reçues

- Caisse clôturée ; versement à vérifier

## Procédures — Recettes

### Examiner un versement

1. Menu **Recettes** > **Versements** : ouvrir.
2. **Accepter**, **Rejeter** ou **Demander une justification** (l'agent est notifié).

### Produire un rapport de recettes

1. Menu **Recettes** > **Rapports** : choisir le rapport et la période.
2. Afficher, ou exporter en CSV / PDF (l'export est journalisé).

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
