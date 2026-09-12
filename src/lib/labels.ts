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
