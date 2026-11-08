import "server-only";
import { z } from "zod";
import type { Prisma, PublicSubmissionStatus } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { logAudit } from "@/server/audit";
import { AuthError, BusinessError, NotFoundError } from "@/server/errors";
import { inScope, type Actor } from "@/server/auth/dal";
import type { RequestContext } from "@/server/request-context";
import { createComplaint } from "@/server/complaints/service";

function need(actor: Actor, permission: string) {
  if (!actor.permissions.has(permission)) throw new AuthError("forbidden", `Permission ${permission} required`);
}

// ------------------------------------------------------------------ public submissions (staff side)

/** A submission is visible to the units it was addressed to; unassigned ones to national and provincial reviewers. */
function submissionScope(actor: Actor): Prisma.PublicSubmissionWhereInput {
  if (actor.scopeLevel === "NATIONAL") return {};
  if (actor.scopeLevel === "REGIONAL") return { OR: [{ stationId: null }, { stationId: { in: [] } }] };
  return { stationId: { in: actor.stationIds?.length ? actor.stationIds : ["-"] } };
}

async function scopeFor(actor: Actor): Promise<Prisma.PublicSubmissionWhereInput> {
  if (actor.scopeLevel === "REGIONAL") {
    const ids = (await prisma.station.findMany({ where: { regionId: actor.regionId ?? "-" }, select: { id: true } })).map((s) => s.id);
    return { OR: [{ stationId: null }, { stationId: { in: ids } }] };
  }
  return submissionScope(actor);
}

const submissionSelect = { id: true, number: true, kind: true, category: true, subject: true, message: true, locationText: true, occurredOn: true, contactName: true, contactPhone: true, contactEmail: true, anonymous: true, stationId: true, status: true, publicReply: true, repliedAt: true, handledById: true, complaintId: true, receivedAt: true } satisfies Prisma.PublicSubmissionSelect;

export async function listSubmissions(actor: Actor, filter: { status?: PublicSubmissionStatus; page?: number } = {}) {
  need(actor, "intake:view");
  const where: Prisma.PublicSubmissionWhereInput = { AND: [await scopeFor(actor)], ...(filter.status ? { status: filter.status } : {}) };
  const pageSize = 25;
  const page = filter.page ?? 1;
  const [items, total] = await Promise.all([
    prisma.publicSubmission.findMany({ where, orderBy: { receivedAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, select: { id: true, number: true, kind: true, subject: true, status: true, receivedAt: true, anonymous: true, stationId: true } }),
    prisma.publicSubmission.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getSubmission(actor: Actor, id: string, ctx?: RequestContext) {
  need(actor, "intake:view");
  const s = await prisma.publicSubmission.findFirst({ where: { id, AND: [await scopeFor(actor)] }, select: submissionSelect });
  if (!s) throw new NotFoundError("Submission");
  // Contact data of a member of the public is personal data: every consultation is audited.
  if (ctx) await logAudit({ actor, action: "PUBLIC_SUBMISSION_VIEWED", module: "public", entityType: "PublicSubmission", entityId: s.id, entityLabel: s.number, summary: `Public submission ${s.number} consulted`, context: ctx });
  return s;
}

export const submissionUpdateSchema = z.object({ id: z.string().min(1), status: z.enum(["RECEIVED", "IN_REVIEW", "FORWARDED", "CLOSED", "REJECTED"]), publicReply: z.string().trim().max(1500).optional().transform((v) => v || undefined) });

export async function updateSubmission(actor: Actor, input: z.infer<typeof submissionUpdateSchema>, ctx: RequestContext) {
  need(actor, "intake:manage");
  const before = await getSubmission(actor, input.id);
  if ((input.status === "CLOSED" || input.status === "REJECTED") && !input.publicReply) throw new BusinessError("A closure or a rejection needs a reply the person will see.", "VALIDATION", { publicReply: "required" });
  await prisma.publicSubmission.update({ where: { id: input.id }, data: { status: input.status, handledById: actor.id, ...(input.publicReply && input.publicReply !== before.publicReply ? { publicReply: input.publicReply, repliedAt: new Date() } : {}) } });
  await logAudit({ actor, action: "PUBLIC_SUBMISSION_UPDATED", module: "public", entityType: "PublicSubmission", entityId: before.id, entityLabel: before.number, summary: `${before.number}: ${before.status} → ${input.status}${input.publicReply ? " (public reply)" : ""}`, before: { status: before.status }, after: { status: input.status }, context: ctx });
}

/** Converts a complaint filed online into an internal complaint (the person's identity stays in the description: no Person record is created). */
export async function convertToComplaint(actor: Actor, id: string, stationId: string | null, ctx: RequestContext) {
  need(actor, "intake:manage");
  need(actor, "complaints:create");
  const s = await getSubmission(actor, id);
  if (s.kind === "CONTACT") throw new BusinessError("A contact message is not a complaint.", "STATE");
  if (s.complaintId) throw new BusinessError("This submission was already converted.", "STATE");
  const target = stationId || s.stationId;
  if (!target) throw new BusinessError("Select the unit that will handle the complaint.");
  const contact = s.anonymous ? "Dépôt anonyme" : [s.contactName, s.contactPhone, s.contactEmail].filter(Boolean).join(" · ");
  const complaint = await createComplaint(actor, {
    isAnonymous: true,
    category: s.category,
    title: s.subject.slice(0, 200),
    description: `${s.message}\n\n— Dépôt en ligne ${s.number} — ${contact}`.slice(0, 5000).padEnd(20, " "),
    incidentAt: s.occurredOn ?? undefined,
    locationText: s.locationText ?? undefined,
    stationId: target,
    priority: "NORMAL",
    submit: "register",
  } as never, ctx);
  await prisma.publicSubmission.update({ where: { id }, data: { complaintId: complaint.id, status: "FORWARDED", handledById: actor.id, publicReply: s.publicReply ?? "Votre dépôt a été transmis au service compétent pour traitement.", repliedAt: s.publicReply ? undefined : new Date() } });
  await logAudit({ actor, action: "PUBLIC_SUBMISSION_CONVERTED", module: "public", entityType: "PublicSubmission", entityId: id, entityLabel: s.number, summary: `${s.number} converted into complaint ${complaint.number}`, context: ctx });
  return complaint;
}

// ------------------------------------------------------------------ news

export const newsSchema = z.object({ id: z.string().optional(), title: z.string().trim().min(5).max(160), summary: z.string().trim().min(10).max(300), body: z.string().trim().min(20).max(8000) });

export async function listNewsAdmin(actor: Actor) {
  need(actor, "public:content");
  return prisma.publicNews.findMany({ orderBy: { createdAt: "desc" }, take: 100, select: { id: true, title: true, summary: true, body: true, status: true, publishedAt: true, isDemo: true } });
}

export async function saveNews(actor: Actor, input: z.infer<typeof newsSchema>, ctx: RequestContext) {
  need(actor, "public:content");
  const data = { title: input.title, summary: input.summary, body: input.body };
  const n = input.id ? await prisma.publicNews.update({ where: { id: input.id }, data, select: { id: true, title: true } }) : await prisma.publicNews.create({ data: { ...data, authorId: actor.id }, select: { id: true, title: true } });
  await logAudit({ actor, action: input.id ? "PUBLIC_NEWS_UPDATED" : "PUBLIC_NEWS_CREATED", module: "public", entityType: "PublicNews", entityId: n.id, entityLabel: n.title, summary: `News "${n.title}" ${input.id ? "updated" : "created (draft)"}`, context: ctx });
  return n;
}

export async function setNewsPublished(actor: Actor, id: string, published: boolean, ctx: RequestContext) {
  need(actor, "public:content");
  const n = await prisma.publicNews.findUnique({ where: { id }, select: { id: true, title: true, authorId: true } });
  if (!n) throw new NotFoundError("News");
  if (published && n.authorId === actor.id && !actor.permissions.has("wanted:publish")) throw new BusinessError("Publication needs a second person than the author (four-eyes rule).", "STATE");
  await prisma.publicNews.update({ where: { id }, data: { status: published ? "PUBLISHED" : "DRAFT", publishedAt: published ? new Date() : null } });
  await logAudit({ actor, action: published ? "PUBLIC_NEWS_PUBLISHED" : "PUBLIC_NEWS_UNPUBLISHED", module: "public", entityType: "PublicNews", entityId: id, entityLabel: n.title, summary: `News "${n.title}" ${published ? "published" : "withdrawn"}`, context: ctx });
}

// ------------------------------------------------------------------ public directory of units

export const stationPublicSchema = z.object({
  id: z.string().min(1),
  publicVisible: z.boolean(),
  publicAddress: z.string().trim().max(200).optional().transform((v) => v || null),
  publicPhone: z.string().trim().max(40).optional().transform((v) => v || null),
  publicHours: z.string().trim().max(120).optional().transform((v) => v || null),
  /** The editor attests the coordinates were checked with the unit; required to list it. */
  verified: z.boolean().default(false),
});

export async function listStationsAdmin(actor: Actor) {
  need(actor, "public:content");
  const where: Prisma.StationWhereInput = { isActive: true, ...(actor.scopeLevel === "NATIONAL" ? {} : actor.scopeLevel === "REGIONAL" ? { regionId: actor.regionId ?? "-" } : { id: { in: actor.stationIds?.length ? actor.stationIds : ["-"] } }) };
  return prisma.station.findMany({ where, orderBy: [{ region: { name: "asc" } }, { name: "asc" }], take: 400, select: { id: true, code: true, name: true, region: { select: { name: true } }, publicVisible: true, publicAddress: true, publicPhone: true, publicHours: true, publicVerifiedAt: true } });
}

export async function saveStationPublic(actor: Actor, input: z.infer<typeof stationPublicSchema>, ctx: RequestContext) {
  need(actor, "public:content");
  const st = await prisma.station.findUnique({ where: { id: input.id }, select: { id: true, code: true, regionId: true, publicVerifiedAt: true } });
  if (!st || !inScope(actor, { stationId: st.id, regionId: st.regionId })) throw new NotFoundError("Unit");
  const verifiedNow = input.verified;
  if (input.publicVisible && !verifiedNow && !st.publicVerifiedAt) throw new BusinessError("Verify the coordinates with the unit before listing it publicly.", "STATE");
  if (input.publicVisible && !input.publicPhone && !input.publicAddress) throw new BusinessError("Give at least an address or a phone number to list the unit.", "VALIDATION");
  await prisma.station.update({ where: { id: st.id }, data: { publicVisible: input.publicVisible, publicAddress: input.publicAddress, publicPhone: input.publicPhone, publicHours: input.publicHours, ...(verifiedNow ? { publicVerifiedAt: new Date(), publicVerifiedById: actor.id } : {}) } });
  await logAudit({ actor, action: "PUBLIC_DIRECTORY_UPDATED", module: "public", entityType: "Station", entityId: st.id, entityLabel: st.code, summary: `Public directory entry of ${st.code}: ${input.publicVisible ? "listed" : "hidden"}${verifiedNow ? " (coordinates verified)" : ""}`, context: ctx });
}
