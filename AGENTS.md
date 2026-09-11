# Police Management System — notes for agents

- **Stack**: Next.js 16.3 App Router (`src/proxy.ts` is the middleware; `LayoutProps`/`PageProps`/`RouteContext` are global generated types). Read `node_modules/next/dist/docs/` before using any uncertain API. React 19, TypeScript strict, Tailwind 4.
- **Database**: Prisma 7 with the `pg` adapter; client generated into `src/generated/prisma` (git-ignored, `npm run db:generate`). Schema = `prisma/schema.prisma`, migrations in `prisma/migrations` (`npm run db:migrate`). Dev DB: `npm run db:dev` (embedded PostgreSQL 18 on port 5436, data in `.pgdata/`). Demo data: `npm run db:seed` (deterministic, fictional).
- **Dev server**: `npm run dev` → http://localhost:3300.
- **Layering**: `src/server/<module>/service.ts` holds business logic (pure functions taking an `Actor`); `src/server/<module>/actions.ts` are server actions (`"use server"`, return `FormState`); `src/app/api/v1/**/route.ts` are REST handlers. Both entry points call the same service and never touch Prisma directly for mutations.
- **Every mutation**: authenticate (`requireActor`) → authorize (`can(actor, "module:action")` + scope check) → validate (zod) → transaction → `logAudit` (+ `addCaseEvent` for case-linked entities, `notify` for other users).
- **Never**: hard-delete cases, evidence, custody events, arrests, warrants, statements, reports or audit rows; store plaintext secrets; trust client-side checks; hard-code statistics; use real personal data.
- **Labels**: all enum labels/tones live in `src/lib/labels.ts` (English UI).
- **Permissions**: catalog in `src/lib/permissions.ts`; roles are DB rows (seeded system roles) with a permission set; the effective permission set is loaded per request in the DAL.
