# -*- coding: utf-8 -*-
"""Libellés français des modules, droits et rôles (fidèles aux codes du système)."""

MOD = {
    "dashboard": "Tableau de bord", "statistics": "Statistiques", "users": "Utilisateurs", "roles": "Rôles", "permissions": "Droits", "security": "Sécurité", "audit": "Journal d'audit",
    "system": "Système", "org": "Organisation", "officers": "Agents (officiers)", "persons": "Personnes", "wanted": "Personnes recherchées", "biometric": "Biométrie", "intake": "Dépôts du site public",
    "public": "Site public", "alerts": "Alertes nationales", "complaints": "Plaintes", "cases": "Affaires", "investigations": "Enquêtes", "statements": "Déclarations", "interviews": "Auditions",
    "transcripts": "Transcriptions", "evidence": "Preuves", "warrants": "Mandats", "arrests": "Arrestations", "detention": "Gardes à vue", "patrols": "Patrouilles", "incidents": "Incidents",
    "operations": "Opérations", "vehicles": "Véhicules de service", "maintenance": "Maintenance", "documents": "Documents", "reports": "Rapports", "traffic": "Circulation", "cash": "Caisses et recettes",
    "hr": "Ressources humaines", "approvals": "Approbations", "apikeys": "Clés d'accès (API)", "records": "Export PDF",
}

# libellés précis pour chaque code (verbe d'action en français)
PERM = {
    "dashboard:view": "Voir le tableau de bord", "statistics:view": "Voir les statistiques",
    "users:view": "Voir les comptes", "users:create": "Créer un compte", "users:update": "Modifier un compte", "users:manage_status": "Activer, suspendre, désactiver, débloquer un compte",
    "users:reset_password": "Émettre une réinitialisation de mot de passe", "users:manage_sessions": "Voir et révoquer les sessions d'autrui",
    "roles:view": "Voir les rôles", "roles:manage": "Modifier les droits d'un rôle (sensible)", "permissions:view": "Voir le catalogue des droits",
    "security:view": "Voir la sécurité", "security:manage": "Gérer les paramètres de sécurité", "audit:view": "Consulter le journal d'audit", "audit:export": "Exporter le journal d'audit (sensible)",
    "system:settings": "Modifier les paramètres système", "system:backup": "Lancer et restaurer les sauvegardes (sensible)", "system:demo": "Charger les données de démonstration",
    "org:view": "Voir l'organisation", "org:manage": "Gérer la structure organisationnelle", "officers:view": "Voir les agents", "officers:manage": "Gérer les fiches agents",
    "persons:view": "Voir les personnes", "persons:create": "Créer une personne", "persons:update": "Modifier une personne", "persons:merge": "Fusionner des fiches en doublon",
    "wanted:view": "Voir les personnes recherchées", "wanted:create": "Créer un avis de recherche", "wanted:approve": "Approuver / annuler un avis (sensible)", "wanted:verify": "Vérifier un avis (quatre yeux)",
    "wanted:update": "Modifier un avis", "wanted:status": "Changer le statut d'un avis", "wanted:publish": "Publier un avis sur le site public (sensible)", "wanted:export": "Exporter l'avis public (sensible)",
    "biometric:control": "Contrôle d'identité biométrique (simulation)", "biometric:search_fingerprint": "Recherche par empreinte", "biometric:search_face": "Recherche par visage",
    "biometric:search_voice": "Recherche par voix", "biometric:search_anpr": "Recherche par plaque (ANPR)", "biometric:manage": "Enrôler des gabarits biométriques",
    "biometric:history_view": "Voir l'historique des recherches biométriques", "biometric:verify": "Enregistrer la vérification humaine d'une correspondance",
    "intake:view": "Voir les dépôts du site public", "intake:manage": "Traiter les dépôts du site public", "public:content": "Gérer le contenu du site public",
    "alerts:view": "Recevoir et lire les alertes de son unité", "alerts:ack": "Acquitter une alerte pour l'unité", "alerts:supervise": "Superviser la diffusion des alertes", "alerts:simulate": "Publier des alertes fictives (exercice)",
    "complaints:view": "Voir les plaintes", "complaints:create": "Enregistrer une plainte", "complaints:update": "Modifier une plainte", "complaints:review": "Examiner une plainte", "complaints:assign": "Affecter une plainte",
    "complaints:convert": "Convertir une plainte en affaire", "complaints:close": "Clôturer ou rejeter une plainte",
    "cases:view": "Voir les affaires", "cases:view_sensitive": "Voir les affaires sensibles (sensible)", "cases:create": "Ouvrir une affaire", "cases:update": "Modifier une affaire", "cases:assign": "Affecter une affaire",
    "cases:close": "Transmettre ou clôturer une affaire", "cases:archive": "Archiver une affaire",
    "investigations:view": "Voir les enquêtes et tâches", "investigations:manage": "Gérer les enquêtes", "investigations:review": "Contrôler les enquêtes",
    "statements:view": "Voir les déclarations", "statements:create": "Créer une déclaration", "statements:finalize": "Finaliser une déclaration",
    "interviews:view": "Voir les auditions", "interviews:manage": "Gérer les auditions", "transcripts:view": "Voir les transcriptions", "transcripts:review": "Relire une transcription", "transcripts:approve": "Approuver une transcription",
    "evidence:view": "Voir les preuves", "evidence:create": "Enregistrer une preuve", "evidence:update": "Modifier une preuve", "evidence:transfer": "Transférer la garde d'une preuve", "evidence:release": "Restituer / détruire une preuve",
    "evidence:manage_locations": "Gérer les lieux de stockage",
    "warrants:view": "Voir les mandats", "warrants:create": "Demander un mandat", "warrants:approve": "Approuver ou rejeter un mandat (sensible)", "warrants:execute": "Marquer un mandat exécuté", "warrants:cancel": "Annuler un mandat",
    "arrests:view": "Voir les arrestations", "arrests:create": "Enregistrer une arrestation", "arrests:update": "Changer le statut d'une arrestation",
    "detention:view": "Voir les gardes à vue", "detention:manage": "Ouvrir, surveiller et clore une garde à vue", "detention:extend": "Prolonger une garde à vue (sensible)",
    "patrols:view": "Voir les patrouilles", "patrols:manage": "Planifier et gérer les patrouilles", "incidents:view": "Voir les incidents", "incidents:create": "Signaler un incident", "incidents:update": "Modifier un incident",
    "operations:view": "Voir les opérations", "operations:manage": "Planifier les opérations", "operations:approve": "Approuver les opérations",
    "vehicles:view": "Voir les véhicules de service", "vehicles:manage": "Gérer les véhicules de service", "maintenance:view": "Voir la maintenance", "maintenance:manage": "Gérer la maintenance",
    "documents:view": "Voir les documents", "documents:view_confidential": "Voir les documents confidentiels (sensible)", "documents:upload": "Déposer des documents", "documents:archive": "Archiver des documents",
    "reports:view": "Voir les rapports", "reports:generate": "Produire des rapports", "reports:export": "Exporter rapports et données (sensible)",
    "traffic:view": "Voir contrôles, PV et amendes", "traffic:control_create": "Enregistrer un contrôle et émettre un PV", "traffic:evidence_upload": "Joindre des preuves à un contrôle", "traffic:ticket_cancel": "Annuler un PV",
    "traffic:fine_manage": "Gérer le statut des amendes", "traffic:payment_record": "Enregistrer un paiement d'amende et délivrer le reçu", "traffic:payment_void": "Annuler un paiement saisi par erreur",
    "traffic:drivers_view": "Voir les conducteurs", "traffic:drivers_manage": "Gérer les conducteurs", "traffic:vehicles_view": "Voir les véhicules (circulation)", "traffic:vehicles_manage": "Gérer les véhicules (circulation)",
    "traffic:violations_view": "Voir le catalogue des infractions", "traffic:catalog_manage": "Activer ou désactiver une infraction du catalogue", "traffic:dashboard": "Voir le tableau de bord circulation", "traffic:export": "Exporter listes et statistiques de circulation (sensible)",
    "cash:collect": "Encaisser une amende sur le terrain", "cash:register": "Ouvrir, voir et clore sa propre caisse", "cash:view": "Voir caisses, recettes, versements et rapprochements", "cash:verify_closure": "Vérifier la clôture d'une caisse",
    "cash:deposit_create": "Déclarer un versement", "cash:deposit_review": "Examiner un versement (accepter, rejeter, demander justification)", "cash:deposit_validate": "Valider définitivement un versement", "cash:reconcile": "Gérer les rapprochements et écarts",
    "cash:reports": "Voir et exporter les rapports de recettes", "cash:block": "Bloquer ou débloquer une caisse",
    "hr:view": "Voir les dossiers RH", "hr:manage": "Modifier le dossier RH d'un agent", "hr:career": "Enregistrer une décision de carrière", "hr:transfer_propose": "Proposer une mutation", "hr:transfer_review": "Examiner les mutations (RH)",
    "hr:transfer_validate": "Valider une mutation (autorité compétente)", "hr:auto_assign_config": "Paramétrer l'affectation automatique", "hr:attendance_record": "Enregistrer l'appel quotidien", "hr:leave_request": "Déposer une demande de congé",
    "hr:leave_approve": "Approuver ou rejeter un congé", "hr:training_manage": "Gérer les formations et attestations", "hr:discipline_view": "Voir les dossiers disciplinaires (sensible)", "hr:discipline_manage": "Instruire un dossier disciplinaire (sensible)",
    "hr:discipline_decide": "Décider d'une sanction (sensible)", "hr:document_issue": "Éditer des documents RH", "hr:pay_view": "Voir la paie (sensible)", "hr:pay_manage": "Demander des éléments de paie (sensible)", "hr:pay_validate": "Valider la paie (sensible)", "hr:pay_export": "Exporter la paie (sensible)",
    "records:export_pdf": "Exporter en PDF les listes et fiches (chefs de chaque niveau ; chaque export est journalisé)", "approvals:view": "Voir les demandes d'approbation", "approvals:decide": "Décider d'une demande d'approbation (sensible)", "apikeys:manage_own": "Gérer ses propres clés d'accès",
}

# traduction des rôles (code -> nom français, famille, supérieur hiérarchique habituel d'après les périmètres, destinataires)
ROLE = {
    "SUPER_ADMIN": ("Administrateur technique", "Administration et sécurité"),
    "SECURITY_ADMIN": ("Administrateur de sécurité", "Administration et sécurité"),
    "POLICE_ADMIN": ("Administrateur de la police (système d'information)", "Administration et sécurité"),
    "NATIONAL_COMMANDER": ("Commandement national (Direction générale)", "Commandement"),
    "REGIONAL_COMMANDER": ("Délégué provincial de police", "Commandement"),
    "DEPARTMENTAL_COMMANDER": ("Commandant de département (rôle dormant)", "Commandement"),
    "STATION_COMMANDER": ("Commissaire (chef de commissariat)", "Commandement"),
    "INVESTIGATOR": ("Enquêteur", "Investigation"),
    "DESK_OFFICER": ("Agent d'accueil / de permanence", "Terrain et accueil"),
    "PATROL_OFFICER": ("Agent de patrouille", "Terrain et accueil"),
    "OFFICER": ("Officier de police (désigné OPJ dans le système)", "Terrain et accueil"),
    "EVIDENCE_CUSTODIAN": ("Responsable des scellés et pièces à conviction", "Investigation"),
    "CUSTODY_OFFICER": ("Agent de garde à vue", "Terrain et accueil"),
    "FLEET_MANAGER": ("Gestionnaire du parc de véhicules", "Appui"),
    "ANALYST": ("Analyste criminel", "Contrôle et analyse"),
    "AUDITOR": ("Auditeur", "Contrôle et analyse"),
    "BIOMETRIC_OFFICER": ("Agent biométrie", "Investigation"),
    "FORENSIC_OFFICER": ("Agent de police technique et scientifique", "Investigation"),
    "PROSECUTOR": ("Magistrat du parquet (consultation)", "Contrôle et analyse"),
    "HR_DIRECTOR": ("Directeur des ressources humaines", "Ressources humaines"),
    "HR_PAYROLL": ("Gestionnaire de paie", "Ressources humaines"),
    "HR_PAYROLL_CONTROL": ("Contrôleur de paie", "Ressources humaines"),
    "HR_OFFICER": ("Agent du service des ressources humaines", "Ressources humaines"),
    "TRAFFIC_OFFICER": ("Agent de circulation", "Circulation et recettes"),
    "TRAFFIC_CONTROL_AGENT": ("Agent de contrôle routier", "Circulation et recettes"),
    "TRAFFIC_SUPERVISOR": ("Superviseur circulation", "Circulation et recettes"),
    "TRAFFIC_PAYMENT_MANAGER": ("Responsable financier / paiements", "Circulation et recettes"),
    "TRAFFIC_UNIT_HEAD": ("Chef d'unité (recettes)", "Circulation et recettes"),
    "TRAFFIC_READONLY": ("Consultation circulation", "Circulation et recettes"),
}
SCOPE = {"NATIONAL": "National (tout le pays)", "REGIONAL": "Provincial (sa province)", "DEPARTMENTAL": "Départemental (son département)", "STATION": "Commissariat (son unité et ses postes rattachés)", "OWN": "Ses propres enregistrements"}
VERB_ORDER = ["view", "create", "update", "manage", "assign", "review", "convert", "close", "approve", "verify", "execute", "cancel", "decide"]

def plabel(code):
    return PERM.get(code, code)
def mlabel(m):
    return MOD.get(m, m)
