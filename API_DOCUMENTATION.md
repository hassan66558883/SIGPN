# API DOCUMENTATION — Police Management System

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
