# Fiche de profil — Administrateur technique

**Manuel individuel du profil `SUPER_ADMIN`**

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
| Type de compte (code système) | `SUPER_ADMIN` |
| Fonction | Administrateur technique |
| Famille | Administration et sécurité |
| Niveau hiérarchique (périmètre) | National (tout le pays) |
| Service d'affectation | Celui du compte (commissariat, délégation, direction) : il fixe ce que l'utilisateur voit |
| Second facteur exigé par le rôle | Oui |
| Supérieur hiérarchique (selon le périmètre du système) | Direction générale pour l'usage ; aucun lien opérationnel — organigramme officiel à confirmer |
| Destinataires de ses rapports et transmissions | Administrateur de sécurité et Direction générale (rapport technique) |
| Nombre de droits | 12 sur 157 |
| Droits sensibles détenus | 2 |
| Comptes de démonstration | `admin` |

**Responsabilité :** Administre la plate-forme technique (paramètres, sauvegardes, structure organisationnelle, catalogue des rôles). Ne détient AUCUN droit sur les données de police.

## Modules accessibles (menu)

- **Général** : Tableau de bord
- **Accueil** : Approbations
- **Ressources humaines** : Mes congés, Ma solde
- **Administration** : Organisation, Rôles & permissions, Centre de sécurité

## Tableau de bord

Ce profil voit, **dans son périmètre**, : aucun chiffre opérationnel (les chiffres sans droit ne sont jamais affichés).

## Opérations autorisées (par module)

| Module | Opérations autorisées |
|---|---|
| Tableau de bord | Voir le tableau de bord |
| Rôles | Voir les rôles; Modifier les droits d'un rôle (sensible) |
| Droits | Voir le catalogue des droits |
| Sécurité | Voir la sécurité |
| Système | Lancer et restaurer les sauvegardes (sensible); Charger les données de démonstration; Modifier les paramètres système |
| Organisation | Voir l'organisation; Gérer la structure organisationnelle |
| Approbations | Voir les demandes d'approbation |
| Clés d'accès (API) | Gérer ses propres clés d'accès |

Les droits marqués *(sensible)* n'agissent que si le compte a l'habilitation requise (droit sensible = habilitation « Sensible » ou « Confidentiel », attribuée par l'administrateur de sécurité).

## Opérations interdites (principales)

Ce profil **ne peut pas** : Exporter en PDF les listes et fiches ; Enregistrer une plainte ; Examiner / affecter une plainte ; Ouvrir une affaire ; Transmettre ou clôturer une affaire ; Voir les affaires sensibles ; Demander un mandat ; Approuver un mandat ; Créer un avis de recherche ; Approuver un avis de recherche ; Publier un avis sur le site public ; Enregistrer une arrestation ; Gérer une garde à vue ; Prolonger une garde à vue ; Enregistrer une pièce à conviction ; Émettre un PV routier ; Enregistrer un paiement d'amende ; Créer un compte ; Décider d'une approbation ; Consulter le journal d'audit ; Enregistrer une décision de carrière ; Voir les dossiers disciplinaires ; Voir la paie.

Toute opération qui n'est pas dans la liste des opérations autorisées est refusée par le système.

## Documents

| Il peut… | Documents |
|---|---|
| Créer | — |
| Consulter | Organisation |
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
