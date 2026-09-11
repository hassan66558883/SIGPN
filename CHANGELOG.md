# CHANGELOG

All notable changes to the Police Management System. Dates are ISO (UTC+1, N'Djamena).

## [0.1.0] — 2026-09-11 — Phase 0: Architecture & Foundation

### Added
- Project scaffold: Next.js 16.3, React 19, TypeScript strict, Tailwind 4, Prisma 7, PostgreSQL 18.
- Complete data model (`prisma/schema.prisma`): 64 tables / 57 enums covering identity & RBAC, organization, persons, complaints, cases, investigation, evidence & custody, warrants/arrests/detention, operations, fleet, documents, notifications, audit, system & backup.
- Migrations `init` and `immutability_triggers` (append-only `AuditLog` / `CustodyEvent`, `pg_trgm` search indexes).
- Embedded PostgreSQL dev database (`npm run db:dev`, port 5436).
- Deployment artifacts: multi-stage Dockerfile, docker-compose (nginx + app + postgres + backup), Nginx TLS/rate-limit config, backup/restore scripts.
- Documentation: `docs/ARCHITECTURE.md` (ADRs, system/frontend/backend/DB/API/security/storage/audit/backup/deployment architecture, ERD, module map), generated `docs/DATABASE_DOCUMENTATION.md`, status files.
