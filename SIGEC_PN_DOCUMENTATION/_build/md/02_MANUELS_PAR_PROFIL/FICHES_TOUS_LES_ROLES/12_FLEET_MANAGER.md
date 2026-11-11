# Fiche de profil — Gestionnaire du parc de véhicules

**Manuel individuel du profil `FLEET_MANAGER`**

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
| Type de compte (code système) | `FLEET_MANAGER` |
| Fonction | Gestionnaire du parc de véhicules |
| Famille | Appui |
| Niveau hiérarchique (périmètre) | Provincial (sa province) |
| Service d'affectation | Celui du compte (commissariat, délégation, direction) : il fixe ce que l'utilisateur voit |
| Second facteur exigé par le rôle | Non (peut être exigé si l'utilisateur détient un droit sensible) |
| Supérieur hiérarchique (selon le périmètre du système) | Délégué provincial de police — organigramme officiel à confirmer |
| Destinataires de ses rapports et transmissions | Délégué provincial |
| Nombre de droits | 14 sur 157 |
| Droits sensibles détenus | 0 |
| Comptes de démonstration | `fleet.central` |

**Responsabilité :** Gère les véhicules de service, leur maintenance et leur carburant pour une province.

## Modules accessibles (menu)

- **Général** : Tableau de bord
- **Opérations** : Patrouilles
- **Ressources** : Agents
- **Ressources humaines** : Mes congés, Ma solde
- **Administration** : Organisation

## Tableau de bord

Ce profil voit, **dans son périmètre**, : Nombre d'agents actifs.

## Opérations autorisées (par module)

| Module | Opérations autorisées |
|---|---|
| Tableau de bord | Voir le tableau de bord |
| Organisation | Voir l'organisation |
| Agents (officiers) | Voir les agents |
| Patrouilles | Voir les patrouilles |
| Opérations | Voir les opérations |
| Véhicules de service | Voir les véhicules de service; Gérer les véhicules de service |
| Maintenance | Voir la maintenance; Gérer la maintenance |
| Documents | Voir les documents; Déposer des documents |
| Rapports | Voir les rapports; Produire des rapports |
| Clés d'accès (API) | Gérer ses propres clés d'accès |

Les droits marqués *(sensible)* n'agissent que si le compte a l'habilitation requise (droit sensible = habilitation « Sensible » ou « Confidentiel », attribuée par l'administrateur de sécurité).

## Opérations interdites (principales)

Ce profil **ne peut pas** : Exporter en PDF les listes et fiches ; Enregistrer une plainte ; Examiner / affecter une plainte ; Ouvrir une affaire ; Transmettre ou clôturer une affaire ; Voir les affaires sensibles ; Demander un mandat ; Approuver un mandat ; Créer un avis de recherche ; Approuver un avis de recherche ; Publier un avis sur le site public ; Enregistrer une arrestation ; Gérer une garde à vue ; Prolonger une garde à vue ; Enregistrer une pièce à conviction ; Émettre un PV routier ; Enregistrer un paiement d'amende ; Créer un compte ; Modifier les droits d'un rôle ; Décider d'une approbation ; Consulter le journal d'audit ; Enregistrer une décision de carrière ; Voir les dossiers disciplinaires ; Voir la paie ; Lancer des sauvegardes.

Toute opération qui n'est pas dans la liste des opérations autorisées est refusée par le système.

## Documents

| Il peut… | Documents |
|---|---|
| Créer | Document téléversé; Rapport (écran non construit) |
| Consulter | Patrouilles; Fiches agents; Organisation |
| Transmettre | — |
| Valider / décider | — |

## Notifications reçues

Aucune notification métier propre à ce profil (les notifications de sécurité sur son propre compte lui parviennent toujours).

Aucune procédure spécifique : ce profil consulte.

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
