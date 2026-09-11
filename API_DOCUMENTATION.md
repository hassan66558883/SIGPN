# API DOCUMENTATION — Police Management System

Base URL: `/api/v1` · Format: JSON · Auth: session cookie **or** `Authorization: Bearer pms_<key>`.

## Conventions

- Success: `{ "data": …, "meta": { "page", "pageSize", "total" }? }`
- Error: `{ "error": { "code": "UNAUTHENTICATED|FORBIDDEN|NOT_FOUND|VALIDATION|CONFLICT|RATE_LIMITED|INTERNAL", "message": string, "details"?: object } }`
- HTTP codes: 200/201 success · 400 malformed · 401 unauthenticated · 403 forbidden (audited) · 404 not found / out of scope · 409 state conflict · 422 validation · 429 rate limited · 500 internal (no details leaked).
- Pagination: `?page=1&pageSize=25` (max 100). Sorting: `?sort=createdAt:desc`.
- State-changing requests authenticated by cookie must send header `X-Requested-With: PMS` (CSRF defence); API-key requests are exempt.
- Every mutation and every 403 is written to the audit log.

## Endpoints

| Endpoint | Method | Auth | Permission | Validation | Response | Errors | Phase |
| -------- | ------ | ---- | ---------- | ---------- | -------- | ------ | ----- |
| `/api/health` | GET | none | — | — | `{ status: "ok", time }` | — | 0 |

_Endpoints are appended as each phase delivers them._
