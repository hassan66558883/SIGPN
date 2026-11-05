/**
 * Permission catalog: the single source of truth for `module:action` codes.
 * The DB `Permission` table is synchronised from this list at seed/startup;
 * roles reference permissions by id, so administrators can edit role sets while the
 * codes stay type-safe in application code.
 */
export const PERMISSION_CATALOG = [
  // dashboard & analytics
  ["dashboard:view", "View the dashboard"],
  ["statistics:view", "View statistics and analytics"],
  // identity & access
  ["users:view", "View user accounts"],
  ["users:create", "Create user accounts"],
  ["users:update", "Update user accounts (profile, role, scope)"],
  ["users:manage_status", "Activate, suspend, disable, unlock accounts"],
  ["users:reset_password", "Issue password resets"],
  ["users:manage_sessions", "View and revoke other users' sessions"],
  ["roles:view", "View roles and their permissions"],
  ["roles:manage", "Create roles and edit their permission sets"],
  ["permissions:view", "View the permission catalog"],
  ["security:view", "View security centre (login attempts, sessions, locks)"],
  ["security:manage", "Manage security settings, force MFA reset, revoke API keys"],
  ["audit:view", "View the audit log"],
  ["audit:export", "Export the audit log"],
  ["system:settings", "Edit system settings"],
  ["system:backup", "Run and restore backups"],
  ["system:demo", "Load demonstration data"],
  // organization
  ["org:view", "View organizations, regions, stations, departments, ranks"],
  ["org:manage", "Manage organizations, regions, stations, departments, ranks"],
  ["officers:view", "View officers"],
  ["officers:manage", "Create/update officers and assignments"],
  // persons
  ["persons:view", "View persons"],
  ["persons:create", "Register persons"],
  ["persons:update", "Update persons, identifiers, relationships"],
  ["persons:merge", "Merge duplicate persons"],
  ["wanted:view", "View wanted persons"],
  ["wanted:create", "Create wanted notices"],
  ["wanted:approve", "Approve/cancel wanted notices"],
  ["wanted:update", "Update wanted notices"],
  ["wanted:status", "Change the status of a wanted notice (located, apprehended, etc.)"],
  ["wanted:publish", "Generate the public wanted notice"],
  ["wanted:export", "Export/print the public wanted notice"],
  // complaints
  ["complaints:view", "View complaints"],
  ["complaints:create", "Register complaints"],
  ["complaints:update", "Update complaints"],
  ["complaints:review", "Review complaints"],
  ["complaints:assign", "Assign complaints"],
  ["complaints:convert", "Convert complaints to cases"],
  ["complaints:close", "Close or reject complaints"],
  // cases
  ["cases:view", "View cases within scope"],
  ["cases:view_sensitive", "View cases flagged sensitive"],
  ["cases:create", "Open cases"],
  ["cases:update", "Update cases, add parties, notes, tasks"],
  ["cases:assign", "Assign investigators and supervisors"],
  ["cases:close", "Close cases with a disposition"],
  ["cases:archive", "Archive closed cases"],
  // investigation
  ["investigations:view", "View investigations"],
  ["investigations:manage", "Open and manage investigations, tasks, reports"],
  ["investigations:review", "Supervisor review of investigations and reports"],
  ["statements:view", "View statements"],
  ["statements:create", "Record statements"],
  ["statements:finalize", "Finalize or retract statements"],
  ["interviews:view", "View interviews"],
  ["interviews:manage", "Schedule and conduct interviews"],
  ["transcripts:view", "View transcripts"],
  ["transcripts:review", "Review/edit automated transcripts"],
  ["transcripts:approve", "Approve transcripts"],
  // evidence
  ["evidence:view", "View evidence"],
  ["evidence:create", "Register evidence"],
  ["evidence:update", "Update evidence descriptions"],
  ["evidence:transfer", "Transfer custody / check in-out"],
  ["evidence:release", "Return, release, destroy or archive evidence"],
  ["evidence:manage_locations", "Manage storage locations"],
  // warrants / arrests / detention
  ["warrants:view", "View warrants"],
  ["warrants:create", "Request warrants"],
  ["warrants:approve", "Approve or reject warrants"],
  ["warrants:execute", "Execute warrants"],
  ["warrants:cancel", "Cancel warrants"],
  ["arrests:view", "View arrests"],
  ["arrests:create", "Record arrests"],
  ["arrests:update", "Update arrests"],
  ["detention:view", "View detention records"],
  ["detention:manage", "Manage detention records and logs"],
  ["detention:extend", "Extend detention beyond legal limit with authority"],
  // operations
  ["patrols:view", "View patrols"],
  ["patrols:manage", "Plan and run patrols"],
  ["incidents:view", "View incidents"],
  ["incidents:create", "Report incidents"],
  ["incidents:update", "Update and close incidents"],
  ["operations:view", "View operations"],
  ["operations:manage", "Plan and execute operations"],
  ["operations:approve", "Approve operations"],
  // fleet
  ["vehicles:view", "View vehicles"],
  ["vehicles:manage", "Manage vehicles, assignments, fuel"],
  ["maintenance:view", "View maintenance"],
  ["maintenance:manage", "Manage maintenance records"],
  // documents & reports
  ["documents:view", "View and download documents"],
  ["documents:view_confidential", "View confidential/restricted documents"],
  ["documents:upload", "Upload documents and new versions"],
  ["documents:archive", "Archive documents"],
  ["reports:view", "View generated reports"],
  ["reports:generate", "Generate reports"],
  ["reports:export", "Export reports and data"],
  // biometric & forensic identification
  ["biometric:search_fingerprint", "Perform fingerprint verification/identification searches"],
  ["biometric:search_face", "Perform face verification/identification searches"],
  ["biometric:search_voice", "Perform voice verification/identification searches"],
  ["biometric:search_anpr", "Perform license-plate (ANPR) searches"],
  ["biometric:manage", "Enroll biometric templates (fingerprint/face/voice) for persons"],
  ["biometric:history_view", "View biometric search history"],
  ["biometric:verify", "Record investigator verification action on a biometric match"],
  // traffic offences and fines
  ["traffic:view", "View traffic controls, tickets (PV) and fines within scope"],
  ["traffic:control_create", "Record a traffic control and issue an electronic ticket (PV)"],
  ["traffic:evidence_upload", "Attach photos and evidence to a traffic control"],
  ["traffic:ticket_cancel", "Cancel a ticket (PV) with a reason"],
  ["traffic:fine_manage", "Manage fine status (on hold, contested, cancelled)"],
  ["traffic:payment_record", "Record a fine payment and issue the receipt"],
  ["traffic:payment_void", "Void a payment recorded by mistake"],
  ["traffic:drivers_view", "View drivers and their history"],
  ["traffic:drivers_manage", "Create and update driver records"],
  ["traffic:vehicles_view", "View vehicles and their history"],
  ["traffic:vehicles_manage", "Create and update vehicle records and their documents"],
  ["traffic:violations_view", "View the offence catalogue and flat fine rates"],
  ["traffic:catalog_manage", "Activate or deactivate an offence of the catalogue"],
  ["traffic:dashboard", "View the traffic dashboard and statistics"],
  ["traffic:export", "Export traffic lists and statistics"],
  // field revenue: cash registers, deposits, reconciliation
  ["cash:collect", "Collect a fine payment in the field into one's own cash register"],
  ["cash:register", "Open, view and close one's own cash register and daily statement"],
  ["cash:view", "View cash registers, collected revenue, deposits and reconciliations within scope"],
  ["cash:verify_closure", "Verify the closing of an agent's cash register"],
  ["cash:deposit_create", "Declare the deposit of collected revenue to the administration"],
  ["cash:deposit_review", "Verify, accept, reject or ask for a justification on a deposit"],
  ["cash:deposit_validate", "Definitively validate a deposit"],
  ["cash:reconcile", "Manage reconciliations and process cash discrepancies"],
  ["cash:reports", "View and export financial revenue reports and the revenue dashboard"],
  ["cash:block", "Block or unblock an agent's cash register"],
  // human resources (dossiers, career)
  ["hr:view", "View HR dossiers and career history within scope"],
  ["hr:manage", "Edit the HR dossier of an officer (identity, corps, administrative data)"],
  ["hr:career", "Record career decisions: appointment, promotion, change of function, status, retirement"],
  // self-service
  ["apikeys:manage_own", "Create/revoke own API keys"],
] as const;

export type Permission = (typeof PERMISSION_CATALOG)[number][0];
export const PERMISSIONS: readonly Permission[] = PERMISSION_CATALOG.map(([code]) => code);
export const PERMISSION_SET = new Set<string>(PERMISSIONS);

export function isPermission(code: string): code is Permission {
  return PERMISSION_SET.has(code);
}

export function permissionModule(code: Permission): string {
  return code.split(":")[0];
}
