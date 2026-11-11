# SIGPN-T — Registre des 25 risques (biométrie, version 1.2)

**Police nationale du Tchad — Éditeur : TECHNOTCHAD — 11 novembre 2026 — Probabilité × impact ; classes Bloquant / Critique / Élevé / Moyen / Faible**

**Échelle.** P : 1 rare … 5 quasi certaine ; I : 1 faible … 5 critique ; niveau = P × I : Critique ≥ 15 · Élevé 10–14 · Moyen 5–9 · Faible ≤ 4 ; **Bloquant** : condition qui empêche toute phase. **R-09 (cadre juridique) : Bloquant. R-11 (faux positif → interpellation injustifiée) : Critique avant mesures, jamais sous Élevé après mesures.**

| N° | Risque | P | I | Brut | Classe brute | Mesures | P×I résiduel | Classe résiduelle | Propriétaire |
|---|---|---|---|---|---|---|---|---|---|
| **R-01** | Deux chemins de chiffrement à maintenir (`crypto.ts` et coffre) | 2 | 3 | 6 | Moyen | A-13 ; non-modification de `crypto.ts` ; tests MFA | 3 | Faible | Éditeur |
| **R-02** | Falsification ou contournement par un administrateur privilégié de la base | 4 | 5 | 20 | Critique | A-01, A-02, A-03, A-06, A-07 | 10 | Élevé | Architecte sécurité |
| **R-03** | Rareté et surcharge des relecteurs | 4 | 3 | 12 | Élevé | D-05 ; réservoir provincial ; indicateurs | 6 | Moyen | Commissaires |
| **R-04** | Résurrection de données effacées via sauvegarde | 3 | 4 | 12 | Élevé | A-04, A-05, A-16 | 4 | Faible | DPO |
| **R-05** | Perte de précision lors d'un changement de fournisseur | 3 | 3 | 9 | Moyen | A-09 ; D-03 B | 6 | Moyen | Éditeur |
| **R-06** | Fuite d'images de référence (impact accru par la conservation) | 3 | 5 | 15 | Critique | A-11, A-12, A-13 ; chiffrement ; quotas | 10 | Élevé | Architecte sécurité |
| **R-07** | Spécifications du Dossier unique national inconnues | 4 | 2 | 8 | Moyen | A-18 ; connecteur versionné | 4 | Faible | Éditeur |
| **R-08** | Faux rapprochements de plaques | 4 | 3 | 12 | Élevé | Forme canonique ; revue humaine ; corroboration | 6 | Moyen | Commissaires |
| **R-09** | **Cadre juridique tchadien non confirmé** | 5 | 5 | 25 | Bloquant | D-01, D-17, D-18, D-19, D-20 | 25 | Bloquant | Direction + Justice |
| **R-10** | Dérive documentaire | 3 | 2 | 6 | Moyen | Régénération de la documentation à chaque phase | 2 | Faible | Éditeur |
| **R-11** | **Faux positif entraînant une interpellation ou une atteinte aux droits injustifiée** | 3 | 5 | 15 | Critique | D-19 (corroboration) ; revue indépendante en aveugle ; sondes pièges ; expertise ; droit de contestation ; critères des phases 5 et 6 | 10 | Élevé | Direction + Justice |
| **R-12** | Biais démographiques de la reconnaissance faciale | 3 | 4 | 12 | Élevé | D-09 ; évaluation par groupes ; seuil d'écart ; limitation à l'aide à la vérification | 8 | Moyen | Évaluateur |
| **R-13** | Défaillance, faillite ou fin de support du fournisseur | 3 | 4 | 12 | Élevé | D-03 B ; clauses de sortie ; essai bi-fournisseur ; entiercement | 6 | Moyen | Direction |
| **R-14** | Panne ou perte du HSM, ou perte du quorum de gardiens | 2 | 5 | 10 | Élevé | Deux HSM ; au moins 3 gardiens ; séquestre testé | 5 | Moyen | Architecte sécurité |
| **R-15** | Compromission d'une clé maîtresse | 2 | 5 | 10 | Élevé | A-13 ; procédure de compromission ; quotas ; ré-enveloppement en deux temps | 5 | Moyen | Architecte sécurité |
| **R-16** | Oracle de déballage : compromission du service biométrique | 3 | 5 | 15 | Critique | A-11 ; service séparé ; quotas ; coupe-circuit | 8 | Moyen | Architecte sécurité |
| **R-17** | Divulgation indirecte de la présence d'une personne au Dossier unique | 3 | 4 | 12 | Élevé | A-17 ; `attest()` supprimé ; flux sortants désactivés | 4 | Faible | DPO |
| **R-18** | Biais d'automatisation des relecteurs | 4 | 4 | 16 | Critique | A-26 ; revue en aveugle ; pièges ; indicateurs | 9 | Moyen | DPO |
| **R-19** | Donnée réelle utilisée avant le statut du fournisseur ou hors cadre (collecte) | 3 | 5 | 15 | Critique | A-08, A-24 ; classes de données ; statuts de fournisseur ; garde en base | 5 | Moyen | DPO |
| **R-20** | Abus par un initié (recherches sans motif, détournement) | 4 | 4 | 16 | Critique | Cible partie à l'affaire ; alertes d'anomalie ; revue du DPO ; sanctions | 9 | Moyen | DPO |
| **R-21** | Contournement de la séparation des fonctions par plusieurs comptes d'une même personne | 3 | 4 | 12 | Élevé | A-19 ; `StaffIdentity` ; réconciliation hebdomadaire | 4 | Faible | Responsable des ressources humaines |
| **R-22** | Restauration utilisée pour falsifier l'historique (retour en arrière) | 3 | 5 | 15 | Critique | A-04 ; double contrôle natif ; comparaison aux ancrages externes | 5 | Moyen | Architecte sécurité |
| **R-23** | Indisponibilité du service ou procédures manuelles défaillantes | 3 | 3 | 9 | Moyen | Procédure manuelle ; haute disponibilité ; coupe-circuit | 6 | Moyen | Opérations |
| **R-24** | Collecte inappropriée de données de mineurs | 2 | 5 | 10 | Élevé | D-17 | 5 | Moyen | Direction + juridique |
| **R-25** | Détournement de finalité (usage hors mission légale) | 2 | 5 | 10 | Élevé | Finalité inscrite dans la base légale ; audit externe ; DPO indépendant (D-20) | 8 | Moyen | DPO |
