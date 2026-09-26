# TEST REPORT — SIGPN-T — Système Intégré de Gestion Numérique de la Police Nationale du Tchad

_Cumulative. Only tests that were actually executed are recorded. Per-phase detail lives in `docs/phases/PHASE_XX_REPORT.md`._

## Summary

| Phase | Unit | Integration | Security | Negative | Responsive | Result |
| ----- | ---- | ----------- | -------- | -------- | ---------- | ------ |
| 0 | — | 5 pass (`tests/integration/db-integrity.test.ts`) + 3 tooling checks | 2 pass | 2 pass | n/a (no UI yet) | PASS |
| 1 | 16 pass (`tests/unit/auth-primitives.test.ts`, `tests/unit/i18n.test.ts`) | 14 pass (`db-integrity`, `users-api`) | 16 pass (`tests/security/auth.test.ts`) + 11 manual browser checks | 12 pass | 5 breakpoints pass | PASS |
| 2 | 16 pass (re-run) | 22 pass (`db-integrity`, `users-api`, `territory-scope` 8) | 16 pass (re-run) + 8 territorial isolation tests | 8 pass | 2 breakpoints (1366, 375) | PASS |
| 3 | 22 pass (`workflows` 6 new) | 30 pass (`complaints-cases` 8 new) | 16 pass (re-run) + 4 case-level/person-scope tests | 13 pass | 2 breakpoints (desktop, 375) | PASS |

| Traffic (2026-09-26) | 50 pass (`traffic` 11 new) | 68 pass (`traffic` 22 new) | 16 pass (re-run) | 24 pass (in the traffic tests: refusals, scope, duplicates, tampering) | 375 px mobile form, tablet, desktop, Arabic RTL (manual browser checks) | PASS |

Last full regression run: 2026-09-26 — **50 unit, 68 integration, 16 security tests green**; `tsc --noEmit`, `eslint` and `next build` clean.

### Traffic module — executed checks (2026-09-26)

| Area | Result |
| ---- | ------ |
| Login, permissions | `traffic.cs1`, `admin` sign-in in the browser; 403 for read-only, desk, finance (no control), auditor (no action); 403 for control agent on payments; MFA-flagged roles unchanged |
| Catalogue import | 82 rows (67 / 7 / 8), amounts and délits verified by unit + API tests; import idempotent (2nd run: 0 created / 82 updated) |
| Control → PV → fine | UI run: 3 offences ticked, running total 53 600 FCFA, PV `PV-2026-000007` + fine created, plate normalised; API: 2 offences = 28 600 FCFA; délit-only PV has no fine; compliant control has no PV |
| PDF / QR | PV and receipt PDFs generated (`%PDF`, QR code, seal, photo embedded) and rendered to an image for visual review; public `/verify/pv/…` authentic, identity masked; tampering detected (`sealValid=false`) |
| Payment / receipt | cash and mobile money; reference mandatory and unique; overpayment, partial payment (off by default) refused; setting enables partial → PARTIALLY_PAID → PAID; void re-opens the fine; receipt stays |
| Fine statuses | PAID never set by hand; contest needs a reason and blocks payment; PV cancellation cancels the fine; paid fine cannot be cancelled |
| Database integrity | DELETE refused on PV/fines/payments; receipts and PV offence lines append-only; `CHECK` refuses overpayment |
| Scope | other commissariat → 404 on control/PV/fine/evidence download; province finance manager sees them |
| Integrations | wanted vehicle → alert + audit; case opened from a PV (needs `cases:create`, once); evidence upload (executables refused) |
| Dashboard / search | KPIs recomputed from the DB inside the scope; CSV needs `traffic:export`; search by PV, plate, driver, CNI (exact only), offence, officer, payment status; direct plate lookup |
| Audit | 10 `TRAFFIC_*` actions asserted in the log |
| UI | Arabic RTL rendering, mobile 375 px form with sticky action bar, dashboard charts with real data (150 demo controls) |

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

## Phase 2 — executed tests (2026-09-12)

### Territorial scope isolation (`tests/integration/territory-scope.test.ts`) — 8/8

| Test ID | Test | Result |
| ------- | ---- | ------ |
| P2-S1 | Station commander (CS-01) sees own structure + attached posts/units (PP-NDJ-01A, PP-NDJ-02A, BAC-NDJ), not sibling CA-NDJ-05 nor other provinces | PASS |
| P2-S2 | Agent of a post sees only their own post | PASS |
| P2-S3 | Officer / structure of another commissariat → 404 (no existence leak); own attached post → 200 | PASS |
| P2-S4 | Provincial commander sees every structure of the province, none from other provinces, 1 province in /provinces | PASS |
| P2-S5 | Departmental commander sees exactly the structures of the administrative department | PASS |
| P2-S6 | National admin sees 23 provinces and every structure | PASS |
| P2-S7 | Moundou commander isolated from N'Djamena | PASS |
| P2-S8 | Hierarchy integrity: no orphan POST/UNIT, no cycle | PASS |

### Regression (re-run after the territorial migration)
Unit 16/16 · users-api 9/9 (assertion updated: station scope now includes attached posts) · db-integrity 5/5 · security 16/16 · `next build` OK.

### Manual browser checks
Organisation, Province (Ville de N'Djamena), Département (DEP-NDJ), Commissariat (CS-01: 3 postes/unités, 7 services, 14 agents, 7 comptes), Agents (118), Utilisateurs (17), Nouvel utilisateur — all render without console errors; FR default, DEMO banner, DEMO/Référentiel badges; 1366×768 and 375×812.

## Phase 3 — executed tests (2026-09-12)

### Unit (`tests/unit/workflows.test.ts`) — 6/6 (total unit 22/22)
Complaint schema minimums/defaults · case schema category/sensitive flag · party schema role/person · person schema (identifier pair, forceCreate) · bilingual labels for every workflow status, party role/status and 20 offence categories · FR/EN dictionaries in sync.

### Integration (`tests/integration/complaints-cases.test.ts`) — 8/8 (total integration 30/30)

| Test ID | Test | Result |
| ------- | ---- | ------ |
| P3-I1 | Duplicate detection: same identifier → 409; same phone → candidates returned, no creation; `forceCreate` → created | PASS |
| P3-I2 | Person scope: a person registered by CS-01 is invisible (list, search, direct read → 404) to CA-NDJ-05; national persons remain visible | PASS |
| P3-I3 | Complaint workflow end-to-end: draft → register → review → assign (out-of-scope investigator → 422) → convert; illegal transition → 409; audit sequence CREATED/REGISTERED/REVIEWED/ASSIGNED/CONVERTED | PASS |
| P3-I4 | Case operations: party (suspect ⇒ UNDER_INVESTIGATION), party status, task + status, note, timeline entries | PASS |
| P3-I5 | Case-level authorization: attached post agent cannot see the parent commissariat's case (404); another commissariat 404; team member 200 | PASS |
| P3-I6 | Sensitive case hidden from non-members without `cases:view_sensitive`, visible to team member and national | PASS |
| P3-I7 | Supervisor closure requires disposition (422); closed case read-only (409); non-member write → 403 | PASS |
| P3-I8 | Merge: links (complaints, parties, aliases, identifiers) redirected, source keeps `mergedIntoId`, source excluded from lists | PASS |

### Regression
Unit 22/22 · integration 30/30 (`db-integrity` 5, `users-api` 9, `territory-scope` 8, `complaints-cases` 8) · security 16/16 (two tests — CSRF and logout — are flaky when the suite is re-run within 15 minutes because of the in-memory per-identifier login limiter; re-run green) · `tsc`, `eslint`, `next build` OK.

### Manual browser checks
Plaintes (75, compteurs), Fiche plainte (stepper, faits, traitement), Affaire CASE-2026-00001 (vue d'ensemble, personnes avec présomption d'innocence, tâches, audit), Personnes, Fiche personne, Enregistrer une personne, Mes tâches, Fiche agent (fonction, formations), Organisation (fonctions) — no console errors; FR default; 375×812 on the case workspace (scrollable tabs, stacked task cards).


## Recettes et versements (2026-09-27)
`tests/unit/cash.test.ts` (6) et `tests/integration/cash.test.ts` (13) : ouverture/encaissement (espèces, électronique, Mobile Money), annulation avec motif, clôture, état journalier PDF, caisse clôturée (service + base), anti-doublon, suppressions interdites, versement (plafond, bordereau, référence, manquant), bordereau PDF/QR/vérification publique, vérification → validation (séparation des tâches) → rapprochement → clôture définitive, écart (justification, rejet, validation), rejet puis nouvelle soumission, versement partiel (réglage), caisse bloquée, tableau de bord, 12 rapports, recherche, audit (rôle, IP, avant/après, référence), rôles. Régression : unit 56/56 · intégration 81/81 · sécurité 16/16 · tsc, eslint, `next build` propres.
