# PROJECT STATUS — TPMS (Tchad Police Management System)

_Last updated: 2026-09-12 (end of Phase 3)_

| Item | Value |
| ---- | ----- |
| Current Phase | 4 — Opérations (incidents / interventions, patrouilles) puis tableaux de bord par niveau |
| Completed Phases | 0, 1, 2, 3 (3 regroupe les phases 3, 4 et le noyau 5/6 de la feuille de route initiale) |
| Overall Completion | 38 % (6/16 roadmap phases: 0, 1, 2, 3, 4, core of 5/6) |
| Features Completed | Architecture & data model; authentication (sessions, password policy, reset), MFA (TOTP + recovery), brute-force protection, RBAC (92 permissions, 13 roles, scope levels), users/roles/permissions administration, security centre, immutable audit log + export, notifications inbox, account self-service (sessions, API keys), REST API v1, bilingual UI (FR default / EN), responsive shell; national territorial hierarchy (23 provinces, departments, communes, localities), police structures with statuses and post/unit attachment, territorial scope incl. DEPARTMENTAL, officers & assignments, DEMO seed + banner; **personnel positions & trainings; persons register (identifiers, aliases, relationships, duplicate detection, merge); complaints workflow (draft → registered → review → assigned → converted / closed / rejected); cases & investigation core (team, parties with presumption of innocence, tasks, notes, timeline, audit trail, state machine, case-level authorization)** |
| Features Pending | Operations (incidents/interventions, patrols), dashboards per level (NATIONAL / PROVINCE / COMMISSARIAT / AGENT), evidence & custody (7), arrests & warrants & detention (8), documents & reporting (9), fleet & equipment (11), analytics (12), speech-to-text (13), hardening (14), QA & production (15), missing persons, vehicles register |
| Critical Bugs | 0 |
| High Bugs | 0 (1 found and fixed by test in Phase 3: person search scope leak, see SECURITY_REPORT.md P3-F1) |
| Security Issues | 0 open |
| Technical Debt | see `docs/phases/PHASE_03_REPORT.md` §S |
| Known Limitations | No Docker engine on the workstation (deployment execution deferred to Phase 15); no e-mail/SMS gateway; per-IP limits effective only behind the trusted proxy; attachments (photos/documents) arrive with the Documents module |
| Next Phase | Operations: incidents / interventions, patrols → dashboards per level with real KPIs |
| Production Readiness | NOT READY (foundation, security core, organization, persons/complaints/cases core) |

## Phase log

| Phase | Name | Status | Report |
| ----- | ---- | ------ | ------ |
| 0 | Architecture & Foundation | PASS | docs/phases/PHASE_00_REPORT.md |
| 1 | Authentication & Security Foundation | PASS | docs/phases/PHASE_01_REPORT.md |
| 2 | Organization & Master Data → TPMS territorial evolution | PASS | docs/phases/PHASE_02_REPORT.md |
| 3 | Personnel extras · Person Management · Complaint Management · Case/Investigation core | PASS | docs/phases/PHASE_03_REPORT.md |
| 4 | Complaint Management | PASS (delivered in 3) | docs/phases/PHASE_03_REPORT.md |
| 5 | Case Management | core PASS (delivered in 3); evidence links, reports pending | docs/phases/PHASE_03_REPORT.md |
| 6 | Investigation | core PASS (tasks, notes, timeline); interviews/leads pending | |
| 7 | Evidence & Chain of Custody | pending | |
| 8 | Arrests & Warrants | pending | |
| 9 | Document Management & Reporting | pending | |
| 10 | Operations | next | |
| 11 | Personnel & Fleet | personnel done (positions, trainings); fleet pending | |
| 12 | Dashboard & Analytics | next after operations | |
| 13 | Voice / Speech-to-Text | pending | |
| 14 | Security Hardening | pending | |
| 15 | Complete QA & Production | pending | |

## Demo credentials (development only, fictional)

Shared password: value of `DEMO_PASSWORD` in `.env` (default `Demo-Pms-2026!`). Accounts: `admin` (SUPER_ADMIN), `commander.national`, `commander.central` (province N'Djamena), `commander.dept` (département Ville de N'Djamena), `chief.cs1`, `chief.arr5`, `chief.mdu`, `inv.diallo`, `inv.mensah`, `desk.cs1`, `desk.post1`, `patrol.cs1`, `evidence.cs1`, `custody.cs1`, `fleet.central`, `analyst`, `auditor`. Roles flagged "MFA required" are forced to enrol an authenticator at first sign-in (`npx tsx scripts/demo-totp.ts <user>` prints the current code in development).

DEMO dataset (all fictional): 23 provinces (official referential) · 14 structures · 118 officers · 17 accounts · 10 positions · 124 trainings · 90 persons · 70 complaints · 16 cases.
