# Module 7 — Gestion des infractions

**Manuel de gestion — Gestion des infractions**

| Rubrique | Valeur |
|---|---|
| Système | SIGEC-PN / SIGPN-T — Système d'information de gestion de la Police nationale du Tchad |
| Éditeur et développeur | TECHNOTCHAD |
| Version du document | 1.0 — 10 novembre 2026 |
| Statut | Projet pour validation par la hiérarchie : les points marqués « À confirmer » ne sont pas des décisions |
| Source des informations | Lecture seule du système existant (code, catalogue des rôles et droits, écrans) — aucune donnée, aucun compte, aucun rôle, aucune permission n'a été modifié |

**Disponibilité dans le système : Partiellement disponible.**  Écran : `/traffic`

## Objectif

Constater et traiter les infractions routières (contrôle, PV électronique, amende, paiement) ; les infractions pénales passent par plaintes et affaires.

## Utilisateurs concernés

| Profil | Niveau d'accès | Droits du module |
|---|---|---|
| Commandement national (Direction générale) | Consultation et opérations | 8 |
| Délégué provincial de police | Consultation et opérations | 12 |
| Commandant de département (rôle dormant) | Consultation et opérations | 12 |
| Commissaire (chef de commissariat) | Consultation et opérations | 12 |
| Enquêteur | Consultation et opérations | 5 |
| Agent d'accueil / de permanence | Consultation et opérations | 5 |
| Agent de patrouille | Consultation et opérations | 7 |
| Analyste criminel | Consultation et opérations | 6 |
| Auditeur | Consultation et opérations | 5 |
| Magistrat du parquet (consultation) | Consultation et opérations | 5 |
| Administrateur de la police (système d'information) | Consultation et opérations | 17 |
| Officier de police (désigné OPJ dans le système) | Consultation et opérations | 12 |
| Agent de circulation | Consultation et opérations | 12 |
| Agent de contrôle routier | Consultation et opérations | 10 |
| Superviseur circulation | Consultation et opérations | 12 |
| Responsable financier / paiements | Consultation et opérations | 17 |
| Chef d'unité (recettes) | Consultation et opérations | 9 |
| Consultation circulation | Consultation et opérations | 5 |

## Fonctionnalités

- Contrôles routiers, PV électroniques numérotés, preuves jointes.
- Catalogue des infractions et barèmes d'amendes forfaitaires.
- Fiches conducteurs et véhicules (documents, historique).
- Amendes, paiements, reçus ; paiement en ligne.
- Tableau de bord et exports.

## Formulaires

| Formulaire | Champs |
|---|---|
| Contrôle routier / PV | Conducteur ; véhicule ; lieu ; résultat (conforme / infraction) ; infractions du catalogue ; preuves. |
| Paiement | Amende ; mode (espèces, électronique, mobile money, virement) ; montant. |

## Étapes d'utilisation

1. Circulation > Contrôles > Nouveau contrôle.
2. Choisir les infractions et joindre les preuves.
3. Émettre le PV.
4. Suivre l'amende et le paiement.

## Résultats

PV (PV-AAAA-NNNNNN), amende (AMD-…), reçu (REC-…).

## Droits du module

| Droit (code) | Opération | Sensible | Profils qui le détiennent |
|---|---|---|---|
| `traffic:view` | Voir contrôles, PV et amendes |  | 18 profils |
| `traffic:control_create` | Enregistrer un contrôle et émettre un PV |  | 8 profils |
| `traffic:evidence_upload` | Joindre des preuves à un contrôle |  | 8 profils |
| `traffic:ticket_cancel` | Annuler un PV |  | 6 profils |
| `traffic:fine_manage` | Gérer le statut des amendes |  | 7 profils |
| `traffic:payment_record` | Enregistrer un paiement d'amende et délivrer le reçu |  | Administrateur de la police (système d'information), Responsable financier / paiements |
| `traffic:payment_void` | Annuler un paiement saisi par erreur |  | Administrateur de la police (système d'information), Responsable financier / paiements |
| `traffic:drivers_view` | Voir les conducteurs |  | 18 profils |
| `traffic:drivers_manage` | Gérer les conducteurs |  | 7 profils |
| `traffic:vehicles_view` | Voir les véhicules (circulation) |  | 18 profils |
| `traffic:vehicles_manage` | Gérer les véhicules (circulation) |  | 7 profils |
| `traffic:violations_view` | Voir le catalogue des infractions |  | 18 profils |
| `traffic:catalog_manage` | Activer ou désactiver une infraction du catalogue |  | Administrateur de la police (système d'information) |
| `traffic:dashboard` | Voir le tableau de bord circulation |  | 18 profils |
| `traffic:export` | Exporter listes et statistiques de circulation (sensible) | Oui | 8 profils |
| `cash:collect` | Encaisser une amende sur le terrain |  | Officier de police (désigné OPJ dans le système), Agent de circulation, Agent de contrôle routier |
| `cash:register` | Ouvrir, voir et clore sa propre caisse |  | Officier de police (désigné OPJ dans le système), Agent de circulation, Agent de contrôle routier |
| `cash:view` | Voir caisses, recettes, versements et rapprochements |  | Administrateur de la police (système d'information), Superviseur circulation, Responsable financier / paiements, Chef d'unité (recettes) |
| `cash:verify_closure` | Vérifier la clôture d'une caisse |  | Responsable financier / paiements, Chef d'unité (recettes) |
| `cash:deposit_create` | Déclarer un versement |  | Officier de police (désigné OPJ dans le système), Agent de circulation, Agent de contrôle routier, Responsable financier / paiements |
| `cash:deposit_review` | Examiner un versement (accepter, rejeter, demander justification) |  | Responsable financier / paiements, Chef d'unité (recettes) |
| `cash:deposit_validate` | Valider définitivement un versement |  | Responsable financier / paiements |
| `cash:reconcile` | Gérer les rapprochements et écarts |  | Responsable financier / paiements |
| `cash:reports` | Voir et exporter les rapports de recettes |  | Administrateur de la police (système d'information), Superviseur circulation, Responsable financier / paiements, Chef d'unité (recettes) |
| `cash:block` | Bloquer ou débloquer une caisse |  | Responsable financier / paiements |

## Circuit D — Circuit des infractions

Le système traite les infractions de deux façons. (1) **Infractions routières** : contrôle, procès-verbal (PV) électronique, amende, paiement et reçu — module complet. (2) **Infractions pénales** : elles sont portées par une **plainte** puis une **affaire** (catégorie d'infraction : homicide, vol, fraude, etc.). Il n'existe pas de catalogue pénal dédié ; le catalogue des infractions et les barèmes d'amende concernent la circulation.

**Modules concernés :** Circulation (contrôles, PV, amendes), Plaintes, Affaires, Preuves

![Diagramme du circuit D](../04_WORKFLOWS/img/D_infractions.png)

### Étapes détaillées

| N° | Qui | Action | Précisions du système | Statut après l'étape |
|---|---|---|---|---|
| 1 | Agent | Constatation : contrôle routier ou constat d'une infraction. Circulation > Contrôles > Nouveau contrôle : conducteur, véhicule (plaque), lieu, résultat (conforme ou infraction). | Numéro CTL-AAAA-NNNNN. Le système interroge les avis de recherche : si le conducteur ou la plaque correspondent, le commandement est averti. |  |
| 2 | Agent | Identification de l'infraction : choix dans le catalogue des infractions (montant forfaitaire indiqué). Identification des personnes : fiche conducteur / véhicule. | Certaines infractions ne sont pas justiciables de l'amende forfaitaire (délits) ; le système avertit alors les responsables de la gestion des amendes. |  |
| 3 | Agent | Ajout des preuves : photos, vidéos, documents rattachés au contrôle. | Droit « joindre des preuves ». |  |
| 4 | Agent | Enregistrement et émission du PV électronique (numéro PV-AAAA-NNNNNN) ; une amende (AMD-…) est créée. | Le PV est numéroté automatiquement. | PV émis (ISSUED) ; Amende : À payer (TO_PAY) |
| 5 | Chef de service / Commissaire | Transmission / affectation : le superviseur circulation passe en revue les contrôles et PV de l'unité ; il peut annuler un PV avec motif (l'agent émetteur est averti). | Notification à l'agent : « PV annulé — motif ». |  |
| 6 | Finance | Suivi : paiement au guichet ou en tournée (caisse de l'agent) ou en ligne (page publique « Payer une amende »). Reçu REC-AAAA-NNNNNN. | Voir circuit I (recettes). Statut d'amende : En attente, À payer, Partiellement payée, Payée, Contestée, Annulée. | Payée (PAID) |
| 7 | Chef de service / Commissaire | Validation et rapport final : tableau de bord circulation, statistiques, rapports de recettes (12 rapports) ; export autorisé aux titulaires du droit d'export. | Chaque export est journalisé. | Rapports de recettes et statistiques |

### Règles appliquées par le système

- Un PV annulé ne peut plus être payé ; une amende peut être suspendue, contestée ou annulée par les titulaires du droit de gérer les amendes.
- Un paiement enregistré par erreur s'annule (droit distinct) sans effacement : il devient « annulé ».
- Le catalogue des infractions est consultable ; son activation/désactivation est un droit distinct.

### Statuts

| Code | Libellé affiché | Signification |
|---|---|---|
| ISSUED | PV émis | PV valide. |
| CANCELLED | PV annulé | Annulé avec motif. |

| Code | Libellé affiché | Signification |
|---|---|---|
| PENDING | En attente | Amende en préparation. |
| TO_PAY | À payer | Montant dû. |
| PARTIALLY_PAID | Partiellement payée | Paiement partiel. |
| PAID | Payée | Soldée. |
| CONTESTED | Contestée | Contestation enregistrée. |
| CANCELLED | Annulée | Annulée. |

### Notifications envoyées

| Événement | Destinataires | Message |
|---|---|---|
| PV annulé | L'agent qui avait émis le PV | PV annulé — motif |
| Contrôle avec correspondance | Titulaires du droit d'approuver les avis | Correspondance avec un avis de recherche |
| PV comportant un délit | Titulaires du droit de gérer les amendes | PV comportant un délit (Interdiction d'arbitrage) |

### Écrans

![Tableau de bord circulation](../07_ANNEXES/captures/theme-traffic.png)

![Contrôles routiers](../07_ANNEXES/captures/doc-circ-controles.png)

![Fiche d'un contrôle](../07_ANNEXES/captures/doc-circ-controles-fiche.png)

![Procès-verbaux routiers](../07_ANNEXES/captures/doc-circ-pv.png)

![Amendes et paiements](../07_ANNEXES/captures/doc-circ-amendes.png)

![Catalogue des infractions](../07_ANNEXES/captures/doc-circ-catalogue.png)

### À confirmer auprès de la hiérarchie

- Les barèmes d'amendes forfaitaires et la liste des délits non arbitrables doivent être validés par la hiérarchie et la justice (catalogue chargé à partir de la source indiquée dans la documentation Infractions routières).
- Pour les infractions pénales : un registre ou catalogue pénal dédié est-il attendu ?

### Ce que le système ne fait pas / améliorations recommandées

- Pas de catalogue d'infractions pénales : la qualification est la catégorie de l'affaire (20 catégories).
- Pas de rapport final automatique d'infraction pénale (les rapports et statistiques généraux sont prévus mais NON construits).

## À confirmer auprès de la hiérarchie

- Barèmes et liste des délits non arbitrables.

## Améliorations recommandées

- Pas de catalogue d'infractions pénales.

## Se déconnecter en sécurité

1. Cliquer sur le bouton **Déconnexion** en haut à droite de l'en-tête.
2. Ne pas se contenter de fermer l'onglet, surtout sur un poste partagé.
3. La session se ferme d'elle-même après **60 minutes d'inactivité** (15 minutes pour les comptes qui détiennent un droit sensible) et au plus tard après **10 heures**.

