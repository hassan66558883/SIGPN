# SECURITY REPORT — SIGPN-T — Système Intégré de Gestion Numérique de la Police Nationale du Tchad

_Cumulative security posture and test results. Critical/high findings block phases until fixed._

## Open findings

| ID | Finding | Severity | Status |
| -- | ------- | -------- | ------ |
| — | none open | | |

## Findings fixed during Phase 1

| ID | Finding | Severity | Fix |
| -- | ------- | -------- | --- |
| P1-F1 | `X-Forwarded-For` was used for rate limiting and audit IPs even without a trusted proxy (spoofable) | Medium | Header ignored unless `TRUST_PROXY=1`; constant marker `direct` recorded otherwise (`src/server/request-context.ts`) |
| P1-F2 | Development CSP blocked React dev tooling/HMR (would tempt a permanent relaxation) | Low | `'unsafe-eval'`/`ws:` added **only** when `NODE_ENV !== production` (`next.config.ts`) |
| P1-F3 | MFA recovery codes could disappear before being read (page re-render after enrolment) | Low (usability/security) | Enrolment action no longer revalidates; codes shown once by the client component |
| P1-F4 | Three server pages passed functions to a client component (500 on roles/password pages) | Low (availability) | Forms moved to client components (`role-form.tsx`, `password-form.tsx`) |

## Findings fixed during Phase 3

| ID | Finding | Severity | Fix |
| -- | ------- | -------- | --- |
| P3-F1 | Person search: the territorial scope filter (Prisma `OR`) was overridden by the free-text search `OR` → a station could find persons registered by another station | **High** | Scope, "mine" and search filters combined with `AND: [...]` in persons, complaints and cases queries; regression test P3-I2 |

## Controls status

| Control | Phase | Status |
| ------- | ----- | ------ |
| Security headers (CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy) | 0/1 | implemented, verified by test P1-S2 |
| Append-only audit log & chain of custody (DB triggers) | 0 | implemented + tested |
| Password hashing bcrypt cost 12; policy ≥12 chars, 3 of 4 classes, no username/e-mail, history 5, max age 90 d, forced change on first login | 1 | implemented + tested |
| Session management: DB sessions, 256-bit random token (SHA-256 stored), HttpOnly/SameSite=Lax/Secure(prod), idle 60 min, absolute 10 h, revoke on logout/password change/role change/status change/admin action | 1 | implemented + tested |
| MFA: TOTP RFC 6238 (HMAC-SHA1, 30 s, ±1), secret AES-256-GCM at rest, 8 hashed single-use recovery codes, forced for `requiresMfa` roles, 5 attempts per 5-minute challenge | 1 | implemented + tested (unit vectors, browser E2E) |
| Brute-force protection: lockout after 5 failures for 15 min (DB), per-identifier 20/15 min and per-IP 100/15 min limiters, generic error (no user enumeration), all attempts recorded | 1 | implemented + tested |
| Rate limiting: in-app sliding window (login, MFA, reset, API read/write) + Nginx zones | 1 / 0 | app implemented + tested; Nginx configured (execution Phase 15) |
| RBAC: 92-permission catalog, 12 seeded system roles, DB-managed permission sets, scope levels (NATIONAL/REGIONAL/STATION/OWN), permission checks in DAL, server actions and API wrapper | 1 | implemented + tested |
| Privilege-escalation guards: cannot grant roles/permissions one does not hold; cannot change own role/status; last SUPER_ADMIN protected; role change revokes sessions | 1 | implemented + tested |
| CSRF: Next.js origin check on server actions; `X-Requested-With: PMS` required for cookie-authenticated API mutations | 1 | implemented + tested |
| API keys: `pms_<prefix>_<secret>`, SHA-256 stored, expiry, max 5, owner permissions, revocation | 1 | implemented + tested |
| Audit of every auth event, mutation, denied access and export, with redaction of secrets | 1 | implemented + tested |
| Secrets: `.env` git-ignored; MFA secrets encrypted; audit redaction | 0/1 | implemented |
| Territorial scope (Role + Organizational scope + Permission): NATIONAL / REGIONAL (province) / DEPARTMENTAL / STATION incl. attached posts & units; 404 outside scope | 2 | implemented + 8 isolation tests |
| Case-level authorization: territorial scope AND (not sensitive OR `cases:view_sensitive` OR team member); writes limited to team / `cases:assign`; per-operation permissions (charge/refer, close, archive) | 3 | implemented + 3 tests |
| Person register visibility: national records shared, station-registered records limited to the registering scope | 3 | implemented + tested |
| File upload validation & authorized downloads | 9 | pending |
| Dedicated penetration-style testing | 14 | pending |

## Phase 1 security test results

| Vulnerability | Tested | Result | Severity |
| ------------- | ------ | ------ | -------- |
| Authentication bypass (no cookie / bad key / expired / revoked session) | yes (P1-S3, S4, S10, S11, S14) | blocked | — |
| User enumeration via login errors | yes (P1-S6) | identical responses | — |
| Brute force | yes (P1-S12) | lockout + limiter | — |
| Authorization bypass / insufficient permission | yes (P1-S7, P1-I11) | 403 + audited | — |
| Privilege escalation (self role change, granting higher roles, editing permissions beyond own) | yes (P1-S8, P1-I10) | blocked | — |
| IDOR / scope leakage on users | yes (P1-I7, P1-I10) | scoped, 404/409 | — |
| CSRF on cookie-authenticated mutation | yes (P1-S9) | 403 | — |
| MFA bypass for privileged roles | yes (P1-S13, browser) | blocked until enrolment/verification | — |
| SQL injection-shaped input, malformed JSON | yes (P1-S16) | parameterized queries, 422 | — |
| Secret leakage in API responses | yes (P1-I9) | no hashes/secrets | — |
| Audit tampering | Phase 0 | blocked by trigger | — |

## Phase 2 security test results

| Vulnerability | Tested | Result | Severity |
| ------------- | ------ | ------ | -------- |
| Cross-station data leak (officers, structures, accounts) | yes (P2-S1..S3, S7) | blocked (404) | — |
| Cross-province leak | yes (P2-S4, S7) | blocked | — |
| Departmental scope overflow | yes (P2-S5) | blocked | — |
| Post seeing parent/siblings | yes (P2-S2) | blocked | — |
| Recursive hierarchy cycle (DoS) | yes (P2-S8 + validation) | impossible | — |

## Phase 3 security test results

| Vulnerability | Tested | Result | Severity |
| ------------- | ------ | ------ | -------- |
| Cross-station person leak (list, search, picker, direct read) | yes (P3-I2) | blocked (404 / absent) after fix P3-F1 | — |
| Cross-station / attached-post complaint & case leak | yes (P3-I5) | blocked (404) | — |
| Sensitive case read by non-member | yes (P3-I6) | blocked (404) | — |
| Case write by non-member / after closure | yes (P3-I7) | 403 / 409 | — |
| State-machine bypass (complaint, case) | yes (P3-I3, I7) | 409 STATE | — |
| API `PATCH { op }` without the operation's permission | yes (P3-I3, I4) | 403 | — |
| Identity document reuse across persons | yes (P3-I1) | 409 | — |

## Traffic offences and fines module (2026-09-26)

| Risk | Control | Verified by |
| ---- | ------- | ----------- |
| Unauthorised action on PV, fines, payments | 15 `traffic:*` permissions, server-side check in every service and route, denied attempts audited; payment rights held only by the finance / administration roles | `tests/unit/traffic.test.ts` (role matrix), `tests/integration/traffic.test.ts` (403s) |
| Cross-jurisdiction read | controls, PV, fines scoped by station/province (404 outside scope); evidence downloads use the control's scope; identity details of registry persons only inside the person's scope | integration tests (chief of another commissariat gets 404 incl. download) |
| Deletion or silent alteration of financial records | DB triggers forbid DELETE on PV, fines, payments, controls, evidence, drivers, vehicles; receipts and PV offence lines are append-only; PV sealed (SHA-256 + HMAC) and re-verified on every QR check; every change audited | integration test « integrity at database level » and « tampering is detected » |
| Overpayment / double booking | optimistic guard on the fine, DB `CHECK (paid ≤ amount)`, unique `(method, transaction reference)`, reference mandatory for non-cash | integration tests |
| Information leak through the public QR pages | random 24-character token, rate limiting, no identity beyond masked initials, plate partly masked, robots noindex; unknown token → 404 | integration test (name and CNI absent from the response) |
| Identity-number enumeration in search | CNI search is an exact match only | integration test |
| Malicious uploads | allow-list (JPEG/PNG/WebP/HEIC, MP4/MOV/WebM, PDF), size limit, SHA-256 stored, executables refused | integration test |
| Payment fraud / gateway risk | **no real gateway**: manual provider only; the reference is a declared value, so payments must be reconciled with the bank / operator statements | documented limit |
| Legal value of the seal | integrity seal only, explicitly not a qualified electronic signature | shown on the PV page |

Findings: none open. Note: the QR code embeds `APP_URL`; a wrong value in production produces unusable links (configuration item).

## Residual risks / notes

- Argon2id not used (native build constraint on the Windows workstation); bcrypt cost 12 is used as allowed by the specification.
- Without a trusted proxy the application cannot see the client socket IP (Next.js limitation); per-IP limits therefore only become effective behind Nginx (`TRUST_PROXY=1`). Per-identifier limits and account lockout are always effective.
- No e-mail/SMS gateway: password reset links are issued by administrators and handed over out-of-band (audited).
- The in-process rate limiter is per instance; a multi-instance deployment should add the Nginx zones (configured) or a shared store (deferred to deployment).
