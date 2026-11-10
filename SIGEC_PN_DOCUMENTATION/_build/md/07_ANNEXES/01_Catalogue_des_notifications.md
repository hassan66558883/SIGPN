# Catalogue des notifications

**Toutes les notifications internes relevées dans le système**

| Rubrique | Valeur |
|---|---|
| Système | SIGEC-PN / SIGPN-T — Système d'information de gestion de la Police nationale du Tchad |
| Éditeur et développeur | TECHNOTCHAD |
| Version du document | 1.0 — 10 novembre 2026 |
| Statut | Projet pour validation par la hiérarchie : les points marqués « À confirmer » ne sont pas des décisions |
| Source des informations | Lecture seule du système existant (code, catalogue des rôles et droits, écrans) — aucune donnée, aucun compte, aucun rôle, aucune permission n'a été modifié |

**Types :** Information, Affectation, Échéance, Approbation, Alerte, Sécurité. Les notifications apparaissent dans la cloche de l'en-tête (page **Notifications**). Les alertes nationales s'affichent en plus en bandeau rouge. **Aucune notification n'est envoyée par SMS ou courriel.** La liste ci-dessous est celle du code ; tout événement absent n'envoie pas de notification (par exemple une garde à vue qui dépasse son délai, une plainte sans suite).

| Module | Événement | Destinataires | Type | Message (résumé) |
|---|---|---|---|---|
| Plaintes | Plainte enregistrée / soumise | Titulaires du droit d'examiner les plaintes du commissariat | Approbation | Nouvelle plainte à examiner |
| Plaintes | Plainte affectée | L'enquêteur désigné | Affectation | Plainte affectée à vous |
| Plaintes | Plainte clôturée ou rejetée | L'enquêteur affecté | Information | Plainte clôturée / rejetée |
| Affaires | Affaire créée sans responsable | Titulaires du droit d'affecter les affaires | Approbation | Nouvelle affaire en attente d'affectation |
| Affaires | Affaire créée avec responsable / issue d'une plainte | Le responsable | Affectation | Nouvelle affaire qui vous est confiée |
| Affaires | Affectation à l'équipe d'une affaire | La personne affectée | Affectation | Affecté à l'affaire en tant que … |
| Affaires | Tâche confiée | La personne désignée | Affectation | Tâche affectée à vous |
| Affaires | Affaire soumise à examen | Titulaires du droit de clôture | Approbation | Affaire en attente d'examen du superviseur |
| Affaires | Changement de statut | Le responsable de l'affaire | Information | Affaire — nouveau statut |
| Incidents | Incident de gravité élevée ou critique | Titulaires du droit de modifier les incidents | Alerte | Incident critique / élevé signalé |
| Patrouilles | Patrouille confiée à un superviseur | Le superviseur | Affectation | Patrouille affectée à vous |
| Alertes nationales | Avis de recherche actif diffusé | Unités du périmètre (bandeau rouge) | Alerte | Alerte nationale |
| Alertes nationales | Alerte non prise en compte | Unité parente et superviseurs régionaux (niveau 1) ; superviseurs nationaux (niveau 2) | Alerte | Escalade : avis du réseau sans prise en compte |
| Biométrie | Vérification humaine demandée | Titulaires du droit de vérifier | Alerte | Une vérification humaine est demandée |
| Biométrie | Erreur signalée sur un contrôle | Titulaires du droit de vérifier | Information | Une erreur a été signalée |
| Circulation | Contrôle avec correspondance à un avis de recherche | Titulaires du droit d'approuver les avis | Alerte | Correspondance avec un avis de recherche |
| Circulation | PV comportant un délit | Titulaires du droit de gérer les amendes | Alerte | PV comportant un délit |
| Circulation | PV annulé | L'agent émetteur | Information | PV annulé |
| Recettes | Caisse clôturée | Titulaires du droit d'examiner les versements | Information | Caisse clôturée |
| Recettes | Versement déclaré | Titulaires du droit d'examiner les versements | Information | Versement à vérifier |
| Recettes | Versement rejeté / justification demandée | Agents-caisse de l'unité | Alerte | Versement rejeté / Justification demandée |
| Approbations | Demande d'approbation déposée | Titulaires du droit de décider (sauf le demandeur) | Approbation | Demande d'approbation |
| Approbations | Demande rejetée | Le demandeur | Information | Approbation rejetée |
| Approbations | Changement exécuté ou non exécuté | Le demandeur | Information | Changement approuvé exécuté / non exécuté |
| Sécurité | Rôle modifié | L'utilisateur concerné | Sécurité | Votre rôle a changé — reconnectez-vous |
| Sécurité | Habilitation modifiée | L'utilisateur concerné | Sécurité | Votre habilitation a changé — reconnectez-vous |
| Sécurité | Second facteur réinitialisé | L'utilisateur concerné | Sécurité | Votre MFA a été réinitialisé |
| Sécurité | Demande de réinitialisation de mot de passe | Titulaires du droit de réinitialiser | Sécurité | Réinitialisation demandée |
| Ressources humaines | Mutation proposée | Titulaires du droit d'examen RH | Approbation | Mutation à examiner |
| Ressources humaines | Mutation rejetée | Le proposant | Information | Mutation rejetée |
| Ressources humaines | Mutation exécutée | L'agent, le proposant, les unités de départ et d'arrivée | Affectation | Nouvelle affectation / Agent arrivant / partant |
| Ressources humaines | Travail à réaffecter après une mutation | Titulaires du droit d'affecter de l'ancienne unité | Affectation | N affaires et N tâches à réaffecter |
| Ressources humaines | Demande de congé | Titulaires du droit d'approuver les congés | Approbation | Demande de congé à décider |
| Ressources humaines | Décision sur un congé | Le demandeur | Information | Congé approuvé / rejeté |
| Ressources humaines | Rotation (échéance proche) | Titulaires des droits RH | Échéance | Agents bientôt éligibles à la rotation |
| Ressources humaines | Propositions automatiques de mutation | Titulaires du droit d'examen RH | Approbation | Propositions à examiner |
| Organisation | Nouvelle affectation d'un agent | L'agent | Information | Vous avez été affecté à … |

## Délais de l'alerte nationale

| Priorité de l'avis | Relance | Escalade niveau 1 | Escalade niveau 2 | Acquittement attendu |
|---|---|---|---|---|
| Ordinaire | 5 min | 15 min | 60 min | 30 min |
| Haute / extrême | 5 min | 5 min | 15 min | 10 min |

## Notifications à ajouter (améliorations recommandées)

- Garde à vue proche ou au-delà de l'échéance légale.
- Plainte restée sans examen au-delà d'un délai à définir.
- Affaire sans mouvement depuis un délai à définir.
- Mandat proche de son expiration.

