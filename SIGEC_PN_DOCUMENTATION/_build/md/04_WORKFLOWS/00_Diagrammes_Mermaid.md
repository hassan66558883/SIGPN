# Diagrammes Mermaid

**Sources Mermaid de tous les circuits (à coller dans mermaid.live ou tout outil compatible)**

| Rubrique | Valeur |
|---|---|
| Système | SIGEC-PN / SIGPN-T — Système d'information de gestion de la Police nationale du Tchad |
| Éditeur et développeur | TECHNOTCHAD |
| Version du document | 1.0 — 10 novembre 2026 |
| Statut | Projet pour validation par la hiérarchie : les points marqués « À confirmer » ne sont pas des décisions |
| Source des informations | Lecture seule du système existant (code, catalogue des rôles et droits, écrans) — aucune donnée, aucun compte, aucun rôle, aucune permission n'a été modifié |

## A. Circuit d'une plainte

```mermaid
flowchart TD
  N0["Agent d'accueil<br/>Accueille le plaignant (étape physique, hors système) et lui explique ce qui sera enregistré."]
  N1["Agent d'accueil<br/>Identifie le plaignant : Personnes > recherche ; s'il n'existe pas, Nouvelle personne (nom, prénom, naissance, téléphone, pièce d'identité). Une plainte anonyme est possible (case « Plainte anonyme »)."]
  N2["Agent d'accueil<br/>Plaintes > Nouvelle plainte : catégorie (20 catégories), titre (5 à 200 caractères), description des faits (20 à 5000 caractères), date et lieu des faits, priorité (Basse, Normale, Haute, Urgente), commissariat récepteur.<br/><b>Statut : Brouillon (DRAFT) ou Enregistrée (REGISTERED)</b>"]
  N3["Système<br/>Attribue le numéro automatique (CMP-AAAA-NNNNN), horodate, journalise, et avertit les titulaires du droit « examiner les plaintes » du commissariat.<br/><b>Statut : Enregistrée</b>"]
  N4["Chef de service / Commissaire<br/>Ouvre la plainte, consulte les faits, ajoute ses observations et ajuste la priorité : action « Examiner ».<br/><b>Statut : En examen (UNDER_REVIEW)</b>"]
  N5["Chef de service / Commissaire<br/>Choisit l'enquêteur : action « Affecter ». L'enquêteur doit être actif, dans le périmètre du commissariat et avoir le droit de traiter plaintes ou affaires.<br/><b>Statut : Affectée (ASSIGNED)</b>"]
  N6{"Chef de service / Commissaire<br/>Les faits justifient-ils une enquête ? OUI : convertir en affaire. NON : classer (Clôturer) ou rejeter, avec un motif écrit d'au moins 5 caractères.<br/><b>Statut : Clôturée (CLOSED) ou Rejetée (REJECTED)</b>"}
  N7["Chef de service / Commissaire<br/>Action « Convertir en affaire » : titre, enquêteur responsable, case « Affaire sensible ». Le plaignant devient partie « Plaignant » de l'affaire ; la plainte garde le lien vers l'affaire.<br/><b>Statut : Plainte : Convertie (CONVERTED) ; Affaire : Affectée (ASSIGNED) ou Ouverte (OPEN)</b>"]
  N8["Enquêteur<br/>Instruit l'affaire : ajoute personnes (victime, témoin, mis en cause…), tâches, notes, pièces à conviction ; fait passer l'affaire « En enquête ».<br/><b>Statut : En enquête (UNDER_INVESTIGATION)</b>"]
  N9["Enquêteur<br/>Soumet l'affaire au contrôle du responsable : « Soumettre à examen ».<br/><b>Statut : En attente d'examen (PENDING_REVIEW)</b>"]
  N10{"Chef de service / Commissaire<br/>Contrôle le travail. Peut RENVOYER à l'enquête pour correction (retour à En enquête), TRANSMETTRE, ou CLÔTURER.<br/><b>Statut : Retournée / Transmise (REFERRED) / Clôturée (CLOSED)</b>"}
  N11["Chef de service / Commissaire<br/>Transmission : l'affaire passe en « Transmise » avec l'issue « Transmise au parquet » (ou « Transférée »). Le système enregistre la décision ; il n'envoie pas le dossier à une juridiction.<br/><b>Statut : Transmise (REFERRED)</b>"]
  N12(["Chef de service / Commissaire<br/>Clôture puis archivage : une affaire clôturée est en lecture seule ; l'archivage exige un droit distinct.<br/><b>Statut : Clôturée → Archivée</b>"])
  N0 --> N1
  N1 --> N2
  N2 --> N3
  N3 --> N4
  N4 --> N5
  N5 --> N6
  N6 --> N7
  N7 --> N8
  N8 --> N9
  N9 --> N10
  N10 --> N11
  N11 --> N12
```

## B. Circuit d'un mandat et d'un avis de recherche

```mermaid
flowchart TD
  N0["Enquêteur<br/>Mandats > Nouveau mandat : type (arrestation, perquisition, détention, citation, saisie, autre), personne visée, affaire liée, autorité émettrice (3 à 200 car.), référence de l'autorité, motifs (10 à 3000 car.), adresse visée, date d'expiration.<br/><b>Statut : Brouillon (DRAFT)</b>"]
  N1{"Chef de service / Commissaire<br/>Vérifie l'authenticité et la validité (référence, autorité, motifs, date d'expiration non dépassée), puis approuve ou rejette. Le demandeur ne peut JAMAIS approuver ni rejeter son propre mandat ; un mandat déjà expiré ne s'approuve pas ; le rejet exige un motif.<br/><b>Statut : Actif (ACTIVE) ou Rejeté (REJECTED)</b>"}
  N2["Enquêteur<br/>Personnes recherchées > Nouvel avis : personne, infraction, nature (mandat de recherche, citation à comparaître, personne disparue), niveau de danger, périmètre de diffusion (national, régional, local), base légale, autorité émettrice, motif, dernière localisation connue.<br/><b>Statut : Brouillon (DRAFT)</b>"]
  N3["Chef de service / Commissaire<br/>Vérification (quatre yeux) : contrôle les pièces et la base légale, ajoute ses observations, « Valider la vérification ». L'émetteur ne peut pas vérifier son propre avis.<br/><b>Statut : En attente d'approbation (PENDING_APPROVAL)</b>"]
  N4{"Direction générale / Commandement<br/>Approuve l'avis (autre personne que l'émetteur, vérification faite) : passage à Actif.<br/><b>Statut : Actif (ACTIVE)</b>"}
  N5["Système<br/>Diffuse automatiquement l'alerte aux unités du périmètre choisi, avec relances toutes les 5 minutes puis escalade (niveau 1 : unité parente et superviseurs régionaux ; niveau 2 : superviseurs nationaux).<br/><b>Statut : Alerte : en attente → remise → lue → acquittée</b>"]
  N6["Agent<br/>Reçoit l'alerte : « Marquer comme lu » puis « Acquitter ». Consulte l'avis depuis son commissariat (le périmètre de diffusion détermine ce qu'il voit).<br/><b>Statut : Alerte acquittée</b>"]
  N7["Agent<br/>Une correspondance peut apparaître : à la recherche (écran Personnes recherchées), au contrôle biométrique, ou lors d'un contrôle routier (plaque ou conducteur). Le système affiche « correspondance possible », jamais une certitude.<br/><b>Statut : Correspondance signalée</b>"]
  N8{"Agent<br/>Vérification de l'identité par un humain : « Demander vérification », « Notifier le supérieur », « Signaler une erreur » (faux positif, mauvaise capture, contesté), ou confirmer/rejeter la correspondance.<br/><b>Statut : Contrôle : vérification demandée / supérieur notifié / confirmé / rejeté</b>"}
  N9["Agent<br/>Si l'arrestation a lieu : Arrestations > Nouvelle arrestation avec le mandat en autorité « Mandat » : le mandat doit être ACTIF, non expiré et viser la même personne.<br/><b>Statut : Arrestation enregistrée</b>"]
  N10["Chef de service / Commissaire<br/>Enregistrement de l'exécution : le mandat est marqué « Exécuté » (droit « exécuter les mandats ») ; l'avis passe à Localisé ou Arrêté.<br/><b>Statut : Mandat : Exécuté (EXECUTED) ; Avis : Arrêté (ARRESTED)</b>"]
  N11(["Chef de service / Commissaire<br/>Mise à jour du statut et retrait : un avis arrêté, annulé ou expiré cesse d'être actif ; son éventuelle publication sur le site public est retirée automatiquement.<br/><b>Statut : Arrêté / Annulé / Expiré / Suspendu</b>"])
  N0 --> N1
  N1 --> N2
  N2 --> N3
  N3 --> N4
  N4 --> N5
  N5 --> N6
  N6 --> N7
  N7 --> N8
  N8 --> N9
  N9 --> N10
  N10 --> N11
```

## C. Circuit d'une main courante (module Incidents)

```mermaid
flowchart TD
  N0["Agent<br/>Reçoit l'information (appel, passant, patrouille) — étape hors système."]
  N1["Agent<br/>Incidents > Nouvel incident : type (12 types), gravité (Faible, Moyenne, Élevée, Critique), titre (5 à 200 car.), description (10 à 8000 car.), lieu (3 à 300 car.), coordonnées facultatives, commissariat, patrouille éventuelle.<br/><b>Statut : Signalé (REPORTED)</b>"]
  N2["Système<br/>Pour un incident de gravité Élevée ou Critique, avertit les titulaires du droit de modifier les incidents du commissariat.<br/><b>Statut : Signalé</b>"]
  N3["Agent<br/>Ajoute les personnes concernées (plaignant, victime, témoin, suspect…) et les agents présents."]
  N4["Agent<br/>Fait évoluer l'incident : En intervention, Sur place, Résolu, puis Clôturé, avec un rapport d'intervention : passer à « Résolu » exige un rapport d'au moins 10 caractères.<br/><b>Statut : En intervention → Sur place → Résolu → Clôturé</b>"]
  N5{"Chef de service / Commissaire<br/>Si l'incident révèle une infraction à instruire : « Escalader en affaire » (titre, responsable, sensible ou non). Sinon, clôture.<br/><b>Statut : Escaladé (ESCALATED)</b>"}
  N6(["Chef de service / Commissaire<br/>Consultation et suivi : liste filtrée, tableau de bord (nombre d'incidents sur la période, répartition par type, tendance). Clôture.<br/><b>Statut : Clôturé (CLOSED)</b>"])
  N0 --> N1
  N1 --> N2
  N2 --> N3
  N3 --> N4
  N4 --> N5
  N5 --> N6
```

## D. Circuit des infractions

```mermaid
flowchart TD
  N0["Agent<br/>Constatation : contrôle routier ou constat d'une infraction. Circulation > Contrôles > Nouveau contrôle : conducteur, véhicule (plaque), lieu, résultat (conforme ou infraction)."]
  N1["Agent<br/>Identification de l'infraction : choix dans le catalogue des infractions (montant forfaitaire indiqué). Identification des personnes : fiche conducteur / véhicule."]
  N2["Agent<br/>Ajout des preuves : photos, vidéos, documents rattachés au contrôle."]
  N3["Agent<br/>Enregistrement et émission du PV électronique (numéro PV-AAAA-NNNNNN) ; une amende (AMD-…) est créée.<br/><b>Statut : PV émis (ISSUED) ; Amende : À payer (TO_PAY)</b>"]
  N4["Chef de service / Commissaire<br/>Transmission / affectation : le superviseur circulation passe en revue les contrôles et PV de l'unité ; il peut annuler un PV avec motif (l'agent émetteur est averti)."]
  N5["Finance<br/>Suivi : paiement au guichet ou en tournée (caisse de l'agent) ou en ligne (page publique « Payer une amende »). Reçu REC-AAAA-NNNNNN.<br/><b>Statut : Payée (PAID)</b>"]
  N6(["Chef de service / Commissaire<br/>Validation et rapport final : tableau de bord circulation, statistiques, rapports de recettes (12 rapports) ; export autorisé aux titulaires du droit d'export.<br/><b>Statut : Rapports de recettes et statistiques</b>"])
  N0 --> N1
  N1 --> N2
  N2 --> N3
  N3 --> N4
  N4 --> N5
  N5 --> N6
```

## E. Circuit des plaintes en cours

```mermaid
flowchart TD
  N0["Chef de service / Commissaire<br/>Le commissaire ouvre Plaintes et filtre par statut « Enregistrée » / « En examen » pour voir les plaintes en attente. Le tableau de bord indique le nombre de plaintes de la période et d'affaires ouvertes."]
  N1["Chef de service / Commissaire<br/>Il examine et affecte (circuit A). Pour une affaire sans responsable, il reçoit la notification « en attente d'affectation » et affecte une équipe (responsable, enquêteur, superviseur, analyste, appui)."]
  N2["Enquêteur<br/>Reçoit l'affectation, ouvre Mes tâches, met à jour l'avancement : tâches (à faire, en cours, bloquée, terminée, annulée) avec résultat."]
  N3["Enquêteur<br/>Met à jour l'état de l'affaire (En enquête) et ajoute notes, personnes, pièces."]
  N4["Chef de service / Commissaire<br/>Contrôle des résultats : examine l'affaire soumise (En attente d'examen) ; renvoie à l'enquête, transmet ou clôture."]
  N5["Délégué provincial<br/>Supervise : voit les plaintes et affaires de toute sa province (périmètre régional) et les commissariats rattachés."]
  N6(["Direction générale<br/>Supervision nationale : vue d'ensemble de toutes les affaires et plaintes (périmètre national)."])
  N0 --> N1
  N1 --> N2
  N2 --> N3
  N3 --> N4
  N4 --> N5
  N5 --> N6
```

## F. Circuit des transferts de dossiers

```mermaid
flowchart TD
  N0["Chef de service / Commissaire<br/>Affectation interne : Affaire > Affecter : choix d'un utilisateur du périmètre et d'un rôle dans l'affaire (responsable, enquêteur, superviseur, analyste, appui)."]
  N1["Système<br/>Quand un agent est muté, le système signale aux titulaires du droit d'affecter de son ancienne unité : « Travail à réaffecter » (nombre d'affaires et de tâches ouvertes)."]
  N2["Chef de service / Commissaire<br/>Transmission : l'affaire peut passer au statut « Transmise » (issue : transmise au parquet ou transférée)."]
  N3["Agent<br/>Pièces à conviction : « Transférer la garde » vers un autre agent ou un autre lieu de stockage, avec motif ; l'état de la pièce est consigné."]
  N4["RH<br/>Mutation d'agent : voir circuit J (proposition, examen RH, validation, exécution)."]
  N5(["Chef de service / Commissaire<br/>Pas de circuit « acceptation / refus motivé » entre commissariat, délégation provinciale, direction générale ou services centraux."])
  N0 --> N1
  N1 --> N2
  N2 --> N3
  N3 --> N4
  N4 --> N5
```

## G. Circuit des validations

```mermaid
flowchart TD
  N0["Administration<br/>Demande de changement sensible (création de compte, changement de rôle, élévation d'habilitation, ajout d'un droit sensible à un rôle) : crée une demande d'approbation.<br/><b>Statut : En attente (PENDING)</b>"]
  N1{"Chef de service / Commissaire<br/>Un ou deux approbateurs de niveaux différents décident ; le demandeur ne peut pas approuver sa propre demande (contrainte de base de données).<br/><b>Statut : Approuvée / Rejetée</b>"}
  N2["Système<br/>Exécute le changement approuvé et notifie le demandeur ; en cas d'échec : « Changement approuvé non exécuté ».<br/><b>Statut : Exécutée (EXECUTED) ou Échec (FAILED)</b>"]
  N3["Enquêteur<br/>Mandats : demande → approbation par un autre → exécution/annulation."]
  N4["Enquêteur<br/>Avis de recherche : émission → vérification → approbation → publication publique (chacune par une personne différente de l'émetteur)."]
  N5["Enquêteur<br/>Affaires : soumission à examen → contrôle du superviseur → clôture/archivage (droits distincts)."]
  N6["RH<br/>Mutations : proposition → examen RH → validation de l'autorité compétente → exécution. Congés : demande → approbation. Paie : demande → validation par une autre personne → export."]
  N7["Finance<br/>Recettes : clôture de caisse → vérification → versement → examen → validation définitive → rapprochement."]
  N8(["Chef de service / Commissaire<br/>Retour pour correction : possible pour l'affaire (retour à En enquête), la clôture de caisse/versement (justification demandée), les justificatifs ; un mandat ou avis refusé est rejeté avec motif et doit être recréé."])
  N0 --> N1
  N1 --> N2
  N2 --> N3
  N3 --> N4
  N4 --> N5
  N5 --> N6
  N6 --> N7
  N7 --> N8
```

## D bis. Circuit d'une arrestation et d'une garde à vue

```mermaid
flowchart TD
  N0["Agent<br/>Arrestations > Nouvelle arrestation : personne, affaire éventuelle, fondement (Mandat, Flagrant délit, Ordre du tribunal, Cause probable, Autre), lieu, chefs d'accusation, circonstances, heure de lecture des droits, agent arrêtant.<br/><b>Statut : Enregistrée (RECORDED)</b>"]
  N1["Agent de garde<br/>Gardes à vue > Ouvrir : arrestation, numéro de cellule, notes médicales. Une seule garde à vue ouverte par arrestation ; début non antérieur à l'arrestation.<br/><b>Statut : Garde à vue active (ACTIVE) ; Arrestation : En garde à vue (IN_CUSTODY)</b>"]
  N2["Agent de garde<br/>Journal de surveillance : contrôle de bien-être, repas, médical, visite, avocat, transfert, incident, note."]
  N3{"Chef de service / Commissaire<br/>Prolongation (si nécessaire) : autorité qui autorise et motif obligatoires, au plus 48 h au-delà de l'échéance légale ; la nouvelle échéance doit dépasser l'ancienne. Droit distinct et sensible.<br/><b>Statut : Prolongée (EXTENDED)</b>"}
  N4["Chef de service / Commissaire<br/>Fin de garde à vue : issue (libéré sans charge, libéré sous caution, transféré au parquet, transféré à un autre poste, présenté au tribunal, médical, autre) et notes.<br/><b>Statut : Terminée (ENDED)</b>"]
  N5(["Chef de service / Commissaire<br/>Statut final de l'arrestation : Libérée (motif obligatoire ; impossible tant qu'une garde à vue est ouverte), Transférée ou Inculpée.<br/><b>Statut : Libérée / Transférée / Inculpée</b>"])
  N0 --> N1
  N1 --> N2
  N2 --> N3
  N3 --> N4
  N4 --> N5
```

## H. Circuit du portail public (citoyen)

```mermaid
flowchart TD
  N0["Citoyen<br/>Dépose une plainte ou un signalement sur le portail (consentement obligatoire, pas de pièce jointe).<br/><b>Statut : Reçu (RECEIVED)</b>"]
  N1["Chef de service / Commissaire<br/>Gestionnaire du site public : Site public > Dépôts : ouvre, passe en examen, rédige la réponse publique.<br/><b>Statut : En examen (IN_REVIEW)</b>"]
  N2{"Chef de service / Commissaire<br/>Convertit en plainte interne (choix du commissariat) ou rejette/clôt avec réponse publique.<br/><b>Statut : Transmis (FORWARDED) / Clos / Rejeté</b>"}
  N3(["Citoyen<br/>Suit sa demande avec la référence et le code : voit le statut et la réponse publique, jamais de données personnelles.<br/><b>Statut : Selon traitement</b>"])
  N0 --> N1
  N1 --> N2
  N2 --> N3
```

## I. Circuit des amendes, paiements et versements

```mermaid
flowchart TD
  N0["Agent<br/>Ouvre sa caisse (Recettes > Caisses), encaisse le paiement d'une amende en espèces / électronique / mobile money : reçu REC-… édité."]
  N1["Citoyen<br/>Paiement en ligne : page publique « Payer une amende » → demande envoyée à l'opérateur → paiement enregistré seulement après confirmation authentifiée de l'opérateur."]
  N2["Agent<br/>Clôture sa caisse : le montant à verser est calculé."]
  N3["Chef de service / Commissaire<br/>Vérifie la clôture (chef d'unité)."]
  N4["Agent<br/>Déclare le versement à l'administration (montant, mode)."]
  N5{"Finance<br/>Examine le versement : accepte, rejette ou demande une justification ; puis validation définitive par un autre droit."}
  N6(["Finance<br/>Rapprochement et écarts : traités, justifiés puis validés/rejetés ; rapports de recettes (12) exportables.<br/><b>Statut : Versement validé</b>"])
  N0 --> N1
  N1 --> N2
  N2 --> N3
  N3 --> N4
  N4 --> N5
  N5 --> N6
```

## J. Circuit des mutations et congés (ressources humaines)

```mermaid
flowchart TD
  N0["RH<br/>Proposition de mutation d'un agent du périmètre (ou proposition automatique issue de la rotation).<br/><b>Statut : Proposée (PROPOSED)</b>"]
  N1{"RH<br/>Examen par les RH : approuve (transmis à l'autorité compétente) ou rejette avec note ; le proposant est averti du rejet.<br/><b>Statut : Approuvée RH (HR_APPROVED) ou Rejetée</b>"}
  N2{"Direction générale<br/>Validation par l'autorité compétente, qui doit couvrir la structure d'origine ET la destination.<br/><b>Statut : Approuvée (APPROVED) ou Rejetée</b>"}
  N3["RH<br/>Exécution : le poste change, les sessions de l'agent prennent fin, l'habilitation retombe au niveau standard, une approbation de rétablissement est créée pour la nouvelle unité.<br/><b>Statut : Exécutée (EXECUTED)</b>"]
  N4(["Agent<br/>Congés : l'agent (ou la personne habilitée) dépose une demande ; le supérieur approuve ou rejette ; notification du résultat.<br/><b>Statut : Demandé → Approuvé / Rejeté / Annulé</b>"])
  N0 --> N1
  N1 --> N2
  N2 --> N3
  N3 --> N4
```

