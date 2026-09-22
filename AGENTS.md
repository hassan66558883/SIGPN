# Police Management System — notes for agents

- **Stack**: Next.js 16.3 App Router (`src/proxy.ts` is the middleware; `LayoutProps`/`PageProps`/`RouteContext` are global generated types). Read `node_modules/next/dist/docs/` before using any uncertain API. React 19, TypeScript strict, Tailwind 4.
- **Database**: Prisma 7 with the `pg` adapter; client generated into `src/generated/prisma` (git-ignored, `npm run db:generate`). Schema = `prisma/schema.prisma`, migrations in `prisma/migrations` (`npm run db:migrate`). Dev DB: `npm run db:dev` (embedded PostgreSQL 18 on port 5436, data in `.pgdata/`). Demo data: `npm run db:seed` (deterministic, fictional).
- **Dev server**: `npm run dev` → http://localhost:3300. A junction `C:\Users\DELL\pms` points at this folder (the real path contains a double space).
- **Layering**: `src/server/<module>/*.ts` holds business logic (services take an `Actor`); `src/server/<module>/actions.ts` are server actions (`"use server"`, return `FormState`); `src/app/api/v1/**/route.ts` are REST handlers wrapped in `withApi`. Both entry points call the same service and never touch Prisma directly for mutations.
- **Every mutation**: authenticate (`requireActorForAction`/`withApi`) → authorize (`can(actor, "module:action")` + `scopeWhere`/`inScope`) → validate (zod) → transaction → `logAudit` (+ case timeline / `notify` where relevant).
- **i18n**: French is the default UI language, Arabic is the second one (cookie `pms_lang`, switcher in the header). Arabic is RTL — `isRtl(locale)` drives `dir="rtl"` on `<html>` (root-level only; directional Tailwind utility classes are not individually mirrored). All UI strings are keys in `src/lib/i18n/fr.ts` (reference) and `ar.ts` (TypeScript enforces identical keys). Server components: `const t = await getT()` / `getLocale()`; client components: `useT()`, `useLocale()`, `useMessageTranslator()`. Enum labels are bilingual in `src/lib/labels.ts` (`labelOf(map, key, locale)`). Service-layer messages (BusinessError, success messages) stay **English** and are translated on display via `src/lib/i18n/errors.ts` — add every new English message there. System role names and permission descriptions have French and Arabic labels in `src/lib/i18n/catalog.ts`. Audit summaries remain English (system records).
- **Never**: hard-delete cases, evidence, custody events, arrests, warrants, statements, reports or audit rows; store plaintext secrets; trust client-side checks; hard-code statistics; use real personal data; add UI text without both `fr` and `ar` entries.
- **Territory & scope (TPMS)**: Province = table `Region` (kept for compatibility, UI says Province) → `AdminDepartment` → `Commune` → `Locality`; police structures `Station` with `parentId` (posts/units under a commissariat), `status`, `isDemo`. Scope levels NATIONAL / REGIONAL / DEPARTMENTAL / STATION / OWN; `Actor.stationIds` = own structure + descendants; use `scopeWhere(actor, { via: "station" })` for tables without a province column and `inScope(actor, rec)` for unitary reads (throw `NotFoundError`, never 403, outside scope). Official referential = 23 provinces + N'Djamena arrondissements only; everything else fictional must be `isDemo: true`.
- **Permissions**: catalog in `src/server/rbac/permissions.ts`; roles are DB rows (seeded system roles in `src/server/rbac/roles.ts`) with a permission set; the effective permission set is loaded per request in `src/server/auth/dal.ts`.
- **Tests**: `npm test` (unit, no DB), `npm run test:integration` (DB), `npm run test:security` (needs the dev server on 3300 + seed). Only tests that actually ran may be reported as PASS.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
