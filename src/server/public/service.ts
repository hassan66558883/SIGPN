import "server-only";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { BusinessError, NotFoundError } from "@/server/errors";
import { enforceRateLimit } from "@/server/auth/rate-limit";
import { nextNumber } from "@/server/sequences";

/**
 * PUBLIC SIDE. Everything the anonymous portal can read or write goes through this file, with explicit `select`s of public fields only:
 * no internal id of a person, case, officer or investigation, no internal reason, no contact of a complainant, ever.
 * `tests/unit/public-boundary.test.ts` and the integration test guard this boundary.
 */

export const OFFENSE_CATEGORIES = ["HOMICIDE", "ASSAULT", "SEXUAL_OFFENSE", "ROBBERY", "THEFT", "BURGLARY", "FRAUD", "CORRUPTION", "DRUG_OFFENSE", "TRAFFICKING", "CYBERCRIME", "ARMS_OFFENSE", "KIDNAPPING", "DOMESTIC_VIOLENCE", "TRAFFIC_OFFENSE", "PUBLIC_ORDER", "PROPERTY_DAMAGE", "MISSING_PERSON", "TERRORISM", "OTHER"] as const;

const hashIp = (ip: string | null | undefined) => createHash("sha256").update(`pms-public-ip:${ip ?? "anon"}`).digest("hex").slice(0, 32);
const codeHash = (code: string) => createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L
export const newTrackingCode = () => Array.from({ length: 10 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

const txt = (max: number) => z.string().trim().max(max).optional().transform((v) => (v ? v : undefined));

export const publicSubmissionSchema = z
  .object({
    kind: z.enum(["COMPLAINT", "REPORT", "CONTACT"]),
    category: z.enum(OFFENSE_CATEGORIES).default("OTHER"),
    subject: z.string().trim().min(5, "subject too short").max(150),
    message: z.string().trim().min(20, "message too short").max(4000),
    locationText: txt(200),
    occurredOn: z
      .string()
      .optional()
      .transform((v) => (v ? new Date(v) : undefined))
      .refine((d) => !d || (!Number.isNaN(d.getTime()) && d.getTime() <= Date.now() + 86_400_000), "invalid date"),
    contactName: txt(100),
    contactPhone: txt(30),
    contactEmail: z.string().trim().max(150).email().optional().or(z.literal("").transform(() => undefined)),
    anonymous: z.boolean().default(false),
    stationId: txt(64),
    consent: z.literal(true, { error: "consent required" }),
    /** Honeypot: humans never fill this field. */
    website: z.string().max(200).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.kind === "COMPLAINT" && !v.anonymous && !v.contactName) ctx.addIssue({ code: "custom", path: ["contactName"], message: "name required for a non-anonymous complaint" });
    if (!v.anonymous && !v.contactPhone && !v.contactEmail) ctx.addIssue({ code: "custom", path: ["contactPhone"], message: "a phone number or an e-mail is needed to reach you" });
  });
export type PublicSubmissionInput = z.infer<typeof publicSubmissionSchema>;

/** Files a submission. Returns the reference and the tracking code (shown once, never stored in clear). */
export async function submitPublic(input: PublicSubmissionInput, ip: string | null) {
  enforceRateLimit("publicSubmit", ip);
  if (input.website) return { reference: "PUB-0000-000000", trackingCode: newTrackingCode(), ignored: true as const }; // bot: look successful, store nothing
  let stationId: string | null = null;
  if (input.stationId) {
    const st = await prisma.station.findFirst({ where: { id: input.stationId, isActive: true, publicVisible: true }, select: { id: true } });
    if (!st) throw new BusinessError("Selected unit is invalid.");
    stationId = st.id;
  }
  const code = newTrackingCode();
  const created = await prisma.$transaction(async (tx) => {
    const number = await nextNumber("PUBLIC", tx);
    return tx.publicSubmission.create({
      data: {
        number,
        codeHash: codeHash(code),
        kind: input.kind,
        category: input.category,
        subject: input.subject,
        message: input.message,
        locationText: input.locationText,
        occurredOn: input.occurredOn,
        contactName: input.anonymous ? null : input.contactName,
        contactPhone: input.anonymous ? null : input.contactPhone,
        contactEmail: input.anonymous ? null : input.contactEmail,
        anonymous: input.anonymous,
        stationId,
        ipHash: hashIp(ip),
      },
      select: { id: true, number: true },
    });
  });
  // Generic staff notification (no content). Unit chosen → that unit's reviewers; none → national reviewers.
  const reviewers = await prisma.user.findMany({
    where: { status: "ACTIVE", deletedAt: null, role: { isActive: true, permissions: { some: { permission: { code: "intake:manage" } } }, ...(stationId ? {} : { scopeLevel: "NATIONAL" }) }, ...(stationId ? { stationId } : {}) },
    select: { id: true },
    take: 200,
  });
  if (reviewers.length) await prisma.notification.createMany({ data: reviewers.map((u) => ({ userId: u.id, kind: "INFO" as const, title: "Nouveau dépôt sur le site public", body: `Un dépôt (${created.number}) attend un traitement.`, href: "/public-admin" })) });
  return { reference: created.number, trackingCode: code, ignored: false as const };
}

const STATUS_PUBLIC: Record<string, string> = { RECEIVED: "RECEIVED", IN_REVIEW: "IN_REVIEW", FORWARDED: "FORWARDED", CLOSED: "CLOSED", REJECTED: "REJECTED" };

/** Tracking: reference + code. Same answer for a wrong reference and a wrong code, rate-limited per IP and per reference. */
export async function trackSubmission(reference: string, code: string, ip: string | null) {
  enforceRateLimit("publicTrack", ip);
  const ref = reference.trim().toUpperCase();
  enforceRateLimit("publicTrackRef", ref);
  const row = await prisma.publicSubmission.findUnique({ where: { number: ref }, select: { codeHash: true, kind: true, status: true, subject: true, publicReply: true, repliedAt: true, receivedAt: true, updatedAt: true } });
  const expected = Buffer.from(row?.codeHash ?? "0".repeat(64), "hex");
  const given = Buffer.from(codeHash(code), "hex");
  if (!row || expected.length !== given.length || !timingSafeEqual(expected, given)) throw new NotFoundError("Submission");
  return { reference: ref, kind: row.kind, status: STATUS_PUBLIC[row.status], subject: row.subject, publicReply: row.publicReply, repliedAt: row.repliedAt, receivedAt: row.receivedAt, updatedAt: row.updatedAt };
}

// ---------------------------------------------------------------- read models (public fields only)

export async function publicNews(opts: { id?: string; take?: number } = {}) {
  const where: Prisma.PublicNewsWhereInput = { status: "PUBLISHED", publishedAt: { lte: new Date() }, ...(opts.id ? { id: opts.id } : {}) };
  return prisma.publicNews.findMany({ where, orderBy: { publishedAt: "desc" }, take: opts.take ?? 20, select: { id: true, title: true, summary: true, body: true, publishedAt: true, isDemo: true } });
}

export async function publicStations(filter: { q?: string; regionId?: string } = {}) {
  const q = filter.q?.trim();
  return prisma.station.findMany({
    where: { isActive: true, publicVisible: true, publicVerifiedAt: { not: null }, ...(filter.regionId ? { regionId: filter.regionId } : {}), ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { publicAddress: { contains: q, mode: "insensitive" } }] } : {}) },
    orderBy: [{ region: { name: "asc" } }, { name: "asc" }],
    select: { id: true, name: true, publicAddress: true, publicPhone: true, publicHours: true, publicVerifiedAt: true, region: { select: { id: true, name: true } } },
    take: 400,
  });
}

export async function publicRegions() {
  return prisma.region.findMany({ where: { isActive: true, stations: { some: { publicVisible: true, isActive: true } } }, orderBy: { name: "asc" }, select: { id: true, name: true } });
}

function ageOf(d: Date | null) {
  if (!d) return null;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / (365.25 * 86_400_000)));
}

/** Public wanted notices: only those expressly published, still ACTIVE, never a hearing summons. No photo, no internal reason, no case. */
export async function publicWanted(opts: { id?: string; take?: number } = {}) {
  const rows = await prisma.wantedPerson.findMany({
    where: { status: "ACTIVE", kind: { in: ["SEARCH_WARRANT", "MISSING_PERSON"] }, publicPublishedAt: { not: null }, ...(opts.id ? { id: opts.id } : {}) },
    orderBy: { publicPublishedAt: "desc" },
    take: opts.take ?? 50,
    select: { id: true, number: true, kind: true, offense: true, publicNotice: true, publicPublishedAt: true, person: { select: { firstName: true, lastName: true, dateOfBirth: true, gender: true, physicalDescription: true, aliases: { select: { alias: true } } } }, station: { select: { name: true, publicPhone: true, publicVerifiedAt: true, publicVisible: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    reference: r.number,
    kind: r.kind,
    name: `${r.person.lastName} ${r.person.firstName}`,
    aliases: r.person.aliases.map((a) => a.alias),
    approximateAge: ageOf(r.person.dateOfBirth),
    gender: r.person.gender,
    description: r.person.physicalDescription,
    offense: r.offense,
    notice: r.publicNotice,
    publishedAt: r.publicPublishedAt,
    contact: r.station.publicVisible && r.station.publicVerifiedAt ? { unit: r.station.name, phone: r.station.publicPhone } : null,
  }));
}
