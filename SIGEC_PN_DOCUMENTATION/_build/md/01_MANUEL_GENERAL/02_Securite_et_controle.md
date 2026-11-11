# Sécurité, contrôle et traçabilité

**Authentification, permissions, confidentialité, historique, sessions, désactivation**

| Rubrique | Valeur |
|---|---|
| Système | SIGEC-PN / SIGPN-T — Système d'information de gestion de la Police nationale du Tchad |
| Éditeur et développeur | TECHNOTCHAD |
| Version du document | 1.0 — 10 novembre 2026 |
| Statut | Projet pour validation par la hiérarchie : les points marqués « À confirmer » ne sont pas des décisions |
| Source des informations | Lecture seule du système existant (code, catalogue des rôles et droits, écrans) — aucune donnée, aucun compte, aucun rôle, aucune permission n'a été modifié |

## 1. Connexion et authentification

- Identifiant + mot de passe ; après 5 échecs le compte est verrouillé 15 minutes.
- Mots de passe : 12 caractères minimum, trois types sur quatre, ni courant, ni contenant l'identifiant ou le nom du courriel ; renouvellement tous les 90 jours (valeur par défaut) ; les 5 derniers ne peuvent pas être réutilisés.
- Second facteur (application d'authentification, code à 6 chiffres) exigé selon le rôle, ou si le compte détient un droit sensible ou une habilitation élevée. **Il est actuellement suspendu sur l'installation de démonstration par un interrupteur temporaire ; sa réactivation avant la mise en service est indispensable (À confirmer par la Direction).**
- Mot de passe oublié : demande transmise à l'administrateur de sécurité ; lien à usage unique valable 60 minutes.

## 2. Permissions et habilitations

- Chaque action est protégée par un droit précis (157 droits) attribué à un rôle (29 rôles).
- Le périmètre territorial borne ce que l'on voit : national, provincial, commissariat.
- 20 droits sont **sensibles** (approuver un mandat ou un avis, prolonger une garde à vue, voir les affaires sensibles, paie, discipline, exports, sauvegardes…) : ils n'agissent que si le compte a l'habilitation Sensible ou Confidentiel, attribuée par l'administrateur de sécurité (jamais à soi-même).
- Les changements sensibles (création de compte, changement de rôle, élévation d'habilitation, ajout d'un droit sensible à un rôle) passent par un circuit d'approbation à deux personnes différentes.

## 3. Confidentialité et protection des dossiers judiciaires

- Les affaires **sensibles** ne sont visibles que de leur équipe et des titulaires du droit dédié.
- Les lectures de dossiers sensibles et de mandats sont **journalisées**.
- Les données de paie et de discipline sont strictement confidentielles ; chaque lecture est journalisée.
- Les pièces et données personnelles du site public ne sont jamais exposées ; le code de suivi est conservé haché.

## 4. Journalisation et traçabilité

- Toute action importante est inscrite au journal d'audit : qui, quoi, quand, avant/après, adresse.
- Le journal est **infalsifiable** : chaîne de hachage ; un bouton de contrôle d'intégrité (Centre de sécurité) vérifie la chaîne. Limite : la suppression de la toute dernière ligne n'est détectable que si l'empreinte de tête est conservée en dehors de la base.
- Les validations sont tracées (qui a demandé, qui a vérifié, qui a approuvé).
- **Exports PDF** (listes et fiches) : réservés aux chefs de chaque niveau de commandement ; chaque export est inscrit au journal (qui, quel module, combien de lignes, quels filtres) ; le PDF ne dépasse jamais le périmètre de l'écran.

## 5. Sessions

- Expiration après 60 minutes d'inactivité et 10 heures au maximum.
- Comptes détenant un droit sensible : 15 minutes d'inactivité et une seule session active à la fois.
- L'administrateur de sécurité peut voir et révoquer les sessions ; une mutation met fin aux sessions de l'agent et abaisse son habilitation au niveau standard.

## 6. Désactivation des comptes

Statuts : En attente, Actif, Verrouillé, Suspendu, Désactivé. Un compte désactivé ne peut plus se connecter ; il n'est jamais supprimé (traçabilité).

## 7. Clés d'accès (API)

Les clés créées dans l'application ne portent jamais de droit sensible, ont une expiration obligatoire (1 à 90 jours) ; l'administrateur de sécurité peut toutes les lister et révoquer.

## 8. Responsabilités techniques et opérationnelles

| Responsabilité | Qui | Ne peut pas |
|---|---|---|
| Plate-forme, sauvegardes, structure | Administrateur technique | Aucun droit sur les plaintes, affaires, mandats, arrestations, avis |
| Comptes, sessions, audit | Administrateur de sécurité | Aucune autorité opérationnelle de police |
| Décisions opérationnelles et judiciaires | Commandement, enquêteurs, commissaires selon leurs droits | Administrer la plate-forme |
| Contrôle externe | Auditeur, parquet (lecture) | Modifier |

> L'administrateur technique n'est **jamais** considéré comme un responsable opérationnel ou judiciaire.

![Centre de sécurité](../07_ANNEXES/captures/theme-security.png)

![Contrôle de la chaîne d'audit](../07_ANNEXES/captures/aud-1-chain-and-keys.png)

![Mon compte](../07_ANNEXES/captures/theme-account.png)

![L'administrateur technique n'accède pas aux données de police](../07_ANNEXES/captures/aud-11-tech-admin-refused.png)

## 9. Points à confirmer

- Durées de session et délais de verrouillage à valider par la Direction (valeurs proposées).
- Politique de renouvellement de mot de passe (90 jours par défaut).
- Réactivation du second facteur en production.
