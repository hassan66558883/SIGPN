# Fiche de profil — Administrateur de sécurité

**Manuel individuel du profil `SECURITY_ADMIN`**

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
| Type de compte (code système) | `SECURITY_ADMIN` |
| Fonction | Administrateur de sécurité |
| Famille | Administration et sécurité |
| Niveau hiérarchique (périmètre) | National (tout le pays) |
| Service d'affectation | Celui du compte (commissariat, délégation, direction) : il fixe ce que l'utilisateur voit |
| Second facteur exigé par le rôle | Oui |
| Supérieur hiérarchique (selon le périmètre du système) | Direction générale — organigramme officiel à confirmer |
| Destinataires de ses rapports et transmissions | Direction générale (rapport d'audit) |
| Nombre de droits | 16 sur 157 |
| Droits sensibles détenus | 1 |
| Comptes de démonstration | `security.admin` |

**Responsabilité :** Gère les comptes, les sessions et les paramètres de sécurité, lit le journal d'audit. Ne détient aucune autorité opérationnelle de police.

## Modules accessibles (menu)

- **Général** : Tableau de bord
- **Accueil** : Approbations
- **Recettes et versements** : Audit financier
- **Ressources humaines** : Mes congés, Ma solde
- **Administration** : Organisation, Utilisateurs, Rôles & permissions, Centre de sécurité, Journal d'audit

## Tableau de bord

Ce profil voit, **dans son périmètre**, : aucun chiffre opérationnel (les chiffres sans droit ne sont jamais affichés).

## Opérations autorisées (par module)

| Module | Opérations autorisées |
|---|---|
| Tableau de bord | Voir le tableau de bord |
| Utilisateurs | Voir les comptes; Créer un compte; Modifier un compte; Voir et révoquer les sessions d'autrui; Activer, suspendre, désactiver, débloquer un compte; Émettre une réinitialisation de mot de passe |
| Rôles | Voir les rôles |
| Droits | Voir le catalogue des droits |
| Sécurité | Voir la sécurité; Gérer les paramètres de sécurité |
| Journal d'audit | Consulter le journal d'audit; Exporter le journal d'audit (sensible) |
| Organisation | Voir l'organisation |
| Approbations | Voir les demandes d'approbation |
| Clés d'accès (API) | Gérer ses propres clés d'accès |

Les droits marqués *(sensible)* n'agissent que si le compte a l'habilitation requise (droit sensible = habilitation « Sensible » ou « Confidentiel », attribuée par l'administrateur de sécurité).

## Opérations interdites (principales)

Ce profil **ne peut pas** : Exporter en PDF les listes et fiches ; Enregistrer une plainte ; Examiner / affecter une plainte ; Ouvrir une affaire ; Transmettre ou clôturer une affaire ; Voir les affaires sensibles ; Demander un mandat ; Approuver un mandat ; Créer un avis de recherche ; Approuver un avis de recherche ; Publier un avis sur le site public ; Enregistrer une arrestation ; Gérer une garde à vue ; Prolonger une garde à vue ; Enregistrer une pièce à conviction ; Émettre un PV routier ; Enregistrer un paiement d'amende ; Modifier les droits d'un rôle ; Décider d'une approbation ; Enregistrer une décision de carrière ; Voir les dossiers disciplinaires ; Voir la paie ; Lancer des sauvegardes.

Toute opération qui n'est pas dans la liste des opérations autorisées est refusée par le système.

## Documents

| Il peut… | Documents |
|---|---|
| Créer | Demande de création de compte |
| Consulter | Journal d'audit; Organisation |
| Transmettre | — |
| Valider / décider | — |

## Notifications reçues

- Demande de réinitialisation de mot de passe reçue

## Procédures — Administration

### Créer un compte

1. Administration > **Utilisateurs** > **Nouveau**.
2. Renseigner l'identité et choisir le rôle (seuls les rôles que vous pouvez attribuer sont proposés).
3. Soumettre : une demande d'approbation est créée.

### Suspendre, désactiver ou débloquer un compte

1. Ouvrir la fiche > changer le statut : Actif, Suspendu, Désactivé ; débloquer un compte verrouillé.

### Réinitialiser un mot de passe

1. Ouvrir la fiche > **Émettre un lien de réinitialisation** ; le transmettre à l'utilisateur par un canal sûr.

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
