import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiOk, mapError, parseJson } from "@/server/api";
import { contextFromHeaders } from "@/server/request-context";
import { login } from "@/server/auth/login";
import { setSessionCookie } from "@/server/auth/session";

const schema = z.object({ identifier: z.string().trim().min(1).max(120), password: z.string().min(1).max(200) });

/**
 * POST /api/v1/auth/login — password step. Sets the session cookie on success.
 * Accounts with MFA enabled cannot complete API login this way (mfaRequired=true); use an API key instead.
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = contextFromHeaders(req.headers);
    const body = await parseJson(req, schema);
    const r = await login(body, ctx);
    if (r.kind === "mfa") return apiOk({ mfaRequired: true, message: "Second factor required. Complete sign-in in the web application or use a personal API key." });
    await setSessionCookie(r.token);
    return apiOk({ authenticated: true, userId: r.userId });
  } catch (e) {
    return mapError(e);
  }
}
