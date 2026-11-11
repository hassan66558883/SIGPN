# Module 16 — Gestion des rapports

**Manuel de gestion — Gestion des rapports**

| Rubrique | Valeur |
|---|---|
| Système | SIGEC-PN / SIGPN-T — Système d'information de gestion de la Police nationale du Tchad |
| Éditeur et développeur | TECHNOTCHAD |
| Version du document | 1.0 — 10 novembre 2026 |
| Statut | Projet pour validation par la hiérarchie : les points marqués « À confirmer » ne sont pas des décisions |
| Source des informations | Lecture seule du système existant (code, catalogue des rôles et droits, écrans) — aucune donnée, aucun compte, aucun rôle, aucune permission n'a été modifié |

**Disponibilité dans le système : Partiellement disponible.**  Écran : `/traffic/cash/reports`

## Objectif

Les rapports de recettes (12 rapports) existent ; la page générale « Rapports » est prévue mais non construite.

## Utilisateurs concernés

| Profil | Niveau d'accès | Droits du module |
|---|---|---|
| Commandement national (Direction générale) | Consultation et opérations | 2 |
| Délégué provincial de police | Consultation et opérations | 3 |
| Commandant de département (rôle dormant) | Consultation et opérations | 3 |
| Commissaire (chef de commissariat) | Consultation et opérations | 3 |
| Enquêteur | Consultation et opérations | 2 |
| Agent d'accueil / de permanence | Consultation seule | 1 |
| Agent de patrouille | Consultation seule | 1 |
| Responsable des scellés et pièces à conviction | Consultation et opérations | 2 |
| Agent de garde à vue | Consultation seule | 1 |
| Gestionnaire du parc de véhicules | Consultation et opérations | 2 |
| Analyste criminel | Consultation et opérations | 3 |
| Auditeur | Consultation seule | 1 |
| Agent biométrie | Consultation seule | 1 |
| Agent de police technique et scientifique | Consultation seule | 1 |
| Magistrat du parquet (consultation) | Consultation seule | 1 |
| Administrateur de la police (système d'information) | Consultation et opérations | 4 |
| Directeur des ressources humaines | Consultation et opérations | 2 |
| Officier de police (désigné OPJ dans le système) | Consultation et opérations | 4 |
| Agent de circulation | Consultation et opérations | 3 |
| Agent de contrôle routier | Consultation et opérations | 3 |
| Superviseur circulation | Consultation et opérations | 3 |
| Responsable financier / paiements | Consultation et opérations | 9 |
| Chef d'unité (recettes) | Consultation et opérations | 5 |

## Fonctionnalités

- 12 rapports de recettes : journalier, hebdomadaire, mensuel, par agent, par unité, par commissariat, par province, par mode de paiement, etc. ; export CSV et PDF journalisé.
- Autres rapports (affaires, enquêtes, arrestations…) : non construits.

## Formulaires

| Formulaire | Champs |
|---|---|
| Rapport de recettes | Type de rapport ; période (début, fin) ; format. |

## Étapes d'utilisation

1. Recettes > Rapports.
2. Choisir la période.
3. Afficher ou exporter.

## Résultats

Rapport avec totaux, sous le périmètre de l'utilisateur.

## Droits du module

| Droit (code) | Opération | Sensible | Profils qui le détiennent |
|---|---|---|---|
| `reports:view` | Voir les rapports |  | 21 profils |
| `reports:generate` | Produire des rapports |  | 8 profils |
| `reports:export` | Exporter rapports et données (sensible) | Oui | 6 profils |
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

## Circuit I — Circuit des amendes, paiements et versements

Du paiement d'une amende (au guichet, sur le terrain ou en ligne) jusqu'au rapprochement des versements à l'administration : l'agent a une **caisse**, la clôture est vérifiée, le **versement** est examiné puis validé, et des **écarts** sont justifiés.

**Modules concernés :** Circulation, Caisses et recettes, Paiement en ligne

![Diagramme du circuit I](../04_WORKFLOWS/img/I_recettes.png)

### Étapes détaillées

| N° | Qui | Action | Précisions du système | Statut après l'étape |
|---|---|---|---|---|
| 1 | Agent | Ouvre sa caisse (Recettes > Caisses), encaisse le paiement d'une amende en espèces / électronique / mobile money : reçu REC-… édité. | Un paiement saisi par erreur est annulé (jamais effacé) par un titulaire du droit d'annulation. |  |
| 2 | Citoyen | Paiement en ligne : page publique « Payer une amende » → demande envoyée à l'opérateur → paiement enregistré seulement après confirmation authentifiée de l'opérateur. | En développement : opérateur simulé ; Airtel écrit mais non essayé en réel ; Moov non construit. |  |
| 3 | Agent | Clôture sa caisse : le montant à verser est calculé. | Notification aux vérificateurs de versement : « Caisse clôturée ». |  |
| 4 | Chef de service / Commissaire | Vérifie la clôture (chef d'unité). |  |  |
| 5 | Agent | Déclare le versement à l'administration (montant, mode). | Notification : « Versement à vérifier ». |  |
| 6 | Finance | Examine le versement : accepte, rejette ou demande une justification ; puis validation définitive par un autre droit. | Notification à l'agent : « Versement rejeté / Justification demandée ». |  |
| 7 | Finance | Rapprochement et écarts : traités, justifiés puis validés/rejetés ; rapports de recettes (12) exportables. | Chaque export est journalisé. | Versement validé |

### Règles appliquées par le système

- Les droits sont séparés : encaisser, vérifier, examiner, valider, rapprocher, bloquer.
- Un montant différent ou une amende déjà réglée sur un paiement en ligne place la demande en échec « remboursement requis » (remboursement manuel, hors application).

### Statuts

| Code | Libellé affiché | Signification |
|---|---|---|
| OPEN | Caisse ouverte |  |
| CLOSED | Caisse clôturée |  |
| DEPOSITED | Versée |  |
| VALIDATED | Validée |  |
| BLOCKED | Bloquée |  |

### Notifications envoyées

| Événement | Destinataires | Message |
|---|---|---|
| Caisse clôturée | Vérificateurs de versement de la province | Caisse clôturée : montant à verser |
| Versement déclaré | Vérificateurs de versement | Versement à vérifier |
| Versement rejeté / justification demandée | Les agents-caisse de l'unité | Versement rejeté / Justification demandée |

### Écrans

![Tableau de bord circulation](../07_ANNEXES/captures/theme-traffic.png)

![Tableau de bord des recettes](../07_ANNEXES/captures/doc-recettes-tableau.png)

![Caisses des agents](../07_ANNEXES/captures/doc-recettes-caisses.png)

![Versements](../07_ANNEXES/captures/doc-recettes-versements.png)

![Rapprochements](../07_ANNEXES/captures/doc-recettes-rapprochements.png)

![Écarts](../07_ANNEXES/captures/doc-recettes-ecarts.png)

![Rapports de recettes](../07_ANNEXES/captures/doc-recettes-rapports.png)

![Paiements en ligne](../07_ANNEXES/captures/doc-paiements-en-ligne.png)

![Caisse vue par un agent](../07_ANNEXES/captures/doc-caisse-agent.png)

### À confirmer auprès de la hiérarchie

- Comptes bancaires/Trésor de versement, délais de versement, barème des écarts tolérés.

### Ce que le système ne fait pas / améliorations recommandées

- Écrans de recettes non capturés dans le dossier d'images actuel.

## À confirmer auprès de la hiérarchie

- Rapports demandés par la hiérarchie à chaque niveau.

## Améliorations recommandées

- Module général de rapports non construit.

## Se déconnecter en sécurité

1. Cliquer sur le bouton **Déconnexion** en haut à droite de l'en-tête.
2. Ne pas se contenter de fermer l'onglet, surtout sur un poste partagé.
3. La session se ferme d'elle-même après **60 minutes d'inactivité** (15 minutes pour les comptes qui détiennent un droit sensible) et au plus tard après **10 heures**.

