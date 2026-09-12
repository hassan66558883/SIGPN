# CHANGELOG

All notable changes to the Police Management System. Dates are ISO (UTC+1, N'Djamena).

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
