import type { ScopeLevel } from "@/generated/prisma/client";
import { PERMISSIONS, type Permission } from "@/server/rbac/permissions";

export type SystemRoleDef = {
  code: string;
  name: string;
  description: string;
  scopeLevel: ScopeLevel;
  requiresMfa: boolean;
  permissions: readonly Permission[];
};

const READ_OPERATIONAL: Permission[] = [
  "dashboard:view",
  "org:view",
  "officers:view",
  "persons:view",
  "wanted:view",
  "complaints:view",
  "cases:view",
  "investigations:view",
  "statements:view",
  "interviews:view",
  "transcripts:view",
  "evidence:view",
  "warrants:view",
  "arrests:view",
  "detention:view",
  "patrols:view",
  "incidents:view",
  "operations:view",
  "vehicles:view",
  "maintenance:view",
  "documents:view",
  "reports:view",
  "apikeys:manage_own",
];

/** Read access to the traffic module (controls, PV, fines, drivers, vehicles, catalogue, dashboard). */
const TRAFFIC_READ: Permission[] = ["traffic:view", "traffic:drivers_view", "traffic:vehicles_view", "traffic:violations_view", "traffic:dashboard"];
/** Supervision of traffic enforcement: cancel a PV, manage fine status, export. */
const TRAFFIC_SUPERVISION: Permission[] = [...TRAFFIC_READ, "traffic:ticket_cancel", "traffic:fine_manage", "traffic:export"];
/** Field enforcement: record controls and issue PV, keep drivers and vehicles up to date. */
const TRAFFIC_FIELD: Permission[] = [...TRAFFIC_READ, "traffic:control_create", "traffic:evidence_upload", "traffic:drivers_manage", "traffic:vehicles_manage"];
const TRAFFIC_ALL: Permission[] = [...TRAFFIC_SUPERVISION, ...TRAFFIC_FIELD, "traffic:payment_record", "traffic:payment_void", "traffic:catalog_manage"];

const READ_ALL: Permission[] = [...READ_OPERATIONAL, "statistics:view", "users:view", "roles:view", "permissions:view", "cases:view_sensitive", "documents:view_confidential", "biometric:history_view", ...TRAFFIC_READ];

const INVESTIGATIVE_WRITE: Permission[] = [
  "persons:create",
  "persons:update",
  "wanted:create",
  "wanted:update",
  "wanted:status",
  "complaints:create",
  "complaints:update",
  "cases:create",
  "cases:update",
  "investigations:manage",
  "statements:create",
  "statements:finalize",
  "interviews:manage",
  "transcripts:review",
  "evidence:create",
  "evidence:update",
  "evidence:transfer",
  "warrants:create",
  "arrests:create",
  "arrests:update",
  "incidents:create",
  "incidents:update",
  "documents:upload",
  "reports:generate",
];

const COMMAND: Permission[] = [
  "complaints:review",
  "complaints:assign",
  "complaints:convert",
  "complaints:close",
  "cases:assign",
  "cases:close",
  "cases:view_sensitive",
  "investigations:review",
  "transcripts:approve",
  "wanted:approve",
  "wanted:publish",
  "wanted:export",
  "warrants:approve",
  "warrants:cancel",
  "operations:manage",
  "operations:approve",
  "patrols:manage",
  "detention:manage",
  "detention:extend",
  "documents:view_confidential",
  "reports:export",
  "statistics:view",
  "officers:manage",
  // Account administration inside the commander's own scope (station/region). The scope guard and the
  // privilege-escalation guard (cannot grant permissions one does not hold) bound these.
  "users:view",
  "users:create",
  "users:update",
  "users:manage_status",
  "users:reset_password",
  "users:manage_sessions",
];

export const SYSTEM_ROLES: readonly SystemRoleDef[] = [
  {
    code: "SUPER_ADMIN",
    name: "System Administrator",
    description: "Full access to every module, including security and system administration.",
    scopeLevel: "NATIONAL",
    requiresMfa: true,
    permissions: PERMISSIONS,
  },
  {
    code: "NATIONAL_COMMANDER",
    name: "National Commander",
    description: "National oversight: reads everything, approves warrants, wanted notices, operations and reports.",
    scopeLevel: "NATIONAL",
    requiresMfa: true,
    permissions: [...READ_ALL, ...COMMAND, "cases:archive", "audit:view", ...TRAFFIC_SUPERVISION],
  },
  {
    code: "REGIONAL_COMMANDER",
    name: "Regional Commander",
    description: "Commands all stations of a region.",
    scopeLevel: "REGIONAL",
    requiresMfa: true,
    permissions: [...READ_ALL, ...INVESTIGATIVE_WRITE, ...COMMAND, "cases:archive", "warrants:execute", "org:manage", ...TRAFFIC_SUPERVISION, ...TRAFFIC_FIELD],
  },
  {
    code: "DEPARTMENTAL_COMMANDER",
    name: "Departmental Commander",
    description: "Commands the police structures of one administrative department.",
    scopeLevel: "DEPARTMENTAL",
    requiresMfa: true,
    permissions: [...READ_ALL, ...INVESTIGATIVE_WRITE, ...COMMAND, "warrants:execute", "vehicles:manage", "maintenance:manage", "evidence:manage_locations", ...TRAFFIC_SUPERVISION, ...TRAFFIC_FIELD],
  },
  {
    code: "STATION_COMMANDER",
    name: "Station Commander",
    description: "Commands a police station: reviews complaints, assigns cases, supervises investigations.",
    scopeLevel: "STATION",
    requiresMfa: true,
    permissions: [...READ_ALL, ...INVESTIGATIVE_WRITE, ...COMMAND, "warrants:execute", "vehicles:manage", "maintenance:manage", "evidence:manage_locations", ...TRAFFIC_SUPERVISION, ...TRAFFIC_FIELD],
  },
  {
    code: "INVESTIGATOR",
    name: "Investigator",
    description: "Leads investigations on assigned cases: persons, statements, interviews, evidence, warrants requests, arrests.",
    scopeLevel: "STATION",
    requiresMfa: false,
    permissions: [...READ_OPERATIONAL, ...INVESTIGATIVE_WRITE, "warrants:execute", "biometric:search_fingerprint", "biometric:search_face", "biometric:search_voice", "biometric:search_anpr", "biometric:verify", "biometric:history_view", ...TRAFFIC_READ],
  },
  {
    code: "DESK_OFFICER",
    name: "Desk / Duty Officer",
    description: "Front desk: registers complaints, persons and incidents.",
    scopeLevel: "STATION",
    requiresMfa: false,
    permissions: [...READ_OPERATIONAL, "persons:create", "persons:update", "complaints:create", "complaints:update", "incidents:create", "incidents:update", "documents:upload", "arrests:create", ...TRAFFIC_READ],
  },
  {
    code: "PATROL_OFFICER",
    name: "Patrol Officer",
    description: "Field officer: patrols and incident reporting.",
    scopeLevel: "STATION",
    requiresMfa: false,
    permissions: [...READ_OPERATIONAL, "patrols:manage", "incidents:create", "incidents:update", "persons:create", "arrests:create", "documents:upload", "biometric:search_anpr", "biometric:history_view", ...TRAFFIC_READ, "traffic:control_create", "traffic:evidence_upload"],
  },
  {
    code: "EVIDENCE_CUSTODIAN",
    name: "Evidence Custodian",
    description: "Manages the evidence room and chain of custody.",
    scopeLevel: "STATION",
    requiresMfa: true,
    permissions: [...READ_OPERATIONAL, "evidence:create", "evidence:update", "evidence:transfer", "evidence:release", "evidence:manage_locations", "documents:upload", "reports:generate"],
  },
  {
    code: "CUSTODY_OFFICER",
    name: "Custody Officer",
    description: "Manages detention cells and detainee welfare logs.",
    scopeLevel: "STATION",
    requiresMfa: false,
    permissions: [...READ_OPERATIONAL, "detention:manage", "arrests:update", "documents:upload"],
  },
  {
    code: "FLEET_MANAGER",
    name: "Fleet Manager",
    description: "Manages vehicles, maintenance and fuel for a region.",
    scopeLevel: "REGIONAL",
    requiresMfa: false,
    permissions: ["dashboard:view", "org:view", "officers:view", "vehicles:view", "vehicles:manage", "maintenance:view", "maintenance:manage", "patrols:view", "operations:view", "documents:view", "documents:upload", "reports:view", "reports:generate", "apikeys:manage_own"],
  },
  {
    code: "ANALYST",
    name: "Crime Analyst",
    description: "Read-only national analytics and reporting.",
    scopeLevel: "NATIONAL",
    requiresMfa: false,
    permissions: [...READ_ALL, "reports:generate", "reports:export", "traffic:export"],
  },
  {
    code: "AUDITOR",
    name: "Auditor",
    description: "Read-only access to all records and the audit log.",
    scopeLevel: "NATIONAL",
    requiresMfa: true,
    permissions: [...READ_ALL, "audit:view", "audit:export", "security:view"],
  },
  {
    code: "BIOMETRIC_OFFICER",
    name: "Biometric Officer",
    description: "Runs fingerprint, face, voice and ANPR searches and records investigator verification of matches.",
    scopeLevel: "STATION",
    requiresMfa: true,
    permissions: [...READ_OPERATIONAL, "biometric:search_fingerprint", "biometric:search_face", "biometric:search_voice", "biometric:search_anpr", "biometric:verify", "biometric:history_view"],
  },
  {
    code: "FORENSIC_OFFICER",
    name: "Forensic Officer",
    description: "Manages forensic evidence and chain of custody; enrolls biometric templates and runs fingerprint searches.",
    scopeLevel: "STATION",
    requiresMfa: true,
    permissions: [...READ_OPERATIONAL, "evidence:create", "evidence:update", "evidence:transfer", "evidence:manage_locations", "biometric:manage", "biometric:search_fingerprint", "biometric:history_view"],
  },
  {
    code: "PROSECUTOR",
    name: "Prosecutor",
    description: "Legal oversight: read-only access to cases, evidence and biometric activity, including sensitive and confidential records.",
    scopeLevel: "STATION",
    requiresMfa: true,
    permissions: [...READ_ALL],
  },
  {
    code: "POLICE_ADMIN",
    name: "Police Administrator",
    description: "National administration of the police information system: users, organization and every traffic function, without system security or backup settings.",
    scopeLevel: "NATIONAL",
    requiresMfa: true,
    permissions: [...READ_ALL, ...COMMAND, "cases:archive", "audit:view", "org:manage", ...TRAFFIC_ALL],
  },
  {
    code: "OFFICER",
    name: "Police Officer",
    description: "Police officer (OPJ): records traffic controls and PV, maintains driver and vehicle records, registers persons.",
    scopeLevel: "STATION",
    requiresMfa: false,
    permissions: [...READ_OPERATIONAL, "persons:create", "persons:update", "documents:upload", ...TRAFFIC_FIELD],
  },
  {
    code: "TRAFFIC_OFFICER",
    name: "Traffic Officer",
    description: "Traffic police officer: roadside controls, electronic PV, evidence photos, driver and vehicle records.",
    scopeLevel: "STATION",
    requiresMfa: false,
    permissions: ["dashboard:view", "org:view", "persons:view", "wanted:view", "incidents:view", "patrols:view", "apikeys:manage_own", ...TRAFFIC_FIELD],
  },
  {
    code: "TRAFFIC_CONTROL_AGENT",
    name: "Traffic Control Agent",
    description: "Roadside control agent: records controls and issues PV; reads driver and vehicle records but cannot edit them.",
    scopeLevel: "STATION",
    requiresMfa: false,
    permissions: ["dashboard:view", "org:view", "persons:view", "wanted:view", "apikeys:manage_own", ...TRAFFIC_READ, "traffic:control_create", "traffic:evidence_upload"],
  },
  {
    code: "TRAFFIC_SUPERVISOR",
    name: "Traffic Supervisor",
    description: "Supervises traffic enforcement for a unit: reviews controls and PV, cancels a PV, manages fine status, exports statistics.",
    scopeLevel: "STATION",
    requiresMfa: true,
    permissions: ["dashboard:view", "org:view", "officers:view", "persons:view", "wanted:view", "reports:view", "statistics:view", "apikeys:manage_own", ...TRAFFIC_SUPERVISION, "traffic:drivers_manage", "traffic:vehicles_manage"],
  },
  {
    code: "TRAFFIC_PAYMENT_MANAGER",
    name: "Payment & Finance Manager",
    description: "Records fine payments, issues receipts, voids payments recorded by mistake and follows collection statistics.",
    scopeLevel: "REGIONAL",
    requiresMfa: true,
    permissions: ["dashboard:view", "org:view", "reports:view", "apikeys:manage_own", ...TRAFFIC_READ, "traffic:payment_record", "traffic:payment_void", "traffic:fine_manage", "traffic:export"],
  },
  {
    code: "TRAFFIC_READONLY",
    name: "Traffic Read-only",
    description: "Consultation only: traffic controls, PV, fines, drivers, vehicles and the offence catalogue.",
    scopeLevel: "STATION",
    requiresMfa: false,
    permissions: ["dashboard:view", "org:view", "apikeys:manage_own", ...TRAFFIC_READ],
  },
];

/** Traffic permissions granted by default to each system role (applied once to already-seeded databases). */
export const TRAFFIC_DEFAULT_GRANTS: Record<string, readonly Permission[]> = Object.fromEntries(SYSTEM_ROLES.map((r) => [r.code, r.permissions.filter((p) => p.startsWith("traffic:"))]));

export const ROLE_CODES = SYSTEM_ROLES.map((r) => r.code);
