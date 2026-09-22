/**
 * Centralized bilingual labels and semantic tones for enumerations. Safe for client components.
 */
import type { Locale } from "@/lib/i18n";

export type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "violet";
export type LabelDef = { label: string; tone: Tone };
export type LabelSource = { fr: string; en: string; tone: Tone };
export type LabelMap = Record<string, LabelSource>;

const def = (fr: string, en: string, tone: Tone = "neutral"): LabelSource => ({ fr, en, tone });

export const USER_STATUS: LabelMap = {
  PENDING: def("En attente", "Pending", "info"),
  ACTIVE: def("Actif", "Active", "success"),
  LOCKED: def("Verrouillé", "Locked", "warning"),
  SUSPENDED: def("Suspendu", "Suspended", "danger"),
  DISABLED: def("Désactivé", "Disabled", "neutral"),
};

export const SCOPE_LEVEL: LabelMap = {
  NATIONAL: def("National", "National", "violet"),
  REGIONAL: def("Provincial", "Provincial", "info"),
  DEPARTMENTAL: def("Départemental", "Departmental", "info"),
  STATION: def("Commissariat", "Station", "neutral"),
  OWN: def("Dossiers propres", "Own records", "neutral"),
};

export const STATION_STATUS: LabelMap = {
  ACTIVE: def("En activité", "Active", "success"),
  INACTIVE: def("Inactif", "Inactive", "neutral"),
  UNDER_CONSTRUCTION: def("En construction", "Under construction", "warning"),
  PLANNED: def("Planifié", "Planned", "info"),
};

export const COMMUNE_TYPE: LabelMap = {
  COMMUNE: def("Commune", "Commune"),
  SOUS_PREFECTURE: def("Sous-préfecture", "Sub-prefecture"),
  ARRONDISSEMENT: def("Arrondissement", "Arrondissement"),
};

export const LOCALITY_TYPE: LabelMap = {
  QUARTIER: def("Quartier", "Neighbourhood"),
  VILLAGE: def("Village", "Village"),
  CANTON: def("Canton", "Canton"),
  LOCALITE: def("Localité", "Locality"),
};

export const AUDIT_OUTCOME: LabelMap = {
  SUCCESS: def("Succès", "Success", "success"),
  DENIED: def("Refusé", "Denied", "danger"),
  FAILURE: def("Échec", "Failure", "warning"),
};

export const NOTIFICATION_KIND: LabelMap = {
  INFO: def("Info", "Info", "info"),
  ASSIGNMENT: def("Affectation", "Assignment", "violet"),
  DEADLINE: def("Échéance", "Deadline", "warning"),
  APPROVAL: def("Approbation", "Approval", "info"),
  ALERT: def("Alerte", "Alert", "danger"),
  SECURITY: def("Sécurité", "Security", "danger"),
};

export const PRIORITY: LabelMap = {
  LOW: def("Basse", "Low", "neutral"),
  NORMAL: def("Normale", "Normal", "info"),
  HIGH: def("Haute", "High", "warning"),
  URGENT: def("Urgente", "Urgent", "danger"),
};

export const SEVERITY: LabelMap = {
  LOW: def("Faible", "Low", "neutral"),
  MEDIUM: def("Moyenne", "Medium", "info"),
  HIGH: def("Élevée", "High", "warning"),
  CRITICAL: def("Critique", "Critical", "danger"),
};

export const STATION_TYPE: LabelMap = {
  HEADQUARTERS: def("Direction générale", "Headquarters", "violet"),
  PROVINCIAL_DIRECTION: def("Direction provinciale", "Provincial directorate", "violet"),
  DEPARTMENTAL_DIRECTION: def("Direction départementale", "Departmental directorate", "info"),
  CENTRAL_STATION: def("Commissariat central", "Central station", "info"),
  STATION: def("Commissariat", "Station", "neutral"),
  POST: def("Poste de police", "Police post", "neutral"),
  UNIT: def("Unité", "Unit", "neutral"),
  BRIGADE: def("Brigade", "Brigade", "neutral"),
  SPECIAL_UNIT: def("Unité spéciale", "Special unit", "warning"),
};

export const DEPARTMENT_TYPE: LabelMap = {
  COMMAND: def("Commandement", "Command", "violet"),
  INVESTIGATION: def("Enquêtes", "Investigation", "info"),
  PATROL: def("Patrouille", "Patrol", "neutral"),
  TRAFFIC: def("Circulation", "Traffic", "neutral"),
  FORENSICS: def("Police scientifique", "Forensics", "info"),
  INTELLIGENCE: def("Renseignement", "Intelligence", "warning"),
  CUSTODY: def("Garde à vue", "Custody", "neutral"),
  LOGISTICS: def("Logistique", "Logistics", "neutral"),
  ADMINISTRATION: def("Administration", "Administration", "neutral"),
  SPECIAL: def("Unité spéciale", "Special", "warning"),
};

export const RANK_CATEGORY: LabelMap = {
  COMMISSIONER: def("Commissaires", "Commissioners", "violet"),
  OFFICER: def("Officiers", "Officers", "info"),
  INSPECTOR: def("Inspecteurs", "Inspectors", "info"),
  NON_COMMISSIONED: def("Sous-officiers", "Non-commissioned", "neutral"),
  CONSTABLE: def("Gardiens de la paix", "Constables", "neutral"),
  CIVILIAN: def("Personnel civil", "Civilian", "neutral"),
};

export const GENDER: LabelMap = {
  MALE: def("Masculin", "Male"),
  FEMALE: def("Féminin", "Female"),
  OTHER: def("Autre", "Other"),
  UNKNOWN: def("Non renseigné", "Unknown"),
};

export const DUTY_STATUS: LabelMap = {
  ON_DUTY: def("En service", "On duty", "success"),
  OFF_DUTY: def("Repos", "Off duty", "neutral"),
  ON_LEAVE: def("En congé", "On leave", "info"),
  TRAINING: def("En formation", "Training", "info"),
  SUSPENDED: def("Suspendu", "Suspended", "danger"),
  RETIRED: def("Retraité", "Retired", "neutral"),
  DECEASED: def("Décédé", "Deceased", "neutral"),
};

export const TRAINING_STATUS: LabelMap = {
  PLANNED: def("Planifiée", "Planned", "info"),
  IN_PROGRESS: def("En cours", "In progress", "warning"),
  COMPLETED: def("Terminée", "Completed", "success"),
  FAILED: def("Échouée", "Failed", "danger"),
  CANCELLED: def("Annulée", "Cancelled", "neutral"),
};

export const MARITAL_STATUS: LabelMap = {
  SINGLE: def("Célibataire", "Single"),
  MARRIED: def("Marié(e)", "Married"),
  DIVORCED: def("Divorcé(e)", "Divorced"),
  WIDOWED: def("Veuf/veuve", "Widowed"),
  UNKNOWN: def("Non renseigné", "Unknown"),
};

export const IDENTIFIER_TYPE: LabelMap = {
  NATIONAL_ID: def("Carte nationale d'identité", "National ID"),
  PASSPORT: def("Passeport", "Passport"),
  DRIVER_LICENSE: def("Permis de conduire", "Driver licence"),
  VOTER_CARD: def("Carte d'électeur", "Voter card"),
  RESIDENCE_PERMIT: def("Carte de séjour", "Residence permit"),
  BIRTH_CERTIFICATE: def("Acte de naissance", "Birth certificate"),
  OTHER: def("Autre", "Other"),
};

export const RELATIONSHIP_TYPE: LabelMap = {
  SPOUSE: def("Conjoint(e)", "Spouse"),
  PARENT: def("Parent", "Parent"),
  CHILD: def("Enfant", "Child"),
  SIBLING: def("Frère / sœur", "Sibling"),
  RELATIVE: def("Membre de la famille", "Relative"),
  ASSOCIATE: def("Associé(e)", "Associate"),
  EMPLOYER: def("Employeur", "Employer"),
  EMPLOYEE: def("Employé(e)", "Employee"),
  NEIGHBOUR: def("Voisin(e)", "Neighbour"),
  OTHER: def("Autre", "Other"),
};

export const OFFENSE_CATEGORY: LabelMap = {
  HOMICIDE: def("Homicide", "Homicide", "danger"),
  ASSAULT: def("Coups et blessures", "Assault", "danger"),
  SEXUAL_OFFENSE: def("Infraction sexuelle", "Sexual offence", "danger"),
  ROBBERY: def("Vol avec violence", "Robbery", "danger"),
  THEFT: def("Vol", "Theft", "warning"),
  BURGLARY: def("Cambriolage", "Burglary", "warning"),
  FRAUD: def("Escroquerie / fraude", "Fraud", "warning"),
  CORRUPTION: def("Corruption", "Corruption", "warning"),
  DRUG_OFFENSE: def("Stupéfiants", "Drug offence", "warning"),
  TRAFFICKING: def("Trafic (êtres humains, biens)", "Trafficking", "danger"),
  CYBERCRIME: def("Cybercriminalité", "Cybercrime", "info"),
  ARMS_OFFENSE: def("Armes", "Arms offence", "danger"),
  KIDNAPPING: def("Enlèvement", "Kidnapping", "danger"),
  DOMESTIC_VIOLENCE: def("Violence domestique", "Domestic violence", "danger"),
  TRAFFIC_OFFENSE: def("Infraction routière", "Traffic offence", "neutral"),
  PUBLIC_ORDER: def("Trouble à l'ordre public", "Public order", "neutral"),
  PROPERTY_DAMAGE: def("Dégradation de biens", "Property damage", "neutral"),
  MISSING_PERSON: def("Disparition", "Missing person", "info"),
  TERRORISM: def("Terrorisme", "Terrorism", "danger"),
  OTHER: def("Autre", "Other", "neutral"),
};

export const COMPLAINT_STATUS: LabelMap = {
  DRAFT: def("Brouillon", "Draft", "neutral"),
  REGISTERED: def("Enregistrée", "Registered", "info"),
  UNDER_REVIEW: def("En examen", "Under review", "warning"),
  ASSIGNED: def("Affectée", "Assigned", "violet"),
  CONVERTED: def("Convertie en affaire", "Converted to case", "success"),
  CLOSED: def("Clôturée", "Closed", "neutral"),
  REJECTED: def("Rejetée", "Rejected", "danger"),
};

export const CASE_STATUS: LabelMap = {
  OPEN: def("Ouverte", "Open", "info"),
  ASSIGNED: def("Affectée", "Assigned", "violet"),
  UNDER_INVESTIGATION: def("En enquête", "Under investigation", "warning"),
  PENDING_REVIEW: def("En attente de revue", "Pending review", "warning"),
  REFERRED: def("Transmise", "Referred", "info"),
  CLOSED: def("Clôturée", "Closed", "success"),
  ARCHIVED: def("Archivée", "Archived", "neutral"),
};

export const CASE_DISPOSITION: LabelMap = {
  SOLVED: def("Élucidée", "Solved", "success"),
  UNSOLVED: def("Non élucidée", "Unsolved", "neutral"),
  UNFOUNDED: def("Sans fondement", "Unfounded", "neutral"),
  REFERRED_TO_PROSECUTION: def("Transmise au parquet", "Referred to prosecution", "info"),
  TRANSFERRED: def("Transférée", "Transferred", "info"),
  DISMISSED: def("Classée sans suite", "Dismissed", "neutral"),
};

export const PARTY_ROLE: LabelMap = {
  COMPLAINANT: def("Plaignant(e)", "Complainant", "info"),
  VICTIM: def("Victime", "Victim", "danger"),
  WITNESS: def("Témoin", "Witness", "neutral"),
  SUSPECT: def("Suspect(e)", "Suspect", "warning"),
  PERSON_OF_INTEREST: def("Personne d'intérêt", "Person of interest", "warning"),
  ACCUSED: def("Mis(e) en cause", "Accused", "danger"),
  OTHER: def("Autre", "Other", "neutral"),
};

export const PARTY_STATUS: LabelMap = {
  ACTIVE: def("Active", "Active", "info"),
  UNDER_INVESTIGATION: def("Sous enquête", "Under investigation", "warning"),
  CLEARED: def("Mis(e) hors de cause", "Cleared", "success"),
  CHARGED: def("Poursuivi(e)", "Charged", "danger"),
  REFERRED: def("Transmis(e)", "Referred", "info"),
  WITHDRAWN: def("Retiré(e)", "Withdrawn", "neutral"),
};

export const CASE_ROLE: LabelMap = {
  LEAD: def("Enquêteur principal", "Lead investigator", "violet"),
  INVESTIGATOR: def("Enquêteur", "Investigator", "info"),
  SUPERVISOR: def("Superviseur", "Supervisor", "warning"),
  ANALYST: def("Analyste", "Analyst", "neutral"),
  SUPPORT: def("Appui", "Support", "neutral"),
};

export const TASK_STATUS: LabelMap = {
  TODO: def("À faire", "To do", "neutral"),
  IN_PROGRESS: def("En cours", "In progress", "warning"),
  BLOCKED: def("Bloquée", "Blocked", "danger"),
  DONE: def("Terminée", "Done", "success"),
  CANCELLED: def("Annulée", "Cancelled", "neutral"),
};

export const INCIDENT_TYPE: LabelMap = {
  DISTURBANCE: def("Trouble / rixe", "Disturbance", "warning"),
  TRAFFIC_ACCIDENT: def("Accident de la circulation", "Traffic accident", "warning"),
  ASSAULT: def("Agression", "Assault", "danger"),
  THEFT: def("Vol", "Theft", "warning"),
  FIRE: def("Incendie", "Fire", "danger"),
  MEDICAL: def("Urgence médicale", "Medical emergency", "info"),
  SUSPICIOUS_ACTIVITY: def("Activité suspecte", "Suspicious activity", "info"),
  PUBLIC_ORDER: def("Ordre public", "Public order", "warning"),
  DOMESTIC: def("Violence domestique", "Domestic incident", "danger"),
  NOISE: def("Nuisance sonore", "Noise", "neutral"),
  MISSING_PERSON: def("Personne disparue", "Missing person", "violet"),
  OTHER: def("Autre", "Other", "neutral"),
};

export const INCIDENT_STATUS: LabelMap = {
  REPORTED: def("Signalé", "Reported", "info"),
  RESPONDING: def("Intervention en route", "Responding", "warning"),
  ON_SCENE: def("Sur les lieux", "On scene", "violet"),
  RESOLVED: def("Résolu", "Resolved", "success"),
  ESCALATED: def("Transmis en affaire", "Escalated to case", "danger"),
  CLOSED: def("Clos", "Closed", "neutral"),
};

export const PATROL_STATUS: LabelMap = {
  PLANNED: def("Planifiée", "Planned", "info"),
  ACTIVE: def("En cours", "Active", "success"),
  COMPLETED: def("Terminée", "Completed", "neutral"),
  CANCELLED: def("Annulée", "Cancelled", "danger"),
};

export const SHIFT: LabelMap = {
  MORNING: def("Matin (06h–14h)", "Morning (06:00–14:00)", "info"),
  AFTERNOON: def("Après-midi (14h–22h)", "Afternoon (14:00–22:00)", "warning"),
  NIGHT: def("Nuit (22h–06h)", "Night (22:00–06:00)", "violet"),
  CUSTOM: def("Horaire spécifique", "Custom hours", "neutral"),
};

export const VEHICLE_STATUS: LabelMap = {
  AVAILABLE: def("Disponible", "Available", "success"),
  IN_USE: def("En service", "In use", "info"),
  MAINTENANCE: def("En maintenance", "Maintenance", "warning"),
  OUT_OF_SERVICE: def("Hors service", "Out of service", "danger"),
  DECOMMISSIONED: def("Réformé", "Decommissioned", "neutral"),
};

export const VEHICLE_TYPE: LabelMap = {
  PATROL_CAR: def("Véhicule de patrouille", "Patrol car", "info"),
  MOTORCYCLE: def("Moto", "Motorcycle", "info"),
  VAN: def("Fourgon", "Van", "neutral"),
  PICKUP: def("Pick-up", "Pickup", "neutral"),
  TRUCK: def("Camion", "Truck", "neutral"),
  BUS: def("Bus", "Bus", "neutral"),
  UNMARKED: def("Banalisé", "Unmarked", "violet"),
  OTHER: def("Autre", "Other", "neutral"),
};

export const EVIDENCE_CATEGORY: LabelMap = {
  PHYSICAL: def("Physique", "Physical", "neutral"),
  DOCUMENT: def("Document", "Document", "neutral"),
  DIGITAL: def("Numérique", "Digital", "info"),
  BIOLOGICAL: def("Biologique", "Biological", "violet"),
  WEAPON: def("Arme", "Weapon", "danger"),
  NARCOTICS: def("Stupéfiants", "Narcotics", "danger"),
  VEHICLE: def("Véhicule", "Vehicle", "neutral"),
  CURRENCY: def("Numéraire", "Currency", "neutral"),
  AUDIO_VIDEO: def("Audio/Vidéo", "Audio/Video", "info"),
  OTHER: def("Autre", "Other", "neutral"),
};

export const EVIDENCE_STATUS: LabelMap = {
  COLLECTED: def("Collectée", "Collected", "info"),
  REGISTERED: def("Enregistrée", "Registered", "info"),
  STORED: def("Stockée", "Stored", "success"),
  TRANSFERRED: def("Transférée", "Transferred", "warning"),
  UNDER_EXAMINATION: def("En examen", "Under examination", "violet"),
  RETURNED: def("Restituée", "Returned", "neutral"),
  RELEASED: def("Libérée", "Released", "neutral"),
  DESTROYED: def("Détruite", "Destroyed", "danger"),
  ARCHIVED: def("Archivée", "Archived", "neutral"),
};

export const CUSTODY_ACTION: LabelMap = {
  COLLECTED: def("Collecte", "Collected", "info"),
  REGISTERED: def("Enregistrement", "Registered", "info"),
  STORED: def("Stockage", "Stored", "success"),
  TRANSFERRED: def("Transfert", "Transferred", "warning"),
  CHECKED_OUT: def("Sortie", "Checked out", "warning"),
  CHECKED_IN: def("Entrée", "Checked in", "success"),
  EXAMINED: def("Examen", "Examined", "violet"),
  RETURNED: def("Restitution", "Returned", "neutral"),
  RELEASED: def("Libération", "Released", "neutral"),
  DESTROYED: def("Destruction", "Destroyed", "danger"),
  ARCHIVED: def("Archivage", "Archived", "neutral"),
};

export const STORAGE_LOCATION_TYPE: LabelMap = {
  EVIDENCE_ROOM: def("Salle des pièces", "Evidence room", "neutral"),
  SAFE: def("Coffre-fort", "Safe", "violet"),
  REFRIGERATED: def("Chambre froide", "Refrigerated", "info"),
  VEHICLE_LOT: def("Fourrière", "Vehicle lot", "neutral"),
  LABORATORY: def("Laboratoire", "Laboratory", "info"),
  ARMORY: def("Armurerie", "Armory", "danger"),
  EXTERNAL: def("Externe", "External", "neutral"),
};

export const BIOMETRIC_TYPE: LabelMap = {
  FINGERPRINT: def("Empreinte digitale", "Fingerprint", "info"),
  FACE: def("Reconnaissance faciale", "Face", "violet"),
  VOICE: def("Reconnaissance vocale", "Voice", "info"),
  ANPR: def("Plaque d'immatriculation (LAPI)", "License plate (ANPR)", "neutral"),
};

export const BIOMETRIC_SEARCH_MODE: LabelMap = {
  VERIFY_1_1: def("Vérification 1:1", "1:1 verification", "neutral"),
  IDENTIFY_1_N: def("Identification 1:N", "1:N identification", "neutral"),
};

export const BIOMETRIC_SEARCH_RESULT: LabelMap = {
  NO_MATCH: def("Aucune correspondance", "No match", "neutral"),
  POTENTIAL_MATCH: def("Correspondance potentielle", "Potential match", "warning"),
  VERIFIED_MATCH: def("Correspondance vérifiée", "Verified match", "success"),
  ERROR: def("Erreur", "Error", "danger"),
};

export const BIOMETRIC_ACTION: LabelMap = {
  NONE: def("Aucune action", "No action", "neutral"),
  SENT_FOR_VERIFICATION: def("Transmis pour vérification", "Sent for verification", "info"),
  VERIFIED_BY_INVESTIGATOR: def("Vérifié par l'enquêteur", "Verified by investigator", "success"),
  REJECTED: def("Rejeté", "Rejected", "danger"),
  LINKED_TO_CASE: def("Rattaché à l'affaire", "Linked to case", "violet"),
};

export const FINGER_POSITION: LabelMap = {
  RIGHT_THUMB: def("Pouce droit", "Right thumb"),
  RIGHT_INDEX: def("Index droit", "Right index"),
  RIGHT_MIDDLE: def("Majeur droit", "Right middle"),
  RIGHT_RING: def("Annulaire droit", "Right ring"),
  RIGHT_LITTLE: def("Auriculaire droit", "Right little"),
  LEFT_THUMB: def("Pouce gauche", "Left thumb"),
  LEFT_INDEX: def("Index gauche", "Left index"),
  LEFT_MIDDLE: def("Majeur gauche", "Left middle"),
  LEFT_RING: def("Annulaire gauche", "Left ring"),
  LEFT_LITTLE: def("Auriculaire gauche", "Left little"),
  UNKNOWN: def("Non précisé", "Unspecified"),
};

export const LPR_STATUS: LabelMap = {
  NEW: def("Nouvelle", "New", "info"),
  REVIEWED: def("Examinée", "Reviewed", "warning"),
  LINKED_TO_CASE: def("Rattachée à l'affaire", "Linked to case", "violet"),
  DISMISSED: def("Classée sans suite", "Dismissed", "neutral"),
};

export const WANTED_STATUS: LabelMap = {
  DRAFT: def("Brouillon", "Draft", "neutral"),
  PENDING_APPROVAL: def("En attente d'approbation", "Pending approval", "info"),
  ACTIVE: def("Actif", "Active", "danger"),
  LOCATED: def("Localisé", "Located", "warning"),
  ARRESTED: def("Appréhendé", "Apprehended", "success"),
  CANCELLED: def("Annulé", "Cancelled", "neutral"),
  EXPIRED: def("Expiré", "Expired", "neutral"),
};

export const DANGER_LEVEL: LabelMap = {
  LOW: def("Standard", "Standard", "neutral"),
  MEDIUM: def("Prioritaire", "Priority", "info"),
  HIGH: def("Haute priorité", "High priority", "warning"),
  EXTREME: def("Critique", "Critical", "danger"),
};

export function labelOf(map: LabelMap, key: string | null | undefined, locale: Locale): LabelDef {
  if (!key) return { label: "—", tone: "neutral" };
  const d = map[key];
  if (!d) return { label: humanize(key), tone: "neutral" };
  return { label: d[locale] ?? d.fr, tone: d.tone };
}

export function humanize(code: string): string {
  return code
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function optionsOf(map: LabelMap, locale: Locale): { value: string; label: string }[] {
  return Object.entries(map).map(([value, d]) => ({ value, label: d[locale] ?? d.fr }));
}
