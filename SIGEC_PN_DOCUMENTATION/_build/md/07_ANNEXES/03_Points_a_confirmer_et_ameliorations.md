# Points à confirmer et améliorations recommandées

**Liste consolidée à soumettre à la hiérarchie**

| Rubrique | Valeur |
|---|---|
| Système | SIGEC-PN / SIGPN-T — Système d'information de gestion de la Police nationale du Tchad |
| Éditeur et développeur | TECHNOTCHAD |
| Version du document | 1.0 — 10 novembre 2026 |
| Statut | Projet pour validation par la hiérarchie : les points marqués « À confirmer » ne sont pas des décisions |
| Source des informations | Lecture seule du système existant (code, catalogue des rôles et droits, écrans) — aucune donnée, aucun compte, aucun rôle, aucune permission n'a été modifié |

## 1. Points à confirmer auprès de la hiérarchie

Ces points sont des décisions **organisationnelles ou judiciaires** : aucune hypothèse n'a été retenue dans le système ni dans la documentation.

| Origine | Point à confirmer |
|---|---|
| Circuit A | Qui, dans l'organisation, joue le rôle de « chef de service » entre l'agent d'accueil et le commissaire : le système n'a pas de rôle distinct, c'est le Commissaire (ou toute personne portant le droit « examiner ») qui examine et affecte. |
| Circuit A | Les règles de transmission au parquet (délais, pièces obligatoires, forme du bordereau) : le système enregistre seulement la décision de transmission. |
| Circuit A | La compétence territoriale exacte pour qu'une plainte soit reçue ailleurs que dans le commissariat du lieu des faits. |
| Circuit B | Qui, dans la hiérarchie, détient le pouvoir d'approuver un mandat et un avis de recherche : le système le lie au droit « approuver » (portés par les commandants) ; la décision organisationnelle finale revient à la Direction. |
| Circuit B | Qui contrôle l'authenticité d'un mandat émis par un magistrat : le système n'a pas d'étape « authentification » séparée ; elle se fait par la vérification humaine avant approbation. |
| Circuit B | Le périmètre de diffusion par défaut (national / régional / local) selon la gravité. |
| Circuit B | Faut-il exiger que le vérificateur et l'approbateur d'un avis soient deux personnes différentes (le système ne l'impose pas aujourd'hui) ? |
| Circuit C | Si la main courante réglementaire doit être un registre distinct (chronologique, non modifiable, tenu par le poste) ou si le module Incidents suffit. |
| Circuit C | Le délai de clôture, la signature du registre et l'obligation de transmission au chef de service. |
| Circuit D | Les barèmes d'amendes forfaitaires et la liste des délits non arbitrables doivent être validés par la hiérarchie et la justice (catalogue chargé à partir de la source indiquée dans la documentation Infractions routières). |
| Circuit D | Pour les infractions pénales : un registre ou catalogue pénal dédié est-il attendu ? |
| Circuit E | Les délais de traitement attendus par type de plainte (aucun délai automatique n'existe dans le système). |
| Circuit F | Souhaite-t-on un vrai transfert entre unités (demande, réception, acceptation ou refus motivé, traçabilité, notification) ? Qui accepte à chaque niveau (commissariat, délégation, direction générale, services centraux) ? |
| Circuit F | Cas des affaires qui dépassent la compétence territoriale du commissariat. |
| Circuit G | Qui doit valider chaque acte organisationnel (le système reflète seulement les droits attribués aux rôles actuels). |
| Circuit D bis | Durée légale de la garde à vue et durée maximale de prolongation (48 h + 48 h dans le code). |
| Circuit D bis | Qui autorise une prolongation (champ libre « autorité » dans le formulaire). |
| Circuit H | Réponses types et délais de réponse aux citoyens. |
| Circuit H | Opportunité d'un SMS ou courriel de confirmation (aujourd'hui absents). |
| Circuit I | Comptes bancaires/Trésor de versement, délais de versement, barème des écarts tolérés. |
| Circuit J | Les durées de rotation et les délais d'alerte sont des paramètres du système à valider. |
| Module 1 | Le processus de remise du premier mot de passe aux agents (en main propre, par le chef) est à fixer par la hiérarchie. |
| Module 1 | Le circuit de création de comptes pour 14 000 agents (import en masse) n'est pas décrit : un import de masse n'existe pas dans l'interface actuelle. |
| Module 2 | L'organigramme détaillé de chaque direction et service est fixé par arrêté ministériel (art. 91 du décret 0572/2023) : seule l'arborescence générale (14 directions centrales et unités du décret) est chargée ; la structure détaillée au niveau commissariat doit être fournie. |
| Module 2 | Les unités de niveau 'service' d'un commissariat ne sont pas des unités distinctes dans le système (départements internes seulement). |
| Module 3 | Il n'existe pas de module « Délégations provinciales » à part : c'est l'écran Organisation et le rôle Délégué provincial qui en tiennent lieu. |
| Module 3 | La nomination du délégué est faite par décret (art. 94) : le système ne gère que son compte. |
| Module 5 | Délais de traitement attendus. |
| Module 6 | Faut-il un registre de main courante distinct de l'incident ? |
| Module 7 | Barèmes et liste des délits non arbitrables. |
| Module 13 | Forme réglementaire du procès-verbal d'enquête (modèle, signatures, visa). |
| Module 16 | Rapports demandés par la hiérarchie à chaque niveau. |
| Module 17 | Indicateurs attendus par niveau. |
| Module 18 | Aucune notification par SMS ou courriel. |
| Module 19 | Durées de conservation et règles d'archivage. |
| Manuel du Directeur général | Répartition des pouvoirs d'approbation entre Directeur général et adjoints. |
| Manuel du Directeur général | Fréquence et contenu des rapports attendus de la Direction (les rapports généraux ne sont pas construits). |
| Manuel des directeurs centraux | Quel rôle attribuer à chaque directeur central (ex. Directeur des ressources humaines = rôle RH). |
| Manuel des directeurs centraux | Faut-il créer des rôles propres à chaque direction centrale (droits à définir avec la Direction). |
| Manuel des délégués provinciaux de police | Les rapports périodiques attendus du délégué vers la Direction générale (non construits). |
| Manuel des commissaires (chefs de commissariat) | Profil du commissaire adjoint et délégation de signature en cas d'absence du commissaire. |
| Manuel des chefs de service | Souhaite-t-on un rôle « chef de service » (examen intermédiaire des plaintes, validation avant le commissaire) ? Droits à définir avec la hiérarchie. |
| Manuel des officiers de police judiciaire (OPJ) | Quels actes l'OPJ doit pouvoir accomplir dans le système (plaintes, procès-verbaux, arrestations, gardes à vue) : décision de la hiérarchie et du ministère de la Justice. |
| Manuel des officiers de police judiciaire (OPJ) | Distinction OPJ / agent de police judiciaire (APJ) : non modélisée. |
| Manuel des enquêteurs | Forme réglementaire des procès-verbaux d'audition (non construits). |
| Manuel des agents de police | Fonctions non couvertes par un profil (ex. agent de police judiciaire, agent des archives). |
| Manuel de l'administrateur technique | Séparation entre administrateur technique et administrateur de sécurité en production (deux personnes différentes). |

## 2. Améliorations recommandées

Éléments absents du système actuel ; leur construction suppose confirmation préalable.

| Origine | Amélioration ou limite |
|---|---|
| Circuit A | Procès-verbaux d'enquête, déclarations et auditions : les écrans correspondants (Déclarations, Auditions, Enquêtes) sont prévus mais NON construits ; aujourd'hui les constats se consignent en notes d'affaire, tâches et pièces à conviction. |
| Circuit A | Pas de génération de récépissé de plainte imprimable pour le plaignant. |
| Circuit A | Pas de notification au plaignant (sauf via le portail public avec référence et code). |
| Circuit B | Pas d'interface avec les juridictions : le mandat est saisi à la main à partir du document reçu. |
| Circuit B | Pas de génération de document de mandat imprimable. |
| Circuit B | Les sources frontières, vidéosurveillance et interopérabilité sont affichées « non connecté » ; le contrôle biométrique est une simulation tant qu'aucun matériel réel n'est branché. |
| Circuit C | Pas de module « Main courante » : amélioration recommandée si la hiérarchie confirme un registre dédié (chronologique, un numéro d'ordre par poste, visa du chef de poste). |
| Circuit C | Pas de visa électronique du chef de poste sur chaque incident. |
| Circuit C | Écran Incidents non capturé dans le dossier d'images actuel (voir annexe). |
| Circuit D | Pas de catalogue d'infractions pénales : la qualification est la catégorie de l'affaire (20 catégories). |
| Circuit D | Pas de rapport final automatique d'infraction pénale (les rapports et statistiques généraux sont prévus mais NON construits). |
| Circuit E | Pas d'alerte automatique de plainte « en retard » ni de relance de l'enquêteur : amélioration recommandée. |
| Circuit F | AMÉLIORATION RECOMMANDÉE (non construite) : module de transfert avec statuts Demandé / Reçu / Accepté / Refusé (motif obligatoire), notification de l'expéditeur et du destinataire, historique, et restriction par niveau hiérarchique. |
| Circuit G | Un tableau unique « mes validations en attente » couvrant mandats, avis, affaires et mutations n'existe pas : seul l'écran Approbations regroupe les demandes de changement d'accès. |
| Circuit D bis | Aucune notification automatique d'une garde à vue qui dépasse son délai : amélioration recommandée. |
| Circuit H | Pas de CAPTCHA, de SMS ni de courriel de confirmation ; pas de pièce jointe. |
| Circuit I | Écrans de recettes non capturés dans le dossier d'images actuel. |
| Circuit J | Écrans RH non capturés dans le dossier d'images actuel. |
| Module 5 | Pas de relance automatique des dossiers en retard. |
| Module 6 | Registre de main courante non construit. |
| Module 7 | Pas de catalogue d'infractions pénales. |
| Module 9 | Sources frontières, vidéosurveillance et interopérabilité non connectées (affichées « non connecté »). |
| Module 12 | Écran Enquêtes dédié et Opérations non construits. |
| Module 13 | Module à construire sur confirmation de la hiérarchie. |
| Module 14 | Transfert formel entre unités non construit. |
| Module 15 | Opérations (descentes, barrages, escortes) non construit. |
| Module 16 | Module général de rapports non construit. |
| Module 17 | Module de statistiques détaillées non construit. |
| Module 18 | Pas d'envoi hors application. |
| Module 19 | Module Documents/Archives non construit. |

## 3. Interrupteur temporaire à lever avant la mise en service

Le second facteur est suspendu sur l'installation de démonstration (variable de configuration temporaire). Il doit être rétabli avant toute mise en service.
