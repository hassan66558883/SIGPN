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

const READ_ALL: Permission[] = [...READ_OPERATIONAL, "statistics:view", "users:view", "roles:view", "permissions:view", "cases:view_sensitive", "documents:view_confidential"];

const INVESTIGATIVE_WRITE: Permission[] = [
  "persons:create",
  "persons:update",
  "wanted:create",
  "wanted:update",
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
    permissions: [...READ_ALL, ...COMMAND, "cases:archive", "audit:view"],
  },
  {
    code: "REGIONAL_COMMANDER",
    name: "Regional Commander",
    description: "Commands all stations of a region.",
    scopeLevel: "REGIONAL",
    requiresMfa: true,
    permissions: [...READ_ALL, ...INVESTIGATIVE_WRITE, ...COMMAND, "cases:archive", "warrants:execute", "org:manage"],
  },
  {
    code: "STATION_COMMANDER",
    name: "Station Commander",
    description: "Commands a police station: reviews complaints, assigns cases, supervises investigations.",
    scopeLevel: "STATION",
    requiresMfa: true,
    permissions: [...READ_ALL, ...INVESTIGATIVE_WRITE, ...COMMAND, "warrants:execute", "vehicles:manage", "maintenance:manage", "evidence:manage_locations"],
  },
  {
    code: "INVESTIGATOR",
    name: "Investigator",
    description: "Leads investigations on assigned cases: persons, statements, interviews, evidence, warrants requests, arrests.",
    scopeLevel: "STATION",
    requiresMfa: false,
    permissions: [...READ_OPERATIONAL, ...INVESTIGATIVE_WRITE, "warrants:execute"],
  },
  {
    code: "DESK_OFFICER",
    name: "Desk / Duty Officer",
    description: "Front desk: registers complaints, persons and incidents.",
    scopeLevel: "STATION",
    requiresMfa: false,
    permissions: [...READ_OPERATIONAL, "persons:create", "persons:update", "complaints:create", "complaints:update", "incidents:create", "incidents:update", "documents:upload", "arrests:create"],
  },
  {
    code: "PATROL_OFFICER",
    name: "Patrol Officer",
    description: "Field officer: patrols and incident reporting.",
    scopeLevel: "STATION",
    requiresMfa: false,
    permissions: [...READ_OPERATIONAL, "patrols:manage", "incidents:create", "incidents:update", "persons:create", "arrests:create", "documents:upload"],
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
    permissions: [...READ_ALL, "reports:generate", "reports:export"],
  },
  {
    code: "AUDITOR",
    name: "Auditor",
    description: "Read-only access to all records and the audit log.",
    scopeLevel: "NATIONAL",
    requiresMfa: true,
    permissions: [...READ_ALL, "audit:view", "audit:export", "security:view"],
  },
];

export const ROLE_CODES = SYSTEM_ROLES.map((r) => r.code);
