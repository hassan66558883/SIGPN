# Police Management System — Database Documentation

_Generated from `prisma/schema.prisma` on 2026-09-12 by `scripts/gen-db-docs.ts`. Do not edit by hand._

- Engine: PostgreSQL 18 · ORM: Prisma 7 (pg adapter)
- Tables: **67** · Enums: **60**
- Migrations: `20260911165632_init`, `20260911165825_immutability_triggers`, `20260912102414_national_territory`

## Integrity rules

- All ids are `cuid` strings; business numbers (`CASE-2026-00001`) are unique and generated atomically from `DocumentSequence`.
- Critical records use soft delete (`deletedAt`) or status transitions; no hard deletes.
- `AuditLog` and `CustodyEvent` are append-only (PostgreSQL trigger `pms_forbid_mutation`).
- `CustodyEvent.hash` = SHA-256(prevHash + canonical row) — the chain is verifiable.
- Required relations use RESTRICT on delete (Prisma default); only per-user security rows cascade.


## 1. IDENTITY, ACCESS & SECURITY

### Organization

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| code | String | unique, FK → String |
| name | String | FK → String |
| shortName | String? | nullable, FK → String |
| description | String? | nullable, FK → String |
| isActive | Boolean | default true |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |
| regions | Region[] | 1→N relation |
| users | User[] | 1→N relation |

### Role

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| code | String | unique, FK → String |
| name | String | FK → String |
| description | String? | nullable, FK → String |
| scopeLevel | ScopeLevel | enum, default STATION |
| requiresMfa | Boolean | default false |
| isSystem | Boolean | default false |
| isActive | Boolean | default true |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |
| permissions | RolePermission[] | 1→N relation |
| users | User[] | 1→N relation |

### Permission

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| code | String | unique, FK → String |
| module | String | FK → String |
| action | String | FK → String |
| description | String? | nullable, FK → String |
| roles | RolePermission[] | 1→N relation |

Constraints/indexes: `@@index([module])`

### RolePermission

| Column | Type | Notes |
| ------ | ---- | ----- |
| roleId | String | FK → String |
| permissionId | String | FK → String |
| role | Role | FK → Role, cascade |
| permission | Permission | FK → Permission, cascade |

Constraints/indexes: `@@id([roleId, permissionId])`

### User

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| username | String | unique, FK → String |
| email | String | unique, FK → String |
| firstName | String | FK → String |
| lastName | String | FK → String |
| phone | String? | nullable, FK → String |
| passwordHash | String | FK → String |
| passwordChangedAt | DateTime | default now( |
| mustChangePassword | Boolean | default false |
| status | UserStatus | enum, default ACTIVE |
| failedLoginCount | Int | default 0 |
| lockedUntil | DateTime? | nullable |
| mfaEnabled | Boolean | default false |
| mfaSecretEnc | String? | nullable, FK → String |
| mfaEnrolledAt | DateTime? | nullable |
| lastLoginAt | DateTime? | nullable |
| lastLoginIp | String? | nullable, FK → String |
| roleId | String | FK → String |
| role | Role | FK → Role |
| organizationId | String? | nullable, FK → String |
| organization | Organization? | nullable, FK → Organization |
| regionId | String? | nullable, FK → String |
| region | Region? | nullable, FK → Region |
| adminDepartmentId | String? | nullable, FK → String |
| adminDepartment | AdminDepartment? | nullable, FK → AdminDepartment |
| stationId | String? | nullable, FK → String |
| station | Station? | nullable, FK → Station |
| officer | Officer? | nullable, FK → Officer |
| createdById | String? | nullable, FK → String |
| createdBy | User? | nullable, FK → User |
| createdUsers | User[] | 1→N relation |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |
| deletedAt | DateTime? | nullable |
| sessions | Session[] | 1→N relation |
| loginChallenges | LoginChallenge[] | 1→N relation |
| passwordResetTokens | PasswordResetToken[] | 1→N relation |
| issuedResetTokens | PasswordResetToken[] | 1→N relation |
| mfaRecoveryCodes | MfaRecoveryCode[] | 1→N relation |
| apiKeys | ApiKey[] | 1→N relation |
| notifications | Notification[] | 1→N relation |
| auditLogs | AuditLog[] | 1→N relation |
| passwordHistory | PasswordHistory[] | 1→N relation |
| personsCreated | Person[] | 1→N relation |
| complaintsCreated | Complaint[] | 1→N relation |
| complaintsAssigned | Complaint[] | 1→N relation |
| complaintsReviewed | Complaint[] | 1→N relation |
| casesCreated | Case[] | 1→N relation |
| casesLead | Case[] | 1→N relation |
| casesSupervised | Case[] | 1→N relation |
| caseAssignments | CaseAssignment[] | 1→N relation |
| caseAssignmentsMade | CaseAssignment[] | 1→N relation |
| caseEvents | CaseEvent[] | 1→N relation |
| caseNotes | CaseNote[] | 1→N relation |
| tasksAssigned | Task[] | 1→N relation |
| tasksCreated | Task[] | 1→N relation |
| investigationsLead | Investigation[] | 1→N relation |
| investigationsReviewed | Investigation[] | 1→N relation |
| reportsAuthored | InvestigationReport[] | 1→N relation |
| reportsReviewed | InvestigationReport[] | 1→N relation |
| statementsTaken | Statement[] | 1→N relation |
| interviewsLed | Interview[] | 1→N relation |
| transcriptsReviewed | Transcript[] | 1→N relation |
| transcriptsApproved | Transcript[] | 1→N relation |
| evidenceCollected | Evidence[] | 1→N relation |
| evidenceCustody | Evidence[] | 1→N relation |
| custodyFrom | CustodyEvent[] | 1→N relation |
| custodyTo | CustodyEvent[] | 1→N relation |
| custodyRecorded | CustodyEvent[] | 1→N relation |
| custodyAuthorized | CustodyEvent[] | 1→N relation |
| warrantsRequested | Warrant[] | 1→N relation |
| warrantsApproved | Warrant[] | 1→N relation |
| warrantsExecuted | Warrant[] | 1→N relation |
| arrestsRecorded | Arrest[] | 1→N relation |
| detentionsRecorded | Detention[] | 1→N relation |
| detentionLogs | DetentionLog[] | 1→N relation |
| wantedIssued | WantedPerson[] | 1→N relation |
| wantedApproved | WantedPerson[] | 1→N relation |
| incidentsReported | Incident[] | 1→N relation |
| patrolsCreated | Patrol[] | 1→N relation |
| operationsCreated | Operation[] | 1→N relation |
| documentsUploaded | Document[] | 1→N relation |
| documentVersions | DocumentVersion[] | 1→N relation |
| generatedReports | GeneratedReport[] | 1→N relation |
| settingsUpdated | SystemSetting[] | 1→N relation |
| backups | BackupRecord[] | 1→N relation |
| officerAssignments | OfficerAssignment[] | 1→N relation |
| maintenanceRecorded | MaintenanceRecord[] | 1→N relation |
| fuelLogs | FuelLog[] | 1→N relation |

Constraints/indexes: `@@index([roleId])`, `@@index([stationId])`, `@@index([regionId])`, `@@index([status])`, `@@index([lastName, firstName])`

### PasswordHistory

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| userId | String | FK → String |
| user | User | FK → User, cascade |
| passwordHash | String | FK → String |
| createdAt | DateTime | default now( |

Constraints/indexes: `@@index([userId, createdAt])`

### Session

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| userId | String | FK → String |
| user | User | FK → User, cascade |
| tokenHash | String | unique, FK → String |
| ipAddress | String? | nullable, FK → String |
| userAgent | String? | nullable, FK → String |
| mfaVerified | Boolean | default false |
| createdAt | DateTime | default now( |
| lastSeenAt | DateTime | default now( |
| expiresAt | DateTime |  |
| revokedAt | DateTime? | nullable |
| revokedReason | String? | nullable, FK → String |

Constraints/indexes: `@@index([userId, revokedAt])`, `@@index([expiresAt])`

### LoginChallenge

Short-lived second-factor challenge created after a correct password.

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| userId | String | FK → String |
| user | User | FK → User, cascade |
| tokenHash | String | unique, FK → String |
| ipAddress | String? | nullable, FK → String |
| userAgent | String? | nullable, FK → String |
| attempts | Int | default 0 |
| expiresAt | DateTime |  |
| consumedAt | DateTime? | nullable |
| createdAt | DateTime | default now( |

### MfaRecoveryCode

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| userId | String | FK → String |
| user | User | FK → User, cascade |
| codeHash | String | unique, FK → String |
| usedAt | DateTime? | nullable |
| createdAt | DateTime | default now( |

Constraints/indexes: `@@index([userId])`

### PasswordResetToken

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| userId | String | FK → String |
| user | User | FK → User, cascade |
| tokenHash | String | unique, FK → String |
| issuedById | String? | nullable, FK → String |
| issuedBy | User? | nullable, FK → User |
| expiresAt | DateTime |  |
| usedAt | DateTime? | nullable |
| createdAt | DateTime | default now( |

### LoginAttempt

Brute-force tracking: every login attempt (success or failure) by identifier and IP.

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| identifier | String | FK → String |
| ipAddress | String? | nullable, FK → String |
| success | Boolean |  |
| reason | String? | nullable, FK → String |
| createdAt | DateTime | default now( |

Constraints/indexes: `@@index([identifier, createdAt])`, `@@index([ipAddress, createdAt])`

### ApiKey

Personal API keys for REST clients (Bearer). Scoped to the owner's permissions.

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| userId | String | FK → String |
| user | User | FK → User, cascade |
| name | String | FK → String |
| keyPrefix | String | FK → String |
| keyHash | String | unique, FK → String |
| lastUsedAt | DateTime? | nullable |
| expiresAt | DateTime? | nullable |
| revokedAt | DateTime? | nullable |
| createdAt | DateTime | default now( |

Constraints/indexes: `@@index([userId])`


## 2. ORGANIZATION, TERRITORY & PERSONNEL

### Region

Province (kept as table "Region" for backward compatibility; presented as "Province" in the UI).

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| organizationId | String | FK → String |
| organization | Organization | FK → Organization |
| code | String | unique, FK → String |
| name | String | FK → String |
| capital | String? | nullable, FK → String |
| isActive | Boolean | default true |
| isDemo | Boolean | default false |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |
| adminDepartments | AdminDepartment[] | 1→N relation |
| stations | Station[] | 1→N relation |
| users | User[] | 1→N relation |
| persons | Person[] | 1→N relation |
| complaints | Complaint[] | 1→N relation |
| cases | Case[] | 1→N relation |
| incidents | Incident[] | 1→N relation |
| operations | Operation[] | 1→N relation |

### AdminDepartment

Administrative department (département) of a province.

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| regionId | String | FK → String |
| region | Region | FK → Region |
| code | String | unique, FK → String |
| name | String | FK → String |
| capital | String? | nullable, FK → String |
| isActive | Boolean | default true |
| isDemo | Boolean | default false |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |
| communes | Commune[] | 1→N relation |
| stations | Station[] | 1→N relation |
| users | User[] | 1→N relation |

Constraints/indexes: `@@index([regionId])`

### Commune

Commune, sous-préfecture or urban arrondissement of an administrative department.

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| adminDepartmentId | String | FK → String |
| adminDepartment | AdminDepartment | FK → AdminDepartment |
| code | String | unique, FK → String |
| name | String | FK → String |
| type | CommuneType | enum, default COMMUNE |
| isActive | Boolean | default true |
| isDemo | Boolean | default false |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |
| localities | Locality[] | 1→N relation |
| stations | Station[] | 1→N relation |

Constraints/indexes: `@@index([adminDepartmentId])`

### Locality

Quartier / village / localité (only when official data is available; otherwise demo).

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| communeId | String | FK → String |
| commune | Commune | FK → Commune |
| code | String? | unique, nullable, FK → String |
| name | String | FK → String |
| type | LocalityType | enum, default QUARTIER |
| isActive | Boolean | default true |
| isDemo | Boolean | default false |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |
| stations | Station[] | 1→N relation |

Constraints/indexes: `@@index([communeId])`

### Station

Police structure: commissariat, poste, unité, brigade, direction. Posts and units hang under a parent station.

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| regionId | String | FK → String |
| region | Region | FK → Region |
| adminDepartmentId | String? | nullable, FK → String |
| adminDepartment | AdminDepartment? | nullable, FK → AdminDepartment |
| communeId | String? | nullable, FK → String |
| commune | Commune? | nullable, FK → Commune |
| localityId | String? | nullable, FK → String |
| locality | Locality? | nullable, FK → Locality |
| parentId | String? | nullable, FK → String |
| parent | Station? | nullable, FK → Station |
| children | Station[] | 1→N relation |
| code | String | unique, FK → String |
| name | String | FK → String |
| type | StationType | enum, default STATION |
| status | StationStatus | enum, default ACTIVE |
| address | String? | nullable, FK → String |
| city | String? | nullable, FK → String |
| phone | String? | nullable, FK → String |
| email | String? | nullable, FK → String |
| latitude | Float? | nullable |
| longitude | Float? | nullable |
| commanderId | String? | unique, nullable, FK → String |
| commander | Officer? | nullable, FK → Officer |
| isActive | Boolean | default true |
| isDemo | Boolean | default false |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |
| departments | Department[] | 1→N relation |
| officers | Officer[] | 1→N relation |
| users | User[] | 1→N relation |
| complaints | Complaint[] | 1→N relation |
| cases | Case[] | 1→N relation |
| arrests | Arrest[] | 1→N relation |
| detentions | Detention[] | 1→N relation |
| incidents | Incident[] | 1→N relation |
| patrols | Patrol[] | 1→N relation |
| zones | Zone[] | 1→N relation |
| operations | Operation[] | 1→N relation |
| vehicles | Vehicle[] | 1→N relation |
| storageLocations | StorageLocation[] | 1→N relation |
| officerAssignments | OfficerAssignment[] | 1→N relation |
| documents | Document[] | 1→N relation |

Constraints/indexes: `@@index([regionId])`, `@@index([adminDepartmentId])`, `@@index([communeId])`, `@@index([parentId])`, `@@index([status])`

### Department

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| stationId | String | FK → String |
| station | Station | FK → Station |
| code | String | FK → String |
| name | String | FK → String |
| type | DepartmentType | enum, default INVESTIGATION |
| headId | String? | unique, nullable, FK → String |
| head | Officer? | nullable, FK → Officer |
| isActive | Boolean | default true |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |
| officers | Officer[] | 1→N relation |
| cases | Case[] | 1→N relation |
| officerAssignments | OfficerAssignment[] | 1→N relation |

Constraints/indexes: `@@unique([stationId, code])`

### Rank

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| code | String | unique, FK → String |
| name | String | FK → String |
| level | Int |  |
| category | RankCategory | enum, default CONSTABLE |
| isActive | Boolean | default true |
| officers | Officer[] | 1→N relation |
| assignments | OfficerAssignment[] | 1→N relation |

### Officer

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| badgeNumber | String | unique, FK → String |
| firstName | String | FK → String |
| lastName | String | FK → String |
| gender | Gender | enum, default UNKNOWN |
| dateOfBirth | DateTime? | nullable |
| phone | String? | nullable, FK → String |
| email | String? | nullable, FK → String |
| rankId | String | FK → String |
| rank | Rank | FK → Rank |
| stationId | String | FK → String |
| station | Station | FK → Station |
| departmentId | String? | nullable, FK → String |
| department | Department? | nullable, FK → Department |
| dutyStatus | DutyStatus | enum, default ON_DUTY |
| hiredAt | DateTime? | nullable |
| specialties | String? | nullable, FK → String |
| notes | String? | nullable, FK → String |
| userId | String? | unique, nullable, FK → String |
| user | User? | nullable, FK → User |
| isActive | Boolean | default true |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |
| deletedAt | DateTime? | nullable |
| commandsStation | Station? | nullable, FK → Station |
| headsDepartment | Department? | nullable, FK → Department |
| assignments | OfficerAssignment[] | 1→N relation |
| arrests | Arrest[] | 1→N relation |
| patrolsSupervised | Patrol[] | 1→N relation |
| patrolMembers | PatrolOfficer[] | 1→N relation |
| incidentOfficers | IncidentOfficer[] | 1→N relation |
| operationsCommanded | Operation[] | 1→N relation |
| teamLeads | OperationTeam[] | 1→N relation |
| teamMembers | OperationMember[] | 1→N relation |
| vehicleAssignments | VehicleAssignment[] | 1→N relation |
| fuelLogs | FuelLog[] | 1→N relation |

Constraints/indexes: `@@index([stationId])`, `@@index([departmentId])`, `@@index([lastName, firstName])`

### OfficerAssignment

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| officerId | String | FK → String |
| officer | Officer | FK → Officer |
| stationId | String | FK → String |
| station | Station | FK → Station |
| departmentId | String? | nullable, FK → String |
| department | Department? | nullable, FK → Department |
| rankId | String? | nullable, FK → String |
| rank | Rank? | nullable, FK → Rank |
| position | String? | nullable, FK → String |
| startDate | DateTime |  |
| endDate | DateTime? | nullable |
| reason | String? | nullable, FK → String |
| createdById | String? | nullable, FK → String |
| createdBy | User? | nullable, FK → User |
| createdAt | DateTime | default now( |

Constraints/indexes: `@@index([officerId, startDate])`


## 3. PERSONS

### Person

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| number | String | unique, FK → String |
| firstName | String | FK → String |
| lastName | String | FK → String |
| otherNames | String? | nullable, FK → String |
| gender | Gender | enum, default UNKNOWN |
| dateOfBirth | DateTime? | nullable |
| placeOfBirth | String? | nullable, FK → String |
| nationality | String? | nullable, FK → String |
| maritalStatus | MaritalStatus | enum, default UNKNOWN |
| occupation | String? | nullable, FK → String |
| phone | String? | nullable, FK → String |
| email | String? | nullable, FK → String |
| address | String? | nullable, FK → String |
| city | String? | nullable, FK → String |
| regionId | String? | nullable, FK → String |
| region | Region? | nullable, FK → Region |
| physicalDescription | String? | nullable, FK → String |
| distinguishingMarks | String? | nullable, FK → String |
| notes | String? | nullable, FK → String |
| isDeceased | Boolean | default false |
| createdById | String? | nullable, FK → String |
| createdBy | User? | nullable, FK → User |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |
| deletedAt | DateTime? | nullable |
| mergedIntoId | String? | nullable, FK → String |
| mergedInto | Person? | nullable, FK → Person |
| mergedFrom | Person[] | 1→N relation |
| identifiers | PersonIdentifier[] | 1→N relation |
| aliases | PersonAlias[] | 1→N relation |
| relationsFrom | PersonRelationship[] | 1→N relation |
| relationsTo | PersonRelationship[] | 1→N relation |
| complaints | Complaint[] | 1→N relation |
| caseParties | CaseParty[] | 1→N relation |
| statements | Statement[] | 1→N relation |
| interviews | Interview[] | 1→N relation |
| evidenceFrom | Evidence[] | 1→N relation |
| warrants | Warrant[] | 1→N relation |
| arrests | Arrest[] | 1→N relation |
| detentions | Detention[] | 1→N relation |
| wanted | WantedPerson[] | 1→N relation |
| incidentPersons | IncidentPerson[] | 1→N relation |

Constraints/indexes: `@@index([lastName, firstName])`, `@@index([phone])`, `@@index([dateOfBirth])`, `@@index([regionId])`

### PersonIdentifier

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| personId | String | FK → String |
| person | Person | FK → Person |
| type | IdentifierType | enum |
| value | String | FK → String |
| issuedBy | String? | nullable, FK → String |
| issuedAt | DateTime? | nullable |
| expiresAt | DateTime? | nullable |
| createdAt | DateTime | default now( |

Constraints/indexes: `@@unique([type, value])`, `@@index([personId])`

### PersonAlias

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| personId | String | FK → String |
| person | Person | FK → Person |
| alias | String | FK → String |

Constraints/indexes: `@@index([alias])`

### PersonRelationship

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| fromPersonId | String | FK → String |
| fromPerson | Person | FK → Person |
| toPersonId | String | FK → String |
| toPerson | Person | FK → Person |
| type | RelationshipType | enum |
| notes | String? | nullable, FK → String |
| createdAt | DateTime | default now( |

Constraints/indexes: `@@unique([fromPersonId, toPersonId, type])`

### WantedPerson

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| number | String | unique, FK → String |
| personId | String | FK → String |
| person | Person | FK → Person |
| caseId | String? | nullable, FK → String |
| case | Case? | nullable, FK → Case |
| offense | String | FK → String |
| reason | String | FK → String |
| dangerLevel | DangerLevel | enum, default MEDIUM |
| status | WantedStatus | enum, default DRAFT |
| lastSeenLocation | String? | nullable, FK → String |
| lastSeenAt | DateTime? | nullable |
| issuedById | String | FK → String |
| issuedBy | User | FK → User |
| approvedById | String? | nullable, FK → String |
| approvedBy | User? | nullable, FK → User |
| approvedAt | DateTime? | nullable |
| issuedAt | DateTime | default now( |
| expiresAt | DateTime? | nullable |
| closedAt | DateTime? | nullable |
| closureNotes | String? | nullable, FK → String |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |

Constraints/indexes: `@@index([status])`, `@@index([personId])`


## 4. COMPLAINTS

### Complaint

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| number | String | unique, FK → String |
| complainantId | String? | nullable, FK → String |
| complainant | Person? | nullable, FK → Person |
| isAnonymous | Boolean | default false |
| category | OffenseCategory | enum, default OTHER |
| title | String | FK → String |
| description | String | FK → String |
| incidentAt | DateTime? | nullable |
| receivedAt | DateTime | default now( |
| locationText | String? | nullable, FK → String |
| regionId | String | FK → String |
| region | Region | FK → Region |
| stationId | String | FK → String |
| station | Station | FK → Station |
| priority | Priority | enum, default NORMAL |
| status | ComplaintStatus | enum, default DRAFT |
| assignedToId | String? | nullable, FK → String |
| assignedTo | User? | nullable, FK → User |
| reviewedById | String? | nullable, FK → String |
| reviewedBy | User? | nullable, FK → User |
| reviewedAt | DateTime? | nullable |
| reviewNotes | String? | nullable, FK → String |
| closureReason | String? | nullable, FK → String |
| closedAt | DateTime? | nullable |
| caseId | String? | unique, nullable, FK → String |
| case | Case? | nullable, FK → Case |
| createdById | String | FK → String |
| createdBy | User | FK → User |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |
| deletedAt | DateTime? | nullable |

Constraints/indexes: `@@index([status])`, `@@index([stationId, status])`, `@@index([regionId])`, `@@index([receivedAt])`


## 5. CASES

### Case

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| number | String | unique, FK → String |
| title | String | FK → String |
| category | OffenseCategory | enum |
| description | String | FK → String |
| occurredAt | DateTime? | nullable |
| reportedAt | DateTime | default now( |
| locationText | String? | nullable, FK → String |
| regionId | String | FK → String |
| region | Region | FK → Region |
| stationId | String | FK → String |
| station | Station | FK → Station |
| departmentId | String? | nullable, FK → String |
| department | Department? | nullable, FK → Department |
| priority | Priority | enum, default NORMAL |
| status | CaseStatus | enum, default OPEN |
| isSensitive | Boolean | default false |
| leadId | String? | nullable, FK → String |
| lead | User? | nullable, FK → User |
| supervisorId | String? | nullable, FK → String |
| supervisor | User? | nullable, FK → User |
| disposition | CaseDisposition? | nullable, enum |
| dispositionNotes | String? | nullable, FK → String |
| closedAt | DateTime? | nullable |
| archivedAt | DateTime? | nullable |
| createdById | String | FK → String |
| createdBy | User | FK → User |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |
| deletedAt | DateTime? | nullable |
| complaint | Complaint? | nullable, FK → Complaint |
| assignments | CaseAssignment[] | 1→N relation |
| parties | CaseParty[] | 1→N relation |
| events | CaseEvent[] | 1→N relation |
| notes | CaseNote[] | 1→N relation |
| tasks | Task[] | 1→N relation |
| investigations | Investigation[] | 1→N relation |
| reports | InvestigationReport[] | 1→N relation |
| statements | Statement[] | 1→N relation |
| interviews | Interview[] | 1→N relation |
| evidence | Evidence[] | 1→N relation |
| warrants | Warrant[] | 1→N relation |
| arrests | Arrest[] | 1→N relation |
| wanted | WantedPerson[] | 1→N relation |
| incidents | Incident[] | 1→N relation |
| operations | Operation[] | 1→N relation |
| documents | Document[] | 1→N relation |

Constraints/indexes: `@@index([status])`, `@@index([stationId, status])`, `@@index([regionId])`, `@@index([leadId])`, `@@index([category])`, `@@index([reportedAt])`

### CaseAssignment

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| caseId | String | FK → String |
| case | Case | FK → Case |
| userId | String | FK → String |
| user | User | FK → User |
| role | CaseRole | enum, default INVESTIGATOR |
| assignedById | String | FK → String |
| assignedBy | User | FK → User |
| assignedAt | DateTime | default now( |
| endedAt | DateTime? | nullable |
| notes | String? | nullable, FK → String |

Constraints/indexes: `@@index([caseId, endedAt])`, `@@index([userId, endedAt])`

### CaseParty

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| caseId | String | FK → String |
| case | Case | FK → Case |
| personId | String | FK → String |
| person | Person | FK → Person |
| role | PartyRole | enum |
| status | PartyStatus | enum, default ACTIVE |
| notes | String? | nullable, FK → String |
| injuries | String? | nullable, FK → String |
| addedById | String? | nullable, FK → String |
| addedAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |

Constraints/indexes: `@@unique([caseId, personId, role])`, `@@index([personId])`, `@@index([role])`

### CaseEvent

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| caseId | String | FK → String |
| case | Case | FK → Case |
| kind | String | FK → String |
| title | String | FK → String |
| description | String? | nullable, FK → String |
| actorId | String? | nullable, FK → String |
| actor | User? | nullable, FK → User |
| entityType | String? | nullable, FK → String |
| entityId | String? | nullable, FK → String |
| occurredAt | DateTime | default now( |

Constraints/indexes: `@@index([caseId, occurredAt])`

### CaseNote

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| caseId | String | FK → String |
| case | Case | FK → Case |
| authorId | String | FK → String |
| author | User | FK → User |
| content | String | FK → String |
| isConfidential | Boolean | default false |
| createdAt | DateTime | default now( |

Constraints/indexes: `@@index([caseId, createdAt])`


## 6. INVESTIGATION

### Task

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| caseId | String | FK → String |
| case | Case | FK → Case |
| investigationId | String? | nullable, FK → String |
| investigation | Investigation? | nullable, FK → Investigation |
| title | String | FK → String |
| description | String? | nullable, FK → String |
| priority | Priority | enum, default NORMAL |
| status | TaskStatus | enum, default TODO |
| assignedToId | String? | nullable, FK → String |
| assignedTo | User? | nullable, FK → User |
| createdById | String | FK → String |
| createdBy | User | FK → User |
| dueAt | DateTime? | nullable |
| completedAt | DateTime? | nullable |
| result | String? | nullable, FK → String |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |

Constraints/indexes: `@@index([caseId, status])`, `@@index([assignedToId, status])`, `@@index([dueAt])`

### Investigation

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| number | String | unique, FK → String |
| caseId | String | FK → String |
| case | Case | FK → Case |
| leadId | String | FK → String |
| lead | User | FK → User |
| status | InvestigationStatus | enum, default OPEN |
| openedAt | DateTime | default now( |
| deadlineAt | DateTime? | nullable |
| summary | String? | nullable, FK → String |
| findings | String? | nullable, FK → String |
| reviewerId | String? | nullable, FK → String |
| reviewer | User? | nullable, FK → User |
| reviewedAt | DateTime? | nullable |
| reviewNotes | String? | nullable, FK → String |
| closedAt | DateTime? | nullable |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |
| tasks | Task[] | 1→N relation |
| reports | InvestigationReport[] | 1→N relation |

Constraints/indexes: `@@index([caseId])`, `@@index([status])`

### InvestigationReport

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| number | String | unique, FK → String |
| investigationId | String | FK → String |
| investigation | Investigation | FK → Investigation |
| caseId | String | FK → String |
| case | Case | FK → Case |
| version | Int | default 1 |
| title | String | FK → String |
| content | String | FK → String |
| conclusions | String? | nullable, FK → String |
| recommendations | String? | nullable, FK → String |
| status | ReportStatus | enum, default DRAFT |
| authorId | String | FK → String |
| author | User | FK → User |
| submittedAt | DateTime? | nullable |
| reviewerId | String? | nullable, FK → String |
| reviewer | User? | nullable, FK → User |
| reviewedAt | DateTime? | nullable |
| reviewNotes | String? | nullable, FK → String |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |

Constraints/indexes: `@@index([investigationId])`, `@@index([caseId])`

### Statement

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| number | String | unique, FK → String |
| caseId | String | FK → String |
| case | Case | FK → Case |
| personId | String | FK → String |
| person | Person | FK → Person |
| partyRole | PartyRole | enum, default WITNESS |
| type | StatementType | enum, default WRITTEN |
| status | StatementStatus | enum, default DRAFT |
| takenById | String | FK → String |
| takenBy | User | FK → User |
| takenAt | DateTime | default now( |
| location | String? | nullable, FK → String |
| language | String? | nullable, FK → String |
| content | String | FK → String |
| isConfidential | Boolean | default false |
| finalizedAt | DateTime? | nullable |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |
| transcripts | Transcript[] | 1→N relation |

Constraints/indexes: `@@index([caseId])`, `@@index([personId])`

### Interview

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| number | String | unique, FK → String |
| caseId | String | FK → String |
| case | Case | FK → Case |
| personId | String | FK → String |
| person | Person | FK → Person |
| partyRole | PartyRole | enum, default WITNESS |
| interviewerId | String | FK → String |
| interviewer | User | FK → User |
| scheduledAt | DateTime |  |
| startedAt | DateTime? | nullable |
| endedAt | DateTime? | nullable |
| location | String? | nullable, FK → String |
| purpose | String? | nullable, FK → String |
| summary | String? | nullable, FK → String |
| status | InterviewStatus | enum, default SCHEDULED |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |
| transcripts | Transcript[] | 1→N relation |

Constraints/indexes: `@@index([caseId])`, `@@index([personId])`

### Transcript

Speech-to-text output. Automated text is ALWAYS flagged as requiring human review.

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| interviewId | String? | nullable, FK → String |
| interview | Interview? | nullable, FK → Interview |
| statementId | String? | nullable, FK → String |
| statement | Statement? | nullable, FK → Statement |
| audioDocumentId | String? | unique, nullable, FK → String |
| audioDocument | Document? | nullable, FK → Document |
| provider | String | FK → String |
| version | Int | default 1 |
| status | TranscriptStatus | enum, default PENDING |
| language | String? | nullable, FK → String |
| automatedText | String? | nullable, FK → String |
| reviewedText | String? | nullable, FK → String |
| segments | Json? | nullable |
| durationSeconds | Int? | nullable |
| reviewerId | String? | nullable, FK → String |
| reviewer | User? | nullable, FK → User |
| reviewedAt | DateTime? | nullable |
| approverId | String? | nullable, FK → String |
| approver | User? | nullable, FK → User |
| approvedAt | DateTime? | nullable |
| reviewNotes | String? | nullable, FK → String |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |

Constraints/indexes: `@@index([interviewId])`, `@@index([statementId])`


## 7. EVIDENCE & CHAIN OF CUSTODY

### StorageLocation

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| stationId | String | FK → String |
| station | Station | FK → Station |
| code | String | unique, FK → String |
| name | String | FK → String |
| type | StorageLocationType | enum, default EVIDENCE_ROOM |
| description | String? | nullable, FK → String |
| isActive | Boolean | default true |
| evidence | Evidence[] | 1→N relation |
| custodyFrom | CustodyEvent[] | 1→N relation |
| custodyTo | CustodyEvent[] | 1→N relation |

### Evidence

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| number | String | unique, FK → String |
| caseId | String | FK → String |
| case | Case | FK → Case |
| category | EvidenceCategory | enum, default PHYSICAL |
| description | String | FK → String |
| quantity | Decimal? | nullable |
| unit | String? | nullable, FK → String |
| sealNumber | String? | nullable, FK → String |
| collectedAt | DateTime |  |
| collectedById | String | FK → String |
| collectedBy | User | FK → User |
| collectedFrom | String? | nullable, FK → String |
| collectedFromPersonId | String? | nullable, FK → String |
| collectedFromPerson | Person? | nullable, FK → Person |
| condition | String? | nullable, FK → String |
| status | EvidenceStatus | enum, default COLLECTED |
| currentCustodianId | String? | nullable, FK → String |
| currentCustodian | User? | nullable, FK → User |
| currentLocationId | String? | nullable, FK → String |
| currentLocation | StorageLocation? | nullable, FK → StorageLocation |
| isSensitive | Boolean | default false |
| notes | String? | nullable, FK → String |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |
| custody | CustodyEvent[] | 1→N relation |
| documents | Document[] | 1→N relation |

Constraints/indexes: `@@index([caseId])`, `@@index([status])`, `@@index([currentCustodianId])`

### CustodyEvent

Append-only chain of custody. Each row is hash-chained to the previous one.

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| evidenceId | String | FK → String |
| evidence | Evidence | FK → Evidence |
| seq | Int |  |
| action | CustodyAction | enum |
| fromUserId | String? | nullable, FK → String |
| fromUser | User? | nullable, FK → User |
| toUserId | String? | nullable, FK → String |
| toUser | User? | nullable, FK → User |
| fromLocationId | String? | nullable, FK → String |
| fromLocation | StorageLocation? | nullable, FK → StorageLocation |
| toLocationId | String? | nullable, FK → String |
| toLocation | StorageLocation? | nullable, FK → StorageLocation |
| occurredAt | DateTime |  |
| reason | String | FK → String |
| condition | String? | nullable, FK → String |
| notes | String? | nullable, FK → String |
| authorizedById | String? | nullable, FK → String |
| authorizedBy | User? | nullable, FK → User |
| recordedById | String | FK → String |
| recordedBy | User | FK → User |
| recordedAt | DateTime | default now( |
| prevHash | String? | nullable, FK → String |
| hash | String | FK → String |

Constraints/indexes: `@@unique([evidenceId, seq])`, `@@index([evidenceId, occurredAt])`


## 8. WARRANTS, ARRESTS & DETENTION

### Warrant

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| number | String | unique, FK → String |
| type | WarrantType | enum |
| personId | String? | nullable, FK → String |
| person | Person? | nullable, FK → Person |
| caseId | String? | nullable, FK → String |
| case | Case? | nullable, FK → Case |
| issuingAuthority | String | FK → String |
| issuingAuthorityRef | String? | nullable, FK → String |
| grounds | String | FK → String |
| targetAddress | String? | nullable, FK → String |
| issuedAt | DateTime? | nullable |
| expiresAt | DateTime? | nullable |
| status | WarrantStatus | enum, default DRAFT |
| requestedById | String | FK → String |
| requestedBy | User | FK → User |
| approvedById | String? | nullable, FK → String |
| approvedBy | User? | nullable, FK → User |
| approvedAt | DateTime? | nullable |
| decisionNotes | String? | nullable, FK → String |
| executedAt | DateTime? | nullable |
| executedById | String? | nullable, FK → String |
| executedBy | User? | nullable, FK → User |
| executionNotes | String? | nullable, FK → String |
| cancelledAt | DateTime? | nullable |
| cancellationReason | String? | nullable, FK → String |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |
| arrests | Arrest[] | 1→N relation |
| documents | Document[] | 1→N relation |

Constraints/indexes: `@@index([status])`, `@@index([expiresAt])`, `@@index([personId])`, `@@index([caseId])`

### Arrest

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| number | String | unique, FK → String |
| personId | String | FK → String |
| person | Person | FK → Person |
| caseId | String? | nullable, FK → String |
| case | Case? | nullable, FK → Case |
| warrantId | String? | nullable, FK → String |
| warrant | Warrant? | nullable, FK → Warrant |
| arrestingOfficerId | String | FK → String |
| arrestingOfficer | Officer | FK → Officer |
| stationId | String | FK → String |
| station | Station | FK → Station |
| arrestedAt | DateTime |  |
| locationText | String | FK → String |
| authority | ArrestAuthority | enum, default FLAGRANTE_DELICTO |
| charges | String | FK → String |
| circumstances | String? | nullable, FK → String |
| rightsReadAt | DateTime? | nullable |
| status | ArrestStatus | enum, default RECORDED |
| notes | String? | nullable, FK → String |
| recordedById | String | FK → String |
| recordedBy | User | FK → User |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |
| detentions | Detention[] | 1→N relation |
| documents | Document[] | 1→N relation |

Constraints/indexes: `@@index([personId])`, `@@index([caseId])`, `@@index([stationId, arrestedAt])`, `@@index([status])`

### Detention

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| number | String | unique, FK → String |
| arrestId | String | FK → String |
| arrest | Arrest | FK → Arrest |
| personId | String | FK → String |
| person | Person | FK → Person |
| stationId | String | FK → String |
| station | Station | FK → Station |
| cellNumber | String? | nullable, FK → String |
| startedAt | DateTime |  |
| legalLimitAt | DateTime |  |
| extendedUntil | DateTime? | nullable |
| extensionAuthority | String? | nullable, FK → String |
| extensionReason | String? | nullable, FK → String |
| status | DetentionStatus | enum, default ACTIVE |
| endedAt | DateTime? | nullable |
| endReason | DetentionEndReason? | nullable, enum |
| endNotes | String? | nullable, FK → String |
| medicalNotes | String? | nullable, FK → String |
| recordedById | String | FK → String |
| recordedBy | User | FK → User |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |
| logs | DetentionLog[] | 1→N relation |

Constraints/indexes: `@@index([status])`, `@@index([stationId, status])`, `@@index([legalLimitAt])`

### DetentionLog

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| detentionId | String | FK → String |
| detention | Detention | FK → Detention |
| type | DetentionLogType | enum |
| notes | String | FK → String |
| occurredAt | DateTime | default now( |
| recordedById | String | FK → String |
| recordedBy | User | FK → User |

Constraints/indexes: `@@index([detentionId, occurredAt])`


## 9. OPERATIONS: PATROLS, INCIDENTS, OPERATIONS

### Zone

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| stationId | String | FK → String |
| station | Station | FK → Station |
| code | String | FK → String |
| name | String | FK → String |
| description | String? | nullable, FK → String |
| isActive | Boolean | default true |
| patrols | Patrol[] | 1→N relation |

Constraints/indexes: `@@unique([stationId, code])`

### Patrol

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| number | String | unique, FK → String |
| stationId | String | FK → String |
| station | Station | FK → Station |
| zoneId | String? | nullable, FK → String |
| zone | Zone? | nullable, FK → Zone |
| shift | Shift | enum, default MORNING |
| mission | String | FK → String |
| plannedStart | DateTime |  |
| plannedEnd | DateTime |  |
| actualStart | DateTime? | nullable |
| actualEnd | DateTime? | nullable |
| status | PatrolStatus | enum, default PLANNED |
| supervisorId | String | FK → String |
| supervisor | Officer | FK → Officer |
| vehicleId | String? | nullable, FK → String |
| vehicle | Vehicle? | nullable |
| startKm | Int? | nullable |
| endKm | Int? | nullable |
| report | String? | nullable, FK → String |
| notes | String? | nullable, FK → String |
| createdById | String | FK → String |
| createdBy | User | FK → User |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |
| officers | PatrolOfficer[] | 1→N relation |
| incidents | Incident[] | 1→N relation |

Constraints/indexes: `@@index([stationId, status])`, `@@index([plannedStart])`

### PatrolOfficer

| Column | Type | Notes |
| ------ | ---- | ----- |
| patrolId | String | FK → String |
| patrol | Patrol | FK → Patrol |
| officerId | String | FK → String |
| officer | Officer | FK → Officer |
| role | String? | nullable, FK → String |

Constraints/indexes: `@@id([patrolId, officerId])`

### Incident

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| number | String | unique, FK → String |
| type | IncidentType | enum, default OTHER |
| severity | Severity | enum, default MEDIUM |
| title | String | FK → String |
| description | String | FK → String |
| occurredAt | DateTime |  |
| reportedAt | DateTime | default now( |
| locationText | String | FK → String |
| latitude | Float? | nullable |
| longitude | Float? | nullable |
| regionId | String | FK → String |
| region | Region | FK → Region |
| stationId | String | FK → String |
| station | Station | FK → Station |
| status | IncidentStatus | enum, default REPORTED |
| caseId | String? | nullable, FK → String |
| case | Case? | nullable, FK → Case |
| patrolId | String? | nullable, FK → String |
| patrol | Patrol? | nullable, FK → Patrol |
| report | String? | nullable, FK → String |
| resolvedAt | DateTime? | nullable |
| reportedById | String | FK → String |
| reportedBy | User | FK → User |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |
| officers | IncidentOfficer[] | 1→N relation |
| persons | IncidentPerson[] | 1→N relation |
| documents | Document[] | 1→N relation |

Constraints/indexes: `@@index([stationId, status])`, `@@index([occurredAt])`, `@@index([severity])`

### IncidentOfficer

| Column | Type | Notes |
| ------ | ---- | ----- |
| incidentId | String | FK → String |
| incident | Incident | FK → Incident |
| officerId | String | FK → String |
| officer | Officer | FK → Officer |
| role | String? | nullable, FK → String |

Constraints/indexes: `@@id([incidentId, officerId])`

### IncidentPerson

| Column | Type | Notes |
| ------ | ---- | ----- |
| incidentId | String | FK → String |
| incident | Incident | FK → Incident |
| personId | String | FK → String |
| person | Person | FK → Person |
| role | PartyRole | enum, default OTHER |
| notes | String? | nullable, FK → String |

Constraints/indexes: `@@id([incidentId, personId])`

### Operation

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| number | String | unique, FK → String |
| name | String | FK → String |
| type | OperationType | enum, default OTHER |
| objective | String | FK → String |
| plan | String? | nullable, FK → String |
| riskLevel | Severity | enum, default MEDIUM |
| regionId | String | FK → String |
| region | Region | FK → Region |
| stationId | String | FK → String |
| station | Station | FK → Station |
| commanderId | String | FK → String |
| commander | Officer | FK → Officer |
| caseId | String? | nullable, FK → String |
| case | Case? | nullable, FK → Case |
| plannedStart | DateTime |  |
| plannedEnd | DateTime |  |
| actualStart | DateTime? | nullable |
| actualEnd | DateTime? | nullable |
| status | OperationStatus | enum, default PLANNED |
| finalReport | String? | nullable, FK → String |
| outcome | String? | nullable, FK → String |
| createdById | String | FK → String |
| createdBy | User | FK → User |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |
| teams | OperationTeam[] | 1→N relation |
| resources | OperationResource[] | 1→N relation |
| documents | Document[] | 1→N relation |

Constraints/indexes: `@@index([stationId, status])`, `@@index([plannedStart])`

### OperationTeam

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| operationId | String | FK → String |
| operation | Operation | FK → Operation |
| name | String | FK → String |
| leaderId | String? | nullable, FK → String |
| leader | Officer? | nullable, FK → Officer |
| mission | String? | nullable, FK → String |
| members | OperationMember[] | 1→N relation |

### OperationMember

| Column | Type | Notes |
| ------ | ---- | ----- |
| teamId | String | FK → String |
| team | OperationTeam | FK → OperationTeam |
| officerId | String | FK → String |
| officer | Officer | FK → Officer |
| role | String? | nullable, FK → String |

Constraints/indexes: `@@id([teamId, officerId])`

### OperationResource

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| operationId | String | FK → String |
| operation | Operation | FK → Operation |
| vehicleId | String? | nullable, FK → String |
| vehicle | Vehicle? | nullable |
| description | String | FK → String |
| quantity | Int | default 1 |


## 10. FLEET

### String

| Column | Type | Notes |
| ------ | ---- | ----- |
| year | Int? | nullable |
| color | String? | nullable, FK → String |
| type | VehicleType | enum, default PATROL_CAR |
| fuelType | FuelType | enum, default PETROL |
| stationId | String | FK → String |
| station | Station | FK → Station |
| status | VehicleStatus | enum, default AVAILABLE |
| mileageKm | Int | default 0 |
| acquiredAt | DateTime? | nullable |
| insuranceExpiresAt | DateTime? | nullable |
| inspectionDueAt | DateTime? | nullable |
| notes | String? | nullable, FK → String |
| isActive | Boolean | default true |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |
| assignments | VehicleAssignment[] | 1→N relation |
| maintenance | MaintenanceRecord[] | 1→N relation |
| fuelLogs | FuelLog[] | 1→N relation |
| patrols | Patrol[] | 1→N relation |
| opResources | OperationResource[] | 1→N relation |
| documents | Document[] | 1→N relation |

Constraints/indexes: `@@index([stationId, status])`

### VehicleAssignment

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| vehicleId | String | FK → String |
| vehicle | Vehicle |  |
| officerId | String? | nullable, FK → String |
| officer | Officer? | nullable, FK → Officer |
| purpose | String | FK → String |
| startAt | DateTime |  |
| endAt | DateTime? | nullable |
| startKm | Int? | nullable |
| endKm | Int? | nullable |
| notes | String? | nullable, FK → String |
| createdAt | DateTime | default now( |

Constraints/indexes: `@@index([vehicleId, startAt])`

### MaintenanceRecord

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| vehicleId | String | FK → String |
| vehicle | Vehicle |  |
| type | MaintenanceType | enum, default SERVICE |
| status | MaintenanceStatus | enum, default SCHEDULED |
| description | String | FK → String |
| scheduledAt | DateTime |  |
| performedAt | DateTime? | nullable |
| mileageKm | Int? | nullable |
| cost | Decimal? | nullable |
| provider | String? | nullable, FK → String |
| nextDueAt | DateTime? | nullable |
| nextDueKm | Int? | nullable |
| recordedById | String | FK → String |
| recordedBy | User | FK → User |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |

Constraints/indexes: `@@index([vehicleId, scheduledAt])`, `@@index([status])`

### FuelLog

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| vehicleId | String | FK → String |
| vehicle | Vehicle |  |
| officerId | String? | nullable, FK → String |
| officer | Officer? | nullable, FK → Officer |
| filledAt | DateTime | default now( |
| liters | Decimal |  |
| cost | Decimal? | nullable |
| mileageKm | Int? | nullable |
| station | String? | nullable, FK → String |
| recordedById | String | FK → String |
| recordedBy | User | FK → User |

Constraints/indexes: `@@index([vehicleId, filledAt])`


## 11. DOCUMENTS, REPORTS, NOTIFICATIONS

### Document

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| title | String | FK → String |
| entityType | DocumentEntity | enum |
| entityId | String? | nullable, FK → String |
| category | DocumentCategory | enum, default OTHER |
| classification | Classification | enum, default INTERNAL |
| description | String? | nullable, FK → String |
| currentVersion | Int | default 1 |
| uploadedById | String | FK → String |
| uploadedBy | User | FK → User |
| stationId | String? | nullable, FK → String |
| station | Station? | nullable, FK → Station |
| caseId | String? | nullable, FK → String |
| case | Case? | nullable, FK → Case |
| evidenceId | String? | nullable, FK → String |
| evidence | Evidence? | nullable, FK → Evidence |
| warrantId | String? | nullable, FK → String |
| warrant | Warrant? | nullable, FK → Warrant |
| arrestId | String? | nullable, FK → String |
| arrest | Arrest? | nullable, FK → Arrest |
| incidentId | String? | nullable, FK → String |
| incident | Incident? | nullable, FK → Incident |
| operationId | String? | nullable, FK → String |
| operation | Operation? | nullable, FK → Operation |
| vehicleId | String? | nullable, FK → String |
| vehicle | Vehicle? | nullable |
| isArchived | Boolean | default false |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |
| deletedAt | DateTime? | nullable |
| versions | DocumentVersion[] | 1→N relation |
| transcript | Transcript? | nullable, FK → Transcript |
| generated | GeneratedReport? | nullable, FK → GeneratedReport |

Constraints/indexes: `@@index([entityType, entityId])`, `@@index([caseId])`

### DocumentVersion

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| documentId | String | FK → String |
| document | Document | FK → Document |
| version | Int |  |
| fileName | String | FK → String |
| mimeType | String | FK → String |
| sizeBytes | Int |  |
| storagePath | String | FK → String |
| sha256 | String | FK → String |
| changeNote | String? | nullable, FK → String |
| uploadedById | String | FK → String |
| uploadedBy | User | FK → User |
| uploadedAt | DateTime | default now( |

Constraints/indexes: `@@unique([documentId, version])`

### GeneratedReport

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| number | String | unique, FK → String |
| type | ReportType | enum |
| title | String | FK → String |
| parameters | Json? | nullable |
| entityId | String? | nullable, FK → String |
| generatedById | String | FK → String |
| generatedBy | User | FK → User |
| generatedAt | DateTime | default now( |
| documentId | String? | unique, nullable, FK → String |
| document | Document? | nullable, FK → Document |

Constraints/indexes: `@@index([type, generatedAt])`

### Notification

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| userId | String | FK → String |
| user | User | FK → User, cascade |
| kind | NotificationKind | enum, default INFO |
| title | String | FK → String |
| body | String | FK → String |
| href | String? | nullable, FK → String |
| readAt | DateTime? | nullable |
| createdAt | DateTime | default now( |

Constraints/indexes: `@@index([userId, readAt, createdAt])`


## 12. AUDIT, SYSTEM, BACKUP

### AuditLog

Immutable audit log (DB trigger forbids UPDATE/DELETE).

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| at | DateTime | default now( |
| actorId | String? | nullable, FK → String |
| actor | User? | nullable, FK → User |
| actorLabel | String | FK → String |
| action | String | FK → String |
| module | String | FK → String |
| entityType | String? | nullable, FK → String |
| entityId | String? | nullable, FK → String |
| entityLabel | String? | nullable, FK → String |
| summary | String | FK → String |
| before | Json? | nullable |
| after | Json? | nullable |
| outcome | AuditOutcome | enum, default SUCCESS |
| ipAddress | String? | nullable, FK → String |
| userAgent | String? | nullable, FK → String |
| sessionId | String? | nullable, FK → String |

Constraints/indexes: `@@index([at])`, `@@index([actorId, at])`, `@@index([entityType, entityId])`, `@@index([module, action])`

### DocumentSequence

| Column | Type | Notes |
| ------ | ---- | ----- |
| key | String | PK, FK → String |
| prefix | String | FK → String |
| width | Int | default 5 |
| next | Int | default 1 |

### SystemSetting

| Column | Type | Notes |
| ------ | ---- | ----- |
| key | String | PK, FK → String |
| value | Json |  |
| description | String? | nullable, FK → String |
| updatedById | String? | nullable, FK → String |
| updatedBy | User? | nullable, FK → User |
| updatedAt | DateTime | auto-updated |

### BackupRecord

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| type | String | FK → String, default "FULL" |
| status | BackupStatus | enum, default RUNNING |
| fileName | String? | nullable, FK → String |
| sizeBytes | Int? | nullable |
| sha256 | String? | nullable, FK → String |
| startedAt | DateTime | default now( |
| finishedAt | DateTime? | nullable |
| notes | String? | nullable, FK → String |
| triggeredById | String? | nullable, FK → String |
| triggeredBy | User? | nullable, FK → User |


## Enumerations

- **UserStatus**: PENDING, ACTIVE, LOCKED, SUSPENDED, DISABLED
- **ScopeLevel**: NATIONAL, REGIONAL, DEPARTMENTAL, STATION, OWN
- **CommuneType**: COMMUNE, SOUS_PREFECTURE, ARRONDISSEMENT
- **LocalityType**: QUARTIER, VILLAGE, CANTON, LOCALITE
- **StationType**: HEADQUARTERS, PROVINCIAL_DIRECTION, DEPARTMENTAL_DIRECTION, CENTRAL_STATION, STATION, POST, UNIT, BRIGADE, SPECIAL_UNIT
- **StationStatus**: ACTIVE, INACTIVE, UNDER_CONSTRUCTION, PLANNED
- **DepartmentType**: COMMAND, INVESTIGATION, PATROL, TRAFFIC, FORENSICS, INTELLIGENCE, CUSTODY, LOGISTICS, ADMINISTRATION, SPECIAL
- **RankCategory**: COMMISSIONER, OFFICER, INSPECTOR, NON_COMMISSIONED, CONSTABLE, CIVILIAN
- **Gender**: MALE, FEMALE, OTHER, UNKNOWN
- **DutyStatus**: ON_DUTY, OFF_DUTY, ON_LEAVE, TRAINING, SUSPENDED, RETIRED, DECEASED
- **MaritalStatus**: SINGLE, MARRIED, DIVORCED, WIDOWED, UNKNOWN
- **IdentifierType**: NATIONAL_ID, PASSPORT, DRIVER_LICENSE, VOTER_CARD, RESIDENCE_PERMIT, BIRTH_CERTIFICATE, OTHER
- **RelationshipType**: SPOUSE, PARENT, CHILD, SIBLING, RELATIVE, ASSOCIATE, EMPLOYER, EMPLOYEE, NEIGHBOUR, OTHER
- **DangerLevel**: LOW, MEDIUM, HIGH, EXTREME
- **WantedStatus**: DRAFT, PENDING_APPROVAL, ACTIVE, LOCATED, ARRESTED, CANCELLED, EXPIRED
- **Priority**: LOW, NORMAL, HIGH, URGENT
- **OffenseCategory**: HOMICIDE, ASSAULT, SEXUAL_OFFENSE, ROBBERY, THEFT, BURGLARY, FRAUD, CORRUPTION, DRUG_OFFENSE, TRAFFICKING, CYBERCRIME, ARMS_OFFENSE, KIDNAPPING, DOMESTIC_VIOLENCE, TRAFFIC_OFFENSE, PUBLIC_ORDER, PROPERTY_DAMAGE, MISSING_PERSON, TERRORISM, OTHER
- **ComplaintStatus**: DRAFT, REGISTERED, UNDER_REVIEW, ASSIGNED, CONVERTED, CLOSED, REJECTED
- **CaseStatus**: OPEN, ASSIGNED, UNDER_INVESTIGATION, PENDING_REVIEW, REFERRED, CLOSED, ARCHIVED
- **CaseDisposition**: SOLVED, UNSOLVED, UNFOUNDED, REFERRED_TO_PROSECUTION, TRANSFERRED, DISMISSED
- **CaseRole**: LEAD, INVESTIGATOR, SUPERVISOR, ANALYST, SUPPORT
- **PartyRole**: COMPLAINANT, VICTIM, WITNESS, SUSPECT, PERSON_OF_INTEREST, ACCUSED, OTHER
- **PartyStatus**: ACTIVE, UNDER_INVESTIGATION, CLEARED, CHARGED, REFERRED, WITHDRAWN
- **TaskStatus**: TODO, IN_PROGRESS, BLOCKED, DONE, CANCELLED
- **InvestigationStatus**: OPEN, IN_PROGRESS, REPORT_SUBMITTED, UNDER_REVIEW, APPROVED, RETURNED, CLOSED
- **ReportStatus**: DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, RETURNED, SUPERSEDED
- **StatementType**: WRITTEN, ORAL_TRANSCRIBED, SWORN, CONFESSION
- **StatementStatus**: DRAFT, FINAL, RETRACTED
- **InterviewStatus**: SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED
- **TranscriptStatus**: PENDING, PROCESSING, AUTOMATED_DRAFT, UNDER_REVIEW, APPROVED, REJECTED
- **StorageLocationType**: EVIDENCE_ROOM, SAFE, REFRIGERATED, VEHICLE_LOT, LABORATORY, ARMORY, EXTERNAL
- **EvidenceCategory**: PHYSICAL, DOCUMENT, DIGITAL, BIOLOGICAL, WEAPON, NARCOTICS, VEHICLE, CURRENCY, AUDIO_VIDEO, OTHER
- **EvidenceStatus**: COLLECTED, REGISTERED, STORED, TRANSFERRED, UNDER_EXAMINATION, RETURNED, RELEASED, DESTROYED, ARCHIVED
- **CustodyAction**: COLLECTED, REGISTERED, STORED, TRANSFERRED, CHECKED_OUT, CHECKED_IN, EXAMINED, RETURNED, RELEASED, DESTROYED, ARCHIVED
- **WarrantType**: ARREST, SEARCH, DETENTION, SUMMONS, SEIZURE, OTHER
- **WarrantStatus**: DRAFT, PENDING_APPROVAL, ACTIVE, EXECUTED, EXPIRED, CANCELLED, REJECTED
- **ArrestAuthority**: WARRANT, FLAGRANTE_DELICTO, COURT_ORDER, PROBABLE_CAUSE, OTHER
- **ArrestStatus**: RECORDED, IN_CUSTODY, RELEASED, TRANSFERRED, CHARGED
- **DetentionStatus**: ACTIVE, EXTENDED, ENDED
- **DetentionEndReason**: RELEASED_NO_CHARGE, RELEASED_ON_BAIL, TRANSFERRED_PROSECUTION, TRANSFERRED_STATION, COURT_APPEARANCE, MEDICAL, OTHER
- **DetentionLogType**: WELFARE_CHECK, MEAL, MEDICAL, VISIT, LEGAL_COUNSEL, TRANSFER, INCIDENT, NOTE
- **Shift**: MORNING, AFTERNOON, NIGHT, CUSTOM
- **PatrolStatus**: PLANNED, ACTIVE, COMPLETED, CANCELLED
- **IncidentType**: DISTURBANCE, TRAFFIC_ACCIDENT, ASSAULT, THEFT, FIRE, MEDICAL, SUSPICIOUS_ACTIVITY, PUBLIC_ORDER, DOMESTIC, NOISE, MISSING_PERSON, OTHER
- **Severity**: LOW, MEDIUM, HIGH, CRITICAL
- **IncidentStatus**: REPORTED, RESPONDING, ON_SCENE, RESOLVED, ESCALATED, CLOSED
- **OperationType**: RAID, CHECKPOINT, SURVEILLANCE, ESCORT, CROWD_CONTROL, SEARCH, JOINT, OTHER
- **OperationStatus**: PLANNED, APPROVED, IN_PROGRESS, COMPLETED, CANCELLED
- **VehicleType**: PATROL_CAR, MOTORCYCLE, VAN, PICKUP, TRUCK, BUS, UNMARKED, OTHER
- **VehicleStatus**: AVAILABLE, IN_USE, MAINTENANCE, OUT_OF_SERVICE, DECOMMISSIONED
- **FuelType**: PETROL, DIESEL, ELECTRIC, HYBRID, OTHER
- **MaintenanceType**: SERVICE, REPAIR, INSPECTION, TIRES, BODYWORK, OTHER
- **MaintenanceStatus**: SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED
- **DocumentEntity**: CASE, COMPLAINT, EVIDENCE, PERSON, ARREST, WARRANT, INCIDENT, PATROL, OPERATION, VEHICLE, OFFICER, STATEMENT, INTERVIEW, INVESTIGATION, REPORT, GENERAL
- **DocumentCategory**: PHOTO, SCAN, FORM, REPORT, AUDIO, VIDEO, IDENTITY, LEGAL, OTHER
- **Classification**: INTERNAL, CONFIDENTIAL, RESTRICTED, SECRET
- **ReportType**: CASE, INVESTIGATION, ARREST, EVIDENCE, INCIDENT, PATROL, STATION, STATISTICAL
- **NotificationKind**: INFO, ASSIGNMENT, DEADLINE, APPROVAL, ALERT, SECURITY
- **AuditOutcome**: SUCCESS, DENIED, FAILURE
- **BackupStatus**: RUNNING, COMPLETED, FAILED, RESTORED
