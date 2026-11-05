# SIGPN-T — Documentation de la base de données

_Generated from `prisma/schema.prisma` on 2026-11-05 by `scripts/gen-db-docs.ts`. Do not edit by hand._

- Engine: PostgreSQL 18 · ORM: Prisma 7 (pg adapter)
- Tables: **117** · Enums: **102**
- Migrations: `20260911165632_init`, `20260911165825_immutability_triggers`, `20260912102414_national_territory`, `20260912161408_personnel_positions_trainings_person_station`, `20260922124549_biometric_forensic_identification`, `20260922150000_wanted_persons`, `20260922150500_wanted_persons_station_scope`, `20260926140000_traffic_offences_fines`, `20260926150000_traffic_control_links`, `20260927100000_traffic_cash_revenue`, `20261105170000_hr_dossier_career`, `20261105180000_hr_transfers`, `20261105190000_hr_rotation`, `20261105200000_hr_attendance_training`, `20261105210000_hr_discipline_documents`, `20261106100000_hr_pay`

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
| wantedSightingsLogged | WantedSighting[] | 1→N relation |
| wantedVehiclesAdded | WantedVehicle[] | 1→N relation |
| incidentsReported | Incident[] | 1→N relation |
| patrolsCreated | Patrol[] | 1→N relation |
| operationsCreated | Operation[] | 1→N relation |
| documentsUploaded | Document[] | 1→N relation |
| documentVersions | DocumentVersion[] | 1→N relation |
| generatedReports | GeneratedReport[] | 1→N relation |
| settingsUpdated | SystemSetting[] | 1→N relation |
| backups | BackupRecord[] | 1→N relation |
| officerAssignments | OfficerAssignment[] | 1→N relation |
| trainingsRecorded | Training[] | 1→N relation |
| careerEventsRecorded | CareerEvent[] | 1→N relation |
| rotationExceptionsCreated | RotationException[] | 1→N relation |
| leavesRequested | LeaveRequest[] | 1→N relation |
| leavesDecided | LeaveRequest[] | 1→N relation |
| disciplineOpened | DisciplinaryCase[] | 1→N relation |
| disciplineDecided | DisciplinaryCase[] | 1→N relation |
| hrDocumentsCreated | HrDocument[] | 1→N relation |
| payElementsRequested | OfficerPayElement[] | 1→N relation |
| payElementsValidated | OfficerPayElement[] | 1→N relation |
| payScaleCreated | PayScaleEntry[] | 1→N relation |
| payScaleValidated | PayScaleEntry[] | 1→N relation |
| payRunsGenerated | PayRun[] | 1→N relation |
| payRunsValidated | PayRun[] | 1→N relation |
| transfersProposed | TransferRequest[] | 1→N relation |
| transfersReviewed | TransferRequest[] | 1→N relation |
| transfersValidated | TransferRequest[] | 1→N relation |
| maintenanceRecorded | MaintenanceRecord[] | 1→N relation |
| fuelLogs | FuelLog[] | 1→N relation |
| fingerprintsCaptured | FingerprintRecord[] | 1→N relation |
| facesCaptured | FaceRecord[] | 1→N relation |
| voicesCaptured | VoiceRecord[] | 1→N relation |
| plateDetectionsLogged | LicensePlateDetection[] | 1→N relation |
| biometricSearchesRun | BiometricSearch[] | 1→N relation |
| biometricActionsTaken | BiometricSearch[] | 1→N relation |
| trafficDriversCreated | TrafficDriver[] | 1→N relation |
| trafficVehiclesCreated | TrafficVehicle[] | 1→N relation |
| trafficControlsRecorded | TrafficControl[] | 1→N relation |
| trafficTicketsIssued | TrafficTicket[] | 1→N relation |
| trafficTicketsCancelled | TrafficTicket[] | 1→N relation |
| trafficFinesIssued | TrafficFine[] | 1→N relation |
| trafficPaymentsReceived | TrafficPayment[] | 1→N relation |
| trafficPaymentsVoided | TrafficPayment[] | 1→N relation |
| trafficReceiptsIssued | TrafficReceipt[] | 1→N relation |
| cashRegisters | TrafficCashRegister[] | 1→N relation |
| cashRegistersClosed | TrafficCashRegister[] | 1→N relation |
| cashRegistersBlocked | TrafficCashRegister[] | 1→N relation |
| cashDailyClosures | TrafficDailyClosure[] | 1→N relation |
| cashCollections | TrafficRevenueCollection[] | 1→N relation |
| cashCollectionsVerified | TrafficRevenueCollection[] | 1→N relation |
| cashDepositsAgent | TrafficDeposit[] | 1→N relation |
| cashDepositsMade | TrafficDeposit[] | 1→N relation |
| cashDepositsReceived | TrafficDeposit[] | 1→N relation |
| cashDepositsReviewed | TrafficDeposit[] | 1→N relation |
| cashDepositsValidated | TrafficDeposit[] | 1→N relation |
| cashDepositSlips | TrafficDepositReceipt[] | 1→N relation |
| cashReconciliations | TrafficReconciliation[] | 1→N relation |
| cashDiscrepanciesAgent | TrafficCashDiscrepancy[] | 1→N relation |
| cashDiscrepanciesValidated | TrafficCashDiscrepancy[] | 1→N relation |
| trafficEvidenceUploaded | TrafficEvidence[] | 1→N relation |

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
| wantedPersons | WantedPerson[] | 1→N relation |
| trafficControls | TrafficControl[] | 1→N relation |
| trafficTickets | TrafficTicket[] | 1→N relation |
| trafficFines | TrafficFine[] | 1→N relation |
| cashRegisters | TrafficCashRegister[] | 1→N relation |
| cashCollections | TrafficRevenueCollection[] | 1→N relation |
| cashDeposits | TrafficDeposit[] | 1→N relation |

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
| persons | Person[] | 1→N relation |
| wantedPersons | WantedPerson[] | 1→N relation |
| trafficControls | TrafficControl[] | 1→N relation |
| trafficTickets | TrafficTicket[] | 1→N relation |
| trafficFines | TrafficFine[] | 1→N relation |
| trafficPayments | TrafficPayment[] | 1→N relation |
| cashRegisters | TrafficCashRegister[] | 1→N relation |
| cashCollections | TrafficRevenueCollection[] | 1→N relation |
| cashDeposits | TrafficDeposit[] | 1→N relation |
| transfersFrom | TransferRequest[] | 1→N relation |
| transfersTo | TransferRequest[] | 1→N relation |
| attendance | AttendanceRecord[] | 1→N relation |
| leaveRequests | LeaveRequest[] | 1→N relation |
| hrDocuments | HrDocument[] | 1→N relation |

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
| payScale | PayScaleEntry[] | 1→N relation |

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
| positionId | String? | nullable, FK → String |
| position | Position? | nullable, FK → Position |
| hiredAt | DateTime? | nullable |
| specialties | String? | nullable, FK → String |
| notes | String? | nullable, FK → String |
| userId | String? | unique, nullable, FK → String |
| user | User? | nullable, FK → User |
| isActive | Boolean | default true |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |
| deletedAt | DateTime? | nullable |
| birthPlace | String? | nullable, FK → String |
| maritalStatus | MaritalStatus? | nullable, enum |
| photoPath | String? | nullable, FK → String |
| corpsId | String? | nullable, FK → String |
| corps | Corps? | nullable, FK → Corps |
| administrativeStatus | AdministrativeStatus | enum, default ACTIVE |
| serviceStartDate | DateTime? | nullable |
| currentPostSince | DateTime? | nullable, Date of taking up the current post (drives the 12-month rotation, phase 5). |
| careerEvents | CareerEvent[] | 1→N relation |
| transferRequests | TransferRequest[] | 1→N relation |
| rotationExceptions | RotationException[] | 1→N relation |
| rotationAlerts | RotationAlert[] | 1→N relation |
| attendance | AttendanceRecord[] | 1→N relation |
| leaveRequests | LeaveRequest[] | 1→N relation |
| skills | OfficerSkill[] | 1→N relation |
| disciplinaryCases | DisciplinaryCase[] | 1→N relation |
| distinctions | Distinction[] | 1→N relation |
| hrDocuments | HrDocument[] | 1→N relation |
| payElements | OfficerPayElement[] | 1→N relation |
| payLines | PayRunLine[] | 1→N relation |
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
| trainings | Training[] | 1→N relation |

Constraints/indexes: `@@index([stationId])`, `@@index([departmentId])`, `@@index([lastName, firstName])`, `@@index([currentPostSince])`

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
| positionId | String? | nullable, FK → String |
| positionRef | Position? | nullable, FK → Position |
| startDate | DateTime |  |
| endDate | DateTime? | nullable |
| reason | String? | nullable, FK → String |
| createdById | String? | nullable, FK → String |
| createdBy | User? | nullable, FK → User |
| createdAt | DateTime | default now( |

Constraints/indexes: `@@index([officerId, startDate])`

### Corps

Corps of the Police nationale (referential, editable by HR administrators).

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| code | String | unique, FK → String |
| name | String | FK → String |
| isActive | Boolean | default true |
| officers | Officer[] | 1→N relation |

### CareerEvent

Append-only career history of an officer (every change of grade, function, status or posting).

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| officerId | String | FK → String |
| officer | Officer | FK → Officer |
| type | CareerEventType | enum |
| effectiveDate | DateTime |  |
| reference | String | FK → String |
| reason | String? | nullable, FK → String |
| fromRankId | String? | nullable, FK → String |
| toRankId | String? | nullable, FK → String |
| fromPositionId | String? | nullable, FK → String |
| toPositionId | String? | nullable, FK → String |
| fromStationId | String? | nullable, FK → String |
| toStationId | String? | nullable, FK → String |
| fromStatus | AdministrativeStatus? | nullable, enum |
| toStatus | AdministrativeStatus? | nullable, enum |
| recordedById | String? | nullable, FK → String |
| recordedBy | User? | nullable, FK → User |
| createdAt | DateTime | default now( |

Constraints/indexes: `@@index([officerId, effectiveDate])`, `@@index([type, effectiveDate])`

### TransferRequest

Posting change (mutation) going through the validation circuit: proposal -> HR review -> validation by the competent authority -> decision -> execution on the dossier. Nothing moves an officer before APPROVED.

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| number | String | unique, FK → String |
| officerId | String | FK → String |
| officer | Officer | FK → Officer |
| fromStationId | String | FK → String |
| fromStation | Station | FK → Station |
| fromDepartmentId | String? | nullable, FK → String |
| toStationId | String | FK → String |
| toStation | Station | FK → Station |
| toDepartmentId | String? | nullable, FK → String |
| toPositionId | String? | nullable, FK → String |
| effectiveDate | DateTime |  |
| reason | String | FK → String |
| origin | TransferOrigin | enum, default MANUAL |
| status | TransferStatus | enum, default PROPOSED |
| proposedById | String? | nullable, FK → String |
| proposedBy | User? | nullable, FK → User |
| reviewedById | String? | nullable, FK → String |
| reviewedBy | User? | nullable, FK → User |
| reviewedAt | DateTime? | nullable |
| reviewNote | String? | nullable, FK → String |
| validatedById | String? | nullable, FK → String |
| validatedBy | User? | nullable, FK → User |
| validatedAt | DateTime? | nullable |
| validationNote | String? | nullable, FK → String |
| decisionNumber | String? | unique, nullable, FK → String |
| executedAt | DateTime? | nullable |
| closeReason | String? | nullable, FK → String |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |

Constraints/indexes: `@@index([officerId])`, `@@index([status, createdAt])`, `@@index([fromStationId])`, `@@index([toStationId])`

### AttendanceRecord

One row per officer and day. LEAVE-derived rows (leaveId set) are generated by an approved leave and cannot be edited by roll-call.

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| officerId | String | FK → String |
| officer | Officer | FK → Officer |
| stationId | String | FK → String |
| station | Station | FK → Station |
| date | DateTime |  |
| status | AttendanceStatus | enum |
| lateMinutes | Int? | nullable |
| note | String? | nullable, FK → String |
| leaveId | String? | nullable, FK → String |
| recordedById | String? | nullable, FK → String |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |

Constraints/indexes: `@@unique([officerId, date])`, `@@index([stationId, date])`, `@@index([date, status])`

### LeaveRequest

Leave, permission, authorised absence or unavailability: request -> approval by a hierarchical authority -> attendance generated.

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| number | String | unique, FK → String |
| officerId | String | FK → String |
| officer | Officer | FK → Officer |
| stationId | String | FK → String |
| station | Station | FK → Station |
| type | LeaveType | enum |
| startDate | DateTime |  |
| endDate | DateTime |  |
| days | Int |  |
| reason | String? | nullable, FK → String |
| status | LeaveStatus | enum, default REQUESTED |
| requestedById | String? | nullable, FK → String |
| requestedBy | User? | nullable, FK → User |
| decidedById | String? | nullable, FK → String |
| decidedBy | User? | nullable, FK → User |
| decidedAt | DateTime? | nullable |
| decisionNote | String? | nullable, FK → String |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |

Constraints/indexes: `@@index([officerId, startDate])`, `@@index([status, createdAt])`, `@@index([stationId, status])`

### DisciplinaryCase

Disciplinary procedure. Strictly confidential: every read is audited and needs hr:discipline_view.

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| number | String | unique, FK → String |
| officerId | String | FK → String |
| officer | Officer | FK → Officer |
| stationId | String | FK → String |
| facts | String | FK → String |
| factsDate | DateTime |  |
| status | DisciplineStatus | enum, default OPEN |
| openedById | String? | nullable, FK → String |
| openedBy | User? | nullable, FK → User |
| sanction | SanctionKind? | nullable, enum |
| sanctionStart | DateTime? | nullable |
| sanctionEnd | DateTime? | nullable |
| sanctionActive | Boolean | default false |
| decisionNumber | String? | unique, nullable, FK → String |
| decisionReason | String? | nullable, FK → String |
| decidedById | String? | nullable, FK → String |
| decidedBy | User? | nullable, FK → User |
| decidedAt | DateTime? | nullable |
| closedAt | DateTime? | nullable |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |
| steps | DisciplinaryStep[] | 1→N relation |

Constraints/indexes: `@@index([officerId])`, `@@index([status])`, `@@index([stationId])`

### DisciplinaryStep

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| caseId | String | FK → String |
| case | DisciplinaryCase | FK → DisciplinaryCase |
| kind | DisciplineStepKind | enum |
| date | DateTime |  |
| note | String | FK → String |
| recordedById | String? | nullable, FK → String |
| createdAt | DateTime | default now( |

Constraints/indexes: `@@index([caseId, date])`

### Distinction

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| officerId | String | FK → String |
| officer | Officer | FK → Officer |
| kind | DistinctionKind | enum |
| title | String | FK → String |
| reason | String? | nullable, FK → String |
| reference | String? | nullable, FK → String |
| awardedAt | DateTime |  |
| recordedById | String? | nullable, FK → String |
| createdAt | DateTime | default now( |

Constraints/indexes: `@@index([officerId, awardedAt])`

### HrDocument

Central HR document space. GENERATED documents keep a frozen content snapshot (rendered to PDF or Word on demand); UPLOADED ones keep the stored file. CONFIDENTIAL documents need hr:discipline_view.

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| number | String | unique, FK → String |
| kind | HrDocumentKind | enum |
| title | String | FK → String |
| source | HrDocumentSource | enum |
| confidential | Boolean | default false |
| officerId | String? | nullable, FK → String |
| officer | Officer? | nullable, FK → Officer |
| stationId | String? | nullable, FK → String |
| station | Station? | nullable, FK → Station |
| relatedType | String? | nullable, FK → String |
| relatedId | String? | nullable, FK → String |
| snapshot | Json? | nullable |
| storagePath | String? | nullable, FK → String |
| fileName | String? | nullable, FK → String |
| mimeType | String? | nullable, FK → String |
| sizeBytes | Int? | nullable |
| sha256 | String? | nullable, FK → String |
| createdById | String? | nullable, FK → String |
| createdBy | User? | nullable, FK → User |
| createdAt | DateTime | default now( |

Constraints/indexes: `@@index([officerId, createdAt])`, `@@index([kind, createdAt])`, `@@index([stationId])`

### PayComponent

Referential of pay elements other than the base salary: bonuses (primes), allowances (indemnités), benefits in kind (avantages) and deductions (retenues). FIXED = FCFA per month; PERCENT_OF_BASE = whole percent of the base salary.

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| code | String | unique, FK → String |
| name | String | FK → String |
| kind | PayComponentKind | enum |
| calculation | PayCalculation | enum, default FIXED |
| defaultValue | Int | default 0 |
| description | String? | nullable, FK → String |
| isActive | Boolean | default true |
| createdAt | DateTime | default now( |
| elements | OfficerPayElement[] | 1→N relation |

### PayScaleEntry

Base monthly salary (FCFA) of a rank from a date. Changes are requested then validated by someone else; history is kept.

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| rankId | String | FK → String |
| rank | Rank | FK → Rank |
| amount | Int |  |
| effectiveFrom | DateTime |  |
| status | PayApprovalStatus | enum, default PENDING |
| createdById | String? | nullable, FK → String |
| createdBy | User? | nullable, FK → User |
| validatedById | String? | nullable, FK → String |
| validatedBy | User? | nullable, FK → User |
| validatedAt | DateTime? | nullable |
| note | String? | nullable, FK → String |
| createdAt | DateTime | default now( |

Constraints/indexes: `@@unique([rankId, effectiveFrom])`, `@@index([rankId, status, effectiveFrom])`

### OfficerPayElement

A pay element granted to an officer for a period. Becomes effective only after validation by a person other than the requester.

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| officerId | String | FK → String |
| officer | Officer | FK → Officer |
| componentId | String | FK → String |
| component | PayComponent | FK → PayComponent |
| value | Int? | nullable |
| startDate | DateTime |  |
| endDate | DateTime? | nullable |
| status | PayApprovalStatus | enum, default PENDING |
| reason | String | FK → String |
| decisionRef | String? | nullable, FK → String |
| requestedById | String? | nullable, FK → String |
| requestedBy | User? | nullable, FK → User |
| validatedById | String? | nullable, FK → String |
| validatedBy | User? | nullable, FK → User |
| validatedAt | DateTime? | nullable |
| note | String? | nullable, FK → String |
| endReason | String? | nullable, FK → String |
| createdAt | DateTime | default now( |

Constraints/indexes: `@@index([officerId, status])`, `@@index([status, createdAt])`

### PayRun

Monthly pay statement (état récapitulatif) of the whole force. Frozen once validated; it is a statement for the financial services, the system never moves money.

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| period | String | unique, FK → String |
| status | PayRunStatus | enum, default DRAFT |
| generatedById | String? | nullable, FK → String |
| generatedBy | User? | nullable, FK → User |
| validatedById | String? | nullable, FK → String |
| validatedBy | User? | nullable, FK → User |
| validatedAt | DateTime? | nullable |
| exportedAt | DateTime? | nullable |
| exportCount | Int | default 0 |
| officers | Int | default 0 |
| suspendedCount | Int | default 0 |
| excludedNoScale | Int | default 0 |
| excludedStatus | Int | default 0 |
| totalBase | BigInt | default 0 |
| totalGross | BigInt | default 0 |
| totalDeductions | BigInt | default 0 |
| totalNet | BigInt | default 0 |
| suspendedPercent | Int | default 100 |
| createdAt | DateTime | default now( |
| lines | PayRunLine[] | 1→N relation |

### PayRunLine

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| runId | String | FK → String |
| run | PayRun | FK → PayRun, cascade |
| officerId | String | FK → String |
| officer | Officer | FK → Officer |
| rankId | String | FK → String |
| stationId | String | FK → String |
| regionId | String | FK → String |
| status | AdministrativeStatus | enum |
| base | Int |  |
| gross | Int |  |
| deductions | Int |  |
| net | Int |  |
| detail | Json |  |

Constraints/indexes: `@@unique([runId, officerId])`, `@@index([officerId])`, `@@index([runId, rankId])`, `@@index([runId, regionId])`

### Skill

Competence referential and the competences held by officers (granted by evaluated trainings).

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| code | String | unique, FK → String |
| name | String | FK → String |
| isActive | Boolean | default true |
| holders | OfficerSkill[] | 1→N relation |

### OfficerSkill

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| officerId | String | FK → String |
| officer | Officer | FK → Officer |
| skillId | String | FK → String |
| skill | Skill | FK → Skill |
| level | Int |  |
| acquiredAt | DateTime |  |
| expiresAt | DateTime? | nullable |
| trainingId | String? | nullable, FK → String |
| training | Training? | nullable, FK → Training |

Constraints/indexes: `@@unique([officerId, skillId])`

### RotationException

Administrative exception: the officer is skipped by the automatic rotation while it is active.

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| officerId | String | FK → String |
| officer | Officer | FK → Officer |
| reason | String | FK → String |
| startsAt | DateTime |  |
| endsAt | DateTime? | nullable |
| createdById | String? | nullable, FK → String |
| createdBy | User? | nullable, FK → User |
| endedAt | DateTime? | nullable |
| createdAt | DateTime | default now( |

Constraints/indexes: `@@index([officerId])`

### RotationAlert

Idempotence ledger of the automatic rotation: one UPCOMING and one DUE alert per officer and post tenure.

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| officerId | String | FK → String |
| officer | Officer | FK → Officer |
| kind | RotationAlertKind | enum |
| postSince | DateTime |  |
| transferId | String? | nullable, FK → String |
| createdAt | DateTime | default now( |

Constraints/indexes: `@@unique([officerId, postSince, kind])`, `@@index([kind, createdAt])`

### Position

Fonction (post/duty title) referential, e.g. Commissaire, Chef de service, Officier de police judiciaire.

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| code | String | unique, FK → String |
| name | String | FK → String |
| description | String? | nullable, FK → String |
| isActive | Boolean | default true |
| assignments | OfficerAssignment[] | 1→N relation |
| officers | Officer[] | 1→N relation |

### Training

Training / certification record of an officer.

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| officerId | String | FK → String |
| officer | Officer | FK → Officer |
| title | String | FK → String |
| provider | String? | nullable, FK → String |
| category | String? | nullable, FK → String |
| startDate | DateTime |  |
| endDate | DateTime? | nullable |
| status | TrainingStatus | enum, default PLANNED |
| result | String? | nullable, FK → String |
| certificateNo | String? | nullable, FK → String |
| expiresAt | DateTime? | nullable |
| notes | String? | nullable, FK → String |
| recordedById | String? | nullable, FK → String |
| recordedBy | User? | nullable, FK → User |
| kind | TrainingKind | enum, default CONTINUING |
| score | Float? | nullable |
| passed | Boolean? | nullable |
| evaluatedAt | DateTime? | nullable |
| certificateIssuedAt | DateTime? | nullable |
| skillsGranted | OfficerSkill[] | 1→N relation |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |

Constraints/indexes: `@@index([officerId, startDate])`, `@@index([status])`


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
| stationId | String? | nullable, FK → String |
| station | Station? | nullable, FK → Station |
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
| fingerprintRecords | FingerprintRecord[] | 1→N relation |
| faceRecords | FaceRecord[] | 1→N relation |
| voiceRecords | VoiceRecord[] | 1→N relation |
| plateDetections | LicensePlateDetection[] | 1→N relation |
| biometricMatches | BiometricMatch[] | 1→N relation |
| biometricTopMatches | BiometricSearch[] | 1→N relation |
| trafficDriver | TrafficDriver? | nullable, FK → TrafficDriver |
| trafficVehiclesOwned | TrafficVehicle[] | 1→N relation |
| trafficControlsAsDriver | TrafficControl[] | 1→N relation |
| trafficTicketsAsDriver | TrafficTicket[] | 1→N relation |
| trafficFinesAsDriver | TrafficFine[] | 1→N relation |

Constraints/indexes: `@@index([lastName, firstName])`, `@@index([phone])`, `@@index([dateOfBirth])`, `@@index([regionId])`, `@@index([stationId])`

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
| regionId | String | FK → String |
| region | Region | FK → Region |
| stationId | String | FK → String |
| station | Station | FK → Station |
| offense | String | FK → String |
| reason | String | FK → String |
| dangerLevel | DangerLevel | enum, default MEDIUM |
| status | WantedStatus | enum, default DRAFT |
| lastSeenLocation | String? | nullable, FK → String |
| lastSeenAt | DateTime? | nullable |
| warrantId | String? | nullable, FK → String |
| warrant | Warrant? | nullable, FK → Warrant |
| mainPhotoDocumentId | String? | unique, nullable, FK → String |
| mainPhoto | Document? | nullable, FK → Document |
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
| sightings | WantedSighting[] | 1→N relation |
| vehicles | WantedVehicle[] | 1→N relation |
| photos | Document[] | 1→N relation |

Constraints/indexes: `@@index([status])`, `@@index([personId])`, `@@index([caseId])`, `@@index([warrantId])`, `@@index([stationId, status])`, `@@index([regionId])`

### WantedSighting

Location-sighting log (spec: location + date/time + source + officer + notes, latest cached on WantedPerson.lastSeenLocation/lastSeenAt for quick display).

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| wantedPersonId | String | FK → String |
| wantedPerson | WantedPerson | FK → WantedPerson |
| location | String | FK → String |
| occurredAt | DateTime |  |
| source | String? | nullable, FK → String |
| officerId | String | FK → String |
| officer | User | FK → User |
| notes | String? | nullable, FK → String |
| createdAt | DateTime | default now( |

Constraints/indexes: `@@index([wantedPersonId, occurredAt])`

### String?

| Column | Type | Notes |
| ------ | ---- | ----- |
| color | String? | nullable, FK → String |
| year | Int? | nullable |
| notes | String? | nullable, FK → String |
| addedById | String | FK → String |
| addedBy | User | FK → User |
| createdAt | DateTime | default now( |

Constraints/indexes: `@@index([wantedPersonId])`


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
| biometricSearches | BiometricSearch[] | 1→N relation |
| licensePlateDetections | LicensePlateDetection[] | 1→N relation |
| trafficControls | TrafficControl[] | 1→N relation |

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
| fingerprintRecords | FingerprintRecord[] | 1→N relation |
| faceRecords | FaceRecord[] | 1→N relation |
| voiceRecords | VoiceRecord[] | 1→N relation |
| licensePlateDetections | LicensePlateDetection[] | 1→N relation |

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
| wantedPersons | WantedPerson[] | 1→N relation |

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
| trafficControls | TrafficControl[] | 1→N relation |

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
| wantedPersonId | String? | nullable, FK → String |
| wantedPerson | WantedPerson? | nullable, FK → WantedPerson |
| isArchived | Boolean | default false |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |
| deletedAt | DateTime? | nullable |
| versions | DocumentVersion[] | 1→N relation |
| transcript | Transcript? | nullable, FK → Transcript |
| generated | GeneratedReport? | nullable, FK → GeneratedReport |
| mainPhotoOfWanted | WantedPerson? | nullable, FK → WantedPerson |
| trafficDriverPhoto | TrafficDriver? | nullable, FK → TrafficDriver |
| trafficEvidence | TrafficEvidence? | nullable, FK → TrafficEvidence |
| cashDeposit | TrafficDeposit? | nullable, FK → TrafficDeposit |
| cashDiscrepancy | TrafficCashDiscrepancy? | nullable, FK → TrafficCashDiscrepancy |
| trafficVehicleDocument | TrafficVehicleDocument? | nullable, FK → TrafficVehicleDocument |

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


## 13. BIOMETRIC & FORENSIC IDENTIFICATION

### FingerprintRecord

Encrypted biometric template (never a raw image). The optional source capture, if retained, is a normal Evidence row (hash, chain of custody) — biometric tables never hold file bytes themselves.

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| number | String | unique, FK → String |
| personId | String | FK → String |
| person | Person | FK → Person |
| position | FingerPosition | enum, default UNKNOWN |
| templateSecretEnc | String | FK → String |
| quality | Int? | nullable |
| device | String? | nullable, FK → String |
| sourceEvidenceId | String? | nullable, FK → String |
| sourceEvidence | Evidence? | nullable, FK → Evidence |
| capturedById | String | FK → String |
| capturedBy | User | FK → User |
| capturedAt | DateTime | default now( |
| isActive | Boolean | default true |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |

Constraints/indexes: `@@index([personId])`

### FaceRecord

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| number | String | unique, FK → String |
| personId | String | FK → String |
| person | Person | FK → Person |
| templateSecretEnc | String | FK → String |
| quality | Int? | nullable |
| device | String? | nullable, FK → String |
| sourceEvidenceId | String? | nullable, FK → String |
| sourceEvidence | Evidence? | nullable, FK → Evidence |
| capturedById | String | FK → String |
| capturedBy | User | FK → User |
| capturedAt | DateTime | default now( |
| isActive | Boolean | default true |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |

Constraints/indexes: `@@index([personId])`

### VoiceRecord

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| number | String | unique, FK → String |
| personId | String | FK → String |
| person | Person | FK → Person |
| templateSecretEnc | String | FK → String |
| durationSeconds | Int? | nullable |
| device | String? | nullable, FK → String |
| sourceEvidenceId | String? | nullable, FK → String |
| sourceEvidence | Evidence? | nullable, FK → Evidence |
| capturedById | String | FK → String |
| capturedBy | User | FK → User |
| capturedAt | DateTime | default now( |
| isActive | Boolean | default true |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |

Constraints/indexes: `@@index([personId])`

### LicensePlateDetection

One row per plate-read event. A plate's "vehicle profile" is derived by querying all rows for the same plateNumber (most recent first) — deliberately not a master vehicle table (see Vehicle, which is the internal fleet, not a civilian/suspect vehicle registry).

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| number | String | unique, FK → String |
| plateNumber | String | FK → String |
| vehicleMake | String? | nullable, FK → String |
| vehicleModel | String? | nullable, FK → String |
| vehicleColor | String? | nullable, FK → String |
| cameraId | String? | nullable, FK → String |
| locationText | String? | nullable, FK → String |
| latitude | Float? | nullable |
| longitude | Float? | nullable |
| detectedAt | DateTime |  |
| caseId | String? | nullable, FK → String |
| case | Case? | nullable, FK → Case |
| personId | String? | nullable, FK → String |
| person | Person? | nullable, FK → Person |
| sourceEvidenceId | String? | nullable, FK → String |
| sourceEvidence | Evidence? | nullable, FK → Evidence |
| status | LprStatus | enum, default NEW |
| recordedById | String | FK → String |
| recordedBy | User | FK → User |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |

Constraints/indexes: `@@index([plateNumber])`, `@@index([caseId])`, `@@index([detectedAt])`

### BiometricSearch

The mandatory audit/history record for every biometric search (spec: no anonymous search, case + reason + officer + type required). Core fields are write-once; only recordBiometricAction() may later touch action/actionNotes/actionById/actionAt. No delete path exists anywhere in the app.

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| number | String | unique, FK → String |
| type | BiometricType | enum |
| mode | BiometricSearchMode | enum |
| caseId | String | FK → String |
| case | Case | FK → Case |
| reason | String | FK → String |
| officerId | String | FK → String |
| officer | User | FK → User |
| device | String? | nullable, FK → String |
| location | String? | nullable, FK → String |
| parameters | Json? | nullable |
| resultCount | Int | default 0 |
| result | BiometricSearchResult | enum, default NO_MATCH |
| topMatchScore | Decimal? | nullable |
| topMatchPersonId | String? | nullable, FK → String |
| topMatchPerson | Person? | nullable, FK → Person |
| action | BiometricAction | enum, default NONE |
| actionNotes | String? | nullable, FK → String |
| actionById | String? | nullable, FK → String |
| actionBy | User? | nullable, FK → User |
| actionAt | DateTime? | nullable |
| isDemo | Boolean | default true |
| ipAddress | String? | nullable, FK → String |
| createdAt | DateTime | default now( |
| matches | BiometricMatch[] | 1→N relation |

Constraints/indexes: `@@index([caseId])`, `@@index([type])`, `@@index([officerId])`, `@@index([createdAt])`

### BiometricMatch

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| searchId | String | FK → String |
| search | BiometricSearch | FK → BiometricSearch |
| personId | String? | nullable, FK → String |
| person | Person? | nullable, FK → Person |
| score | Decimal |  |
| sourceLabel | String | FK → String |
| rank | Int |  |
| createdAt | DateTime | default now( |

Constraints/indexes: `@@unique([searchId, rank])`, `@@index([searchId])`


## 14. TRAFFIC OFFENCES AND FINES (Gestion des infractions routières et des amendes)

### TrafficViolationCategory

The three parts of the official offence table: A road offences, B cycles & motorcycles, C moto-taxis.

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| code | String | unique, FK → String |
| name | String | FK → String |
| sourceHeading | String? | nullable, FK → String |
| sortOrder | Int |  |
| createdAt | DateTime | default now( |
| violations | TrafficViolation[] | 1→N relation |

### TrafficLegalReference

Legal text of an offence, copied verbatim from the source table (several offences may share one).

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| reference | String | unique, FK → String |
| createdAt | DateTime | default now( |
| violations | TrafficViolation[] | 1→N relation |

### TrafficViolation

Offence catalogue imported verbatim from the official table (name, class, legal text, flat fine). `fineAmountFcfa` is null for a « Délit » (the source states « Interdiction d'arbitrer » instead of an amount).

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| code | String | unique, FK → String |
| categoryId | String | FK → String |
| category | TrafficViolationCategory | FK → TrafficViolationCategory |
| legalReferenceId | String | FK → String |
| legalReference | TrafficLegalReference | FK → TrafficLegalReference |
| name | String | FK → String |
| offenceClass | TrafficOffenceClass | enum |
| classText | String | FK → String |
| fineAmountFcfa | Int? | nullable |
| fineAmountText | String | FK → String |
| isFineEligible | Boolean |  |
| sourcePage | Int |  |
| sourceOrder | Int | unique |
| sourceNote | String? | nullable, FK → String |
| isActive | Boolean | default true |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |
| ticketOffences | TrafficTicketOffence[] | 1→N relation |

Constraints/indexes: `@@index([categoryId])`, `@@index([offenceClass])`, `@@index([name])`

### TrafficDriver

Driver profile of a Person (identity, phone and address stay on Person; the CNI is a PersonIdentifier).

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| personId | String | unique, FK → String |
| person | Person | FK → Person |
| licenseNumber | String? | unique, nullable, FK → String |
| licenseCategory | String? | nullable, FK → String |
| licenseIssuedAt | DateTime? | nullable |
| licenseExpiresAt | DateTime? | nullable |
| licenseIssuedBy | String? | nullable, FK → String |
| photoDocumentId | String? | unique, nullable, FK → String |
| photo | Document? | nullable, FK → Document |
| notes | String? | nullable, FK → String |
| createdById | String | FK → String |
| createdBy | User | FK → User |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |
| controls | TrafficControl[] | 1→N relation |

### String?

| Column | Type | Notes |
| ------ | ---- | ----- |
| color | String? | nullable, FK → String |
| vehicleType | TrafficVehicleType | enum, default CAR |
| year | Int? | nullable |
| ownerPersonId | String? | nullable, FK → String |
| owner | Person? | nullable, FK → Person |
| chassisNumber | String? | unique, nullable, FK → String |
| insuranceCompany | String? | nullable, FK → String |
| insurancePolicyNumber | String? | nullable, FK → String |
| insuranceExpiresAt | DateTime? | nullable |
| technicalInspectionExpiresAt | DateTime? | nullable |
| status | TrafficVehicleStatus | enum, default ACTIVE |
| notes | String? | nullable, FK → String |
| createdById | String | FK → String |
| createdBy | User | FK → User |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |
| documents | TrafficVehicleDocument[] | 1→N relation |
| controls | TrafficControl[] | 1→N relation |

Constraints/indexes: `@@index([ownerPersonId])`

### TrafficVehicleDocument

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| vehicleId | String | FK → String |
| vehicle | TrafficVehicle |  |
| type | TrafficVehicleDocType | enum |
| number | String? | nullable, FK → String |
| issuedAt | DateTime? | nullable |
| expiresAt | DateTime? | nullable |
| documentId | String? | unique, nullable, FK → String |
| document | Document? | nullable, FK → Document |
| notes | String? | nullable, FK → String |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |

Constraints/indexes: `@@index([vehicleId, type])`

### TrafficControl

A roadside control by an officer. May end without offence (COMPLIANT) or lead to one PV (ticket).

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| number | String | unique, FK → String |
| controlledAt | DateTime |  |
| location | String | FK → String |
| latitude | Float? | nullable |
| longitude | Float? | nullable |
| stationId | String | FK → String |
| station | Station | FK → Station |
| regionId | String | FK → String |
| region | Region | FK → Region |
| officerId | String | FK → String |
| officer | User | FK → User |
| driverPersonId | String? | nullable, FK → String |
| driverPerson | Person? | nullable, FK → Person |
| driverId | String? | nullable, FK → String |
| driver | TrafficDriver? | nullable, FK → TrafficDriver |
| licenseNumber | String? | nullable, FK → String |
| vehicleId | String? | nullable, FK → String |
| vehicle | TrafficVehicle? | nullable |
| plateNumber | String? | nullable, FK → String |
| vehicleType | TrafficVehicleType | enum, default CAR |
| vehicleMake | String? | nullable, FK → String |
| vehicleColor | String? | nullable, FK → String |
| outcome | TrafficControlOutcome | enum, default COMPLIANT |
| observations | String? | nullable, FK → String |
| caseId | String? | nullable, FK → String |
| case | Case? | nullable, FK → Case |
| incidentId | String? | nullable, FK → String |
| incident | Incident? | nullable, FK → Incident |
| isDemo | Boolean | default false |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |
| ticket | TrafficTicket? | nullable, FK → TrafficTicket |
| evidence | TrafficEvidence[] | 1→N relation |

Constraints/indexes: `@@index([stationId, controlledAt])`, `@@index([regionId, controlledAt])`, `@@index([officerId, controlledAt])`, `@@index([controlledAt])`, `@@index([plateNumber])`, `@@index([driverPersonId])`

### TrafficTicket

Procès-verbal électronique. Offence lines are snapshots of the catalogue at issue time; `contentHash`/`signature` seal the content (tamper evidence) and `verificationToken` feeds the public QR check.

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| number | String | unique, FK → String |
| verificationToken | String | unique, FK → String |
| controlId | String | unique, FK → String |
| control | TrafficControl | FK → TrafficControl |
| status | TrafficTicketStatus | enum, default ISSUED |
| issuedAt | DateTime | default now( |
| stationId | String | FK → String |
| station | Station | FK → Station |
| regionId | String | FK → String |
| region | Region | FK → Region |
| issuedById | String | FK → String |
| issuedBy | User | FK → User |
| driverPersonId | String? | nullable, FK → String |
| driverPerson | Person? | nullable, FK → Person |
| plateNumber | String? | nullable, FK → String |
| totalFineFcfa | Int |  |
| hasNonSettleableOffence | Boolean | default false |
| observations | String? | nullable, FK → String |
| contentHash | String | FK → String |
| signature | String | FK → String |
| signedAt | DateTime | default now( |
| cancelledAt | DateTime? | nullable |
| cancelledById | String? | nullable, FK → String |
| cancelledBy | User? | nullable, FK → User |
| cancellationReason | String? | nullable, FK → String |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |
| offences | TrafficTicketOffence[] | 1→N relation |
| fine | TrafficFine? | nullable, FK → TrafficFine |

Constraints/indexes: `@@index([stationId, issuedAt])`, `@@index([regionId, issuedAt])`, `@@index([issuedById, issuedAt])`, `@@index([plateNumber])`, `@@index([driverPersonId])`

### TrafficTicketOffence

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| ticketId | String | FK → String |
| ticket | TrafficTicket | FK → TrafficTicket |
| violationId | String | FK → String |
| violation | TrafficViolation | FK → TrafficViolation |
| code | String | FK → String |
| name | String | FK → String |
| classText | String | FK → String |
| legalReference | String | FK → String |
| amountFcfa | Int? | nullable |
| amountText | String | FK → String |
| createdAt | DateTime | default now( |

Constraints/indexes: `@@unique([ticketId, violationId])`, `@@index([violationId])`

### TrafficFine

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| number | String | unique, FK → String |
| ticketId | String | unique, FK → String |
| ticket | TrafficTicket | FK → TrafficTicket |
| status | TrafficFineStatus | enum, default TO_PAY |
| amountFcfa | Int |  |
| amountPaidFcfa | Int | default 0 |
| issuedAt | DateTime | default now( |
| dueDate | DateTime? | nullable |
| paidAt | DateTime? | nullable |
| driverPersonId | String? | nullable, FK → String |
| driverPerson | Person? | nullable, FK → Person |
| plateNumber | String? | nullable, FK → String |
| officerId | String | FK → String |
| officer | User | FK → User |
| stationId | String | FK → String |
| station | Station | FK → Station |
| regionId | String | FK → String |
| region | Region | FK → Region |
| contestedAt | DateTime? | nullable |
| contestReason | String? | nullable, FK → String |
| statusNote | String? | nullable, FK → String |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |
| payments | TrafficPayment[] | 1→N relation |
| receipts | TrafficReceipt[] | 1→N relation |

Constraints/indexes: `@@index([status])`, `@@index([stationId, issuedAt])`, `@@index([regionId, issuedAt])`, `@@index([driverPersonId])`, `@@index([plateNumber])`

### TrafficPayment

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| number | String | unique, FK → String |
| fineId | String | FK → String |
| fine | TrafficFine | FK → TrafficFine |
| amountFcfa | Int |  |
| method | TrafficPaymentMethod | enum |
| provider | String? | nullable, FK → String |
| transactionReference | String? | nullable, FK → String |
| paidAt | DateTime |  |
| receivedById | String | FK → String |
| receivedBy | User | FK → User |
| stationId | String? | nullable, FK → String |
| station | Station? | nullable, FK → Station |
| paymentPoint | String? | nullable, FK → String |
| status | TrafficPaymentStatus | enum, default COMPLETED |
| voidedAt | DateTime? | nullable |
| voidedById | String? | nullable, FK → String |
| voidedBy | User? | nullable, FK → User |
| voidReason | String? | nullable, FK → String |
| notes | String? | nullable, FK → String |
| createdAt | DateTime | default now( |
| receipt | TrafficReceipt? | nullable, FK → TrafficReceipt |
| cashTransaction | TrafficCashTransaction? | nullable, FK → TrafficCashTransaction |
| depositItems | TrafficDepositItem[] | 1→N relation |

Constraints/indexes: `@@unique([method, transactionReference])`, `@@index([fineId])`, `@@index([paidAt])`

### TrafficReceipt

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| number | String | unique, FK → String |
| verificationToken | String | unique, FK → String |
| paymentId | String | unique, FK → String |
| payment | TrafficPayment | FK → TrafficPayment |
| fineId | String | FK → String |
| fine | TrafficFine | FK → TrafficFine |
| amountFcfa | Int |  |
| issuedAt | DateTime | default now( |
| issuedById | String | FK → String |
| issuedBy | User | FK → User |

Constraints/indexes: `@@index([fineId])`

### TrafficEvidence

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| controlId | String | FK → String |
| control | TrafficControl | FK → TrafficControl |
| kind | TrafficEvidenceKind | enum, default PHOTO |
| documentId | String | unique, FK → String |
| document | Document | FK → Document |
| caption | String? | nullable, FK → String |
| latitude | Float? | nullable |
| longitude | Float? | nullable |
| capturedAt | DateTime? | nullable |
| uploadedById | String | FK → String |
| uploadedBy | User | FK → User |
| createdAt | DateTime | default now( |

Constraints/indexes: `@@index([controlId])`

### TrafficCashRegister

The electronic cash register of a collecting agent. One OPEN register per agent (partial unique index).

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| number | String | unique, FK → String |
| agentId | String | FK → String |
| agent | User | FK → User |
| agentBadge | String? | nullable, FK → String |
| stationId | String | FK → String |
| station | Station | FK → Station |
| regionId | String | FK → String |
| region | Region | FK → Region |
| status | TrafficCashRegisterStatus | enum, default OPEN |
| openedAt | DateTime | default now( |
| openingBalanceFcfa | Int | default 0 |
| closedAt | DateTime? | nullable |
| closedById | String? | nullable, FK → String |
| closedBy | User? | nullable, FK → User |
| blockedAt | DateTime? | nullable |
| blockedById | String? | nullable, FK → String |
| blockedBy | User? | nullable, FK → User |
| blockReason | String? | nullable, FK → String |
| notes | String? | nullable, FK → String |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |
| transactions | TrafficCashTransaction[] | 1→N relation |
| closure | TrafficDailyClosure? | nullable, FK → TrafficDailyClosure |
| collection | TrafficRevenueCollection? | nullable, FK → TrafficRevenueCollection |
| deposits | TrafficDeposit[] | 1→N relation |
| discrepancies | TrafficCashDiscrepancy[] | 1→N relation |

Constraints/indexes: `@@index([agentId, status])`, `@@index([stationId, openedAt])`, `@@index([regionId, openedAt])`

### TrafficCashTransaction

One line per payment collected into a register. `paymentId` is unique: a payment can never be counted twice.

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| registerId | String | FK → String |
| register | TrafficCashRegister | FK → TrafficCashRegister |
| paymentId | String | unique, FK → String |
| payment | TrafficPayment | FK → TrafficPayment |
| amountFcfa | Int |  |
| method | TrafficPaymentMethod | enum |
| recordedAt | DateTime | default now( |
| voidedAt | DateTime? | nullable |

Constraints/indexes: `@@index([registerId])`

### TrafficDailyClosure

Daily closing statement (état journalier des recettes): frozen at closing, append-only.

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| number | String | unique, FK → String |
| registerId | String | unique, FK → String |
| register | TrafficCashRegister | FK → TrafficCashRegister |
| paymentsCount | Int |  |
| finesTotalFcfa | Int |  |
| collectedFcfa | Int |  |
| cashFcfa | Int |  |
| electronicFcfa | Int |  |
| mobileMoneyFcfa | Int |  |
| otherFcfa | Int |  |
| amountToDepositFcfa | Int |  |
| receiptNumbers | Json |  |
| ticketNumbers | Json |  |
| closedById | String | FK → String |
| closedBy | User | FK → User |
| closedAt | DateTime | default now( |
| notes | String? | nullable, FK → String |
| collection | TrafficRevenueCollection? | nullable, FK → TrafficRevenueCollection |

### TrafficRevenueCollection

The revenue a closed register owes to the administration, and how much of it has been deposited / validated.

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| number | String | unique, FK → String |
| registerId | String | unique, FK → String |
| register | TrafficCashRegister | FK → TrafficCashRegister |
| closureId | String | unique, FK → String |
| closure | TrafficDailyClosure | FK → TrafficDailyClosure |
| agentId | String | FK → String |
| agent | User | FK → User |
| stationId | String | FK → String |
| station | Station | FK → Station |
| regionId | String | FK → String |
| region | Region | FK → Region |
| periodFrom | DateTime |  |
| periodTo | DateTime |  |
| collectedFcfa | Int |  |
| depositedFcfa | Int | default 0 |
| validatedFcfa | Int | default 0 |
| status | TrafficCollectionStatus | enum, default TO_DEPOSIT |
| verifiedById | String? | nullable, FK → String |
| verifiedBy | User? | nullable, FK → User |
| verifiedAt | DateTime? | nullable |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |
| deposits | TrafficDeposit[] | 1→N relation |
| reconciliation | TrafficReconciliation? | nullable, FK → TrafficReconciliation |
| discrepancies | TrafficCashDiscrepancy[] | 1→N relation |

Constraints/indexes: `@@index([stationId, createdAt])`, `@@index([regionId, createdAt])`, `@@index([agentId])`

### TrafficDeposit

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| number | String | unique, FK → String |
| collectionId | String | FK → String |
| collection | TrafficRevenueCollection | FK → TrafficRevenueCollection |
| registerId | String | FK → String |
| register | TrafficCashRegister | FK → TrafficCashRegister |
| agentId | String | FK → String |
| agent | User | FK → User |
| agentBadge | String? | nullable, FK → String |
| stationId | String | FK → String |
| station | Station | FK → Station |
| regionId | String | FK → String |
| region | Region | FK → Region |
| periodFrom | DateTime |  |
| periodTo | DateTime |  |
| collectedFcfa | Int |  |
| amountDueFcfa | Int |  |
| amountDepositedFcfa | Int |  |
| method | TrafficDepositMethod | enum |
| slipNumber | String? | nullable, FK → String |
| reference | String? | nullable, FK → String |
| recipient | String? | nullable, FK → String |
| depositedAt | DateTime |  |
| depositedById | String | FK → String |
| depositedBy | User | FK → User |
| receivedById | String? | nullable, FK → String |
| receivedBy | User? | nullable, FK → User |
| observations | String? | nullable, FK → String |
| attachmentDocumentId | String? | unique, nullable, FK → String |
| attachmentDocument | Document? | nullable, FK → Document |
| status | TrafficDepositStatus | enum, default SUBMITTED |
| attempt | Int | default 1 |
| previousDepositId | String? | nullable, FK → String |
| reviewedById | String? | nullable, FK → String |
| reviewedBy | User? | nullable, FK → User |
| reviewedAt | DateTime? | nullable |
| reviewNote | String? | nullable, FK → String |
| validatedById | String? | nullable, FK → String |
| validatedBy | User? | nullable, FK → User |
| validatedAt | DateTime? | nullable |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |
| items | TrafficDepositItem[] | 1→N relation |
| slip | TrafficDepositReceipt? | nullable, FK → TrafficDepositReceipt |

Constraints/indexes: `@@index([collectionId])`, `@@index([status])`, `@@index([stationId, depositedAt])`, `@@index([regionId, depositedAt])`

### TrafficDepositItem

Snapshot of the payments covered by a deposit (traceability: PV → fine → payment → receipt → deposit).

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| depositId | String | FK → String |
| deposit | TrafficDeposit | FK → TrafficDeposit |
| paymentId | String | FK → String |
| payment | TrafficPayment | FK → TrafficPayment |
| amountFcfa | Int |  |

Constraints/indexes: `@@unique([depositId, paymentId])`

### TrafficDepositReceipt

Bordereau de versement des recettes (append-only, verifiable by QR code).

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| number | String | unique, FK → String |
| verificationToken | String | unique, FK → String |
| depositId | String | unique, FK → String |
| deposit | TrafficDeposit | FK → TrafficDeposit |
| contentHash | String | FK → String |
| issuedAt | DateTime | default now( |
| issuedById | String | FK → String |
| issuedBy | User | FK → User |

### TrafficReconciliation

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| number | String | unique, FK → String |
| collectionId | String | unique, FK → String |
| collection | TrafficRevenueCollection | FK → TrafficRevenueCollection |
| collectedFcfa | Int |  |
| depositedFcfa | Int |  |
| validatedFcfa | Int |  |
| gapFcfa | Int |  |
| status | TrafficReconciliationStatus | enum, default PENDING |
| computedAt | DateTime | default now( |
| decidedById | String? | nullable, FK → String |
| decidedBy | User? | nullable, FK → User |
| decidedAt | DateTime? | nullable |
| note | String? | nullable, FK → String |
| updatedAt | DateTime | auto-updated |
| discrepancies | TrafficCashDiscrepancy[] | 1→N relation |

### TrafficCashDiscrepancy

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | String | PK, FK → String, default cuid( |
| number | String | unique, FK → String |
| reconciliationId | String | FK → String |
| reconciliation | TrafficReconciliation | FK → TrafficReconciliation |
| collectionId | String | FK → String |
| collection | TrafficRevenueCollection | FK → TrafficRevenueCollection |
| registerId | String | FK → String |
| register | TrafficCashRegister | FK → TrafficCashRegister |
| agentId | String | FK → String |
| agent | User | FK → User |
| amountFcfa | Int |  |
| reason | String? | nullable, FK → String |
| justification | String? | nullable, FK → String |
| attachmentDocumentId | String? | unique, nullable, FK → String |
| attachmentDocument | Document? | nullable, FK → Document |
| status | TrafficDiscrepancyStatus | enum, default OPEN |
| validatedById | String? | nullable, FK → String |
| validatedBy | User? | nullable, FK → User |
| validatedAt | DateTime? | nullable |
| createdAt | DateTime | default now( |
| updatedAt | DateTime | auto-updated |

Constraints/indexes: `@@index([status])`, `@@index([agentId])`


## Enumerations

- **UserStatus**: PENDING, ACTIVE, LOCKED, SUSPENDED, DISABLED
- **ScopeLevel**: NATIONAL, REGIONAL, DEPARTMENTAL, STATION, OWN
- **CommuneType**: COMMUNE, SOUS_PREFECTURE, ARRONDISSEMENT
- **LocalityType**: QUARTIER, VILLAGE, CANTON, LOCALITE
- **StationType**: HEADQUARTERS, DELEGATION, PROVINCIAL_DIRECTION, DEPARTMENTAL_DIRECTION, CENTRAL_STATION, STATION, POST, UNIT, BRIGADE, SPECIAL_UNIT
- **StationStatus**: ACTIVE, INACTIVE, UNDER_CONSTRUCTION, PLANNED
- **DepartmentType**: COMMAND, INVESTIGATION, PATROL, TRAFFIC, FORENSICS, INTELLIGENCE, CUSTODY, LOGISTICS, ADMINISTRATION, SPECIAL
- **RankCategory**: COMMISSIONER, OFFICER, INSPECTOR, NON_COMMISSIONED, CONSTABLE, CIVILIAN
- **Gender**: MALE, FEMALE, OTHER, UNKNOWN
- **DutyStatus**: ON_DUTY, OFF_DUTY, ON_LEAVE, TRAINING, SUSPENDED, RETIRED, DECEASED
- **AdministrativeStatus**: ACTIVE, SECONDED, AT_DISPOSAL, SUSPENDED, RETIRED, CEASED, DECEASED
- **CareerEventType**: RECRUITMENT, APPOINTMENT, PROMOTION, ADVANCEMENT, FUNCTION_CHANGE, TRANSFER, SECONDMENT, AT_DISPOSAL, REINSTATEMENT, RETIREMENT, CESSATION, SUSPENSION
- **TransferStatus**: PROPOSED, HR_APPROVED, APPROVED, EXECUTED, REJECTED, CANCELLED
- **TransferOrigin**: MANUAL, AUTOMATIC
- **AttendanceStatus**: PRESENT, LATE, ABSENT, ON_LEAVE, PERMISSION, UNAVAILABLE
- **LeaveType**: ANNUAL, EXCEPTIONAL, PERMISSION, ABSENCE_AUTHORIZATION, UNAVAILABILITY
- **LeaveStatus**: REQUESTED, APPROVED, REJECTED, CANCELLED
- **DisciplineStatus**: OPEN, IN_PROCEDURE, DECIDED, CLOSED
- **DisciplineStepKind**: NOTIFICATION, HEARING, REPORT, NOTE
- **SanctionKind**: NO_ACTION, WARNING, REPRIMAND, SUSPENSION, DISMISSAL
- **DistinctionKind**: COMMENDATION, CITATION, MEDAL, REWARD
- **HrDocumentKind**: ASSIGNMENT_DECISION, APPOINTMENT_ORDER, TRANSFER_DECISION, WORK_CERTIFICATE, TRAINING_DOCUMENT, ADMIN_FILE, DISCIPLINARY_DOCUMENT, SERVICE_NOTE
- **HrDocumentSource**: GENERATED, UPLOADED
- **PayComponentKind**: BONUS, ALLOWANCE, BENEFIT, DEDUCTION
- **PayCalculation**: FIXED, PERCENT_OF_BASE
- **PayApprovalStatus**: PENDING, ACTIVE, REJECTED
- **PayRunStatus**: DRAFT, VALIDATED
- **RotationAlertKind**: UPCOMING, DUE
- **TrainingStatus**: PLANNED, IN_PROGRESS, COMPLETED, FAILED, CANCELLED
- **TrainingKind**: INITIAL, CONTINUING, INTERNSHIP, SPECIALIZED
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
- **DocumentEntity**: CASE, COMPLAINT, EVIDENCE, PERSON, ARREST, WARRANT, INCIDENT, PATROL, OPERATION, VEHICLE, OFFICER, STATEMENT, INTERVIEW, INVESTIGATION, REPORT, WANTED_PERSON, TRAFFIC_CONTROL, TRAFFIC_TICKET, TRAFFIC_DRIVER, TRAFFIC_VEHICLE, TRAFFIC_DEPOSIT, GENERAL
- **DocumentCategory**: PHOTO, SCAN, FORM, REPORT, AUDIO, VIDEO, IDENTITY, LEGAL, OTHER
- **Classification**: INTERNAL, CONFIDENTIAL, RESTRICTED, SECRET
- **ReportType**: CASE, INVESTIGATION, ARREST, EVIDENCE, INCIDENT, PATROL, STATION, STATISTICAL
- **NotificationKind**: INFO, ASSIGNMENT, DEADLINE, APPROVAL, ALERT, SECURITY
- **AuditOutcome**: SUCCESS, DENIED, FAILURE
- **BackupStatus**: RUNNING, COMPLETED, FAILED, RESTORED
- **BiometricType**: FINGERPRINT, FACE, VOICE, ANPR
- **BiometricSearchMode**: VERIFY_1_1, IDENTIFY_1_N
- **BiometricSearchResult**: NO_MATCH, POTENTIAL_MATCH, VERIFIED_MATCH, ERROR
- **BiometricAction**: NONE, SENT_FOR_VERIFICATION, VERIFIED_BY_INVESTIGATOR, REJECTED, LINKED_TO_CASE
- **FingerPosition**: RIGHT_THUMB, RIGHT_INDEX, RIGHT_MIDDLE, RIGHT_RING, RIGHT_LITTLE, LEFT_THUMB, LEFT_INDEX, LEFT_MIDDLE, LEFT_RING, LEFT_LITTLE, UNKNOWN
- **LprStatus**: NEW, REVIEWED, LINKED_TO_CASE, DISMISSED
- **TrafficOffenceClass**: CLASS_2, CLASS_3, CLASS_4, DELIT
- **TrafficVehicleType**: CAR, PICKUP, MOTORCYCLE, MOTO_TAXI, TRICYCLE, CYCLE, MINIBUS, BUS, TRUCK, TRACTOR_TRAILER, OTHER
- **TrafficVehicleStatus**: ACTIVE, SUSPENDED, SEIZED, STOLEN, SCRAPPED
- **TrafficVehicleDocType**: REGISTRATION_CARD, INSURANCE, TECHNICAL_INSPECTION, BLUE_CARD, TRANSPORT_LICENSE, STICKER, OTHER
- **TrafficControlOutcome**: COMPLIANT, INFRACTION
- **TrafficTicketStatus**: ISSUED, CANCELLED
- **TrafficFineStatus**: PENDING, TO_PAY, PARTIALLY_PAID, PAID, CONTESTED, CANCELLED
- **TrafficPaymentMethod**: CASH, ELECTRONIC, MOBILE_MONEY, BANK_TRANSFER, OTHER
- **TrafficPaymentStatus**: COMPLETED, VOIDED
- **TrafficEvidenceKind**: PHOTO, VIDEO, DOCUMENT
- **TrafficCashRegisterStatus**: OPEN, CLOSED, PENDING_DEPOSIT, DEPOSITED, VALIDATED, BLOCKED
- **TrafficCollectionStatus**: TO_DEPOSIT, PARTIALLY_DEPOSITED, DEPOSITED, VALIDATED
- **TrafficDepositStatus**: SUBMITTED, VERIFIED, JUSTIFICATION_REQUESTED, VALIDATED, REJECTED
- **TrafficDepositMethod**: BANK, TREASURY, CENTRAL_CASH, MOBILE_MONEY, OTHER
- **TrafficReconciliationStatus**: PENDING, CONFORME, GAP_TO_JUSTIFY, VALIDATED, REJECTED
- **TrafficDiscrepancyStatus**: OPEN, JUSTIFIED, VALIDATED, REJECTED
