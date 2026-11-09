# SIGPN-T — Gestion des infractions routières et des amendes

Module intégré à SIGPN-T (Système Intégré de Gestion Numérique de la Police Nationale du Tchad). Il réutilise l'architecture existante (Next.js 16 + Prisma 7 / PostgreSQL, sessions, RBAC à périmètre, journal d'audit inviolable, i18n FR/AR) ; aucune application parallèle n'a été créée.

## 1. Chaîne de traitement

```
CONTRÔLE ROUTIER → INFRACTION(S) → PROCÈS-VERBAL ÉLECTRONIQUE → AMENDE → PAIEMENT → REÇU → STATISTIQUES / RAPPORTS
   (agent)          (catalogue)       (cachet + QR code)        (auto)   (caisse)  (QR code)   (tableau de bord, CSV)
```

* Un **contrôle** (`TrafficControl`) peut être conforme ou relever une ou plusieurs infractions du tableau officiel.
* Si des infractions sont cochées, le **PV** (`TrafficTicket`) et l'**amende** (`TrafficFine`) sont créés **dans la même transaction** : montant = somme des montants forfaitaires du catalogue, appliqués tels quels.
* Une infraction de classe « Délit » n'a **pas de montant forfaitaire** (la source indique « Interdiction d'arbitrer ») : elle figure sur le PV mais n'ajoute rien à l'amende ; un PV composé uniquement de délits n'a pas d'amende. Les superviseurs sont alertés.
* Le **paiement** est enregistré par un agent habilité ; le **reçu** électronique (QR code) est délivré dans la même transaction.
* Aucune donnée n'est supprimée : un PV se **annule** (motif obligatoire), un paiement se **annule** (motif obligatoire, le reçu reste au registre), un contrôle ne se supprime pas.

## 2. Source officielle et import

| | |
|---|---|
| Document | « TABLEAU DES INFRACTIONS A LA CIRCULATION ROUTIERE ET TAUX D'AMENDE FORFAITAIRES » (5 pages) |
| Copie conservée | `docs/sources/TABLEAU-DES-INFRACTIONS-A-LA-CIRCULATION-ROUTIERE-ET-TAUX-D-AMENDE-FORFAITAIRES.pdf` |
| SHA-256 | `d7a8fb737ae7ab20204c32063a3d5262eafc176f2d244298e9b6b3250ee6b675` |
| **Infractions importées** | **82** = 67 infractions routières + 7 cycles et motocyclettes + 8 moto-taxis |
| Références juridiques distinctes | 75 (plusieurs infractions partagent le même texte) |
| Classes | 2ème : 4 · 3ème : 47 · 4ème : 23 · Délit : 8 |
| Montants présents dans la source | 2 200 · 2 400 · 3 600 · 25 000 FCFA (ou « Interdiction d'arbitrer » pour les 8 délits) |

**Fidélité.** Libellé, classe, texte juridique et montant sont copiés à l'identique (seuls les retours à la ligne du PDF sont ramenés à une espace). Rien n'est corrigé, complété ni recalculé. Les anomalies de la source sont uniquement **signalées** dans la colonne `sourceNote` (visible dans le catalogue) :

| Code | Page | Infraction | Classe | Montant source | Remarque factuelle |
|---|---|---|---|---|---|
| TRF-002 | 1 | Arrêt interdit | 3eme | 2 200 FCFA | Montant différent du taux le plus fréquent de la 3ème classe (3 600). |
| TRF-039 | 2 | Dépassement interdit | 4eme | 3 600 Fcfa | Montant différent du taux le plus fréquent de la 4ème classe (25 000). |
| TRF-040 | 2 | Dépassement à signaler lorsqu'il s'effectue du côté droit ou mauvaise | 4eme | 3 600 Fcfa | Idem ; libellé apparemment tronqué (« ou mauvaise »). |
| TRF-010 | 1 | Défaut d'avertissements | 3eme | 3 600 Fcfa | Référence « 742 » conservée telle quelle. |
| TRF-023 | 2 | Défaut de maitrise | 4eme | 25 000 Fcfa | Référence « A » sans numéro d'article, conservée. |
| TRF-033 | 2 | Défaut de vitesse en substance transparente | 3eme | 3 600 Fcfa | Libellé conservé. |
| TRF-048 | 3 | Mauvaise stationnement ou stationnement interdit | 3eme | 3 600 Fcfa | Libellé conservé (« Mauvaise »). |
| TRF-060 | 3 | Refus de serer sur le bord droit quant on veut quitter la chaussée… | 3eme | 3 600 Fcfa | Libellé conservé (« serer », « quant »). |
| TRF-078 | 5 | Défait de la licence spéciale de transport SMT | 3eme | 3 600 Fcfa | « Défait » conservé (probable coquille pour « Défaut »). |
| TRF-082 | 5 | Défaut de dispositif d'équipement d'une mototaxi (…) | 3eme | 3 600 Fcfa | Parenthèse non refermée dans la source. |
| TRF-009, 013, 014, 018, 019, 024, 065, 067 | 1, 2, 4 | Défauts d'assurance, de carte bleue, de CNI, de certificat sanitaire, de visite technique, de licence de transport ; surcharge de passagers ; transport clandestin | Délit | « Interdiction d'arbitrer » | Pas de montant forfaitaire. |

> Ces anomalies sont à faire confirmer par l'autorité qui détient le texte officiel ; le système applique la source telle quelle en attendant.

**Procédure.**

```bash
# régénérer le jeu de données à partir du PDF (Python + PyMuPDF)
python scripts/traffic/extract_violations.py docs/sources/TABLEAU-...-FORFAITAIRES.pdf
# importer / rafraîchir la base et vérifier l'écart avec la source (idempotent, sans risque en production)
npm run traffic:import
```

`npm run db:seed` exécute le même import. Le test unitaire recalcule le SHA-256 du PDF conservé et compare le jeu de données à la source ; le test d'intégration vérifie les montants via l'API.

## 3. Modèle de données

Migrations : `20260926140000_traffic_offences_fines`, `20260926150000_traffic_control_links` (additives, aucune donnée existante modifiée).

| Entité demandée | Table | Remarques |
|---|---|---|
| traffic_violation_categories | `TrafficViolationCategory` | 3 lignes (A routières, B cycles et motocyclettes, C moto-taxis) |
| traffic_legal_references | `TrafficLegalReference` | texte juridique verbatim, unique |
| traffic_violations | `TrafficViolation` | 82 lignes ; classe, montant (nul pour un délit), remarque source ; seul `isActive` est modifiable |
| drivers | `TrafficDriver` | profil permis rattaché à **`Person`** (identité, téléphone, adresse) ; la CNI reste un `PersonIdentifier` |
| vehicles | `TrafficVehicle` | registre des véhicules civils/commerciaux (le modèle `Vehicle` existant est le parc de la police) |
| vehicle_documents | `TrafficVehicleDocument` | carte grise, assurance, visite technique, carte bleue, licence, vignette |
| traffic_controls | `TrafficControl` | rattaché à `User` (agent), `Station`, `Region`, `Person`, `TrafficDriver`, `TrafficVehicle`, `Case`, `Incident` |
| traffic_tickets | `TrafficTicket` + `TrafficTicketOffence` | lignes d'infraction **figées** au moment du PV ; cachet (SHA-256 + HMAC) |
| traffic_fines | `TrafficFine` | statuts : À payer, Payée, Partiellement payée, Annulée, Contestée, En attente |
| traffic_payments | `TrafficPayment` | espèces, électronique, Mobile Money, virement, autre ; référence unique par mode |
| traffic_receipts | `TrafficReceipt` | **append-only** ; jeton de vérification QR |
| traffic_evidence | `TrafficEvidence` | fichier stocké via `Document` / `DocumentVersion` (GED) avec empreinte SHA-256 |
| traffic_audit_logs | **`AuditLog` existant** (`module = 'traffic'`) | volontairement **pas de table dupliquée** (« éviter les entités en double ») : journal central inviolable, affiché sous « Historique et traçabilité » de chaque PV / amende / contrôle |

Clés primaires (cuid), clés étrangères, index (station+date, région+date, agent+date, plaque, conducteur, statut), contraintes d'unicité (numéros, jeton QR, immatriculation, carte grise, châssis, permis, `(mode, référence de transaction)`), horodatages `createdAt/updatedAt` et champs d'audit (`createdBy`, `officer`, `issuedBy`, `cancelledBy`, `receivedBy`, `voidedBy`) sont présents.

**Protections en base (PostgreSQL)** : suppression interdite sur `TrafficControl`, `TrafficTicket`, `TrafficFine`, `TrafficPayment`, `TrafficEvidence`, `TrafficDriver`, `TrafficVehicle` ; `TrafficReceipt` et `TrafficTicketOffence` sont en lecture seule (ni UPDATE ni DELETE) ; contraintes `CHECK` : montant payé ≤ montant de l'amende, paiement > 0.

Numérotation annuelle atomique : `CTL-2026-00001`, `PV-2026-000001`, `AMD-2026-000001`, `PAY-…`, `REC-…`.

## 4. Rôles et autorisations

15 nouvelles autorisations `traffic:*` (voir l'écran Rôles & permissions). Rôles :

| Demandé | Rôle système | Périmètre | MFA | Fait |
|---|---|---|---|---|
| Administrateur système | `SUPER_ADMIN` | national | oui | tout |
| Administrateur police | `POLICE_ADMIN` (nouveau) | national | oui | tout le module, utilisateurs, organisation ; pas de sécurité système / sauvegardes |
| Officier | `OFFICER` (nouveau) | commissariat | non | contrôles, PV, fiches conducteurs/véhicules |
| Agent de circulation | `TRAFFIC_OFFICER` (nouveau) | commissariat | non | contrôles, PV, preuves, conducteurs, véhicules |
| Agent de contrôle | `TRAFFIC_CONTROL_AGENT` (nouveau) | commissariat | non | contrôles, PV, preuves ; lecture seule des fiches |
| Responsable d'unité | `STATION_COMMANDER` / `DEPARTMENTAL_COMMANDER` / `REGIONAL_COMMANDER` (étendus) | selon rôle | oui | supervision + saisie |
| Responsable financier / paiement | `TRAFFIC_PAYMENT_MANAGER` (nouveau) | province | oui | paiements, annulation de paiement, statut des amendes, export |
| Superviseur | `TRAFFIC_SUPERVISOR` (nouveau) | commissariat | oui | annulation de PV, statut des amendes, export |
| Consultation / lecture seule | `TRAFFIC_READONLY` (nouveau) ; `AUDITOR`, `ANALYST`, `PROSECUTOR` (lecture) | selon rôle | — | lecture |

Un agent n'accède qu'aux fonctions de son rôle (contrôle serveur à chaque action, refus audité ; les écrans masquent les actions non autorisées). Seuls `TRAFFIC_PAYMENT_MANAGER`, `POLICE_ADMIN` et `SUPER_ADMIN` peuvent enregistrer ou annuler un paiement (test unitaire).

## 5. Règles métier

* **Périmètre** : contrôles, PV et amendes suivent le périmètre du commissariat (hors périmètre → 404, pas de fuite d'existence). **Décision** : le registre des conducteurs et des véhicules est **national** (un conducteur verbalisé ailleurs reste redevable) ; l'historique est visible en résumé, les données d'identité détaillées ne le sont que dans le périmètre de la personne.
* **Doublons** : un conducteur est retrouvé par CNI, puis par n° de permis ; sinon créé. Jamais de doublon d'identifiant. Un véhicule est retrouvé par immatriculation (normalisée en majuscules).
* **Statuts d'amende** : À payer → En attente / Contestée / Annulée ; En attente ↔ À payer ; Contestée → À payer (rejet) / En attente / Annulée. *Payée* et *Partiellement payée* résultent **uniquement** des paiements. Motif obligatoire pour En attente, Contestée, Annulée. Une amende payée ne peut pas être annulée : annuler d'abord le paiement.
* **Paiement partiel** et **échéance** : la source ne les prévoit pas. Ils sont **désactivés par défaut** et se règlent par `SystemSetting` : `traffic.allow_partial_payment` (booléen) et `traffic.payment_deadline_days` (entier). Aucun délai légal n'a été inventé.
* **Passerelle de paiement (guichet)** : le guichet utilise `TrafficPaymentProvider` (`payment-provider.ts`), fournisseur `manual` : l'agent saisit la référence de transaction (obligatoire pour électronique / Mobile Money / virement, unique par mode).
* **Cachet électronique** : SHA-256 du contenu canonique du PV + HMAC (clé serveur) lié au numéro et à l'agent émetteur. Toute modification en base est détectée à la lecture du QR code. C'est un cachet d'intégrité, **pas une signature électronique qualifiée** (mention affichée).
* **Avis de recherche / véhicule** : un contrôle sur une personne ou une plaque liée à un avis ACTIF/LOCALISÉ affiche une alerte, journalise `TRAFFIC_WANTED_HIT` et notifie les approbateurs du commissariat. Un véhicule volé ou saisi déclenche une alerte.
* **Affaires** : depuis un PV, « Ouvrir une affaire » crée une affaire *Infraction routière* (droit `cases:create`), avec le conducteur comme personne d'intérêt ; le lien est conservé sur le contrôle.

## 6. Sécurité

RBAC + périmètre sur chaque lecture/écriture ; validation zod ; transactions ; **audit de chaque création, modification, paiement, annulation, statut, preuve, impression PDF, export** (actions `TRAFFIC_*`) ; MFA selon le rôle ; API avec limitation de débit et en-tête CSRF pour les sessions ; téléversement limité (photos JPEG/PNG/WebP/HEIC, vidéos MP4/MOV/WebM, PDF ; taille max `UPLOAD_MAX_MB`), empreinte SHA-256 conservée, exécutables refusés ; téléchargement des preuves soumis au périmètre du contrôle.

**Vérification publique par QR code** (`/verify/pv/{jeton}`, `/verify/receipt/{jeton}`, API `/api/v1/public/verify/…`) : jeton aléatoire de 24 caractères, limitation de débit, aucune donnée d'identité complète (initiales, plaque partiellement masquée). Le QR code contient l'URL construite avec `APP_URL` : **renseigner `APP_URL` avec l'adresse publique** en production.

## 7. Écrans et API

Écrans (menu « Circulation routière ») : `/traffic` (tableau de bord), `/traffic/controls` (+ `/new` optimisé tablette/mobile, `/[id]`), `/traffic/tickets` (+ `/[id]`), `/traffic/fines` (+ `/[id]`), `/traffic/receipts/[id]`, `/traffic/drivers` (+ `/new`, `/[id]`), `/traffic/vehicles` (+ `/new`, `/[id]`), `/traffic/violations`, `/traffic/search`, public `/verify/pv/[jeton]` et `/verify/receipt/[jeton]`. Intégrations : fiche Personne (carte Circulation), tableau de bord principal, notifications, GED (preuves), affaires, avis de recherche.

API (`/api/v1/traffic/…`, voir `API_DOCUMENTATION.md`) : `controls`, `controls/{id}/evidence`, `tickets`, `tickets/{id}` (PATCH `cancel`), `tickets/{id}/pdf`, `tickets/{id}/case`, `fines`, `fines/{id}` (PATCH `status`), `fines/{id}/payments`, `payments/{id}` (PATCH `void`), `receipts/{id}` et `/pdf`, `drivers`, `vehicles` (recherche par `plate`), `vehicles/{id}/documents`, `violations`, `stats` (JSON/CSV), `search`.

## 8. Guide d'utilisation rapide

**Agent de circulation / de contrôle** — *Contrôles routiers → Nouveau contrôle* : 1) date, lieu, position GPS (bouton « Utiliser ma position ») ; 2) identité du conducteur (nom/prénom/CNI/permis, ou personne déjà enregistrée) ; 3) immatriculation (véhicule reconnu automatiquement, alertes assurance / visite technique / véhicule volé) ; 4) cocher les infractions (recherche par libellé ou article ; le total s'affiche en bas) ; 5) photos et observations ; 6) **Enregistrer et établir le PV**. La page du contrôle affiche le PV, l'amende, les alertes ; le PV se télécharge en PDF ou s'imprime.

**Caissier / responsable financier** — *Amendes & paiements* → ouvrir l'amende → *Enregistrer un paiement* (mode, référence, point de paiement) → le reçu (PDF + QR code) est généré. Un paiement saisi par erreur s'annule avec motif.

**Superviseur** — annule un PV (motif), met une amende en attente / contestée, consulte le tableau de bord et exporte le CSV.

**Administrateur** — active/désactive une infraction du catalogue, règle l'échéance et le paiement partiel (SystemSetting), gère utilisateurs et rôles.

## 9. Exploitation

```bash
npm run db:deploy         # applique les migrations (prod)   |  dev : npx prisma migrate deploy
npm run db:seed           # permissions, rôles, catalogue des 82 infractions, comptes et données de démonstration
npm run traffic:import    # catalogue seul (sans données de démonstration)
npm run dev               # http://localhost:3300
npm test && npm run test:integration && npm run test:security
```

> **Note (base de développement)** : `prisma migrate dev` signale que la migration `20260912161408_personnel_positions_trainings_person_station` a été modifiée après son application (situation antérieure à ce module, sans lien avec lui) et propose une réinitialisation. **Ne pas réinitialiser** : appliquer les migrations avec `npx prisma migrate deploy`, qui ne vérifie pas cette empreinte.

Comptes de démonstration (mot de passe commun `DEMO_PASSWORD`) : `police.admin`, `officer.cs1`, `traffic.cs1`, `control.cs1`, `traffic.supervisor`, `finance.central`, `readonly.traffic`.

## 10. Points à faire valider (non tranchés par la source)

1. Anomalies de montants/classes/libellés du tableau (§2) : confirmation par l'autorité.
2. Traitement d'un délit (« Interdiction d'arbitrer ») : le système n'établit pas d'amende ; la suite judiciaire est un processus hors périmètre du module (ouverture d'affaire disponible).
3. Échéance de paiement et paiement partiel : à décider puis à activer via les paramètres.
4. Le PDF du PV est en français ; la version arabe est disponible à l'écran mais pas dans le PDF (polices arabes non embarquées).
5. Passerelle de paiement réelle (Mobile Money, banque) : à intégrer derrière l'interface existante.
6. Signature électronique qualifiée : hors périmètre (cachet d'intégrité fourni).

* **Paiement en ligne (site public)** : le citoyen retrouve son amende sur `/payer` (n° de PV + plaque ; même refus pour un PV inconnu et une mauvaise plaque, limité par IP et par PV), choisit Mobile Money / carte / virement et lance le paiement (`POST /api/v1/public/fines/pay`). **L'amende n'est jamais soldée sur la parole du citoyen** : elle l'est quand l'opérateur confirme, par une notification **signée** (`POST /api/v1/webhooks/payments`, HMAC-SHA256 sur `horodatage.corps`, tolérance 5 min, idempotente sur l'identifiant d'événement) ou par interrogation de statut. À la confirmation : paiement + reçu électronique créés atomiquement, sous le compte désactivé `system.online-payments`, mêmes garde-fous que le guichet (surpaiement impossible, un seul essai en cours par amende). Montant différent ou amende soldée entre-temps : rien n'est imputé, le paiement est marqué **À REMBOURSER** (écran `Circulation › Paiements en ligne`, rapprochement, bouton « Interroger l'opérateur »). Le code de suivi du payeur n'est stocké que haché ; seul le téléphone masqué est conservé. Configuration : `TRAFFIC_ONLINE_PROVIDER=off|sandbox` (défaut `off` : page publique indisponible), `ONLINE_PAYMENT_WEBHOOK_SECRET` (≥ 16 caractères). **Seul le fournisseur `sandbox` existe** (opérateur simulé, aucun argent réel, refusé en production sauf `ALLOW_SANDBOX_PAYMENTS=yes`). Brancher un vrai opérateur (Airtel Money, Moov Africa, banque, agrégateur) = implémenter `OnlineGateway` (`initiate`, `verifyNotification`, `queryStatus`) dans `src/server/traffic/online-gateway.ts` avec ses identifiants marchands ; le reste (page publique, webhook, idempotence, rapprochement, reçu) ne change pas. Non couvert : le remboursement effectif auprès de l'opérateur (acte manuel hors application).