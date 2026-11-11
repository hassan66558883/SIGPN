# Fiche de profil — Agent biométrie

**Manuel individuel du profil `BIOMETRIC_OFFICER`**

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

## Modules accessibles (menu)

- **Général** : Tableau de bord
- **Accueil** : Plaintes, Incidents, Personnes, Personnes recherchées, Alertes nationales
- **Enquête** : Affaires, Mes tâches, Pièces & chaîne de possession, Biométrie & police scientifique, Contrôle biométrique
- **Contrainte** : Mandats, Arrestations, Garde à vue
- **Opérations** : Patrouilles
- **Ressources** : Agents
- **Ressources humaines** : Mes congés, Ma solde
- **Administration** : Organisation

## Tableau de bord

Ce profil voit, **dans son périmètre**, : Nombre d'agents actifs; Incidents de la période, répartition par type, tendance, incidents récents; Affaires ouvertes; Plaintes reçues sur la période; Avis de recherche actifs, avis récents.

## Opérations autorisées (par module)

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

## Opérations interdites (principales)

Ce profil **ne peut pas** : Exporter en PDF les listes et fiches ; Enregistrer une plainte ; Examiner / affecter une plainte ; Ouvrir une affaire ; Transmettre ou clôturer une affaire ; Voir les affaires sensibles ; Demander un mandat ; Approuver un mandat ; Créer un avis de recherche ; Approuver un avis de recherche ; Publier un avis sur le site public ; Enregistrer une arrestation ; Gérer une garde à vue ; Prolonger une garde à vue ; Enregistrer une pièce à conviction ; Émettre un PV routier ; Enregistrer un paiement d'amende ; Créer un compte ; Modifier les droits d'un rôle ; Décider d'une approbation ; Consulter le journal d'audit ; Enregistrer une décision de carrière ; Voir les dossiers disciplinaires ; Voir la paie ; Lancer des sauvegardes.

Toute opération qui n'est pas dans la liste des opérations autorisées est refusée par le système.

## Documents

| Il peut… | Documents |
|---|---|
| Créer | — |
| Consulter | Plaintes; Affaires; Mandats; Avis de recherche; Arrestations; Gardes à vue; Incidents; Patrouilles; Pièces à conviction; Fiches personnes; Fiches agents; Organisation; Alertes nationales |
| Transmettre | — |
| Valider / décider | Vérification humaine d'une correspondance biométrique |

## Notifications reçues

- Vérification humaine demandée ; erreur signalée
- Alertes nationales (avis de recherche) de son unité

## Procédures — Affaires

### Suivre ses tâches

1. Menu **Mes tâches**.
2. Changer l'état d'une tâche : à faire, en cours, bloquée, terminée, annulée, avec un résultat.

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

## Procédures — Biométrie

### Contrôle d'identité biométrique (simulation)

1. Menu **Contrôle biométrique** : choisir la modalité (empreinte ou visage), saisir le motif du contrôle, lancer.
2. En cas de correspondance possible : **Voir le dossier autorisé**, **Demander vérification**, **Notifier le supérieur** ou **Signaler une erreur**.

> **À savoir :** L'écran est une simulation tant qu'aucun matériel réel n'est branché.

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
