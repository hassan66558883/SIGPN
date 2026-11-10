# -*- coding: utf-8 -*-
"""Circuits opérationnels du SIGPN-T, relevés dans le code (services, schémas, statuts). Rien n'est inventé :
ce que le système ne fait pas est dit dans `gaps`, ce qui dépend de la hiérarchie dans `confirm`."""

CH = "Chef de service / Commissaire"
WF = []

# ---------------------------------------------------------------- A. PLAINTE
WF.append(dict(
    id="A_plainte", letter="A", title="Circuit d'une plainte",
    intro="Une plainte est reçue à l'accueil d'un commissariat (ou déposée par un citoyen sur le portail public, voir circuit H), enregistrée dans le système, examinée par le commissaire, affectée à un enquêteur, puis transformée en **affaire** (dossier d'enquête) qui est instruite, transmise ou clôturée.",
    modules=["Plaintes", "Personnes", "Affaires", "Tâches", "Preuves"],
    steps=[
        dict(a="Agent d'accueil", t="Accueille le plaignant (étape physique, hors système) et lui explique ce qui sera enregistré.", detail="Aucune saisie à cette étape."),
        dict(a="Agent d'accueil", t="Identifie le plaignant : Personnes > recherche ; s'il n'existe pas, Nouvelle personne (nom, prénom, naissance, téléphone, pièce d'identité). Une plainte anonyme est possible (case « Plainte anonyme »).", detail="Le système signale un doublon probable ; il faut alors choisir la fiche existante ou confirmer expressément la création (« forcer »)."),
        dict(a="Agent d'accueil", t="Plaintes > Nouvelle plainte : catégorie (20 catégories), titre (5 à 200 caractères), description des faits (20 à 5000 caractères), date et lieu des faits, priorité (Basse, Normale, Haute, Urgente), commissariat récepteur.", detail="Deux boutons : enregistrer en brouillon, ou enregistrer et soumettre.", s="Brouillon (DRAFT) ou Enregistrée (REGISTERED)"),
        dict(a="Système", k="system", t="Attribue le numéro automatique (CMP-AAAA-NNNNN), horodate, journalise, et avertit les titulaires du droit « examiner les plaintes » du commissariat.", detail="Notification : « Nouvelle plainte à examiner » (type Approbation).", s="Enregistrée"),
        dict(a=CH, t="Ouvre la plainte, consulte les faits, ajoute ses observations et ajuste la priorité : action « Examiner ».", detail="Le brouillon doit d'abord être enregistré (soumis).", s="En examen (UNDER_REVIEW)"),
        dict(a=CH, t="Choisit l'enquêteur : action « Affecter ». L'enquêteur doit être actif, dans le périmètre du commissariat et avoir le droit de traiter plaintes ou affaires.", detail="Notification à l'enquêteur : « Plainte affectée à vous » (type Affectation).", s="Affectée (ASSIGNED)"),
        dict(a=CH, k="decision", t="Les faits justifient-ils une enquête ? OUI : convertir en affaire. NON : classer (Clôturer) ou rejeter, avec un motif écrit d'au moins 5 caractères.", detail="Clôture / rejet : notification de l'enquêteur déjà affecté ; états définitifs.", s="Clôturée (CLOSED) ou Rejetée (REJECTED)"),
        dict(a=CH, t="Action « Convertir en affaire » : titre, enquêteur responsable, case « Affaire sensible ». Le plaignant devient partie « Plaignant » de l'affaire ; la plainte garde le lien vers l'affaire.", detail="Numéro d'affaire CASE-AAAA-NNNNN. Notification au responsable : « Nouvelle affaire qui vous est confiée ».", s="Plainte : Convertie (CONVERTED) ; Affaire : Affectée (ASSIGNED) ou Ouverte (OPEN)"),
        dict(a="Enquêteur", t="Instruit l'affaire : ajoute personnes (victime, témoin, mis en cause…), tâches, notes, pièces à conviction ; fait passer l'affaire « En enquête ».", detail="Le journal chronologique de l'affaire enregistre chaque événement.", s="En enquête (UNDER_INVESTIGATION)"),
        dict(a="Enquêteur", t="Soumet l'affaire au contrôle du responsable : « Soumettre à examen ».", detail="Notification aux titulaires du droit de clôture : « Affaire en attente d'examen du superviseur ».", s="En attente d'examen (PENDING_REVIEW)"),
        dict(a=CH, k="decision", t="Contrôle le travail. Peut RENVOYER à l'enquête pour correction (retour à En enquête), TRANSMETTRE, ou CLÔTURER.", detail="Seuls les titulaires du droit de clôture peuvent transmettre ou clôturer ; la clôture exige une issue (résolue, non résolue, non fondée, transmise au parquet, transférée, classée).", s="Retournée / Transmise (REFERRED) / Clôturée (CLOSED)"),
        dict(a=CH, t="Transmission : l'affaire passe en « Transmise » avec l'issue « Transmise au parquet » (ou « Transférée »). Le système enregistre la décision ; il n'envoie pas le dossier à une juridiction.", detail="L'envoi réel du dossier à l'autorité judiciaire se fait hors système (voir « À confirmer »).", s="Transmise (REFERRED)"),
        dict(a=CH, k="end", t="Clôture puis archivage : une affaire clôturée est en lecture seule ; l'archivage exige un droit distinct.", detail="Statut final : Archivée (ARCHIVED).", s="Clôturée → Archivée"),
    ],
    rules=[
        "Le brouillon n'est visible que dans le périmètre du commissariat ; seul un brouillon, une plainte enregistrée ou en examen peut encore être modifiée.",
        "Les transitions de statut sont fixes : Brouillon → Enregistrée → En examen → Affectée → Convertie ; Clôturée et Rejetée sont possibles depuis Enregistrée, En examen ou Affectée ; Convertie, Clôturée et Rejetée sont définitives.",
        "Aucun enquêteur ne peut être affecté hors du périmètre de celui qui affecte.",
        "Toute action est inscrite au journal d'audit (qui, quand, avant/après).",
        "Une affaire marquée « sensible » n'est visible que de son équipe et des titulaires du droit « consulter les affaires sensibles ».",
    ],
    statuts=[("DRAFT","Brouillon","Saisie non soumise."),("REGISTERED","Enregistrée","Soumise ; en attente d'examen."),("UNDER_REVIEW","En examen","Examinée par le commissaire."),("ASSIGNED","Affectée","Confiée à un enquêteur."),("CONVERTED","Convertie","Transformée en affaire (définitif)."),("CLOSED","Clôturée","Classée avec motif (définitif)."),("REJECTED","Rejetée","Rejetée avec motif (définitif).")],
    statuts2=[("OPEN","Ouverte","Affaire créée sans responsable."),("ASSIGNED","Affectée","Responsable désigné."),("UNDER_INVESTIGATION","En enquête","Instruction en cours."),("PENDING_REVIEW","En attente d'examen","Soumise au contrôle du responsable."),("REFERRED","Transmise","Décision de transmission enregistrée."),("CLOSED","Clôturée","Issue enregistrée ; lecture seule."),("ARCHIVED","Archivée","Archivage (droit distinct).")],
    notifs=[
        ("Plainte enregistrée","Titulaires du droit « examiner les plaintes » du commissariat (sauf l'auteur)","Nouvelle plainte à examiner — CMP-… — titre"),
        ("Plainte affectée","L'enquêteur désigné","Plainte affectée à vous"),
        ("Plainte clôturée ou rejetée","L'enquêteur affecté, s'il y en a un","Plainte clôturée / rejetée — motif"),
        ("Conversion en affaire","Le responsable désigné","Nouvelle affaire qui vous est confiée"),
        ("Affaire créée sans responsable","Titulaires du droit « affecter les affaires » du commissariat","Nouvelle affaire en attente d'affectation"),
        ("Affaire soumise à examen","Titulaires du droit de clôture du commissariat","Affaire en attente d'examen du superviseur"),
        ("Changement de statut d'affaire","Le responsable de l'affaire (sauf l'auteur du changement)","Affaire — nouveau statut"),
        ("Tâche confiée","La personne désignée","Tâche affectée à vous"),
    ],
    screens=[("theme-complaints.png","Liste des plaintes (filtres, statuts, boutons)"),("theme-complaint-new.png","Formulaire de nouvelle plainte"),("theme-cases.png","Liste des affaires")],
    confirm=[
        "Qui, dans l'organisation, joue le rôle de « chef de service » entre l'agent d'accueil et le commissaire : le système n'a pas de rôle distinct, c'est le Commissaire (ou toute personne portant le droit « examiner ») qui examine et affecte.",
        "Les règles de transmission au parquet (délais, pièces obligatoires, forme du bordereau) : le système enregistre seulement la décision de transmission.",
        "La compétence territoriale exacte pour qu'une plainte soit reçue ailleurs que dans le commissariat du lieu des faits.",
    ],
    gaps=[
        "Procès-verbaux d'enquête, déclarations et auditions : les écrans correspondants (Déclarations, Auditions, Enquêtes) sont prévus mais NON construits ; aujourd'hui les constats se consignent en notes d'affaire, tâches et pièces à conviction.",
        "Pas de génération de récépissé de plainte imprimable pour le plaignant.",
        "Pas de notification au plaignant (sauf via le portail public avec référence et code).",
    ],
))

# ---------------------------------------------------------------- B. MANDAT / PERSONNE RECHERCHÉE
WF.append(dict(
    id="B_mandat", letter="B", title="Circuit d'un mandat et d'un avis de recherche",
    intro="Le système distingue deux objets liés : le **mandat** (acte de l'autorité judiciaire enregistré dans le système : arrestation, perquisition, détention, citation, saisie) et l'**avis de recherche** (diffusion d'une personne recherchée aux unités). Un avis de nature « mandat de recherche » exige un mandat **actif** lié. La diffusion passe par le réseau d'**alertes nationales**.",
    modules=["Mandats", "Personnes recherchées", "Alertes nationales", "Contrôle biométrique", "Arrestations"],
    steps=[
        dict(a="Enquêteur", t="Mandats > Nouveau mandat : type (arrestation, perquisition, détention, citation, saisie, autre), personne visée, affaire liée, autorité émettrice (3 à 200 car.), référence de l'autorité, motifs (10 à 3000 car.), adresse visée, date d'expiration.", detail="Réception et enregistrement : le mandat émis par l'autorité judiciaire est saisi tel quel. Numéro WRT-AAAA-NNNNN.", s="Brouillon (DRAFT)"),
        dict(a=CH, k="decision", t="Vérifie l'authenticité et la validité (référence, autorité, motifs, date d'expiration non dépassée), puis approuve ou rejette. Le demandeur ne peut JAMAIS approuver ni rejeter son propre mandat ; un mandat déjà expiré ne s'approuve pas ; le rejet exige un motif.", detail="Droit requis : approuver les mandats (droit sensible).", s="Actif (ACTIVE) ou Rejeté (REJECTED)"),
        dict(a="Enquêteur", t="Personnes recherchées > Nouvel avis : personne, infraction, nature (mandat de recherche, citation à comparaître, personne disparue), niveau de danger, périmètre de diffusion (national, régional, local), base légale, autorité émettrice, motif, dernière localisation connue.", detail="Un avis « mandat de recherche » doit être lié à un mandat actif. Une personne ne peut avoir qu'un avis vivant à la fois. Numéro WNT-AAAA-NNNNN.", s="Brouillon (DRAFT)"),
        dict(a=CH, t="Vérification (quatre yeux) : contrôle les pièces et la base légale, ajoute ses observations, « Valider la vérification ». L'émetteur ne peut pas vérifier son propre avis.", detail="Base légale et autorité doivent être renseignées.", s="En attente d'approbation (PENDING_APPROVAL)"),
        dict(a="Direction générale / Commandement", k="decision", t="Approuve l'avis (autre personne que l'émetteur, vérification faite) : passage à Actif.", detail="Droit requis : approuver les avis de recherche (sensible).", s="Actif (ACTIVE)"),
        dict(a="Système", k="system", t="Diffuse automatiquement l'alerte aux unités du périmètre choisi, avec relances toutes les 5 minutes puis escalade (niveau 1 : unité parente et superviseurs régionaux ; niveau 2 : superviseurs nationaux).", detail="Délais : avis ordinaire 15 min (niveau 1) et 60 min (niveau 2) ; avis urgent (danger élevé/extrême) 5 et 15 min. Un bandeau rouge apparaît sur toutes les pages des agents concernés en moins de 20 secondes.", s="Alerte : en attente → remise → lue → acquittée"),
        dict(a="Agent", t="Reçoit l'alerte : « Marquer comme lu » puis « Acquitter ». Consulte l'avis depuis son commissariat (le périmètre de diffusion détermine ce qu'il voit).", detail="L'acquittement est horodaté et attribué à l'unité.", s="Alerte acquittée"),
        dict(a="Agent", t="Une correspondance peut apparaître : à la recherche (écran Personnes recherchées), au contrôle biométrique, ou lors d'un contrôle routier (plaque ou conducteur). Le système affiche « correspondance possible », jamais une certitude.", detail="Lors d'un contrôle routier, les titulaires du droit d'approuver les avis de recherche du commissariat sont avertis (« correspondance avec un avis de recherche »).", s="Correspondance signalée"),
        dict(a="Agent", k="decision", t="Vérification de l'identité par un humain : « Demander vérification », « Notifier le supérieur », « Signaler une erreur » (faux positif, mauvaise capture, contesté), ou confirmer/rejeter la correspondance.", detail="Toute action est datée et attribuée ; aucune décision automatique.", s="Contrôle : vérification demandée / supérieur notifié / confirmé / rejeté"),
        dict(a="Agent", t="Si l'arrestation a lieu : Arrestations > Nouvelle arrestation avec le mandat en autorité « Mandat » : le mandat doit être ACTIF, non expiré et viser la même personne.", detail="Voir circuit D bis (arrestation et garde à vue).", s="Arrestation enregistrée"),
        dict(a=CH, t="Enregistrement de l'exécution : le mandat est marqué « Exécuté » (droit « exécuter les mandats ») ; l'avis passe à Localisé ou Arrêté.", detail="Un mandat exécuté est définitif.", s="Mandat : Exécuté (EXECUTED) ; Avis : Arrêté (ARRESTED)"),
        dict(a=CH, k="end", t="Mise à jour du statut et retrait : un avis arrêté, annulé ou expiré cesse d'être actif ; son éventuelle publication sur le site public est retirée automatiquement.", detail="Suspension possible avec motif ; un avis expiré peut être réactivé.", s="Arrêté / Annulé / Expiré / Suspendu"),
    ],
    rules=[
        "Règle des quatre yeux : l'émetteur d'un avis ne peut ni le vérifier, ni l'approuver, ni le publier ; le demandeur d'un mandat ne peut ni l'approuver ni le rejeter.",
        "**Limite à connaître :** le système n'empêche pas que la même personne (autre que l'émetteur) vérifie PUIS approuve un avis : les droits de vérification, d'approbation et de publication sont portés par les mêmes profils (commissaire, délégué, commandement national, administrateur de la police).",
        "Statuts du mandat réellement gérés : Brouillon, Actif, Exécuté, Expiré, Annulé, Rejeté (et « En attente d'approbation » existe dans le modèle).",
        "Statuts de l'avis : Brouillon, En attente d'approbation, Actif, Localisé, Arrêté, Suspendu, Annulé, Expiré. Transitions fixes : un avis Arrêté ou Annulé est définitif.",
        "Le périmètre de diffusion (national, régional, local) ne peut être changé qu'avant l'approbation ; la nature, la base légale et l'autorité aussi.",
        "Le motif d'un avis reste interne ; seule une publication expresse (circuit H) expose un texte public.",
        "Une alerte n'établit jamais la culpabilité : vérification humaine avant toute action.",
    ],
    statuts=[("DRAFT","Brouillon","Mandat demandé, non approuvé."),("ACTIVE","Actif","Approuvé et exploitable."),("EXECUTED","Exécuté","Mis à exécution (définitif)."),("EXPIRED","Expiré","Date d'expiration dépassée."),("CANCELLED","Annulé","Annulé avec motif."),("REJECTED","Rejeté","Refusé avec motif.")],
    statuts2=[("DRAFT","Brouillon","Avis en préparation."),("PENDING_APPROVAL","En attente d'approbation","Vérifié, en attente de l'autorité."),("ACTIVE","Actif","Diffusé."),("LOCATED","Localisé","Personne localisée, pas encore arrêtée."),("ARRESTED","Arrêté","Personne arrêtée (définitif)."),("SUSPENDED","Suspendu","Diffusion suspendue avec motif."),("CANCELLED","Annulé","Retiré avec motif (définitif)."),("EXPIRED","Expiré","Date dépassée ; réactivable.")],
    notifs=[
        ("Avis approuvé (Actif)","Unités du périmètre de diffusion (alerte avec bandeau)","Alerte nationale — avis de recherche"),
        ("Alerte non prise en compte","Niveau 1 : unité parente et superviseurs régionaux ; niveau 2 : superviseurs nationaux","Escalade : avis du réseau national sans prise en compte"),
        ("Contrôle routier avec correspondance","Titulaires du droit d'approuver les avis, commissariat du contrôle","Contrôle routier : correspondance avec un avis de recherche"),
        ("Vérification biométrique demandée","Titulaires du droit de vérifier, commissariat concerné","Une vérification humaine est demandée"),
        ("Erreur signalée sur un contrôle","Titulaires du droit de vérifier","Une erreur a été signalée sur un contrôle"),
    ],
    screens=[("enf-1-warrant-form.png","Formulaire de demande de mandat"),("enf-2-warrant-draft.png","Mandat en brouillon"),("enf-3-warrant-active.png","Mandat actif après approbation"),("s1-1-formulaire-enqueteur.png","Création d'un avis de recherche"),("s1-5-verification-chef.png","Vérification par le chef"),("s1-6-approbation-commandement.png","Approbation par le commandement"),("s1-7-avis-actif-diffuse.png","Avis actif et diffusé"),("s2-2-abeche-alerte-recue.png","Alerte reçue dans une unité"),("s3-2-alerte-rouge-correspondance.png","Alerte rouge de correspondance"),("enf-8-warrant-executed.png","Mandat exécuté")],
    confirm=[
        "Qui, dans la hiérarchie, détient le pouvoir d'approuver un mandat et un avis de recherche : le système le lie au droit « approuver » (portés par les commandants) ; la décision organisationnelle finale revient à la Direction.",
        "Qui contrôle l'authenticité d'un mandat émis par un magistrat : le système n'a pas d'étape « authentification » séparée ; elle se fait par la vérification humaine avant approbation.",
        "Le périmètre de diffusion par défaut (national / régional / local) selon la gravité.",
        "Faut-il exiger que le vérificateur et l'approbateur d'un avis soient deux personnes différentes (le système ne l'impose pas aujourd'hui) ?",
    ],
    gaps=[
        "Pas d'interface avec les juridictions : le mandat est saisi à la main à partir du document reçu.",
        "Pas de génération de document de mandat imprimable.",
        "Les sources frontières, vidéosurveillance et interopérabilité sont affichées « non connecté » ; le contrôle biométrique est une simulation tant qu'aucun matériel réel n'est branché.",
    ],
))

# ---------------------------------------------------------------- C. MAIN COURANTE -> incidents
WF.append(dict(
    id="C_main_courante", letter="C", title="Circuit d'une main courante (module Incidents)",
    intro="**Le SIGPN-T ne comporte pas de module nommé « main courante ».** Le module le plus proche est **Incidents** : un incident est un évènement signalé (trouble, accident, vol, incendie, personne disparue…) enregistré avec date, lieu, gravité et personnes concernées. Ce circuit décrit l'incident tel que le système le gère ; son équivalence avec la main courante réglementaire est à confirmer par la hiérarchie.",
    modules=["Incidents", "Patrouilles", "Affaires"],
    steps=[
        dict(a="Agent", t="Reçoit l'information (appel, passant, patrouille) — étape hors système.", detail="Pour une patrouille, l'incident peut être rattaché à la patrouille en cours."),
        dict(a="Agent", t="Incidents > Nouvel incident : type (12 types), gravité (Faible, Moyenne, Élevée, Critique), titre (5 à 200 car.), description (10 à 8000 car.), lieu (3 à 300 car.), coordonnées facultatives, commissariat, patrouille éventuelle.", detail="Date et heure : l'heure de survenue et de signalement sont enregistrées. Numéro INC-AAAA-NNNNN. L'agent responsable est l'auteur du signalement.", s="Signalé (REPORTED)"),
        dict(a="Système", k="system", t="Pour un incident de gravité Élevée ou Critique, avertit les titulaires du droit de modifier les incidents du commissariat.", detail="Notification de type Alerte : « Incident critique / de gravité élevée signalé ».", s="Signalé"),
        dict(a="Agent", t="Ajoute les personnes concernées (plaignant, victime, témoin, suspect…) et les agents présents.", detail="Chaque rôle est précisé ; les notes sont limitées à 1000 caractères."),
        dict(a="Agent", t="Fait évoluer l'incident : En intervention, Sur place, Résolu, puis Clôturé, avec un rapport d'intervention : passer à « Résolu » exige un rapport d'au moins 10 caractères.", detail="Un incident clôturé ne se modifie plus.", s="En intervention → Sur place → Résolu → Clôturé"),
        dict(a=CH, k="decision", t="Si l'incident révèle une infraction à instruire : « Escalader en affaire » (titre, responsable, sensible ou non). Sinon, clôture.", detail="Création d'une affaire liée ; notifications d'affectation de l'affaire (circuit A).", s="Escaladé (ESCALATED)"),
        dict(a=CH, k="end", t="Consultation et suivi : liste filtrée, tableau de bord (nombre d'incidents sur la période, répartition par type, tendance). Clôture.", detail="Pas d'archivage séparé : un incident clôturé reste consultable dans le périmètre.", s="Clôturé (CLOSED)"),
    ],
    rules=[
        "Les statuts d'un incident : Signalé, En intervention, Sur place, Résolu, Escaladé, Clôturé.",
        "L'agent n'enregistre que dans son commissariat ; un commandant de périmètre plus large peut choisir un commissariat dans son périmètre.",
        "Les incidents sont soumis au périmètre territorial comme tous les enregistrements.",
    ],
    statuts=[("REPORTED","Signalé","Enregistré."),("RESPONDING","En intervention","Équipe dépêchée."),("ON_SCENE","Sur place","Équipe sur les lieux."),("RESOLVED","Résolu","Situation traitée."),("ESCALATED","Escaladé","Transformé en affaire."),("CLOSED","Clôturé","Terminé.")],
    notifs=[("Incident de gravité élevée ou critique","Titulaires du droit de modifier les incidents du commissariat (sauf l'auteur)","Incident critique / de gravité élevée signalé — INC-… — lieu")],
    screens=[("theme-dashboard.png","Tableau de bord (incidents récents, répartition)")],
    confirm=[
        "Si la main courante réglementaire doit être un registre distinct (chronologique, non modifiable, tenu par le poste) ou si le module Incidents suffit.",
        "Le délai de clôture, la signature du registre et l'obligation de transmission au chef de service.",
    ],
    gaps=[
        "Pas de module « Main courante » : amélioration recommandée si la hiérarchie confirme un registre dédié (chronologique, un numéro d'ordre par poste, visa du chef de poste).",
        "Pas de visa électronique du chef de poste sur chaque incident.",
        "Écran Incidents non capturé dans le dossier d'images actuel (voir annexe).",
    ],
))

# ---------------------------------------------------------------- D. INFRACTIONS (circulation + penal)
WF.append(dict(
    id="D_infractions", letter="D", title="Circuit des infractions",
    intro="Le système traite les infractions de deux façons. (1) **Infractions routières** : contrôle, procès-verbal (PV) électronique, amende, paiement et reçu — module complet. (2) **Infractions pénales** : elles sont portées par une **plainte** puis une **affaire** (catégorie d'infraction : homicide, vol, fraude, etc.). Il n'existe pas de catalogue pénal dédié ; le catalogue des infractions et les barèmes d'amende concernent la circulation.",
    modules=["Circulation (contrôles, PV, amendes)", "Plaintes", "Affaires", "Preuves"],
    steps=[
        dict(a="Agent", t="Constatation : contrôle routier ou constat d'une infraction. Circulation > Contrôles > Nouveau contrôle : conducteur, véhicule (plaque), lieu, résultat (conforme ou infraction).", detail="Numéro CTL-AAAA-NNNNN. Le système interroge les avis de recherche : si le conducteur ou la plaque correspondent, le commandement est averti."),
        dict(a="Agent", t="Identification de l'infraction : choix dans le catalogue des infractions (montant forfaitaire indiqué). Identification des personnes : fiche conducteur / véhicule.", detail="Certaines infractions ne sont pas justiciables de l'amende forfaitaire (délits) ; le système avertit alors les responsables de la gestion des amendes."),
        dict(a="Agent", t="Ajout des preuves : photos, vidéos, documents rattachés au contrôle.", detail="Droit « joindre des preuves »."),
        dict(a="Agent", t="Enregistrement et émission du PV électronique (numéro PV-AAAA-NNNNNN) ; une amende (AMD-…) est créée.", detail="Le PV est numéroté automatiquement.", s="PV émis (ISSUED) ; Amende : À payer (TO_PAY)"),
        dict(a="Chef de service / Commissaire", t="Transmission / affectation : le superviseur circulation passe en revue les contrôles et PV de l'unité ; il peut annuler un PV avec motif (l'agent émetteur est averti).", detail="Notification à l'agent : « PV annulé — motif »."),
        dict(a="Finance", t="Suivi : paiement au guichet ou en tournée (caisse de l'agent) ou en ligne (page publique « Payer une amende »). Reçu REC-AAAA-NNNNNN.", detail="Voir circuit I (recettes). Statut d'amende : En attente, À payer, Partiellement payée, Payée, Contestée, Annulée.", s="Payée (PAID)"),
        dict(a=CH, k="end", t="Validation et rapport final : tableau de bord circulation, statistiques, rapports de recettes (12 rapports) ; export autorisé aux titulaires du droit d'export.", detail="Chaque export est journalisé.", s="Rapports de recettes et statistiques"),
    ],
    rules=[
        "Un PV annulé ne peut plus être payé ; une amende peut être suspendue, contestée ou annulée par les titulaires du droit de gérer les amendes.",
        "Un paiement enregistré par erreur s'annule (droit distinct) sans effacement : il devient « annulé ».",
        "Le catalogue des infractions est consultable ; son activation/désactivation est un droit distinct.",
    ],
    statuts=[("ISSUED","PV émis","PV valide."),("CANCELLED","PV annulé","Annulé avec motif.")],
    statuts2=[("PENDING","En attente","Amende en préparation."),("TO_PAY","À payer","Montant dû."),("PARTIALLY_PAID","Partiellement payée","Paiement partiel."),("PAID","Payée","Soldée."),("CONTESTED","Contestée","Contestation enregistrée."),("CANCELLED","Annulée","Annulée.")],
    notifs=[("PV annulé","L'agent qui avait émis le PV","PV annulé — motif"),("Contrôle avec correspondance","Titulaires du droit d'approuver les avis","Correspondance avec un avis de recherche"),("PV comportant un délit","Titulaires du droit de gérer les amendes","PV comportant un délit (Interdiction d'arbitrage)")],
    screens=[("theme-traffic.png","Tableau de bord circulation")],
    confirm=["Les barèmes d'amendes forfaitaires et la liste des délits non arbitrables doivent être validés par la hiérarchie et la justice (catalogue chargé à partir de la source indiquée dans la documentation Infractions routières).","Pour les infractions pénales : un registre ou catalogue pénal dédié est-il attendu ?"],
    gaps=["Pas de catalogue d'infractions pénales : la qualification est la catégorie de l'affaire (20 catégories).","Pas de rapport final automatique d'infraction pénale (les rapports et statistiques généraux sont prévus mais NON construits)."],
))

# ---------------------------------------------------------------- E. PLAINTES EN COURS
WF.append(dict(
    id="E_plaintes_en_cours", letter="E", title="Circuit des plaintes en cours",
    intro="Ce circuit décrit le suivi quotidien des plaintes déjà enregistrées et des affaires ouvertes : qui voit quoi, qui relance, qui contrôle.",
    modules=["Plaintes", "Affaires", "Tâches", "Tableau de bord"],
    steps=[
        dict(a=CH, t="Le commissaire ouvre Plaintes et filtre par statut « Enregistrée » / « En examen » pour voir les plaintes en attente. Le tableau de bord indique le nombre de plaintes de la période et d'affaires ouvertes.", detail="Chiffres calculés dans le périmètre du commissariat ; un chiffre sans droit n'est jamais affiché."),
        dict(a=CH, t="Il examine et affecte (circuit A). Pour une affaire sans responsable, il reçoit la notification « en attente d'affectation » et affecte une équipe (responsable, enquêteur, superviseur, analyste, appui).", detail="Affecter à l'affaire : notification de l'intéressé."),
        dict(a="Enquêteur", t="Reçoit l'affectation, ouvre Mes tâches, met à jour l'avancement : tâches (à faire, en cours, bloquée, terminée, annulée) avec résultat.", detail="Une tâche confiée à un tiers avertit celui-ci."),
        dict(a="Enquêteur", t="Met à jour l'état de l'affaire (En enquête) et ajoute notes, personnes, pièces.", detail="Journal chronologique alimenté automatiquement."),
        dict(a=CH, t="Contrôle des résultats : examine l'affaire soumise (En attente d'examen) ; renvoie à l'enquête, transmet ou clôture.", detail="Voir règles de contrôle du circuit A."),
        dict(a="Délégué provincial", t="Supervise : voit les plaintes et affaires de toute sa province (périmètre régional) et les commissariats rattachés.", detail="Il ne voit pas les autres provinces."),
        dict(a="Direction générale", k="end", t="Supervision nationale : vue d'ensemble de toutes les affaires et plaintes (périmètre national).", detail="Aucune validation nationale n'est exigée par le système sur une affaire courante."),
    ],
    rules=["Une affaire clôturée ou archivée est en lecture seule.","Seule l'équipe de l'affaire ou un titulaire du droit d'affecter peut la modifier.","Tout changement d'équipe est notifié à la personne concernée."],
    statuts=[("OPEN","Ouverte","")],
    notifs=[("Affectation à une affaire","La personne affectée","Affecté à l'affaire en tant que …")],
    screens=[("theme-cases.png","Liste des affaires"),("theme-dashboard.png","Tableau de bord")],
    confirm=["Les délais de traitement attendus par type de plainte (aucun délai automatique n'existe dans le système)."],
    gaps=["Pas d'alerte automatique de plainte « en retard » ni de relance de l'enquêteur : amélioration recommandée."],
))

# ---------------------------------------------------------------- F. TRANSFERTS DE DOSSIERS
WF.append(dict(
    id="F_transferts", letter="F", title="Circuit des transferts de dossiers",
    intro="**Le SIGPN-T ne comporte pas de procédure formelle de transfert d'un dossier entre commissariats avec acceptation ou refus motivé du destinataire.** Ce que le système fait : (1) l'**affectation** d'une affaire à une autre personne de son périmètre ; (2) la **réaffectation du travail** quand un agent est muté ; (3) la **transmission** (statut Transmise) ; (4) le **transfert de garde** des pièces à conviction ; (5) la **mutation des agents** (circuit RH). Les transferts de dossiers entre commissariats, délégations et direction générale sont à confirmer et à construire.",
    modules=["Affaires", "Ressources humaines (mutations)", "Preuves"],
    steps=[
        dict(a=CH, t="Affectation interne : Affaire > Affecter : choix d'un utilisateur du périmètre et d'un rôle dans l'affaire (responsable, enquêteur, superviseur, analyste, appui).", detail="Interdit sur une affaire clôturée. L'intéressé est notifié. Entre services d'un même commissariat, c'est ce mécanisme qui s'applique."),
        dict(a="Système", k="system", t="Quand un agent est muté, le système signale aux titulaires du droit d'affecter de son ancienne unité : « Travail à réaffecter » (nombre d'affaires et de tâches ouvertes).", detail="Les affaires restent attribuées jusqu'à réaffectation manuelle."),
        dict(a=CH, t="Transmission : l'affaire peut passer au statut « Transmise » (issue : transmise au parquet ou transférée).", detail="C'est un enregistrement de décision, pas un envoi vers un autre service informatique."),
        dict(a="Agent", t="Pièces à conviction : « Transférer la garde » vers un autre agent ou un autre lieu de stockage, avec motif ; l'état de la pièce est consigné.", detail="Chaîne de conservation tracée."),
        dict(a="RH", t="Mutation d'agent : voir circuit J (proposition, examen RH, validation, exécution).", detail="Exécutée, la mutation clôt les accès de l'ancien poste et notifie les unités."),
        dict(a=CH, k="end", t="Pas de circuit « acceptation / refus motivé » entre commissariat, délégation provinciale, direction générale ou services centraux.", detail="À confirmer par la hiérarchie avant développement.", k2=None),
    ],
    rules=["Toute affectation est inscrite au journal d'audit et au journal de l'affaire.","Une affaire sensible reste invisible aux personnes hors équipe sans droit particulier.","La portée territoriale empêche d'affecter quelqu'un hors de son périmètre."],
    statuts=[("REFERRED","Transmise","Décision de transmission enregistrée.")],
    notifs=[("Affectation à une affaire","La personne affectée","Affecté à l'affaire en tant que …"),("Travail à réaffecter","Titulaires du droit d'affecter de l'ancienne unité","X a quitté l'unité : N affaire(s) et N tâche(s) ouvertes")],
    screens=[],
    confirm=["Souhaite-t-on un vrai transfert entre unités (demande, réception, acceptation ou refus motivé, traçabilité, notification) ? Qui accepte à chaque niveau (commissariat, délégation, direction générale, services centraux) ?","Cas des affaires qui dépassent la compétence territoriale du commissariat."],
    gaps=["AMÉLIORATION RECOMMANDÉE (non construite) : module de transfert avec statuts Demandé / Reçu / Accepté / Refusé (motif obligatoire), notification de l'expéditeur et du destinataire, historique, et restriction par niveau hiérarchique."],
))

# ---------------------------------------------------------------- G. VALIDATIONS
WF.append(dict(
    id="G_validations", letter="G", title="Circuit des validations",
    intro="Le système impose des **validations réelles**, reposant sur des droits précis et la règle des **quatre yeux** (jamais la même personne pour demander et valider). Ce tableau recense celles dont la preuve existe dans le code.",
    modules=["Approbations", "Mandats", "Avis de recherche", "Affaires", "Mutations", "Congés", "Paie", "Recettes"],
    steps=[
        dict(a="Administration", t="Demande de changement sensible (création de compte, changement de rôle, élévation d'habilitation, ajout d'un droit sensible à un rôle) : crée une demande d'approbation.", detail="Les titulaires du droit « décider les approbations » sont notifiés.", s="En attente (PENDING)"),
        dict(a=CH, k="decision", t="Un ou deux approbateurs de niveaux différents décident ; le demandeur ne peut pas approuver sa propre demande (contrainte de base de données).", detail="Les comptes sensibles exigent deux approbateurs.", s="Approuvée / Rejetée"),
        dict(a="Système", k="system", t="Exécute le changement approuvé et notifie le demandeur ; en cas d'échec : « Changement approuvé non exécuté ».", detail="", s="Exécutée (EXECUTED) ou Échec (FAILED)"),
        dict(a="Enquêteur", t="Mandats : demande → approbation par un autre → exécution/annulation.", detail="Voir circuit B."),
        dict(a="Enquêteur", t="Avis de recherche : émission → vérification → approbation → publication publique (chacune par une personne différente de l'émetteur).", detail="Voir circuit B."),
        dict(a="Enquêteur", t="Affaires : soumission à examen → contrôle du superviseur → clôture/archivage (droits distincts).", detail="Voir circuit A."),
        dict(a="RH", t="Mutations : proposition → examen RH → validation de l'autorité compétente → exécution. Congés : demande → approbation. Paie : demande → validation par une autre personne → export.", detail="Voir circuit J."),
        dict(a="Finance", t="Recettes : clôture de caisse → vérification → versement → examen → validation définitive → rapprochement.", detail="Voir circuit I."),
        dict(a=CH, k="end", t="Retour pour correction : possible pour l'affaire (retour à En enquête), la clôture de caisse/versement (justification demandée), les justificatifs ; un mandat ou avis refusé est rejeté avec motif et doit être recréé.", detail="Un avis refusé en brouillon ne se « renvoie » pas : il est annulé avec motif."),
    ],
    rules=["Le pouvoir de valider découle UNIQUEMENT des droits portés par le rôle ; aucun pouvoir n'est attribué hors de ces droits.","Les droits sensibles (20) ne sont utilisables que si le compte a l'habilitation suffisante ; certains imposent le second facteur.","Un administrateur technique n'a aucun droit de valider une opération de police."],
    statuts=[("PENDING","En attente","Demande déposée."),("APPROVED","Approuvée","Décision favorable ; en cours d'exécution."),("EXECUTED","Exécutée","Changement appliqué."),("REJECTED","Rejetée","Refusée."),("CANCELLED","Annulée","Retirée."),("EXPIRED","Expirée","Délai dépassé."),("FAILED","Échec","Exécution impossible.")],
    notifs=[("Nouvelle demande d'approbation","Titulaires du droit de décider (sauf le demandeur)","Une modification sensible attend votre décision"),("Demande rejetée","Le demandeur","Votre demande a été rejetée"),("Changement exécuté / non exécuté","Le demandeur","Changement approuvé exécuté / non exécuté")],
    screens=[("theme-approvals.png","Écran des approbations"),("aud-6-commander-todo.png","À traiter par le commandant"),("aud-7-second-approver.png","Second approbateur"),("aud-8-requests-executed.png","Demandes exécutées")],
    confirm=["Qui doit valider chaque acte organisationnel (le système reflète seulement les droits attribués aux rôles actuels)."],
    gaps=["Un tableau unique « mes validations en attente » couvrant mandats, avis, affaires et mutations n'existe pas : seul l'écran Approbations regroupe les demandes de changement d'accès."],
))

# ---------------------------------------------------------------- D bis ARRESTATION / GAV
WF.append(dict(
    id="Dbis_arrestation_gav", letter="D bis", title="Circuit d'une arrestation et d'une garde à vue",
    intro="L'arrestation est enregistrée avec son fondement (mandat, flagrant délit, ordre du tribunal, cause probable, autre). La garde à vue démarre avec une échéance légale fixée à 48 heures (constante du code, à confirmer) ; elle est surveillée par un journal, peut être prolongée par le commissaire et se termine par une issue.",
    modules=["Arrestations", "Gardes à vue", "Mandats", "Personnes"],
    steps=[
        dict(a="Agent", t="Arrestations > Nouvelle arrestation : personne, affaire éventuelle, fondement (Mandat, Flagrant délit, Ordre du tribunal, Cause probable, Autre), lieu, chefs d'accusation, circonstances, heure de lecture des droits, agent arrêtant.", detail="Sur mandat : le mandat doit être actif, non expiré et viser la même personne. L'heure ne peut pas être dans le futur. Numéro ARR-AAAA-NNNNN.", s="Enregistrée (RECORDED)"),
        dict(a="Agent de garde", t="Gardes à vue > Ouvrir : arrestation, numéro de cellule, notes médicales. Une seule garde à vue ouverte par arrestation ; début non antérieur à l'arrestation.", detail="Échéance légale = arrestation + 48 h. Numéro DET-AAAA-NNNNN.", s="Garde à vue active (ACTIVE) ; Arrestation : En garde à vue (IN_CUSTODY)"),
        dict(a="Agent de garde", t="Journal de surveillance : contrôle de bien-être, repas, médical, visite, avocat, transfert, incident, note.", detail="Impossible sur une garde à vue terminée."),
        dict(a=CH, k="decision", t="Prolongation (si nécessaire) : autorité qui autorise et motif obligatoires, au plus 48 h au-delà de l'échéance légale ; la nouvelle échéance doit dépasser l'ancienne. Droit distinct et sensible.", detail="L'agent de garde ne voit pas ce formulaire.", s="Prolongée (EXTENDED)"),
        dict(a=CH, t="Fin de garde à vue : issue (libéré sans charge, libéré sous caution, transféré au parquet, transféré à un autre poste, présenté au tribunal, médical, autre) et notes.", detail="L'arrestation suit l'issue ; le mandat éventuel est marqué exécuté.", s="Terminée (ENDED)"),
        dict(a=CH, k="end", t="Statut final de l'arrestation : Libérée (motif obligatoire ; impossible tant qu'une garde à vue est ouverte), Transférée ou Inculpée.", detail="États finaux définitifs. Les gardes à vue dont le délai est dépassé sont signalées dans la liste.", s="Libérée / Transférée / Inculpée"),
    ],
    rules=["Libérer une personne exige un motif et la fin préalable de la garde à vue.","Le délai de 48 h est une constante du code : à confirmer avec la Direction et le parquet.","Chaque étape est au journal d'audit."],
    statuts=[("RECORDED","Enregistrée","Arrestation saisie."),("IN_CUSTODY","En garde à vue","Personne gardée."),("RELEASED","Libérée","Fin sans suite (définitif)."),("TRANSFERRED","Transférée","Transfert (définitif)."),("CHARGED","Inculpée","Inculpation (définitif).")],
    statuts2=[("ACTIVE","Active","Garde à vue en cours."),("EXTENDED","Prolongée","Délai prolongé."),("ENDED","Terminée","Issue enregistrée.")],
    notifs=[("(aucune notification automatique)","—","Les gardes à vue en dépassement sont signalées dans la liste ; aucune notification n'est envoyée")],
    screens=[("enf-4-arrest-form.png","Formulaire d'arrestation"),("enf-5-arrest-detail.png","Fiche d'arrestation"),("enf-6-custody-detail.png","Garde à vue"),("enf-7-custody-extended.png","Prolongation"),("enf-8-warrant-executed.png","Mandat exécuté")],
    confirm=["Durée légale de la garde à vue et durée maximale de prolongation (48 h + 48 h dans le code).","Qui autorise une prolongation (champ libre « autorité » dans le formulaire)."],
    gaps=["Aucune notification automatique d'une garde à vue qui dépasse son délai : amélioration recommandée."],
))

# ---------------------------------------------------------------- H. PORTAIL PUBLIC
WF.append(dict(
    id="H_portail_public", letter="H", title="Circuit du portail public (citoyen)",
    intro="Le portail public permet à un citoyen, sans compte, de déposer une plainte ou un signalement, de suivre sa demande, de consulter l'annuaire des commissariats, les actualités et les avis de recherche **publiés**. Rien n'est jamais créé automatiquement comme plainte officielle : un agent habilité convertit le dépôt.",
    modules=["Portail public", "Gestion du site public"],
    steps=[
        dict(a="Citoyen", t="Dépose une plainte ou un signalement sur le portail (consentement obligatoire, pas de pièce jointe).", detail="Le système remet une référence et un code de suivi, affichés UNE SEULE fois ; le code est conservé haché.", s="Reçu (RECEIVED)"),
        dict(a="Chef de service / Commissaire", t="Gestionnaire du site public : Site public > Dépôts : ouvre, passe en examen, rédige la réponse publique.", detail="Droit « gérer les dépôts ».", s="En examen (IN_REVIEW)"),
        dict(a="Chef de service / Commissaire", k="decision", t="Convertit en plainte interne (choix du commissariat) ou rejette/clôt avec réponse publique.", detail="Aucune fiche Personne n'est créée à partir des données du déclarant.", s="Transmis (FORWARDED) / Clos / Rejeté"),
        dict(a="Citoyen", k="end", t="Suit sa demande avec la référence et le code : voit le statut et la réponse publique, jamais de données personnelles.", detail="Limites de débit par référence ; mêmes réponses pour un mauvais code et une référence inconnue.", s="Selon traitement"),
    ],
    rules=["Les dépôts sont traités par les profils portant le droit « traiter les dépôts du site public » : commissaires, délégués provinciaux, commandement national et administrateur de la police (pas de profil dédié).","Un avis de recherche n'est publié que sur validation expresse, par une personne autre que l'émetteur, s'il est actif, vérifié et d'un type publiable ; il est retiré automatiquement quand il n'est plus actif.","Un commissariat n'apparaît dans l'annuaire que si ses coordonnées publiques sont vérifiées.","L'indexation des moteurs de recherche est désactivée."],
    statuts=[("RECEIVED","Reçu","Dépôt enregistré."),("IN_REVIEW","En examen","Pris en charge."),("FORWARDED","Transmis","Converti en plainte interne."),("CLOSED","Clos","Traité."),("REJECTED","Rejeté","Refusé.")],
    notifs=[("(pas de notification interne dédiée)","—","Le gestionnaire consulte la file des dépôts")],
    screens=[("s5-1-accueil-public.png","Accueil du portail"),("s5-2-formulaire-plainte.png","Formulaire de plainte"),("s5-3-plainte-recue.png","Confirmation avec référence et code"),("s5-4-suivi-recu.png","Suivi"),("s5-5-bureau-public-file.png","File de traitement"),("s5-6-traitement-plainte.png","Traitement"),("s5-8-publication-expresse.png","Publication expresse"),("s5-9-avis-public-publie.png","Avis public publié")],
    confirm=["Réponses types et délais de réponse aux citoyens.","Opportunité d'un SMS ou courriel de confirmation (aujourd'hui absents)."],
    gaps=["Pas de CAPTCHA, de SMS ni de courriel de confirmation ; pas de pièce jointe."],
))

# ---------------------------------------------------------------- I. RECETTES / PAIEMENT
WF.append(dict(
    id="I_recettes", letter="I", title="Circuit des amendes, paiements et versements",
    intro="Du paiement d'une amende (au guichet, sur le terrain ou en ligne) jusqu'au rapprochement des versements à l'administration : l'agent a une **caisse**, la clôture est vérifiée, le **versement** est examiné puis validé, et des **écarts** sont justifiés.",
    modules=["Circulation", "Caisses et recettes", "Paiement en ligne"],
    steps=[
        dict(a="Agent", t="Ouvre sa caisse (Recettes > Caisses), encaisse le paiement d'une amende en espèces / électronique / mobile money : reçu REC-… édité.", detail="Un paiement saisi par erreur est annulé (jamais effacé) par un titulaire du droit d'annulation."),
        dict(a="Citoyen", t="Paiement en ligne : page publique « Payer une amende » → demande envoyée à l'opérateur → paiement enregistré seulement après confirmation authentifiée de l'opérateur.", detail="En développement : opérateur simulé ; Airtel écrit mais non essayé en réel ; Moov non construit."),
        dict(a="Agent", t="Clôture sa caisse : le montant à verser est calculé.", detail="Notification aux vérificateurs de versement : « Caisse clôturée »."),
        dict(a="Chef de service / Commissaire", t="Vérifie la clôture (chef d'unité).", detail=""),
        dict(a="Agent", t="Déclare le versement à l'administration (montant, mode).", detail="Notification : « Versement à vérifier »."),
        dict(a="Finance", k="decision", t="Examine le versement : accepte, rejette ou demande une justification ; puis validation définitive par un autre droit.", detail="Notification à l'agent : « Versement rejeté / Justification demandée »."),
        dict(a="Finance", k="end", t="Rapprochement et écarts : traités, justifiés puis validés/rejetés ; rapports de recettes (12) exportables.", detail="Chaque export est journalisé.", s="Versement validé"),
    ],
    rules=["Les droits sont séparés : encaisser, vérifier, examiner, valider, rapprocher, bloquer.","Un montant différent ou une amende déjà réglée sur un paiement en ligne place la demande en échec « remboursement requis » (remboursement manuel, hors application)."],
    statuts=[("OPEN","Caisse ouverte",""),("CLOSED","Caisse clôturée",""),("DEPOSITED","Versée",""),("VALIDATED","Validée",""),("BLOCKED","Bloquée","")],
    notifs=[("Caisse clôturée","Vérificateurs de versement de la province","Caisse clôturée : montant à verser"),("Versement déclaré","Vérificateurs de versement","Versement à vérifier"),("Versement rejeté / justification demandée","Les agents-caisse de l'unité","Versement rejeté / Justification demandée")],
    screens=[("theme-traffic.png","Tableau de bord circulation")],
    confirm=["Comptes bancaires/Trésor de versement, délais de versement, barème des écarts tolérés."],
    gaps=["Écrans de recettes non capturés dans le dossier d'images actuel."],
))

# ---------------------------------------------------------------- J. RH
WF.append(dict(
    id="J_mutations_rh", letter="J", title="Circuit des mutations et congés (ressources humaines)",
    intro="Le module Ressources humaines gère les dossiers des agents, les mutations, la rotation, la présence, les congés, la formation, la discipline et la paie. Les mutations suivent un circuit à quatre étapes avec séparation des fonctions.",
    modules=["Ressources humaines"],
    steps=[
        dict(a="RH", t="Proposition de mutation d'un agent du périmètre (ou proposition automatique issue de la rotation).", detail="Numéro MUT-AAAA-NNNNN.", s="Proposée (PROPOSED)"),
        dict(a="RH", k="decision", t="Examen par les RH : approuve (transmis à l'autorité compétente) ou rejette avec note ; le proposant est averti du rejet.", detail="Droit « examiner les mutations ».", s="Approuvée RH (HR_APPROVED) ou Rejetée"),
        dict(a="Direction générale", k="decision", t="Validation par l'autorité compétente, qui doit couvrir la structure d'origine ET la destination.", detail="Droit « valider les mutations ».", s="Approuvée (APPROVED) ou Rejetée"),
        dict(a="RH", t="Exécution : le poste change, les sessions de l'agent prennent fin, l'habilitation retombe au niveau standard, une approbation de rétablissement est créée pour la nouvelle unité.", detail="Notifications : agent (« Nouvelle affectation »), proposant (« Mutation exécutée »), unités départ et arrivée, responsables des affaires ouvertes (« Travail à réaffecter »).", s="Exécutée (EXECUTED)"),
        dict(a="Agent", k="end", t="Congés : l'agent (ou la personne habilitée) dépose une demande ; le supérieur approuve ou rejette ; notification du résultat.", detail="Types : annuel, exceptionnel, permission, autorisation d'absence, indisponibilité.", s="Demandé → Approuvé / Rejeté / Annulé"),
    ],
    rules=["Les données de paie et de discipline sont strictement confidentielles ; chaque lecture est journalisée.","Celui qui demande une modification de paie ne peut pas la valider."],
    statuts=[("PROPOSED","Proposée",""),("HR_APPROVED","Approuvée par les RH",""),("APPROVED","Approuvée par l'autorité",""),("EXECUTED","Exécutée",""),("REJECTED","Rejetée",""),("CANCELLED","Annulée","")],
    notifs=[("Mutation à examiner","Titulaires du droit d'examen RH","Transfert à examiner"),("Mutation rejetée","Le proposant","Transfert rejeté"),("Nouvelle affectation","L'agent muté","Nouvelle affectation"),("Demande de congé","Titulaires du droit d'approuver les congés","Demande de congé à décider"),("Résultat de congé","Le demandeur","Demande de congé approuvée / rejetée"),("Rotation","Titulaires des droits RH","Agents bientôt éligibles à la rotation")],
    screens=[],
    confirm=["Les durées de rotation et les délais d'alerte sont des paramètres du système à valider."],
    gaps=["Écrans RH non capturés dans le dossier d'images actuel."],
))
