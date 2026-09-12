# PROJECT STATUS — TPMS (Tchad Police Management System)

_Last updated: 2026-09-12 (end of Phase 2)_

| Item | Value |
| ---- | ----- |
| Current Phase | 3 — Personnel (fonctions, formations) puis Plaintes / Dossiers |
| Completed Phases | 0, 1, 2 |
| Overall Completion | 19 % (3/16 phases) |
| Features Completed | Architecture & data model; authentication (sessions, password policy, reset), MFA (TOTP + recovery), brute-force protection, RBAC (92 permissions, 12 roles, scope levels), users/roles/permissions administration, security centre, immutable audit log + export, notifications inbox, account self-service (sessions, API keys), REST API v1 (auth/users/roles/audit), bilingual UI (FR default / EN), responsive shell; national territorial hierarchy (23 provinces, departments, communes, localities), police structures with statuses and post/unit attachment, territorial scope incl. DEPARTMENTAL, officers & assignments, DEMO seed + banner, TPMS branding |
| Features Pending | Personnel extras (functions, trainings), persons (3), complaints (4), cases (5), investigation (6), evidence & custody (7), arrests & warrants (8), documents & reporting (9), operations (10), personnel & fleet (11), dashboard & analytics (12), speech-to-text (13), hardening (14), QA & production (15) |
| Critical Bugs | 0 |
| High Bugs | 0 |
| Security Issues | 0 open (4 fixed in Phase 1, see SECURITY_REPORT.md) |
| Technical Debt | see `docs/phases/PHASE_01_REPORT.md` §S |
| Known Limitations | No Docker engine on the workstation (deployment execution deferred to Phase 15); no e-mail/SMS gateway (reset links handed over by administrators); per-IP limits effective only behind the trusted proxy |
| Next Phase | 3 — Person Management (after personnel functions/trainings) |
| Production Readiness | NOT READY (foundation + security core only) |

## Phase log

| Phase | Name | Status | Report |
| ----- | ---- | ------ | ------ |
| 0 | Architecture & Foundation | PASS | docs/phases/PHASE_00_REPORT.md |
| 1 | Authentication & Security Foundation | PASS | docs/phases/PHASE_01_REPORT.md |
| 2 | Organization & Master Data → TPMS territorial evolution | PASS | docs/phases/PHASE_02_REPORT.md |
| 3 | Person Management | pending | |
| 4 | Complaint Management | pending | |
| 5 | Case Management | pending | |
| 6 | Investigation | pending | |
| 7 | Evidence & Chain of Custody | pending | |
| 8 | Arrests & Warrants | pending | |
| 9 | Document Management & Reporting | pending | |
| 10 | Operations | pending | |
| 11 | Personnel & Fleet | pending | |
| 12 | Dashboard & Analytics | pending | |
| 13 | Voice / Speech-to-Text | pending | |
| 14 | Security Hardening | pending | |
| 15 | Complete QA & Production | pending | |

## Demo credentials (development only, fictional)

Shared password: value of `DEMO_PASSWORD` in `.env` (default `Demo-Pms-2026!`). Accounts: `admin` (SUPER_ADMIN), `commander.national`, `commander.central` (province N'Djamena), `commander.dept` (département Ville de N'Djamena), `chief.cs1`, `chief.arr5`, `chief.mdu`, `inv.diallo`, `inv.mensah`, `desk.cs1`, `desk.post1`, `patrol.cs1`, `evidence.cs1`, `custody.cs1`, `fleet.central`, `analyst`, `auditor`. Roles flagged "MFA required" are forced to enrol an authenticator at first sign-in (`npx tsx scripts/demo-totp.ts <user>` prints the current code in development).
