# TEST REPORT — Police Management System

_Cumulative. Only tests that were actually executed are recorded. Per-phase detail lives in `docs/phases/PHASE_XX_REPORT.md`._

## Summary

| Phase | Unit | Integration | Security | Negative | Responsive | Result |
| ----- | ---- | ----------- | -------- | -------- | ---------- | ------ |
| 0 | — | 5 pass (`tests/integration/db-integrity.test.ts`) + 3 tooling checks | 2 pass | 2 pass | n/a (no UI yet) | PASS |
| 1 | 16 pass (`tests/unit/auth-primitives.test.ts`, `tests/unit/i18n.test.ts`) | 14 pass (`db-integrity`, `users-api`) | 16 pass (`tests/security/auth.test.ts`) + 11 manual browser checks | 12 pass | 5 breakpoints pass | PASS |

How to run: `npm test` (unit) · `npm run test:integration` (needs dev DB) · `npm run test:security` (needs `npm run dev` on 3300 + seed). Last full regression run: 2026-09-12 (all suites green, `tsc --noEmit` and `eslint` clean).

## Phase 0 — executed tests (2026-09-11)

| Test ID | Test | Expected | Actual | Result |
| ------- | ---- | -------- | ------ | ------ |
| P0-T1 | `prisma validate` on full schema | valid | "The schema is valid" | PASS |
| P0-T2 | `prisma generate` | client generated in `src/generated/prisma` | generated (Prisma 7.10.0) | PASS |
| P0-T3 | Embedded PostgreSQL 18 start on 5436 + database `pms` creation | listening, db created | listening on 127.0.0.1:5436, "database pms created" | PASS |
| P0-T4 | `prisma migrate dev` applies `init` + `immutability_triggers` to the real DB | 2 migrations applied, schema in sync | "Your database is now in sync with your schema" | PASS |
| P0-T5 | Insert `AuditLog` row then UPDATE it | rejected with `append-only` error, row unchanged | rejected; summary unchanged | PASS |
| P0-T6 | Insert `AuditLog` row then DELETE it | rejected with `append-only` error, row still present | rejected; row present | PASS |
| P0-T7 | `CustodyEvent` has row-level BEFORE trigger for UPDATE and DELETE (`pg_trigger`) | trigger `custody_event_append_only` with UPDATE+DELETE bits | present, tgtype bits 16 and 8 set | PASS |
| P0-T8 | All rows in `_prisma_migrations` finished and not rolled back | 2 finished | 2 finished, none rolled back | PASS |
| P0-T9 | `pg_trgm` extension and 3 trigram indexes exist | present | present | PASS |
| P0-T10 | `tsc --noEmit` on scaffold + scripts + tests | 0 errors | exit 0 | PASS |

## Phase 1 — executed tests (2026-09-12)

### Unit (`npm test`) — 16/16

| Test ID | Test | Result |
| ------- | ---- | ------ |
| P1-U1 | TOTP matches RFC 6238 vectors (T=59 → 287082, T=1111111109 → 081804) | PASS |
| P1-U2 | TOTP verify accepts ±1 step, rejects ±3 steps and non-numeric | PASS |
| P1-U3 | Base32 round-trip | PASS |
| P1-U4 | otpauth URI contains issuer/account/secret | PASS |
| P1-U5 | 8 unique recovery codes, hash normalizes case/format | PASS |
| P1-U6 | AES-256-GCM round-trip; tampered ciphertext rejected | PASS |
| P1-U7 | Password policy: length, classes, username inclusion, compliant password | PASS |
| P1-U8 | bcrypt cost 12 hash verifies; wrong/null never verifies | PASS |
| P1-U9 | Rate limiter blocks at limit and resets | PASS |
| P1-U10 | SHA-256 deterministic | PASS |
| P1-U11 | French is the default locale | PASS |
| P1-U12 | EN dictionary has exactly the FR keys, no empty values | PASS |
| P1-U13 | Placeholders identical between FR and EN for every key | PASS |
| P1-U14 | Interpolation | PASS |
| P1-U15 | Service messages translated to FR / passed through in EN / unknown untouched | PASS |
| P1-U16 | Every permission and system role has a French label | PASS |

### Integration (`npm run test:integration`) — 14/14

| Test ID | Test | Result |
| ------- | ---- | ------ |
| P1-I1..5 | Phase 0 DB integrity suite (re-run) | PASS |
| P1-I6 | `GET /api/v1/roles` returns system roles with permission sets | PASS |
| P1-I7 | `GET /api/v1/users` paginated; station commander sees only CS-01 users | PASS |
| P1-I8 | `POST /users` 422 on invalid body, 409 duplicate username, 422 weak temporary password | PASS |
| P1-I9 | `POST /users` creates investigator (201), `mustChangePassword=true`, no hash leaked, `USER_CREATED` audited | PASS |
| P1-I10 | Privilege escalation: station commander cannot grant SUPER_ADMIN (409) nor place a user in another station (409); nothing persisted | PASS |
| P1-I11 | Desk officer without `users:view` → 403, `ACCESS_DENIED` audited | PASS |
| P1-I12 | Status transitions: suspend (200), repeat suspend (409), self-status (409), reactivate (200); audit sequence `USER_SUSPENDED`,`USER_ACTIVE` | PASS |
| P1-I13 | Role change revokes target sessions (`role_changed`) and audits before/after role codes | PASS |
| P1-I14 | Audit CSV export: 403 without permission, CSV header correct, `AUDIT_EXPORTED` audited | PASS |

### Security (`npm run test:security`, live server) — 16/16

| Test ID | Test | Expected | Actual | Result |
| ------- | ---- | -------- | ------ | ------ |
| P1-S1 | `/api/health` without auth | 200 `status:ok` | 200 | PASS |
| P1-S2 | Security headers on `/login` | X-Frame-Options DENY, nosniff, CSP frame-ancestors 'none', Referrer-Policy, no X-Powered-By | all present | PASS |
| P1-S3 | Unauthenticated page → redirect | 307 to `/login` | 307 | PASS |
| P1-S4 | Unauthenticated API → 401 | `UNAUTHENTICATED` | 401 | PASS |
| P1-S5 | Valid login sets HttpOnly SameSite=Lax cookie; `/me` returns role + permissions | 200 | 200 | PASS |
| P1-S6 | Wrong password vs unknown user | identical 422 body, no cookie | identical | PASS |
| P1-S7 | Insufficient permission → 403 + `ACCESS_DENIED` audit | 403 + audit row | 403 + row | PASS |
| P1-S8 | Privilege escalation: investigator PATCHes own role to SUPER_ADMIN | 403, role unchanged | 403, unchanged | PASS |
| P1-S9 | CSRF: cookie mutation without `X-Requested-With` | 403 `CSRF` | 403 | PASS |
| P1-S10 | Logout revokes session | `/me` → 401 | 401 | PASS |
| P1-S11 | Expired session (absolute) rejected | 401 | 401 | PASS |
| P1-S12 | Brute force: 5 failures lock the account; correct password then rejected; `ACCOUNT_LOCKED` audited | LOCKED, 422, audit | as expected | PASS |
| P1-S13 | MFA-required role without enrolment: API refuses | 403 `SECURITY_STEP_REQUIRED` | 403 | PASS |
| P1-S14 | API key: Bearer auth works with owner permissions, CSRF-exempt, bad key 401 | as expected | as expected | PASS |
| P1-S15 | Login attempts and auth events recorded | ≥5 rows each | yes | PASS |
| P1-S16 | Malicious input: SQL-shaped identifier, non-JSON body, empty fields | 422 each | 422 | PASS |

### Manual browser checks (Chromium pane, 2026-09-12)

| Test ID | Test | Result |
| ------- | ---- | ------ |
| P1-B1 | Login form (FR default) → dashboard as `inv.diallo` | PASS |
| P1-B2 | Admin login redirected to forced MFA enrolment (`/account/mfa?forced=1`) | PASS |
| P1-B3 | MFA enrolment: QR + manual key shown, real TOTP code (computed from the displayed secret) accepted, MFA enabled, `MFA_ENROLLED` audited | PASS |
| P1-B4 | Sign out → login as admin → `/login/mfa`; wrong code → "Code de vérification incorrect." + `MFA_FAILED` audit; right code → dashboard, `LOGIN … (totp)` audit | PASS |
| P1-B5 | Users list, user detail, new-user form, roles list, role detail (permission editor), permission matrix, security centre, audit log, account, password page, notifications all render without error | PASS |
| P1-B6 | FR → EN → FR language toggle updates content and `<title>` | PASS |
| P1-B7 | Responsive 1920×1080 (sidebar + 4-column KPIs) | PASS |
| P1-B8 | Responsive 1366×768 (role editor two-column, user detail three-column) | PASS |
| P1-B9 | Responsive 1024×768 (audit filters wrap, table scrolls) | PASS |
| P1-B10 | Responsive 768 tablet (users table keeps columns, drawer navigation) | PASS |
| P1-B11 | Responsive 375/390 mobile (stacked-card tables, hamburger drawer, header fits after fix) | PASS |

### Negative tests executed in Phase 1

Empty fields (login, MFA, API body) · invalid ids (404 out of scope) · duplicate username/e-mail (409) · weak/temporary passwords (422) · unauthorized page (403 page) · unauthorized API (401/403) · SQL-shaped input · non-JSON body · wrong TOTP code · expired session · repeated status transition (409) · self role/status change (403/409).
