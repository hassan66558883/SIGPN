import { headers } from "next/headers";
import { env } from "@/server/env";

export type RequestContext = { ip: string | null; userAgent: string | null };

export function contextFromHeaders(h: Headers): RequestContext {
  let ip: string | null = null;
  if (env.trustProxy) {
    const forwarded = h.get("x-forwarded-for");
    ip = (forwarded ? forwarded.split(",")[0]?.trim() : null) || h.get("x-real-ip") || null;
  } else {
    // Without a trusted reverse proxy, X-Forwarded-For is attacker-controlled and must NOT feed
    // rate limiting or audit records. Next.js does not expose the socket address here, so a
    // constant marker is recorded; per-identifier limits and account lockout stay effective.
    ip = "direct";
  }
  const userAgent = h.get("user-agent");
  return { ip: ip ? ip.slice(0, 64) : null, userAgent: userAgent ? userAgent.slice(0, 512) : null };
}

export async function getRequestContext(): Promise<RequestContext> {
  return contextFromHeaders(await headers());
}
