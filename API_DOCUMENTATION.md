# API DOCUMENTATION — SIGPN-T — Système Intégré de Gestion Numérique de la Police Nationale du Tchad

Base URL: `/api/v1` · Format: JSON · Auth: session cookie **or** `Authorization: Bearer pms_<key>`.

## Conventions

- Success: `{ "data": …, "meta": { "page", "pageSize", "total" }? }`
- Error: `{ "error": { "code": "UNAUTHENTICATED|FORBIDDEN|CSRF|SECURITY_STEP_REQUIRED|NOT_FOUND|VALIDATION|CONFLICT|STATE|RATE_LIMITED|INTERNAL", "message": string, "details"?: object } }`
- HTTP codes: 200/201 success · 401 unauthenticated · 403 forbidden (audited) / CSRF / security step pending · 404 not found or out of scope · 409 state conflict · 422 validation · 429 rate limited (`Retry-After` header) · 500 internal (no details leaked).
- Pagination: `?page=1&pageSize=25` (max 100). Sorting where documented.
- **CSRF**: state-changing requests authenticated by the session cookie must send `X-Requested-With: PMS`; API-key requests are exempt.
- **Security steps**: a cookie session whose user must change their password or enrol/verify MFA receives `403 SECURITY_STEP_REQUIRED` on every `/api/v1` call until the step is completed in the web UI.
- **Rate limits** (per client IP, in-process): 240 read requests/min, 60 mutations/min; login 100/IP and 20/identifier per 15 min; MFA 10 per 10 min; password reset 5 per hour. Nginx adds `10 r/m` on `/login` and `120 r/m` on `/api/`.
- Every mutation and every 403 is written to the immutable audit log. Messages are English; the web UI translates them (French default).

## Endpoints

| Endpoint | Method | Auth | Permission | Validation | Response | Errors | Phase |
| -------- | ------ | ---- | ---------- | ---------- | -------- | ------ | ----- |
| `/api/health` | GET | none | — | — | `{ status: "ok"\|"degraded", time }` (503 when DB unreachable) | — | 1 |
| `/api/v1/auth/login` | POST | none | — | `{ identifier: string(1–120), password: string(1–200) }` | `{ authenticated: true, userId }` + `Set-Cookie: pms_session` (HttpOnly, SameSite=Lax, Secure in prod) — or `{ mfaRequired: true }` when the account has MFA (complete in the web UI or use an API key) | 422 generic "Invalid username or password." (no user enumeration; identical body for unknown user and wrong password); 422 locked/inactive; 429 | 1 |
| `/api/v1/auth/logout` | POST | session/key | — | header `X-Requested-With: PMS` (cookie) | `{ loggedOut: true }`; session revoked, cookie cleared | 401, 403 CSRF | 1 |
| `/api/v1/auth/me` | GET | session/key | — | — | `{ id, username, email, firstName, lastName, role:{code,name,scopeLevel}, regionId, stationId, mfaEnabled, authMethod, permissions[] }` | 401, 403 SECURITY_STEP_REQUIRED | 1 |
| `/api/v1/users` | GET | session/key | `users:view` | query `q≤100, status∈UserStatus, roleId, stationId, page, pageSize` | `data: User[]` (public fields, no hashes/secrets) limited to the caller's scope; `meta` | 401, 403, 422 | 1 |
| `/api/v1/users` | POST | session/key | `users:create` | `userCreateSchema`: username (3–40, `[a-z0-9._-]`), email, firstName, lastName, phone?, roleId, regionId?, stationId?, officerId?, temporaryPassword (policy) | 201 `data: User` (mustChangePassword=true) | 409 duplicate username/e-mail; 409 STATE role not grantable (privilege escalation guard) / placement out of scope; 422 | 1 |
| `/api/v1/users/{id}` | GET | session/key | `users:view` | path id | `data: User` | 404 (also when out of scope) | 1 |
| `/api/v1/users/{id}` | PATCH | session/key | `users:update` (+`users:manage_status` for `op:"status"`) | `userUpdateSchema` **or** `{ op:"status", status:"ACTIVE"\|"SUSPENDED"\|"DISABLED", reason? }` | `data: User`; role change revokes the target's sessions | 403 self role change / escalation; 409 STATE invalid transition, last admin; 422 | 1 |
| `/api/v1/roles` | GET | session/key | `roles:view` | — | `data: Role[]` with `permissions[]`, `userCount` | 401, 403 | 1 |
| `/api/v1/audit` | GET | session/key | `audit:view` | query `q, module, action, actorId, entityType, entityId, outcome, from, to, page, pageSize≤100` | `data: AuditLog[]`, `meta` | 401, 403, 422 | 1 |
| `/api/v1/audit/export` | GET | session/key | `audit:export` | same filters | `text/csv` attachment (≤5000 rows); the export itself is audited (`AUDIT_EXPORTED`) | 401, 403 | 1 |
| `/api/v1/provinces` | GET | session/key | `org:view` | — | `data: Province[]` with `adminDepartments[].communes[]` and `isDemo` flags; NATIONAL sees all, others their own province | 401, 403 | 2 |
| `/api/v1/stations` | GET | session/key | `org:view` | query `q, regionId, adminDepartmentId, parentId, type, status, page, pageSize` | `data: Station[]` (type, status, parentId, counts) restricted to the caller's territorial scope (own structure + attached posts/units for station actors) | 401, 403, 422 | 2 |
| `/api/v1/stations` | POST | session/key | `org:manage` | `stationSchema` (province, type, status, optional department/commune/locality/parent; POST/UNIT require a parent; no cycles) | 201 `data: Station` | 409 duplicate code / STATE scope; 422 | 2 |
| `/api/v1/stations/{id}` | GET | session/key | `org:view` | path id | `data: Station` with territory, parent, children, departments, counts | 404 when outside scope | 2 |
| `/api/v1/officers` | GET | session/key | `officers:view` | query `q, stationId, departmentId, rankId, dutyStatus, includeInactive, page, pageSize` | `data: Officer[]` inside the caller's scope | 401, 403, 422 | 2 |
| `/api/v1/officers` | POST | session/key | `officers:manage` | `officerSchema` (badge, names, rank, station, department?) | 201 `data: Officer` + initial assignment; audited `OFFICER_CREATED` | 409 duplicate badge / STATE scope; 422 | 2 |
| `/api/v1/officers/{id}` | GET | session/key | `officers:view` | path id | `data: Officer & { assignments[] }` | 404 when outside scope | 2 |
| `/api/v1/persons` | GET | session/key | `persons:view` | query `q, gender, regionId, stationId, includeMerged, page, pageSize` | `data: Person[]` (national records + records of the caller's scope), `meta` | 401, 403, 422 | 3 |
| `/api/v1/persons` | POST | session/key | `persons:create` | `personSchema` (+ optional `idType/idValue`, `forceCreate:"1"`) | 201 `data: Person` **or** 200 `data: { duplicates: DuplicateCandidate[] }` when candidates exist and `forceCreate` is absent | 409 identifier already attributed; 422 | 3 |
| `/api/v1/persons/search` | GET | session/key | `persons:view` | query `q (≥2 chars)` | `data: PersonSummary[]` (≤10, in scope) | 401, 403 | 3 |
| `/api/v1/persons/{id}` | GET | session/key | `persons:view` | path id | `data: Person` with identifiers, aliases, relationships, complaints, case parties | 404 when outside scope / merged away | 3 |
| `/api/v1/complaints` | GET | session/key | `complaints:view` | query `q, status, category, priority, stationId, assignedToId, mine, page, pageSize` | `data: Complaint[]`, `meta` (scope applied) | 401, 403, 422 | 3 |
| `/api/v1/complaints` | POST | session/key | `complaints:create` | `complaintSchema` (`submit: "register"\|"draft"`, complainant in scope or `isAnonymous`) | 201 `data: Complaint` (`CMP-YYYY-NNNNN`) | 404 complainant/station out of scope; 422 | 3 |
| `/api/v1/complaints/{id}` | GET | session/key | `complaints:view` | path id | `data: Complaint` with complainant, station, assignee, case | 404 outside scope | 3 |
| `/api/v1/complaints/{id}` | PATCH | session/key | per op: `register`→`complaints:create`, `review`→`complaints:review`, `assign`→`complaints:assign`, `close`→`complaints:close`, `convert`→`complaints:convert` | `{ op:"register" }` · `{ op:"review", reviewNotes?, priority? }` · `{ op:"assign", assignedToId, reviewNotes? }` · `{ op:"close", outcome:"CLOSED"\|"REJECTED", reason }` · `{ op:"convert", title?, leadId?, isSensitive? }` | `data: Complaint` (convert → `{ complaint, case:{id,number} }`) | 403 missing op permission; 409 STATE invalid transition / already converted; 422 investigator out of scope | 3 |
| `/api/v1/cases` | GET | session/key | `cases:view` | query `q, status, category, priority, stationId, mine, page, pageSize` | `data: Case[]`, `meta` (scope + sensitivity rule) | 401, 403, 422 | 3 |
| `/api/v1/cases` | POST | session/key | `cases:create` (+`cases:view_sensitive` to flag sensitive) | `caseSchema` | 201 `data: Case` (`CASE-YYYY-NNNNN`) + LEAD assignment when `leadId` | 403 sensitive without permission; 422 | 3 |
| `/api/v1/cases/{id}` | GET | session/key | `cases:view` | path id | `data: Case` with team, parties, tasks, notes (confidential filtered), timeline | 404 outside scope / sensitive non-member | 3 |
| `/api/v1/cases/{id}` | PATCH | session/key | `assign`→`cases:assign`; other ops→`cases:update` (+`cases:close` for CLOSED / CHARGED / REFERRED, `cases:archive` for ARCHIVED); writer must be team member or hold `cases:assign` | `{ op:"assign", userId, role:"LEAD"\|"SUPERVISOR"\|"MEMBER" }` · `{ op:"addParty", personId, role, notes? }` · `{ op:"partyStatus", partyId, status, notes? }` · `{ op:"note", content, isConfidential? }` · `{ op:"task", title, assignedToId?, dueAt?, priority? }` · `{ op:"taskStatus", taskId, status, result? }` · `{ op:"status", status, disposition?, notes? }` | `data: Case` | 403 not team / missing permission; 409 STATE read-only (CLOSED/ARCHIVED) or invalid transition; 422 disposition required | 3 |

## Traffic offences and fines (`/api/v1/traffic/*`)

All endpoints are scoped like the other modules (controls, PV and fines by station/province; the drivers, vehicles and catalogue registers are national). Full behaviour and rules: `docs/INFRACTIONS_ROUTIERES.md`. Amounts are integers in FCFA. Body/query validation errors → 422, invalid transition or concurrent change → 409, outside scope → 404, missing permission → 403 (audited).

| Endpoint | Method | Permission | Body / query | Response |
| -------- | ------ | ---------- | ------------ | -------- |
| `/traffic/controls` | GET | `traffic:view` | `q, outcome, stationId, officerId, mine, from, to, page, pageSize` | `data: Control[]` + `meta` |
| `/traffic/controls` | POST | `traffic:control_create` | `controlledAt, location, latitude?, longitude?, stationId?`, driver (`driverPersonId` **or** `driverFirstName/LastName/CNI…`, `licenseNumber?`…), vehicle (`vehicleId` **or** `plateNumber`, `vehicleType`, make/model/colour…), `violationIds[]` (0–20), `observations?`, `caseId?`, `incidentId?` | 201 `{ control, ticket \| null, fine \| null, wantedHits[], vehicleAlert }` — PV and fine are created in the same transaction when `violationIds` is not empty |
| `/traffic/controls/{id}` | GET | `traffic:view` | — | `data: Control` (evidence, PV, offences) + `wantedHits` |
| `/traffic/controls/{id}/evidence` | POST | `traffic:evidence_upload` | multipart `file` (photo/video/PDF), `caption?`, `latitude?`, `longitude?` | 201 `TrafficEvidence`; 422 for other file types |
| `/traffic/tickets` | GET | `traffic:view` | `q, status, fineStatus, stationId, from, to, page` | `data: Ticket[]` |
| `/traffic/tickets/{id}` | GET | `traffic:view` | — | `data: Ticket` with offences, control, fine/payments, `sealValid` (the HMAC is never returned) |
| `/traffic/tickets/{id}` | PATCH | `traffic:ticket_cancel` | `{ op:"cancel", reason (≥10) }` | `data: Ticket`; 409 if the fine is paid |
| `/traffic/tickets/{id}/pdf` | GET | `traffic:view` | `?download=1` | `application/pdf` (audited) |
| `/traffic/tickets/{id}/case` | POST | `traffic:view` + `cases:create` | `title?, description?` | 201 `{ id, number }`; 409 when a case is already linked |
| `/traffic/fines` | GET | `traffic:view` | `q, status, stationId, overdue, from, to, page` | `data: Fine[]`, `meta.sumAmount/sumPaid` |
| `/traffic/fines/{id}` | GET | `traffic:view` | — | `data: Fine` with payments and receipts |
| `/traffic/fines/{id}` | PATCH | `traffic:fine_manage` | `{ op:"status", status: PENDING\|TO_PAY\|CONTESTED\|CANCELLED, note }` | `data: Fine`; `PAID`/`PARTIALLY_PAID` are never set by hand |
| `/traffic/fines/{id}/payments` | POST | `traffic:payment_record` | `amountFcfa, method (CASH\|ELECTRONIC\|MOBILE_MONEY\|BANK_TRANSFER\|OTHER), provider?, transactionReference? (required except cash), paidAt?, paymentPoint?, notes?` | 201 `{ payment, receipt, fine }`; 409 paid/contested/cancelled or duplicate reference; 422 overpayment, partial payment while disabled |
| `/traffic/payments/{id}` | PATCH | `traffic:payment_void` | `{ op:"void", reason (≥10) }` | payment voided, fine re-opened; the receipt stays in the register |
| `/traffic/receipts/{id}` · `/pdf` | GET | `traffic:view` | — | `data: Receipt` · `application/pdf` |
| `/traffic/drivers` | GET · POST | `traffic:drivers_view` · `traffic:drivers_manage` | search `q` (name, licence, file number, CNI exact) · create | list · 201 |
| `/traffic/drivers/{id}` | GET · PATCH | `traffic:drivers_view` · `traffic:drivers_manage` | licence fields | profile with national history |
| `/traffic/vehicles` | GET · POST | `traffic:vehicles_view` · `traffic:vehicles_manage` | `plate=TD-1234-AB` (direct plate search), `q`, `status` · create | list · 201 |
| `/traffic/vehicles/{id}` · `/documents` | GET · PATCH · POST | idem | vehicle fields · document (insurance, inspection, card…) | vehicle with history |
| `/traffic/violations` | GET | `traffic:violations_view` | `q, category, offenceClass` | the 82 catalogue offences + `meta.summary` |
| `/traffic/violations/{id}` | PATCH | `traffic:catalog_manage` | `{ isActive }` only | names, classes, legal texts and amounts are never editable |
| `/traffic/stats` | GET | `traffic:dashboard` | `from, to, format=json\|csv` (CSV needs `traffic:export`) | KPIs, monthly series, top offences, by category/class/station/zone/province/officer, top vehicles, repeat drivers |
| `/traffic/search` | GET | `traffic:view` | `pv, fine, plate, driver, license, cni (exact), violation, officer, stationId, fineStatus, from, to` | matching controls with PV / fine |
| `/public/verify/pv/{token}` · `/public/verify/receipt/{token}` | GET | public (rate-limited) | — | authenticity, seal validity, offences and amounts; identity masked |

## Territorial scope (Role + Organizational scope + Permission)

Every list and every unitary read applies the caller's scope in addition to the permission:

| Scope level | Sees |
| ----------- | ---- |
| NATIONAL | everything |
| REGIONAL | one province (all departments, communes, structures, officers of the province) |
| DEPARTMENTAL | every police structure attached to one administrative department |
| STATION / OWN | the actor's structure and its attached posts/units (recursive), nothing else |

Records outside the scope answer 404 (no existence leak). Master-data writes (provinces, departments, communes, localities, structures) are allowed to NATIONAL actors and to REGIONAL actors inside their own province; services of a structure can also be managed by its STATION/DEPARTMENTAL actors.

## Authentication for API clients

1. Sign in to the web UI, open **Mon compte › Clés API**, create a key (shown once, format `pms_<prefix>_<secret>`; only its SHA-256 is stored).
2. Send `Authorization: Bearer pms_…` on every request. The key carries exactly the owner's permissions and scope; revoking the key or disabling the user stops access immediately.
3. Keys can expire (`expiresInDays`) and are limited to 5 active per user.


## Recettes et versements (`/api/v1/traffic/cash`)
| Route | Méthodes | Permission |
| ----- | -------- | ---------- |
| `registers`, `registers/{id}` | GET, POST (ouvrir) ; PATCH `{op: close|block|unblock}` | `cash:register` / `cash:block` |
| `collections`, `collections/{id}` | GET ; PATCH `{op: verify_closure|finalize|reject|declare_gap}` | `cash:view`, `cash:verify_closure`, `cash:reconcile` |
| `closures`, `closures/{id}`, `closures/{id}/pdf` | GET | `cash:view` / `cash:register` |
| `deposits`, `deposits/{id}`, `deposits/{id}/pdf` | GET, POST ; PATCH `{op: verify|request_justification|reject|validate|respond}` | `cash:deposit_*` |
| `discrepancies`, `discrepancies/{id}` | GET ; PATCH `{op: justify|validate|reject}` | `cash:reconcile` |
| `reconciliations` | GET | `cash:view` |
| `stats`, `reports/{kind}` (`json|csv|pdf`), `search` | GET | `cash:reports` / `cash:view` |
| `/api/v1/public/verify/deposit/{token}` | GET (public) | — |
