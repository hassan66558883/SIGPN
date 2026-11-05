import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { logAudit } from "@/server/audit";
import { CORPS_OF_CATEGORY } from "@/server/hr/corps";

export const IMPORT_COLUMNS = ["badgeNumber", "firstName", "lastName", "gender", "dateOfBirth", "birthPlace", "maritalStatus", "rankCode", "stationCode", "positionCode", "corpsCode", "hiredAt", "serviceStartDate", "currentPostSince", "phone", "email"] as const;

const date = z
  .string()
  .trim()
  .transform((s, ctx) => {
    if (!s) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s) ?? /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
    const iso = m ? (m[1].length === 4 ? `${m[1]}-${m[2]}-${m[3]}` : `${m[3]}-${m[2]}-${m[1]}`) : "";
    const d = new Date(`${iso}T00:00:00Z`);
    if (!iso || Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: "custom", message: "invalid date (use YYYY-MM-DD or DD/MM/YYYY)" });
      return z.NEVER;
    }
    return d;
  });

const rowSchema = z.object({
  badgeNumber: z.string().trim().min(2).max(20).regex(/^[A-Za-z0-9-]+$/, "letters, digits and dashes only").transform((s) => s.toUpperCase()),
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  gender: z.string().trim().transform((s) => s.toUpperCase()).pipe(z.enum(["MALE", "FEMALE", "OTHER", "UNKNOWN", ""]).transform((s) => s || "UNKNOWN")),
  dateOfBirth: date,
  birthPlace: z.string().trim().max(100),
  maritalStatus: z.string().trim().transform((s) => s.toUpperCase()).pipe(z.enum(["SINGLE", "MARRIED", "DIVORCED", "WIDOWED", "UNKNOWN", ""])),
  rankCode: z.string().trim().min(1, "rank code required"),
  stationCode: z.string().trim().min(1, "structure code required"),
  positionCode: z.string().trim(),
  corpsCode: z.string().trim(),
  hiredAt: date,
  serviceStartDate: date,
  currentPostSince: date,
  phone: z.string().trim().max(30),
  email: z.string().trim().max(120).refine((s) => !s || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s), "invalid e-mail"),
});

export type ImportIssue = { line: number; badgeNumber: string; message: string };
export type ImportReport = { dryRun: boolean; rows: number; valid: number; created: number; skippedExisting: number; errors: ImportIssue[]; warnings: ImportIssue[] };

/** Minimal RFC 4180 CSV reader (quotes, doubled quotes, CRLF, `,` or `;` separator, BOM). */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const sep = (src.split("\n", 1)[0].match(/;/g)?.length ?? 0) > (src.split("\n", 1)[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let q = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"' && src[i + 1] === '"') (field += '"'), i++;
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === sep) (cur.push(field), (field = ""));
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      cur.push(field);
      field = "";
      if (cur.some((x) => x !== "")) rows.push(cur);
      cur = [];
    } else field += c;
  }
  if (field !== "" || cur.length) {
    cur.push(field);
    if (cur.some((x) => x !== "")) rows.push(cur);
  }
  return rows;
}


/**
 * Bulk creation of officer dossiers from a CSV (national migration of the personnel files). Creates only: an existing
 * badge number is reported and skipped, never overwritten. Each officer gets an open assignment and a RECRUITMENT
 * career event. Dry run by default: nothing is written until `apply` is true. Written in chunks inside transactions.
 */
export async function importOfficers(csv: string, opts: { apply: boolean; chunk?: number; actorLabel?: string }): Promise<ImportReport> {
  const table = parseCsv(csv);
  const header = (table[0] ?? []).map((h) => h.trim());
  const missing = ["badgeNumber", "firstName", "lastName", "rankCode", "stationCode"].filter((c) => !header.includes(c));
  if (missing.length) throw new Error(`Missing column(s): ${missing.join(", ")}. Expected columns: ${IMPORT_COLUMNS.join(", ")}`);
  const idx = Object.fromEntries(IMPORT_COLUMNS.map((c) => [c, header.indexOf(c)]));
  const rep: ImportReport = { dryRun: !opts.apply, rows: table.length - 1, valid: 0, created: 0, skippedExisting: 0, errors: [], warnings: [] };

  const [ranks, stations, positions, corps, existing] = await Promise.all([
    prisma.rank.findMany({ select: { id: true, code: true, category: true } }),
    prisma.station.findMany({ select: { id: true, code: true } }),
    prisma.position.findMany({ select: { id: true, code: true } }),
    prisma.corps.findMany({ select: { id: true, code: true } }),
    prisma.officer.findMany({ select: { badgeNumber: true } }),
  ]);
  const rankBy = new Map(ranks.map((r) => [r.code.toUpperCase(), r]));
  const stationBy = new Map(stations.map((s) => [s.code.toUpperCase(), s.id]));
  const positionBy = new Map(positions.map((p) => [p.code.toUpperCase(), p.id]));
  const corpsBy = new Map(corps.map((c) => [c.code.toUpperCase(), c.id]));
  const known = new Set(existing.map((o) => o.badgeNumber.toUpperCase()));
  const seen = new Set<string>();

  type Ready = { id: string; data: Prisma.OfficerUncheckedCreateInput; rankId: string; stationId: string; positionId: string | null; hired: Date | null; since: Date | null };
  const ready: Ready[] = [];
  for (let r = 1; r < table.length; r++) {
    const line = r + 1;
    const raw = Object.fromEntries(IMPORT_COLUMNS.map((c) => [c, idx[c] >= 0 ? (table[r][idx[c]] ?? "") : ""]));
    const parsed = rowSchema.safeParse(raw);
    if (!parsed.success) {
      for (const i of parsed.error.issues) rep.errors.push({ line, badgeNumber: String(raw.badgeNumber), message: `${i.path.join(".")}: ${i.message}` });
      continue;
    }
    const v = parsed.data;
    const err = (message: string) => rep.errors.push({ line, badgeNumber: v.badgeNumber, message });
    if (seen.has(v.badgeNumber)) {
      err("duplicate badge number in the file");
      continue;
    }
    seen.add(v.badgeNumber);
    if (known.has(v.badgeNumber)) {
      rep.skippedExisting++;
      rep.warnings.push({ line, badgeNumber: v.badgeNumber, message: "already exists: skipped (never overwritten)" });
      continue;
    }
    const rank = rankBy.get(v.rankCode.toUpperCase());
    const stationId = stationBy.get(v.stationCode.toUpperCase());
    if (!rank) err(`unknown rank code "${v.rankCode}"`);
    if (!stationId) err(`unknown structure code "${v.stationCode}"`);
    const positionId = v.positionCode ? positionBy.get(v.positionCode.toUpperCase()) : null;
    if (v.positionCode && !positionId) err(`unknown position code "${v.positionCode}"`);
    const corpsId = v.corpsCode ? corpsBy.get(v.corpsCode.toUpperCase()) : (corpsBy.get(CORPS_OF_CATEGORY[rank?.category ?? ""] ?? "") ?? null);
    if (v.corpsCode && !corpsId) err(`unknown corps code "${v.corpsCode}"`);
    const dob = v.dateOfBirth;
    const hired = v.hiredAt;
    if (dob && dob > new Date()) err("date of birth in the future");
    if (dob && hired && hired < new Date(Date.UTC(dob.getUTCFullYear() + 16, dob.getUTCMonth(), dob.getUTCDate()))) err("hired before the age of 16");
    if (!dob) rep.warnings.push({ line, badgeNumber: v.badgeNumber, message: "no date of birth (excluded from the retirement forecast)" });
    const since = v.currentPostSince ?? hired;
    if (!since) rep.warnings.push({ line, badgeNumber: v.badgeNumber, message: "no date of taking up the post (excluded from the automatic assignment)" });
    if (since && since > new Date(Date.now() + 86_400_000)) err("date of taking up the post in the future");
    if (!rank || !stationId || (v.positionCode && !positionId) || (v.corpsCode && !corpsId) || (dob && dob > new Date()) || (dob && hired && hired < new Date(Date.UTC(dob.getUTCFullYear() + 16, dob.getUTCMonth(), dob.getUTCDate()))) || (since && since > new Date(Date.now() + 86_400_000))) continue;
    rep.valid++;
    ready.push({
      id: randomUUID(),
      rankId: rank.id,
      stationId,
      positionId: positionId ?? null,
      hired,
      since,
      data: { id: "", badgeNumber: v.badgeNumber, firstName: v.firstName, lastName: v.lastName, gender: v.gender as "MALE", dateOfBirth: dob, birthPlace: v.birthPlace || null, maritalStatus: (v.maritalStatus || null) as "SINGLE" | null, phone: v.phone || null, email: v.email || null, rankId: rank.id, stationId, positionId: positionId ?? null, corpsId: corpsId ?? null, hiredAt: hired, serviceStartDate: v.serviceStartDate ?? hired, currentPostSince: since },
    });
  }
  if (!opts.apply) return rep;
  const chunk = opts.chunk ?? 500;
  for (let i = 0; i < ready.length; i += chunk) {
    const part = ready.slice(i, i + chunk);
    await prisma.$transaction(
      async (tx) => {
        await tx.officer.createMany({ data: part.map((p) => ({ ...p.data, id: p.id })) });
        await tx.officerAssignment.createMany({ data: part.map((p) => ({ id: randomUUID(), officerId: p.id, stationId: p.stationId, rankId: p.rankId, positionId: p.positionId, startDate: p.since ?? p.hired ?? new Date(), reason: "Initial import" })) });
        await tx.careerEvent.createMany({ data: part.filter((p) => p.hired).map((p) => ({ id: randomUUID(), officerId: p.id, type: "RECRUITMENT" as const, effectiveDate: p.hired!, reference: "IMPORT", reason: "Imported from the personnel files", toRankId: p.rankId, toStationId: p.stationId, toStatus: "ACTIVE" as const })) });
      },
      { timeout: 120_000 },
    );
    rep.created += part.length;
  }
  await logAudit({ actor: null, action: "HR_IMPORT_APPLIED", module: "hr", summary: `HR import (${opts.actorLabel ?? "cli"}): ${rep.created} officer(s) created, ${rep.skippedExisting} skipped, ${rep.errors.length} row error(s)`, after: { rows: rep.rows, created: rep.created, skipped: rep.skippedExisting, errors: rep.errors.length }, context: { ip: "cli", userAgent: "sigpn-t/hr-import" } });
  return rep;
}
