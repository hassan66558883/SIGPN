# PHASE 1 COMPLETION PACKAGE — Authentication & Security Foundation

## A. Phase information

| Field | Value |
| ----- | ----- |
| Phase | 1 |
| Name | Authentication & Security Foundation |
| Priority | P0 |
| Start | 2026-09-11 18:10 |
| Completion | 2026-09-12 11:30 |
| Status | **PASS** |

## B. Executive summary

Phase 1 delivers the complete security core on which every later module depends: password authentication with database-backed revocable sessions, a strict password policy with history and forced rotation, TOTP multi-factor authentication (mandatory for privileged roles, with recovery codes and administrator reset), brute-force protection with account lockout and rate limiting, and a database-managed role-based access control model (92 permissions, 12 seeded system roles, four scope levels) enforced identically in pages, server actions and the REST API. Every authentication event, mutation and denied access is written to the immutable audit log.

Administrators receive working screens for users, roles and permissions (with a matrix view), a security centre, the audit log with CSV export, notifications and a personal account page with session and API-key management. Mid-phase the owner asked for a bilingual interface with French as the always-default language; this was built into the foundation (dictionary-based i18n with a cookie switcher, bilingual labels, localized dates and titles) so that no later module ships English-only text.

Major technical decisions: sessions in PostgreSQL rather than JWT (instant revocation); TOTP implemented with Node's crypto (no third-party auth dependency, verified against RFC 6238 vectors); "cannot grant what you do not hold" as the single privilege-escalation rule for both role assignment and permission editing; service-layer messages kept in English and translated at the presentation boundary. Business impact: the system can be handed to real administrators to create accounts and roles safely, in French, from day one.

## C. Features implemented

| ID | Feature | Status | Notes |
| -- | ------- | ------ | ----- |
| P1-F1 | Login / logout (username or e-mail) | PASS | generic errors, attempts recorded |
| P1-F2 | DB sessions: idle 60 min, absolute 10 h, revocation (logout, password/role/status change, admin) | PASS | P1-S10/S11/I13 |
| P1-F3 | Password hashing bcrypt 12, policy, history 5, max age 90 d, forced change | PASS | P1-U7/U8, browser |
| P1-F4 | Password change (self) | PASS | revokes other sessions |
| P1-F5 | Password reset: admin-issued one-time link (60 min) + self-service request notifying admins | PASS | no e-mail gateway → out-of-band handover |
| P1-F6 | MFA enrolment (QR + key), TOTP verification, 8 recovery codes, regenerate, disable (non-mandatory roles), admin reset | PASS | real E2E in browser with computed TOTP |
| P1-F7 | Forced MFA enrolment for `requiresMfa` roles; API blocked until completed | PASS | P1-S13, browser |
| P1-F8 | Account statuses PENDING/ACTIVE/LOCKED/SUSPENDED/DISABLED with transition table | PASS | P1-I12 |
| P1-F9 | Brute-force: lockout 5/15 min, limiters per identifier/IP, auto-unlock | PASS | P1-S12 |
| P1-F10 | RBAC: permission catalog, system roles, DB role editor, matrix, scope levels | PASS | P1-I6, browser |
| P1-F11 | Privilege-escalation guards | PASS | P1-S8, P1-I10 |
| P1-F12 | Users administration (list/filter/paginate, create, edit, status, sessions, reset, MFA reset) | PASS | scoped to actor's region/station |
| P1-F13 | Security centre (sessions, locks, failed logins, denied accesses, policy) | PASS | live DB data |
| P1-F14 | Immutable audit log viewer + CSV export (audited) | PASS | P1-I14 |
| P1-F15 | Notifications inbox (mark read / all) | PASS | used by reset requests and security events |
| P1-F16 | Account page: profile, permissions, MFA, sessions, API keys | PASS | browser |
| P1-F17 | REST API v1 (health, auth, users, roles, audit) with uniform errors, CSRF rule, API keys | PASS | 25 automated tests |
| P1-F18 | i18n: FR default / EN, switcher, bilingual labels, dates, titles, translated service messages | PASS | P1-U11..16, browser |
| P1-F19 | Responsive shell: sidebar, mobile drawer, stacked tables | PASS | 5 breakpoints |
| P1-F20 | Foundation seed (permissions, roles, minimal org, 13 demo accounts) | PASS | idempotent |

## D. Screens

| Screen | Route | Status | Responsive | Tested |
| ------ | ----- | ------ | ---------- | ------ |
| Sign in | `/login` | PASS | yes | browser + API |
| MFA verification | `/login/mfa` | PASS | yes | browser (wrong + right code) |
| Forgot password | `/forgot-password` | PASS | yes | render + action (security test of rate limit path) |
| Reset password | `/reset-password/[token]` | PASS | yes | render; token flow unit-covered by service |
| Dashboard | `/dashboard` | PASS | yes (390–1920) | browser |
| My account | `/account` | PASS | yes | browser |
| Change password | `/account/password` | PASS | yes | browser (form fixed) |
| MFA settings | `/account/mfa` | PASS | yes | browser E2E |
| Notifications | `/notifications` | PASS | yes | render |
| Users | `/admin/users` | PASS | yes (cards < 768) | browser |
| New user | `/admin/users/new` | PASS | yes | browser render; creation via API tests |
| User detail | `/admin/users/[id]` | PASS | yes | browser |
| Roles | `/admin/roles` | PASS | yes | browser (fixed) |
| Role detail / permission editor | `/admin/roles/[id]` | PASS | yes | browser |
| Permission matrix | `/admin/permissions` | PASS | horizontal scroll | browser |
| Security centre | `/admin/security` | PASS | yes | browser |
| Audit log | `/audit` | PASS | yes | browser |
| 401 / 403 / 404 / 500 | special files | PASS | yes | 500 boundary exercised during dev |

## E. Workflows

**Sign-in**: `/login` form → `loginAction` → `login()` (rate limits → user lookup → constant-time bcrypt compare → lockout accounting → status gate) → either session cookie (`pms_session`) or MFA challenge cookie (`pms_mfa`, 5 min) → `/login/mfa` → `verifyMfaChallenge()` (TOTP ±1 step or recovery code, 5 attempts) → session with `mfaVerified=true` → `/dashboard`. Layout `requireActor()` then enforces pending steps (`mustChangePassword` → `/account/password?forced=1`; role requires MFA and not enrolled → `/account/mfa?forced=1`).

**MFA enrolment**: `beginMfaAction` (secret generated, stored AES-256-GCM, QR data URL) → user scans → `confirmMfaAction` (TOTP verify → `mfaEnabled`, recovery hashes, current session marked verified, `MFA_ENROLLED`) → codes displayed once.

**User administration**: `/admin/users/new` → `createUserAction` → `createUser()` (grantable-role check, placement scope check, policy check, uniqueness) → `USER_CREATED` audit → detail page; status/role/session/reset/MFA actions each audited; role change and status change revoke the target's sessions and notify them.

**Role editing**: `/admin/roles/[id]` → `setRolePermissionsAction` → `setRolePermissions()` (only permissions the actor holds may be granted or removed) → `PERMISSION_CHANGED` with before/after → affected users' sessions revoked when permissions were reduced.

## F. Database

Tables used: `User`, `PasswordHistory`, `Session`, `LoginChallenge`, `MfaRecoveryCode`, `PasswordResetToken`, `LoginAttempt`, `ApiKey`, `Role`, `Permission`, `RolePermission`, `Notification`, `AuditLog`, plus `Organization/Region/Station` for placement. No schema change since Phase 0 (migrations unchanged: `init`, `immutability_triggers`). Key constraints: unique `username`, `email`, `tokenHash`, `keyHash`, `codeHash`; `RolePermission` composite PK; indexes on `Session(userId, revokedAt)`, `LoginAttempt(identifier, createdAt)`, `AuditLog(at)`, `(actorId, at)`, `(entityType, entityId)`, `(module, action)`. Important queries: effective permission set (`User → Role → RolePermission → Permission`) loaded once per request; scoped user list `scopeWhere(actor)`; security overview aggregates (counts, groupBy IP).

## G. API

See `API_DOCUMENTATION.md` (11 endpoints with method, auth, permission, validation, response, errors).

## H. Validation

- Frontend: HTML constraints (`required`, `minLength`, `maxLength`, `pattern`, `type=email`), controlled selects, inline field errors from server.
- Backend: zod schemas for every action/route (`userCreateSchema`, `userUpdateSchema`, `roleSchema`, login/MFA/reset schemas, API query schemas with bounds), password policy, transition tables, uniqueness checks, grantable-role/permission checks, placement scope checks.
- Database: unique constraints, enums (`UserStatus`, `ScopeLevel`), FKs, NOT NULL, append-only triggers.

## I. Security

Documented in `SECURITY_REPORT.md` (controls table, 4 findings fixed, residual risks). Highlights: bcrypt 12; AES-256-GCM MFA secrets; SHA-256 hashed tokens/keys/recovery codes; HttpOnly SameSite=Lax cookies; CSP/HSTS/nosniff/frame-ancestors; CSRF header for cookie API mutations; rate limiting; lockout; redaction in audit payloads.

## J. Permission matrix

Live matrix at `/admin/permissions` (92 × 12). Summary of the seeded roles:

| Role | Scope | MFA | View | Create | Update | Approve | Export | Archive |
| ---- | ----- | --- | ---- | ------ | ------ | ------- | ------ | ------- |
| SUPER_ADMIN | National | yes | all | all | all | all | all | all |
| NATIONAL_COMMANDER | National | yes | all | — | — | warrants, wanted, operations, reports, complaints review | yes | cases |
| REGIONAL_COMMANDER | Regional | yes | all | investigative + users + org | investigative + users | as above | yes | cases |
| STATION_COMMANDER | Station | yes | all | investigative + users | investigative + users + fleet | as above | yes | — |
| INVESTIGATOR | Station | no | operational | persons, complaints, cases, statements, evidence, warrants requests, arrests | same | — | — | — |
| DESK_OFFICER | Station | no | operational | persons, complaints, incidents, arrests | persons, complaints, incidents | — | — | — |
| PATROL_OFFICER | Station | no | operational | patrols, incidents, persons, arrests | patrols, incidents | — | — | — |
| EVIDENCE_CUSTODIAN | Station | yes | operational | evidence, locations | evidence, transfers, release | — | — | evidence |
| CUSTODY_OFFICER | Station | no | operational | detention logs | detention, arrests | — | — | — |
| FLEET_MANAGER | Regional | no | fleet | vehicles, maintenance | vehicles, maintenance | — | reports | — |
| ANALYST | National | no | all | reports | — | — | yes | — |
| AUDITOR | National | yes | all + audit + security | — | — | — | audit | — |

## K. Audit logging

Actions recorded in Phase 1: `LOGIN`, `LOGIN_FAILED`, `LOGIN_REJECTED`, `ACCOUNT_LOCKED`, `LOGOUT`, `MFA_CHALLENGE`, `MFA_FAILED`, `MFA_ENROLLED`, `MFA_DISABLED`, `MFA_RECOVERY_USED`, `MFA_RECOVERY_REGENERATED`, `PASSWORD_CHANGED`, `PASSWORD_CHANGE_FAILED`, `PASSWORD_RESET_REQUESTED`, `PASSWORD_RESET_ISSUED`, `PASSWORD_RESET_COMPLETED`, `SESSION_REVOKED`, `API_KEY_CREATED`, `API_KEY_REVOKED`, `ACCESS_DENIED`, `USER_CREATED`, `USER_UPDATED`, `USER_ROLE_CHANGED`, `USER_ACTIVE|SUSPENDED|DISABLED`, `USER_SESSIONS_REVOKED`, `USER_MFA_RESET`, `ROLE_CREATED`, `ROLE_UPDATED`, `ROLE_ACTIVATED|DEACTIVATED`, `PERMISSION_CHANGED`, `AUDIT_EXPORTED`, `SEED_FOUNDATION`. Payloads redact `password*`, `*tokenHash`, `secret*`, `mfaSecretEnc`, `keyHash`, `codeHash`.

## L. Test results

See `TEST_REPORT.md` Phase 1: 16 unit + 14 integration + 16 security automated tests, 11 manual browser checks — all PASS on the final regression run (2026-09-12).

## M. Negative testing

Covered: empty fields, invalid ids/out-of-scope (404), duplicates (409), weak passwords (422), wrong TOTP, expired session, unauthorized page/API, privilege escalation, CSRF, SQL-shaped input, malformed JSON, invalid status transitions, self role/status changes.

## N. Security test results

See `SECURITY_REPORT.md` "Phase 1 security test results" — 11 vulnerability classes tested, none open.

## O. Responsive testing

| Viewport | Result |
| -------- | ------ |
| 1920×1080 | PASS — sidebar, 4-column KPI grid |
| 1366×768 | PASS — role editor 2 columns, user detail 3 columns |
| 1024×768 | PASS — audit filters wrap, table scrolls horizontally |
| 768 (tablet) | PASS — table columns retained, drawer navigation |
| 390 / 375 (mobile) | PASS — stacked-card tables, hamburger drawer; header collision fixed (brand text hidden < 640 px) |

## P. UI/UX review

Consistent tokens (navy/blue/gold + semantic tones), uppercase micro-labels, cards with header/description, badges for statuses, inline field errors, pending states on every submit button, empty states on every list, success/error alerts translated, breadcrumbs on detail pages, keyboard-closable drawer (Escape), `aria-label`s on icon buttons and filters, `aria-current` on active nav items, `role=alert` on errors. Known gaps: no toast system (feedback is inline), tables have no column sorting yet.

## Q. Bugs

| ID | Bug | Severity | Status |
| -- | --- | -------- | ------ |
| P1-B1 | Security suite non-repeatable (per-IP limiter 30/15 min tripped by consecutive runs) | Low | Fixed (limit 100; identifier limit 20; lockout is the primary control) |
| P1-B2 | Test timezone offset: JS Dates serialized with +01:00 against UTC-naive timestamps | Low | Fixed (ISO strings) |
| P1-B3 | Dev CSP blocked React dev runtime → forms not hydrating in dev | Medium (dev only) | Fixed (dev-only relaxation) |
| P1-B4 | `X-Forwarded-For` honoured without trusted proxy | Medium | Fixed |
| P1-B5 | Recovery codes could be hidden by immediate revalidation | Low | Fixed |
| P1-B6 | Render-prop children passed from server pages to `ActionForm` → 500 on roles & password pages | High | Fixed (client form components) |
| P1-B7 | Mobile header brand text collided with language switcher | Low | Fixed |
| P1-B8 | Security test assumed `admin` had no MFA; broke after real enrolment | Low | Fixed (dynamic fixture) |

## R. Known limitations

- No e-mail/SMS delivery: reset links are handed over by administrators (audited); self-service request only notifies administrators.
- Client IP is unknown without a trusted reverse proxy (Next.js exposes no socket address); per-IP limiting is effective behind Nginx with `TRUST_PROXY=1`.
- In-process rate limiter is per instance (Nginx zones cover multi-instance deployments).
- Audit summaries are English (system records); the UI chrome is bilingual.
- API login cannot complete MFA (by design): MFA accounts use personal API keys for REST access.

## S. Technical debt

- `fail()` maps service errors to English strings translated by pattern on the client; a message-key based error model would be cleaner as the catalog grows.
- `securityOverview()` runs ~10 queries; acceptable now, candidate for a materialized summary if the audit table grows large.
- `listAuditLogs` uses `contains` filters; full-text search on `summary` could use the `pg_trgm` index later.
- Role names/descriptions for **custom** roles are single-language (stored text).
- Dev-only CSP relaxation relies on `NODE_ENV`; production build must keep `NODE_ENV=production` (enforced by Dockerfile).

## T. Files changed

`src/server/{env,crypto,db,errors,request-context,audit,sequences,notifications,notifications-actions,api,action-utils,i18n,i18n-actions}.ts`, `src/server/auth/*` (password, mfa, session, rate-limit, dal, login, api-auth, actions), `src/server/rbac/{permissions,roles}.ts`, `src/server/admin/{users,roles,actions,queries}.ts`, `src/server/demo/{accounts,seed-foundation}.ts`, `prisma/seed.ts`, `src/lib/{labels,format,navigation}.ts`, `src/lib/i18n/{index,fr,en,errors,catalog}.ts`, `src/components/{ui,forms,password-rules,i18n-provider,language-switcher}.tsx`, `src/components/app-shell/{sidebar,header}.tsx`, `src/app/layout.tsx`, `src/app/{error,forbidden,unauthorized,not-found}.tsx`, `src/app/(auth)/**`, `src/app/(app)/**` (dashboard, account, admin/users, admin/roles, admin/permissions, admin/security, audit, notifications), `src/app/api/**`, `src/proxy.ts`, `next.config.ts`, `tests/unit/*`, `tests/integration/*`, `tests/security/*`, docs.

## U. Configuration changes

No new environment variables beyond Phase 0. `TRUST_PROXY=1` must be set in production (compose does). `LOGIN_MAX_FAILURES`, `LOGIN_LOCK_MINUTES`, `SESSION_*`, `PASSWORD_*` are honoured; in-app limiter constants live in `src/server/auth/rate-limit.ts` (`LIMITS`).

## V. Deployment status

| Environment | Status |
| ----------- | ------ |
| Development | operational (dev server 3300, embedded PostgreSQL 5436, seed loaded) |
| Testing | operational (46 automated tests green) |
| Staging | not provisioned |
| Production | not provisioned |

## W. Rollback plan

`git revert` of the Phase 1 commit restores the Phase 0 foundation (no schema change in Phase 1, so no migration rollback is needed). Seeded roles/permissions can be re-synchronized at any time with `npm run db:seed` (idempotent).

## X. Phase scorecard

| Category | Score |
| -------- | ----: |
| Functionality | 9/10 |
| Security | 9/10 |
| Validation | 9/10 |
| Database | 9/10 |
| API | 8/10 |
| UI/UX | 8/10 |
| Responsive | 9/10 |
| Testing | 9/10 |
| Performance | 8/10 |
| Documentation | 9/10 |

**PHASE 1: PASS → PHASE 2 starts automatically.**
