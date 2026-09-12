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
  REGIONAL: def("Régional", "Regional", "info"),
  STATION: def("Commissariat", "Station", "neutral"),
  OWN: def("Dossiers propres", "Own records", "neutral"),
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
  CENTRAL_STATION: def("Commissariat central", "Central station", "info"),
  STATION: def("Commissariat", "Station", "neutral"),
  POST: def("Poste de police", "Police post", "neutral"),
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
