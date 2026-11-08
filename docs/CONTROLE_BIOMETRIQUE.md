# Écran de contrôle biométrique (SIGPN-T v2.0, chapitre 6)

> **Version de démonstration : simulation uniquement.** Aucune empreinte ni image réelle n'est comparée, enregistrée ou transmise. L'intégration d'un système biométrique réel est conditionnée à un système approuvé, à une base légale et à des tests de précision et de protection des données (voir « Prérequis avant un système réel »).

Page : `/biometric/control` (permission `biometric:control`). Elle vient en plus du module biométrique existant (`/biometric`, recherches avec dossier et motif), qui n'est pas modifié.

## Disposition

- **À gauche : capture.** Onglet empreinte (lecteur simulé) et onglet caméra (aperçu local via le navigateur ; l'image n'est ni envoyée ni enregistrée), scénario de démonstration, motif du contrôle (obligatoire), réglages du signal sonore (activation, volume, test — enregistrés dans le navigateur de l'agent).
- **À droite : résultats**, avec un bandeau d'état, l'indice de similarité, la qualité de capture, la référence et les actions habilitées.

## Les quatre états

| Résultat | Affichage | Comportement |
|---|---|---|
| Correspondance possible (indice ≥ 80 et qualité ≥ 40) | Bandeau **rouge** clignotant modéré (1,6 s, sans animation si « réduire les animations »), signal sonore **bref** (0,35 s, configurable) | Texte « Correspondance possible — vérification humaine obligatoire », référence de l'alerte, boutons habilités |
| Résultat incertain (45 à 80, ou capture médiocre) | Bandeau **ambre**, pas de son | « Vérification supplémentaire requise », aucune conclusion automatique ; l'identité n'est pas nommée |
| Aucune correspondance | Bandeau **vert** avec libellé | « Poursuivre le déroulement normal » ; rappel que ce n'est pas une garantie (faux négatifs) |
| Service indisponible | Bandeau **gris** | Procédure manuelle autorisée, signalement de l'indisponibilité ; jamais lu comme « aucune correspondance » |

La couleur n'est jamais le seul signal : chaque bandeau porte une icône et un texte explicite (`role="alert"` pour le rouge).

## Boutons

- **Voir le dossier autorisé** : seulement si l'agent peut ouvrir l'avis dans son périmètre ; sinon le bulletin de l'alerte suffit.
- **Demander vérification** : notifie (message générique) les agents de l'unité qui détiennent `biometric:verify`.
- **Notifier le supérieur** : notifie (message générique) les commandants de l'unité.
- **Signaler une erreur** : faux positif, faux négatif, mauvaise capture, contestation par la personne contrôlée (notes libres) — alimente le suivi de précision.

## Décision humaine (avant toute action coercitive)

Un agent qui détient `biometric:verify` **autre que celui qui a effectué le contrôle** confirme ou écarte, avec une justification écrite (≥ 10 caractères) sur l'identité **et** la validité du mandat. La décision est définitive. Contrainte base de données : le relecteur ne peut pas être l'agent du contrôle. « Confirmé » signifie « identité confirmée par une personne », jamais « décidé par le système ».

## Référence (lien avec les alertes nationales)

Pour une correspondance possible ou incertaine, la référence est le dernier avis **encore en vigueur** (publié, corrigé ou réactivé) livré aux unités de l'agent, pris dans le bulletin du réseau. Les avis retirés, suspendus, expirés ou clos ne sont jamais utilisés. Sans avis en vigueur, une identité fictive de démonstration est affichée.

## Traçabilité et sécurité

Chaque contrôle (`BCT-AAAA-NNNNNN`), demande, notification, signalement et décision est journalisé. La table impose `isSimulation = true` (contrainte CHECK) tant qu'aucun fournisseur approuvé n'est branché. Aucune image, aucun gabarit n'est stocké. Les notifications ne contiennent aucune identité.

## API

`GET/POST /api/v1/biometric/control` · `GET/PATCH /api/v1/biometric/control/{id}` (`requestVerification`, `notifySuperior`, `reportError`, `review`).

## Prérequis avant un système réel

1. Texte légal autorisant le traitement de données biométriques (autorité de protection des données, décision de la Direction générale).
2. Système approuvé, avec évaluation indépendante des taux de faux positifs / faux négatifs sur la population concernée.
3. Chiffrement des gabarits au repos et en transit, durée de conservation, droit de contestation documentés.
4. Remplacer le simulateur (`runControl`) par un fournisseur derrière la même interface, retirer la contrainte `simulation_only` par migration documentée, tests de précision et de charge.
5. Procédure d'indisponibilité validée par les opérationnels.

## Migration et retour arrière

`prisma/migrations/20261108140000_biometric_control` (additive). Retour arrière : `DROP TABLE "BiometricControl"; DROP TYPE "BiometricErrorKind","BiometricControlStatus","BiometricControlResult";` après sauvegarde.

## Limites

- Les seuils (80 / 45 / qualité 40) sont des valeurs de démonstration, à calibrer avec un vrai système.
- Le signal sonore se règle par poste (navigateur), pas encore par administrateur.
- Le lecteur d'empreinte matériel n'est pas branché (zone simulée).
- Pas de test sur mobile réel ni d'audit d'accessibilité complet (lecteur d'écran).
