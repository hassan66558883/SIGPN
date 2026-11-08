# Portail public (SIGPN-T v2.0, chapitres 2.2 et 4)

Le site public est servi par la même application, sous des chemins dédiés. Il lit et écrit **uniquement** par `src/server/public/service.ts` (champs publics sélectionnés explicitement). Aucun module interne n'est importé par les routes ou pages publiques ; deux tests (`tests/unit/public-boundary.test.ts`, `tests/integration/public.test.ts`) le vérifient.

## Pages (sans connexion)

| Chemin | Contenu |
|---|---|
| `/` | Accueil institutionnel, services en ligne, dernières actualités et avis publiés, encadré d'urgence |
| `/plaintes`, `/signalement`, `/contact` | Formulaires (même composant) : référence + code de suivi à l'envoi |
| `/suivi` | Suivi par référence + code |
| `/commissariats` | Annuaire (recherche, province) : seulement les unités dont les coordonnées ont été vérifiées |
| `/avis-de-recherche` | Avis dont la publication a été expressément validée |
| `/actualites`, `/actualites/{id}` | Actualités publiées |

FR par défaut, arabe RTL (même sélecteur de langue), mobile et clavier (lien d'évitement, libellés, `role="alert"`/`status`).

## Dépôts (plaintes, signalements, messages)

- Validation côté serveur (longueurs, consentement obligatoire, coordonnée de contact exigée sauf anonymat, nom exigé pour une plainte non anonyme), champ piège anti-robot (réponse « réussie », rien n'est enregistré).
- Cadence limitée par adresse (5 dépôts/heure par défaut, `PUBLIC_SUBMIT_LIMIT`) ; suivi : 10 essais/15 min par adresse et 8/heure **par référence** (`PUBLIC_TRACK_LIMIT`).
- Le **code de suivi** (10 caractères sans ambiguïté) n'est affiché qu'une fois et n'est stocké que haché (SHA-256). Une mauvaise référence et un mauvais code donnent la même réponse 404 (pas d'énumération). Le suivi ne renvoie jamais de donnée personnelle : statut, objet, réponse publique, dates.
- Un dépôt anonyme ne conserve aucune donnée de contact. L'adresse IP n'est conservée que hachée.
- Côté agents (`/public-admin`, permissions `intake:view` / `intake:manage`) : liste dans le périmètre, consultation du détail **journalisée** (données personnelles), changement de statut avec réponse publique (obligatoire pour clôturer ou rejeter), conversion d'une plainte en plainte interne (une seule fois, sans créer de fiche personne ; l'identité reste dans la description).

## Annuaire des unités

Champs publics propres (adresse, téléphone, horaires) distincts des données internes. Une unité n'est listée qu'après une **attestation de vérification** des coordonnées auprès de l'unité (contrainte en base `publicVisible ⇒ publicVerifiedAt`). Aucune coordonnée n'est inventée : un numéro d'urgence n'apparaît que si l'administration renseigne la clé `public.emergency_number` dans `SystemSetting`.

## Avis de recherche publics

Étape **distincte** de l'approbation et de la diffusion au réseau :

1. avis ACTIF, vérifié, de nature mandat de recherche ou personne disparue (une recherche pour audition n'est jamais publique) ;
2. `wanted:publish`, **une autre personne que l'émetteur**, validation expresse (case à cocher) et texte public rédigé ;
3. seuls le nom, les alias, l'âge approximatif, le signalement, le motif, le texte public et le contact vérifié de l'unité sont publiés (pas de photo, pas de motif interne, pas d'affaire, pas d'identifiant interne) ;
4. **retrait automatique** dès que l'avis cesse d'être actif (suspension, localisation, arrestation, retrait, expiration), journalisé ; la base interdit en outre un avis public non ACTIF (`CHECK`).

Rappel affiché : présomption d'innocence, ne pas intervenir soi-même.

## Actualités

Brouillon invisible ; publication par les détenteurs de `public:content` (un second que l'auteur, sauf rôle qui publie aussi les avis) ; retrait possible ; contenus de démonstration signalés.

## Permissions

`intake:view`, `intake:manage` (rôles qui examinent les plaintes), `public:content` (rôles qui publient les avis), `wanted:publish` (publication d'un avis). Attribuées une fois (`rbac.public_portal_defaults_applied`).

## API

Publique : `POST /api/v1/public/submissions`, `POST /api/v1/public/track`, `GET /api/v1/public/{news,stations,wanted}`. Agents : `GET /api/v1/intake`, `GET|PATCH /api/v1/intake/{id}`, `GET|POST /api/v1/public-content/news`, `PATCH …/news/{id}`, `GET /api/v1/public-content/stations`, `PUT …/stations/{id}`, `PATCH /api/v1/wanted/{id}` (`publishPublic`, `unpublishPublic`).

## Migration et retour arrière

`prisma/migrations/20261108160000_public_portal` (additive). Retour arrière : `DROP TABLE "PublicSubmission","PublicNews"; DROP TYPE …;` puis suppression des colonnes `publicVisible…` de `Station` et `publicPublishedAt…` de `WantedPerson`, après sauvegarde.

## Limites connues

- Les adresses IP sont celles vues par l'application : derrière un proxy de confiance (`TRUST_PROXY`) uniquement ; sans cela tout le trafic partage un marqueur et les plafonds sont globaux (relevés en développement).
- Pas de CAPTCHA (contrôles côté serveur : champ piège, plafonds, validation) ; à ajouter si un abus réel apparaît.
- Pas de pièce jointe ni de photographie dans les dépôts et dans les avis publics (circuit d'autorisation à définir avec la Direction).
- Pas d'envoi d'e-mail/SMS de confirmation : le citoyen suit par référence + code.
- Modifier l'infraction d'un avis déjà public ne le retire pas automatiquement : à retirer et republier (le formulaire de modification n'est pas exposé dans l'interface).
- Les contenus et coordonnées de la démonstration sont fictifs ; aucun numéro officiel n'est inclus.
- L'indexation par les moteurs de recherche est désactivée (démonstration).
