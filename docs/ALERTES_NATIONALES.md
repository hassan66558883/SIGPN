# Réseau national d'alertes (SIGPN-T v2.0, chapitre 5)

## Principe

Quand un avis de recherche est approuvé (ou suspendu, corrigé, réactivé, retiré, expiré, clos), le serveur crée **un événement national unique** (`NationalAlert`, immuable par trigger) et une **livraison** par unité destinataire (`AlertDelivery`). La file est durable : elle vit en base PostgreSQL, rien n'est perdu à un redémarrage.

| Étape du cahier | Mise en œuvre |
|---|---|
| Création par un agent habilité | `wanted:create`, avis en brouillon |
| Vérification puis approbation | `wanted:verify` (≠ émetteur), `wanted:approve` (≠ émetteur), mandat actif pour un mandat de recherche |
| Événement national unique dans une file durable | `publishAlert` dans la **même transaction** que le changement d'état (clé d'idempotence unique) |
| Notification immédiate des unités connectées | message générique `Notification` (kind ALERT) + bandeau et signal dans l'application (rafraîchissement 20 s) |
| Unités hors ligne : événements en attente à la reconnexion | la livraison reste `PENDING` ; la prochaine synchronisation (`GET /api/v1/alerts`) les remet toutes, dans l'ordre (`afterSeq` pour reprendre) |
| Accusés de livraison, lecture, acquittement | `DELIVERED` (remise à la synchronisation), `READ` (ouverture ou bouton), `ACKNOWLEDGED` (`alerts:ack`) — idempotents, audités |
| Suspensions, corrections, expirations, retraits | mêmes événements, même circuit (types `SUSPENDED`, `UPDATED`, `EXPIRED`, `WITHDRAWN`, `CLOSED`, `REACTIVATED`) |

## Périmètre de diffusion

Choisi sur l'avis (`diffusionLevel`, modifiable avant approbation) :

- `NATIONAL` : toutes les unités actives (commissariats et sous-commissariats) ;
- `REGIONAL` : les unités de la province de l'unité émettrice ;
- `LOCAL` : l'unité émettrice et ses sous-unités.

## Contenu transmis

Bulletin minimal : identité nécessaire à la reconnaissance (nom, alias, naissance, signalement), infraction, nature, niveau de vigilance, autorité émettrice, unité source, consigne. **Jamais** : motif interne, détail d'enquête, informateurs, pièces. La notification visible hors application est générique (aucune donnée sensible sur un écran verrouillé). Chaque alerte rappelle qu'une correspondance n'établit jamais la culpabilité.

## Supervision (`/alerts/supervision`, `alerts:supervise`)

Alertes avec compteurs reçues / lues / acquittées / échecs / en attente, filtres (période, province, commissariat, statut, type), liste des unités avec état connecté / hors ligne, détail par unité, relance manuelle. Une unité est « connectée » si un de ses clients a émis un battement de cœur dans les 2 dernières minutes. La portée suit le rôle (national : tout ; provincial : sa province).

## Relances et escalades (automatiques)

Passe idempotente toutes les minutes (`ALERT_SCHEDULER`, `npm run alerts:maintain` pour un cron externe) :

- livraison en attente : relance toutes les 5 minutes (compteur ; rappel générique aux utilisateurs de l'unité, 3 fois) ;
- escalade niveau 1 sans prise en compte après 15 min (5 min pour une vigilance HAUTE/EXTRÊME) → supervision provinciale et unité parente ; niveau 2 après 60 min (15 min) → supervision nationale ;
- livraison remise mais non acquittée : niveaux à 30 / 60 min (10 / 20 min pour l'urgent) ;
- unité désactivée : livraison en `FAILED`.

Le niveau atteint est enregistré sur la livraison : une même escalade n'est jamais répétée. Les simulations ne sont pas escaladées.

## Démonstration (`alerts:simulate`)

Alerte fictive (marquée SIMULATION partout, jamais liée à un avis réel) et coupure simulée d'une unité depuis la page de supervision. Réservé à l'administrateur système et au commandement national.

## Permissions

`alerts:view` (recevoir/lire, tous les rôles qui voient les avis), `alerts:ack`, `alerts:supervise` (rôles qui approuvent les avis), `alerts:simulate` (SUPER_ADMIN, NATIONAL_COMMANDER). Attribuées une fois par `syncSystemRoles` (clé `rbac.alerts_defaults_applied`).

## API

`GET /api/v1/alerts` · `POST /api/v1/alerts/heartbeat` · `GET /api/v1/alerts/{id}` · `POST /api/v1/alerts/{id}/read` · `POST /api/v1/alerts/{id}/ack` · `GET /api/v1/alerts/supervision` · `GET /api/v1/alerts/supervision/{id}` · `POST /api/v1/alerts/supervision/{id}/remind` · `POST /api/v1/alerts/units/{id}/presence` · `POST /api/v1/alerts/simulate`.

## Migration et retour arrière

`prisma/migrations/20261108120000_national_alerts` (additive). Retour arrière : `DROP TABLE "AlertDelivery","StationPresence","NationalAlert"; ALTER TABLE "WantedPerson" DROP COLUMN "diffusionLevel"; DROP TYPE "AlertDeliveryStatus","AlertKind","WantedDiffusion";` — à faire après sauvegarde.

## Limites connues

- Livraison « pull » (rafraîchissement 20 s), pas de WebSocket ni de notification push mobile : le délai d'affichage est de l'ordre de 20 s.
- La reconnexion d'une unité est détectée à la prochaine synchronisation ; le test de coupure réseau réel (câble, VSAT) n'a pas été fait, seulement la simulation.
- La photographie n'est pas diffusée dans le bulletin (accès aux pièces hors périmètre) ; à décider avec la Direction.
- Charge mesurée en phase 8 sur un seul poste (300 unités simulées, 20 avis, 6 000 livraisons, build de production) : publication 138 ms au 95e centile, supervision 27 ms, voir `docs/TESTS_PHASE8.md` ; les délais d'un réseau réel ne sont pas mesurés.
- Le texte du bulletin (par exemple « vérification humaine obligatoire ») est figé en français à la publication ; il n'est pas traduit dans l'interface arabe.
- Compte d'unité : la réception suit l'unité de l'utilisateur ; une unité sans utilisateur (ex. sous-commissariat sans compte) reste en attente et finit escaladée.
