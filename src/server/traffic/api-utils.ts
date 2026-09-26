import "server-only";
import { z } from "zod";
import { AuthError } from "@/server/errors";
import type { Actor } from "@/server/auth/dal";
import type { Permission } from "@/server/rbac/permissions";
import { paginationSchema } from "@/server/api";
import { TRAFFIC_FINE_STATUSES } from "@/server/traffic/schemas";

export function need(actor: Actor, permission: Permission) {
  if (!actor.permissions.has(permission)) throw new AuthError("forbidden", `Permission ${permission} required`);
}

export const dateQuery = z
  .string()
  .trim()
  .optional()
  .transform((s) => (s ? new Date(s) : null))
  .refine((d) => d === null || !Number.isNaN(d.getTime()), "invalid date");

export const rangeQuery = { from: dateQuery, to: dateQuery };
export const listQuery = paginationSchema.extend({ q: z.string().trim().max(100).optional(), ...rangeQuery });
export const fineStatusQuery = z.enum(TRAFFIC_FINE_STATUSES).optional();

export function pdfResponse(buf: Buffer, fileName: string, download: boolean) {
  return new Response(new Uint8Array(buf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${fileName.replace(/[^A-Za-z0-9._-]/g, "_")}"`, "Cache-Control": "private, no-store" } });
}
