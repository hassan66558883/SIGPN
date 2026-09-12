# SECURITY REPORT — Police Management System

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
| Case-level authorization | 5 | pending |
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

## Residual risks / notes

- Argon2id not used (native build constraint on the Windows workstation); bcrypt cost 12 is used as allowed by the specification.
- Without a trusted proxy the application cannot see the client socket IP (Next.js limitation); per-IP limits therefore only become effective behind Nginx (`TRUST_PROXY=1`). Per-identifier limits and account lockout are always effective.
- No e-mail/SMS gateway: password reset links are issued by administrators and handed over out-of-band (audited).
- The in-process rate limiter is per instance; a multi-instance deployment should add the Nginx zones (configured) or a shared store (deferred to deployment).
