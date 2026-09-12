/** Fictional demonstration accounts (created by the seed). All share DEMO_PASSWORD. */
export const DEMO_ACCOUNTS = [
  { username: "admin", roleCode: "SUPER_ADMIN", roleName: "System Administrator", firstName: "Aisha", lastName: "Mbaye", hint: "national · MFA required" },
  { username: "commander.national", roleCode: "NATIONAL_COMMANDER", roleName: "National Commander", firstName: "Daniel", lastName: "Okafor", hint: "national · MFA required" },
  { username: "commander.central", roleCode: "REGIONAL_COMMANDER", roleName: "Regional Commander", firstName: "Grace", lastName: "Abubakar", hint: "Central region · MFA required" },
  { username: "chief.cs1", roleCode: "STATION_COMMANDER", roleName: "Station Commander", firstName: "Samuel", lastName: "Kone", hint: "Central Station 1 · MFA required" },
  { username: "inv.diallo", roleCode: "INVESTIGATOR", roleName: "Investigator", firstName: "Fatou", lastName: "Diallo", hint: "Central Station 1" },
  { username: "inv.mensah", roleCode: "INVESTIGATOR", roleName: "Investigator", firstName: "Kwame", lastName: "Mensah", hint: "Central Station 1" },
  { username: "desk.cs1", roleCode: "DESK_OFFICER", roleName: "Desk / Duty Officer", firstName: "Amina", lastName: "Sow", hint: "Central Station 1" },
  { username: "patrol.cs1", roleCode: "PATROL_OFFICER", roleName: "Patrol Officer", firstName: "Joseph", lastName: "Traore", hint: "Central Station 1" },
  { username: "evidence.cs1", roleCode: "EVIDENCE_CUSTODIAN", roleName: "Evidence Custodian", firstName: "Mariam", lastName: "Bello", hint: "Central Station 1 · MFA required" },
  { username: "custody.cs1", roleCode: "CUSTODY_OFFICER", roleName: "Custody Officer", firstName: "Peter", lastName: "Adeyemi", hint: "Central Station 1" },
  { username: "fleet.central", roleCode: "FLEET_MANAGER", roleName: "Fleet Manager", firstName: "Ibrahim", lastName: "Sanogo", hint: "Central region" },
  { username: "analyst", roleCode: "ANALYST", roleName: "Crime Analyst", firstName: "Ruth", lastName: "Nakamura", hint: "national" },
  { username: "auditor", roleCode: "AUDITOR", roleName: "Auditor", firstName: "Omar", lastName: "Haddad", hint: "national · MFA required" },
] as const;
