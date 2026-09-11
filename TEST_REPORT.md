# TEST REPORT — Police Management System

_Cumulative. Only tests that were actually executed are recorded. Per-phase detail lives in `docs/phases/PHASE_XX_REPORT.md`._

## Summary

| Phase | Unit | Integration | Security | Negative | Responsive | Result |
| ----- | ---- | ----------- | -------- | -------- | ---------- | ------ |
| 0 | — | 5 pass (`tests/integration/db-integrity.test.ts`) + 3 tooling checks | 2 pass | 2 pass | n/a (no UI yet) | PASS |

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

Functional custody-tamper test with real evidence rows is scheduled for Phase 7 (needs Evidence/User fixtures).
