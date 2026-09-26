# GESTION DES RECETTES ET VERSEMENTS (SIGPN-T v0.6.0)

Complète le module des amendes : suit de bout en bout l'argent encaissé sur le terrain, du paiement de l'amende au rapprochement avec le versement à l'administration. Aucun paiement existant n'est remplacé : un paiement enregistré par un agent de terrain est simplement **rattaché à sa caisse**.

```
PV → AMENDE → PAIEMENT → REÇU → CAISSE AGENT → CLÔTURE → RECETTE COLLECTÉE → VERSEMENT → BORDEREAU → RAPPROCHEMENT → (écart) → CLÔTURE DÉFINITIVE
```

## Les six montants (jamais confondus)
| Montant | Où il vit |
|---|---|
| Montant de l'amende | `TrafficFine.amountFcfa` (tableau officiel, non modifiable) |
| Montant encaissé | somme des paiements de la caisse (`TrafficCashTransaction`), figée à la clôture |
| Disponible en caisse | fond de caisse + encaissé − versé déclaré |
| Montant versé | `TrafficDeposit.amountDepositedFcfa` (déclaré, hors rejetés) |
| Montant validé | versements au statut VALIDATED |
| Écart | encaissé − validé, jamais supprimé (fiche d'écart) |

## Workflow
1. **Ouverture** de la caisse (une seule caisse ouverte par agent, index unique partiel).
2. **Encaissement** : `POST /traffic/fines/{id}/payments` par un agent `cash:collect` → rattachement automatique à sa caisse ouverte (sinon 409). Le montant vient de l'amende ; un paiement partiel reste régi par le réglage existant.
3. **Clôture** : verrou de ligne, calcul des totaux (espèces, électronique, Mobile Money, autres), état journalier figé (PDF), recette collectée + rapprochement `EN ATTENTE`.
4. **Versement** : montant ≤ disponible ; banque/Trésor = n° de bordereau obligatoire ; banque/Mobile Money = référence ; un montant inférieur doit être expliqué (ou, si `traffic.allow_partial_deposit` est actif, il s'agit d'un versement partiel). Bordereau généré (PDF + QR + vérification publique).
5. **Vérification** (responsable d'unité / financier : accepter, demander une justification, rejeter avec motif) puis **validation définitive** (responsable financier). Un rejeté peut être re-soumis (tentative n° 2, lien vers le précédent).
6. **Rapprochement** : CONFORME / ÉCART À JUSTIFIER / EN ATTENTE / VALIDÉ / REJETÉ. Un écart crée une **fiche d'écart** (motif, justification, pièce, validateur, date) : justifier → valider/rejeter. **Clôture définitive** seulement si conforme ou écart validé.

Statuts de caisse : OUVERTE → CLÔTURÉE → EN ATTENTE DE VERSEMENT → VERSÉE → VALIDÉE ; BLOQUÉE (bloquer/débloquer par le responsable financier).

## Contrôles anti-fraude
- Un paiement ne peut être compté qu'une fois (`paymentId` unique) ; un reçu ↔ un paiement ; référence de transaction unique par mode.
- Caisse clôturée/bloquée : aucune opération (service **et** trigger `traffic_cash_tx_guard`) ; pas d'annulation après clôture.
- Versement ≤ montant disponible (service + CHECK), validé ≤ versé ≤ encaissé (CHECK sur la recette).
- Séparation des tâches : on ne vérifie/valide pas son propre versement ni son propre écart ; l'administrateur ne détient aucune permission d'écriture financière.
- Aucune suppression physique (triggers `pms_forbid_delete`) ; état journalier, lignes de versement et bordereaux en écriture unique (`pms_forbid_mutation`).
- Toute annulation exige un motif ; tout événement est audité (module `traffic_cash`) avec utilisateur, rôle, IP, ancienne/nouvelle valeur, référence.

## Permissions (`cash:*`)
`collect`, `register`, `view`, `verify_closure`, `deposit_create`, `deposit_review`, `deposit_validate`, `reconcile`, `reports`, `block`.

| Rôle | Fonctions |
|---|---|
| Agent de circulation / de contrôle / officier | collect, register, deposit_create |
| Responsable d'unité (`TRAFFIC_UNIT_HEAD`, nouveau) | view, verify_closure, deposit_review, reports |
| Responsable financier (`TRAFFIC_PAYMENT_MANAGER`) | view, deposit_review, deposit_validate, reconcile, block, reports, deposit_create |
| Superviseur | view, reports, audit:view |
| Administrateur police | view, reports, audit:view (aucune écriture financière) |

Les permissions sont ajoutées **une seule fois** aux rôles déjà en base (`rbac.cash_defaults_applied`).

## Pages et API
Pages `/traffic/cash` (tableau de bord), `/registers`, `/collections`, `/closures`, `/deposits`, `/deposits/new`, `/slips`, `/reconciliation`, `/discrepancies`, `/reports` (12 rapports, PDF/CSV), `/search`, `/audit`, et `/verify/deposit/{token}` (public).
API `/api/v1/traffic/cash/{registers,collections,closures,deposits,discrepancies,reconciliations,stats,reports/{kind},search}` (+ `/pdf`) et `/api/v1/public/verify/deposit/{token}`.

## Tables
`TrafficCashRegister` (traffic_cash_registers), `TrafficCashTransaction`, `TrafficDailyClosure`, `TrafficRevenueCollection`, `TrafficDeposit`, `TrafficDepositItem`, `TrafficDepositReceipt`, `TrafficReconciliation`, `TrafficCashDiscrepancy` ; migration `20260927100000_traffic_cash_revenue`. Réutilisés : `User`, `Officer` (matricule), `Station`, `Region`, `TrafficPayment`, `TrafficReceipt`, `TrafficFine`, `Document`, `AuditLog`.

## Limites
Aucune passerelle de paiement réelle ; le versement Mobile Money est un mode déclaré. Après clôture, une erreur de saisie se corrige par le processus d'écart (pas d'annulation directe). Les rapports agrègent en mémoire (plafond 200 000 paiements par période).

## Comptes de démonstration
`traffic.cs1`, `control.cs1`, `control.cs2` (agents), `unit.head` (responsable d'unité), `finance.central` (financier), `traffic.supervisor`, `police.admin`. Données : 5 caisses à tous les stades.
