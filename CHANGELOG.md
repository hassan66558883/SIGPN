# CHANGELOG

All notable changes to SIGPN-T (Système Intégré de Gestion Numérique de la Police Nationale du Tchad, formerly TPMS). Dates are ISO (UTC+1, N'Djamena).

## [0.6.0] — 2026-09-27 — « Gestion des recettes et versements »

### Added
- Cash register per collecting agent, automatic booking of field payments, daily closing statement (PDF), revenue collections, deposits with electronic slip (PDF + QR + public check), verification / validation workflow (four-eyes), reconciliation, discrepancy sheets, blocking, revenue dashboard, 12 financial reports (PDF/CSV), search and financial audit (see `docs/RECETTES_VERSEMENTS.md`).
- 10 `cash:*` permissions, role « Responsable d'unité (recettes) », demo accounts `unit.head` and `control.cs2`, 5 demo registers, migration `20260927100000_traffic_cash_revenue` (triggers: no delete, closed register takes no operation, frozen statements and slips).

### Changed
- A field agent (`cash:collect`) may now record and void their own payments, only in an open register; finance roles are unchanged. Sidebar and chart axis (compact labels) tweaks; `test:integration` runs files sequentially.

## [0.5.0] — 2026-09-26 — SIGPN-T: rename and « Gestion des infractions routières et des amendes »

### Changed
- **Product renamed SIGPN-T** (Système Intégré de Gestion Numérique de la Police Nationale du Tchad): login page, sidebar, header, footer, browser title/metadata, French and Arabic dictionaries, environment defaults (`APP_NAME`), deployment config, seed text, living documentation. « TPMS » remains only in historical phase reports.
- Sidebar: the traffic dashboard entry no longer stays highlighted on every `/traffic/*` page.

### Added
- **Traffic offences and fines module** (see `docs/INFRACTIONS_ROUTIERES.md`): roadside controls (tablet/mobile-first form, GPS, photos), offence catalogue imported **verbatim** from the official table (82 offences: 67 road, 7 cycles/motorcycles, 8 moto-taxis; source PDF kept with its SHA-256), electronic PV (sealed with SHA-256 + HMAC, QR code, PDF, print), automatic fines from the flat amounts, fine statuses (to pay, paid, partially paid, cancelled, contested, on hold), payments (cash, electronic, Mobile Money, transfer — manual provider, no real gateway) and electronic receipts (QR code, PDF), drivers and vehicles registers (documents, insurance / inspection alerts), global search, traffic dashboard (KPIs, SVG charts, CSV export), public QR verification pages with masked identity.
- Integrations: persons (driver profile, licence and CNI identifiers), officers/units/stations (scope), wanted persons (hit on person or plate → alert, audit, notification), cases (open a case from a PV), incidents (link), documents/GED (evidence with SHA-256), notifications, main dashboard, audit log.
- 15 `traffic:*` permissions; 7 new system roles (`POLICE_ADMIN`, `OFFICER`, `TRAFFIC_OFFICER`, `TRAFFIC_CONTROL_AGENT`, `TRAFFIC_SUPERVISOR`, `TRAFFIC_PAYMENT_MANAGER`, `TRAFFIC_READONLY`) and traffic grants for existing roles (applied once to already-seeded databases); FR and AR labels for every role, permission, enumeration and service message.
- Database (2 additive migrations): 13 tables, 10 enums, deletion protection triggers (PV, fines, payments, controls, evidence, drivers, vehicles), append-only receipts and PV offence lines, `CHECK` constraints on amounts, 4 `DocumentEntity` values.
- REST API `/api/v1/traffic/*` (controls, evidence, tickets, PDF, cases, fines, payments, receipts, drivers, vehicles, violations, stats, search) and public verification `/api/v1/public/verify/{pv,receipt}/{token}`.
- Demo data: 150 controls, 112 PV, 105 fines, 60 payments, 36 drivers, 48 vehicles (fictional). Seven demo accounts.
- Tests: 11 unit + 22 integration for the module; full regression 50 unit / 68 integration / 16 security green; `tsc`, `eslint`, `next build` clean.

### Notes
- `prisma migrate dev` reports a pre-existing checksum change on migration `20260912161408_…` and asks for a reset; migrations are applied with `prisma migrate deploy` (no reset, no data loss).

## [0.4.0] — 2026-09-12 — Phase 3: Personnel (positions, trainings), Persons, Complaints, Cases

### Added
- Personnel: configurable positions (`Position`) carried by officers and assignments; trainings with life cycle (planned → in progress → completed / failed / cancelled), result, certificate, expiry.
- Persons register: full profile, typed identifiers (unique type+value), aliases, relationships, duplicate detection at creation (identifier, phone, name + birth date, accent-insensitive via `unaccent_safe()`), explicit forced creation, merge of duplicates (links redirected, `mergedIntoId`, no deletion), optional station attachment with territorial visibility.
- Complaints: draft/registered intake (identified or anonymous complainant), 20 offence categories, priority, workflow DRAFT → REGISTERED → UNDER_REVIEW → ASSIGNED → CONVERTED / CLOSED / REJECTED with locked transitions and concurrency guards, review, assignment to an in-scope investigator, motivated closure, conversion to a case.
- Cases: creation (direct or by conversion), investigation team (lead, supervisor, members, history), parties with presumption-of-innocence notice and party status, tasks (+ "My tasks"), notes (confidential), automatic timeline, audit trail, state machine with mandatory disposition at closure and read-only afterwards, sensitive flag.
- Case-level authorization: territorial scope AND (not sensitive OR `cases:view_sensitive` OR team member); writes limited to the team or `cases:assign`; per-operation permissions for charging/referring, closing, archiving.
- Person picker component (server search, accessible combobox).
- REST API: `/persons`, `/persons/search`, `/persons/{id}`, `/complaints`, `/complaints/{id}` (PATCH ops register/review/assign/close/convert), `/cases`, `/cases/{id}` (PATCH ops assign/addParty/partyStatus/note/task/taskStatus/status).
- DEMO seed: 10 positions, 124 trainings, 90 persons, 70 complaints, 16 cases (fictional, idempotent).
- Tests: 6 unit (workflows/schemas/labels), 8 integration (duplicate detection, person scope, complaint workflow + audit sequence, case authorization incl. attached post isolation and sensitive cases, supervisor closure/read-only).

### Fixed
- Person search scope filter (an `OR`) was overridden by the search `OR` → cross-station leak; scope, "mine" and search filters are now combined with `AND` in persons, complaints and cases queries.
- Complaint review returned 500 (`updateMany` with relation `connect`); transitions now write scalar foreign keys.

### Changed
- Migration `personnel_positions_trainings_person_station` is additive (2 tables, 3 columns, `unaccent` extension + `unaccent_safe()`).

## [0.3.0] — 2026-09-12 — Phase 2: Structures nationales & territoire (TPMS)

### Added
- Territorial hierarchy: provinces (table Region, 23 official provinces of Chad), administrative departments, communes / sub-prefectures / arrondissements, localities — configurable, flagged official vs DEMO.
- Police hierarchy: extended structure types (provincial/departmental directorates, posts, units), statuses ACTIVE / INACTIVE / UNDER_CONSTRUCTION / PLANNED, parent/child attachment with cycle protection, commander, territorial attachments.
- Scope: new DEPARTMENTAL level and role DEPARTMENTAL_COMMANDER; station scope now includes attached posts/units (recursive); 8 territorial isolation tests.
- Screens: organization overview, province, department, structure (resources & attachments), officers list/new/detail with assignment history and duty status, users placement by department, pre-fill from officer.
- REST API: /provinces, /stations, /stations/{id}, /officers, /officers/{id}.
- Seed: Chad referential + DEMO structures (14), officers (118), demo accounts (17); DEMO banner (DEMO_MODE).
- Product renamed TPMS – Tchad Police Management System.

### Changed
- Migration `national_territory` is additive only (no drop); legacy fictional regions converted to real provinces keeping their ids.

## [0.2.0] — 2026-09-12 — Phase 1: Authentication & Security Foundation

### Added
- Authentication: login (username or e-mail), logout, DB-backed sessions (idle/absolute expiry, revocation), forced password change, password policy + history, admin-issued one-time reset links, self-service reset request (notifies administrators).
- MFA: TOTP enrolment with QR code and manual key, 8 single-use recovery codes, forced enrolment for privileged roles, step-up challenge at sign-in, admin MFA reset.
- Brute-force protection: account lockout, per-identifier/per-IP limiters, login-attempt register.
- RBAC: 92-permission catalog, 12 seeded system roles with scope levels, DB-managed permission sets, role/permission editor, permission matrix, privilege-escalation guards.
- Administration: users (list/filter/create/edit/status/sessions/reset/MFA reset), roles, permissions, security centre, immutable audit log viewer with CSV export, notifications inbox, personal account page (sessions, API keys).
- REST API v1: health, auth (login/logout/me), users, roles, audit (+ export) with uniform envelope, CSRF header rule, API-key authentication.
- Internationalization: French default UI with English as second language (cookie-based switcher), bilingual enum labels, role names and permission descriptions, localized dates and page titles.
- Responsive application shell: desktop sidebar, mobile drawer, stacked-card tables below 768 px.
- Foundation seed: permission catalog, system roles, minimal organization (1 organization, 2 regions, 2 stations) and 13 fictional demo accounts.
- Tests: 16 unit, 14 integration, 16 live security tests.

### Fixed
- `X-Forwarded-For` no longer trusted without `TRUST_PROXY=1` (spoofable rate-limit key).
- Development-only CSP relaxation for React dev tooling; production CSP unchanged.
- Recovery codes shown reliably after MFA enrolment.
- Server pages no longer pass render-prop functions to client components (500 on roles/password pages).

## [0.1.0] — 2026-09-11 — Phase 0: Architecture & Foundation

### Added
- Project scaffold: Next.js 16.3, React 19, TypeScript strict, Tailwind 4, Prisma 7, PostgreSQL 18.
- Complete data model (`prisma/schema.prisma`): 64 tables / 57 enums covering identity & RBAC, organization, persons, complaints, cases, investigation, evidence & custody, warrants/arrests/detention, operations, fleet, documents, notifications, audit, system & backup.
- Migrations `init` and `immutability_triggers` (append-only `AuditLog` / `CustodyEvent`, `pg_trgm` search indexes).
- Embedded PostgreSQL dev database (`npm run db:dev`, port 5436).
- Deployment artifacts: multi-stage Dockerfile, docker-compose (nginx + app + postgres + backup), Nginx TLS/rate-limit config, backup/restore scripts.
- Documentation: `docs/ARCHITECTURE.md` (ADRs, system/frontend/backend/DB/API/security/storage/audit/backup/deployment architecture, ERD, module map), generated `docs/DATABASE_DOCUMENTATION.md`, status files.
