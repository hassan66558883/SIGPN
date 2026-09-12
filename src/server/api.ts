import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { logAudit } from "@/server/audit";
import { contextFromHeaders, type RequestContext } from "@/server/request-context";
import { resolveApiActor } from "@/server/auth/api-auth";
import { can, pendingSecurityStep, type Actor } from "@/server/auth/dal";
import { enforceRateLimit } from "@/server/auth/rate-limit";
import { AuthError, BusinessError, NotFoundError, RateLimitError } from "@/server/errors";
import type { Permission } from "@/server/rbac/permissions";

export type ApiContext<P = Record<string, string>> = { actor: Actor; ctx: RequestContext; params: P; req: NextRequest };

type Handler<P> = (c: ApiContext<P>) => Promise<Response>;

export function apiError(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json({ error: { code, message, ...(details !== undefined ? { details } : {}) } }, { status });
}

export function apiOk<T>(data: T, init?: { status?: number; meta?: Record<string, unknown> }) {
  return NextResponse.json({ data, ...(init?.meta ? { meta: init.meta } : {}) }, { status: init?.status ?? 200 });
}

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Wraps a route handler with: actor resolution (API key or session), CSRF header check for
 * cookie-authenticated mutations, rate limiting, permission check (audited on denial) and
 * uniform error mapping. Handlers never see unauthenticated requests.
 */
export function withApi<P = Record<string, string>>(opts: { permission?: Permission; public?: boolean }, handler: Handler<P>) {
  return async (req: NextRequest, routeCtx?: { params: Promise<P> }): Promise<Response> => {
    const ctx = contextFromHeaders(req.headers);
    const params = (routeCtx ? await routeCtx.params : ({} as P)) as P;
    try {
      enforceRateLimit(MUTATING.has(req.method) ? "apiWrite" : "api", ctx.ip);
      if (opts.public) return await handler({ actor: null as unknown as Actor, ctx, params, req });
      const actor = await resolveApiActor(req);
      if (!actor) return apiError(401, "UNAUTHENTICATED", "Authentication required.");
      if (actor.authMethod === "session") {
        if (MUTATING.has(req.method) && req.headers.get("x-requested-with") !== "PMS") return apiError(403, "CSRF", "Missing X-Requested-With: PMS header.");
        const step = pendingSecurityStep(actor);
        if (step) return apiError(403, "SECURITY_STEP_REQUIRED", step === "password" ? "Password change required." : "Multi-factor authentication required.");
      }
      if (opts.permission && !can(actor, opts.permission)) {
        await logAudit({ actor, action: "ACCESS_DENIED", module: opts.permission.split(":")[0], outcome: "DENIED", summary: `API ${req.method} ${req.nextUrl.pathname} denied: ${opts.permission} required (role ${actor.roleCode})`, context: ctx });
        return apiError(403, "FORBIDDEN", "You do not have permission to perform this action.");
      }
      return await handler({ actor, ctx, params, req });
    } catch (e) {
      return mapError(e);
    }
  };
}

export function mapError(e: unknown): Response {
  if (e instanceof RateLimitError) return NextResponse.json({ error: { code: "RATE_LIMITED", message: e.message } }, { status: 429, headers: { "Retry-After": String(e.retryAfterSeconds) } });
  if (e instanceof AuthError) return e.kind === "unauthenticated" ? apiError(401, "UNAUTHENTICATED", "Authentication required.") : apiError(403, "FORBIDDEN", e.message || "Forbidden.");
  if (e instanceof NotFoundError) return apiError(404, "NOT_FOUND", e.message);
  if (e instanceof BusinessError) return apiError(e.code === "CONFLICT" || e.code === "STATE" ? 409 : 422, e.code, e.message, e.fieldErrors);
  if (e instanceof z.ZodError) return apiError(422, "VALIDATION", "Validation failed.", z.flattenError(e).fieldErrors);
  console.error("[api] unhandled", e);
  return apiError(500, "INTERNAL", "Internal server error.");
}

export async function parseJson<T extends z.ZodType>(req: NextRequest, schema: T): Promise<z.infer<T>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new BusinessError("Request body must be valid JSON.");
  }
  return schema.parse(body);
}

export function parseQuery<T extends z.ZodType>(req: NextRequest, schema: T): z.infer<T> {
  return schema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
}

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export function pageArgs(p: { page: number; pageSize: number }) {
  return { skip: (p.page - 1) * p.pageSize, take: p.pageSize };
}
