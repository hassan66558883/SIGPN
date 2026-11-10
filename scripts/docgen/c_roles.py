# -*- coding: utf-8 -*-
"""Description française des 29 rôles, hiérarchie d'après les périmètres du système, et table droits -> documents / notifications."""

DESC = {
    "SUPER_ADMIN": "Administre la plate-forme technique (paramètres, sauvegardes, structure organisationnelle, catalogue des rôles). Ne détient AUCUN droit sur les données de police.",
    "SECURITY_ADMIN": "Gère les comptes, les sessions et les paramètres de sécurité, lit le journal d'audit. Ne détient aucune autorité opérationnelle de police.",
    "NATIONAL_COMMANDER": "Supervision nationale : lit l'ensemble des données, approuve les mandats, avis de recherche, opérations et rapports, décide des approbations sensibles.",
    "REGIONAL_COMMANDER": "Commande l'ensemble des commissariats d'une province (délégué provincial de police).",
    "DEPARTMENTAL_COMMANDER": "Commande les structures de police d'un département administratif (rôle conservé mais sans titulaire prévu par le décret).",
    "STATION_COMMANDER": "Commande un commissariat : examine les plaintes, affecte les affaires, contrôle les enquêtes, approuve les mandats et avis selon ses droits.",
    "INVESTIGATOR": "Mène les enquêtes sur les affaires qui lui sont affectées : personnes, preuves, demandes de mandat, arrestations.",
    "DESK_OFFICER": "Accueil : enregistre les plaintes, les personnes et les incidents.",
    "PATROL_OFFICER": "Agent de terrain : patrouilles et signalement d'incidents.",
    "EVIDENCE_CUSTODIAN": "Tient la salle des scellés et la chaîne de conservation des pièces à conviction.",
    "CUSTODY_OFFICER": "Tient les cellules de garde à vue et le journal de surveillance des gardés à vue.",
    "FLEET_MANAGER": "Gère les véhicules de service, leur maintenance et leur carburant pour une province.",
    "ANALYST": "Analyse nationale en lecture seule et production de rapports.",
    "AUDITOR": "Accès en lecture seule à tous les enregistrements et au journal d'audit.",
    "BIOMETRIC_OFFICER": "Exécute les recherches (empreinte, visage, voix, plaque) et enregistre la vérification humaine des correspondances.",
    "FORENSIC_OFFICER": "Police technique et scientifique : pièces, chaîne de conservation, enrôlement de gabarits et recherche d'empreintes.",
    "PROSECUTOR": "Contrôle juridique : consultation des affaires, preuves et activité biométrique, y compris les dossiers sensibles et confidentiels (lecture seule).",
    "POLICE_ADMIN": "Administration nationale du système d'information de la police : utilisateurs, organisation et toutes les fonctions de circulation, avec des droits de commandement.",
    "HR_DIRECTOR": "Direction des ressources humaines : dossiers RH et décisions de carrière (promotion, nomination, statut, retraite).",
    "HR_PAYROLL": "Paie : demande les modifications de barème et d'éléments de paie et génère les états mensuels ; ne peut ni valider ni exporter.",
    "HR_PAYROLL_CONTROL": "Contrôle de la paie : valide barèmes, éléments et états mensuels, les exporte vers les services financiers ; ne peut pas créer ce qu'il valide.",
    "HR_OFFICER": "Service des ressources humaines : tient les dossiers RH ; ne peut pas enregistrer de décision de carrière.",
    "OFFICER": "Officier de police (désigné « OPJ » dans la description du rôle) : enregistre les contrôles et PV routiers, tient les fiches conducteurs et véhicules, enregistre les personnes. Dans l'état actuel du système ce rôle n'a pas de droit de création de plainte ni de pouvoir judiciaire propre.",
    "TRAFFIC_OFFICER": "Agent de circulation : contrôles routiers, PV électronique, photos, fiches conducteurs et véhicules.",
    "TRAFFIC_CONTROL_AGENT": "Agent de contrôle routier : enregistre les contrôles et émet des PV ; lit les fiches mais ne les modifie pas.",
    "TRAFFIC_SUPERVISOR": "Supervise la circulation d'une unité : revoit contrôles et PV, annule un PV, gère les amendes, exporte les statistiques.",
    "TRAFFIC_PAYMENT_MANAGER": "Enregistre les paiements d'amendes, édite les reçus, annule un paiement saisi par erreur et suit les recettes.",
    "TRAFFIC_UNIT_HEAD": "Chef d'unité (recettes) : suit les recettes de ses agents, vérifie les clôtures journalières et contrôle les versements.",
    "TRAFFIC_READONLY": "Consultation seule : contrôles, PV, amendes, conducteurs, véhicules et catalogue des infractions.",
}

# (supérieur hiérarchique d'après le périmètre du système, destinataires de ses rapports)
HIER = {
    "SUPER_ADMIN": ("Direction générale pour l'usage ; aucun lien opérationnel", "Administrateur de sécurité et Direction générale (rapport technique)"),
    "SECURITY_ADMIN": ("Direction générale", "Direction générale (rapport d'audit)"),
    "NATIONAL_COMMANDER": ("Autorité de tutelle (Ministère) — hors système", "Hors système"),
    "REGIONAL_COMMANDER": ("Commandement national (Direction générale)", "Direction générale"),
    "DEPARTMENTAL_COMMANDER": ("Délégué provincial de police", "Délégué provincial de police"),
    "STATION_COMMANDER": ("Délégué provincial de police de la province", "Délégué provincial de police"),
    "INVESTIGATOR": ("Commissaire de son commissariat (superviseur de l'affaire)", "Commissaire et responsable d'affaire"),
    "DESK_OFFICER": ("Commissaire de son commissariat", "Commissaire (plaintes à examiner)"),
    "PATROL_OFFICER": ("Commissaire de son commissariat (ou superviseur de patrouille)", "Superviseur de patrouille et commissaire"),
    "EVIDENCE_CUSTODIAN": ("Commissaire de son commissariat", "Commissaire et responsable d'affaire"),
    "CUSTODY_OFFICER": ("Commissaire de son commissariat", "Commissaire"),
    "FLEET_MANAGER": ("Délégué provincial de police", "Délégué provincial"),
    "ANALYST": ("Direction générale", "Direction générale"),
    "AUDITOR": ("Direction générale / organe de contrôle", "Direction générale"),
    "BIOMETRIC_OFFICER": ("Commissaire de son commissariat", "Responsable d'affaire et commissaire"),
    "FORENSIC_OFFICER": ("Commissaire de son commissariat", "Responsable d'affaire et commissaire"),
    "PROSECUTOR": ("Autorité judiciaire (hors police)", "Hors système"),
    "POLICE_ADMIN": ("Direction générale", "Direction générale"),
    "HR_DIRECTOR": ("Direction générale", "Direction générale"),
    "HR_PAYROLL": ("Directeur des ressources humaines", "Contrôleur de paie"),
    "HR_PAYROLL_CONTROL": ("Directeur des ressources humaines", "Services financiers"),
    "HR_OFFICER": ("Directeur des ressources humaines", "Directeur des ressources humaines"),
    "OFFICER": ("Commissaire de son commissariat", "Commissaire"),
    "TRAFFIC_OFFICER": ("Superviseur circulation / Commissaire", "Superviseur circulation"),
    "TRAFFIC_CONTROL_AGENT": ("Superviseur circulation / Commissaire", "Superviseur circulation"),
    "TRAFFIC_SUPERVISOR": ("Commissaire de son commissariat", "Commissaire et délégué provincial"),
    "TRAFFIC_PAYMENT_MANAGER": ("Délégué provincial de police", "Services financiers (versements)"),
    "TRAFFIC_UNIT_HEAD": ("Commissaire de son commissariat", "Responsable financier de la province"),
    "TRAFFIC_READONLY": ("Commissaire de son commissariat", "—"),
}

# droit -> (famille de document, libellé)
DOC_CREATE = {
    "complaints:create": "Plainte", "cases:create": "Affaire", "warrants:create": "Demande de mandat", "wanted:create": "Avis de recherche", "arrests:create": "Fiche d'arrestation",
    "detention:manage": "Garde à vue et son journal", "incidents:create": "Incident", "patrols:manage": "Patrouille et son rapport", "evidence:create": "Fiche de pièce à conviction",
    "traffic:control_create": "Contrôle routier et procès-verbal (PV)", "traffic:payment_record": "Paiement d'amende et reçu", "cash:register": "Caisse et état journalier", "cash:deposit_create": "Déclaration de versement",
    "persons:create": "Fiche personne", "users:create": "Demande de création de compte", "hr:transfer_propose": "Proposition de mutation", "hr:leave_request": "Demande de congé", "hr:document_issue": "Document RH (attestation, ordre, note de service)",
    "hr:pay_manage": "Demande d'élément de paie / état mensuel", "statements:create": "Déclaration (écran non construit)", "documents:upload": "Document téléversé", "reports:generate": "Rapport (écran non construit)",
}
DOC_VIEW = {
    "complaints:view": "Plaintes", "cases:view": "Affaires", "cases:view_sensitive": "Affaires sensibles", "warrants:view": "Mandats", "wanted:view": "Avis de recherche", "arrests:view": "Arrestations",
    "detention:view": "Gardes à vue", "incidents:view": "Incidents", "patrols:view": "Patrouilles", "evidence:view": "Pièces à conviction", "persons:view": "Fiches personnes", "traffic:view": "Contrôles, PV et amendes",
    "traffic:drivers_view": "Conducteurs", "traffic:vehicles_view": "Véhicules", "cash:view": "Caisses, recettes et versements", "cash:reports": "Rapports de recettes", "audit:view": "Journal d'audit",
    "hr:view": "Dossiers RH", "hr:discipline_view": "Dossiers disciplinaires", "hr:pay_view": "Paie", "officers:view": "Fiches agents", "org:view": "Organisation", "alerts:view": "Alertes nationales", "intake:view": "Dépôts du site public",
}
DOC_SEND = {
    "complaints:assign": "Plainte vers un enquêteur", "complaints:convert": "Plainte vers une affaire", "cases:assign": "Affaire vers un membre de l'équipe", "cases:close": "Affaire vers le parquet (statut Transmise) ou clôture",
    "evidence:transfer": "Pièce à conviction vers un autre agent ou lieu", "hr:transfer_propose": "Mutation vers les RH", "cash:deposit_create": "Versement vers le responsable financier", "intake:manage": "Dépôt public converti en plainte interne",
    "detention:manage": "Garde à vue vers sa fin (parquet, tribunal, autre poste)", "arrests:update": "Arrestation vers transfert / inculpation",
}
DOC_VALID = {
    "complaints:review": "Examen d'une plainte", "warrants:approve": "Approbation / rejet d'un mandat", "wanted:verify": "Vérification d'un avis", "wanted:approve": "Approbation d'un avis", "wanted:publish": "Publication publique d'un avis",
    "cases:close": "Clôture d'une affaire", "cases:archive": "Archivage d'une affaire", "detention:extend": "Prolongation d'une garde à vue", "approvals:decide": "Décision sur une demande d'approbation",
    "cash:verify_closure": "Vérification de clôture de caisse", "cash:deposit_review": "Examen d'un versement", "cash:deposit_validate": "Validation d'un versement", "cash:reconcile": "Rapprochement et écarts",
    "hr:transfer_review": "Examen d'une mutation (RH)", "hr:transfer_validate": "Validation d'une mutation", "hr:leave_approve": "Décision sur un congé", "hr:discipline_decide": "Décision de sanction", "hr:pay_validate": "Validation de paie",
    "traffic:ticket_cancel": "Annulation d'un PV", "traffic:payment_void": "Annulation d'un paiement", "traffic:fine_manage": "Gestion du statut d'une amende", "biometric:verify": "Vérification humaine d'une correspondance biométrique", "transcripts:approve": "Approbation de transcription (écran non construit)",
}
# droits -> notification reçue
NOTIF = {
    "complaints:review": "Nouvelle plainte à examiner (commissariat)", "cases:assign": "Nouvelle affaire en attente d'affectation ; travail à réaffecter après une mutation", "cases:close": "Affaire en attente d'examen du superviseur",
    "approvals:decide": "Demande d'approbation à décider", "incidents:update": "Incident de gravité élevée ou critique signalé", "biometric:verify": "Vérification humaine demandée ; erreur signalée",
    "wanted:approve": "Contrôle routier : correspondance avec un avis de recherche", "traffic:fine_manage": "PV comportant un délit", "cash:deposit_review": "Caisse clôturée ; versement à vérifier", "cash:register": "Versement rejeté / justification demandée",
    "hr:transfer_review": "Mutation à examiner ; propositions automatiques de rotation", "hr:leave_approve": "Demande de congé à décider", "hr:view": "Agents bientôt éligibles à la rotation ; officier arrivant / partant",
    "users:reset_password": "Demande de réinitialisation de mot de passe reçue", "alerts:view": "Alertes nationales (avis de recherche) de son unité", "alerts:supervise": "Escalade : avis du réseau sans prise en compte",
}
# opérations « clés » dont l'absence est notable (droit -> phrase)
KEYOPS = [
    ("complaints:create", "Enregistrer une plainte"), ("complaints:review", "Examiner / affecter une plainte"), ("cases:create", "Ouvrir une affaire"), ("cases:close", "Transmettre ou clôturer une affaire"),
    ("cases:view_sensitive", "Voir les affaires sensibles"), ("warrants:create", "Demander un mandat"), ("warrants:approve", "Approuver un mandat"), ("wanted:create", "Créer un avis de recherche"),
    ("wanted:approve", "Approuver un avis de recherche"), ("wanted:publish", "Publier un avis sur le site public"), ("arrests:create", "Enregistrer une arrestation"), ("detention:manage", "Gérer une garde à vue"),
    ("detention:extend", "Prolonger une garde à vue"), ("evidence:create", "Enregistrer une pièce à conviction"), ("traffic:control_create", "Émettre un PV routier"), ("traffic:payment_record", "Enregistrer un paiement d'amende"),
    ("users:create", "Créer un compte"), ("roles:manage", "Modifier les droits d'un rôle"), ("approvals:decide", "Décider d'une approbation"), ("audit:view", "Consulter le journal d'audit"),
    ("hr:career", "Enregistrer une décision de carrière"), ("hr:discipline_view", "Voir les dossiers disciplinaires"), ("hr:pay_view", "Voir la paie"), ("system:backup", "Lancer des sauvegardes"),
]
# KPI du tableau de bord selon les droits
KPI = [("officers:view", "Nombre d'agents actifs"), ("incidents:view", "Incidents de la période, répartition par type, tendance, incidents récents"), ("cases:view", "Affaires ouvertes"), ("complaints:view", "Plaintes reçues sur la période"), ("wanted:view", "Avis de recherche actifs, avis récents"), ("traffic:dashboard", "Tableau de bord circulation (menu Circulation)"), ("cash:reports", "Tableau de bord des recettes")]
