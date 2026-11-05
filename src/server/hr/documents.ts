import "server-only";
import { z } from "zod";
import type { HrDocumentKind, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { logAudit } from "@/server/audit";
import { AuthError, BusinessError, NotFoundError } from "@/server/errors";
import { inScope, scopeWhere, type Actor } from "@/server/auth/dal";
import type { Permission } from "@/server/rbac/permissions";
import type { RequestContext } from "@/server/request-context";
import { getOfficer } from "@/server/org/service";
import { nextNumber } from "@/server/sequences";
import { readUpload, saveUpload } from "@/server/storage";
import { fmtDate } from "@/lib/format";
import { TRAINING_KIND, SANCTION_KIND, labelOf } from "@/lib/labels";
import { renderDocDocx, renderDocPdf, type DocContent } from "@/server/hr/doc-render";

export const DOC_KINDS = ["ASSIGNMENT_DECISION", "APPOINTMENT_ORDER", "TRANSFER_DECISION", "WORK_CERTIFICATE", "TRAINING_DOCUMENT", "ADMIN_FILE", "DISCIPLINARY_DOCUMENT", "SERVICE_NOTE"] as const;
export const UPLOAD_KINDS = ["ADMIN_FILE", "TRAINING_DOCUMENT", "DISCIPLINARY_DOCUMENT"] as const;
/** Kinds that are tied to a single source record: issued once. */
const ONCE = new Set<HrDocumentKind>(["APPOINTMENT_ORDER", "TRANSFER_DECISION", "TRAINING_DOCUMENT", "DISCIPLINARY_DOCUMENT"]);

export const issueSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("WORK_CERTIFICATE"), officerId: z.string().min(1) }),
  z.object({ kind: z.literal("ASSIGNMENT_DECISION"), officerId: z.string().min(1) }),
  z.object({ kind: z.literal("APPOINTMENT_ORDER"), careerEventId: z.string().min(1) }),
  z.object({ kind: z.literal("TRANSFER_DECISION"), transferId: z.string().min(1) }),
  z.object({ kind: z.literal("TRAINING_DOCUMENT"), trainingId: z.string().min(1) }),
  z.object({ kind: z.literal("DISCIPLINARY_DOCUMENT"), caseId: z.string().min(1) }),
  z.object({ kind: z.literal("SERVICE_NOTE"), title: z.string().trim().min(3).max(200), body: z.string().trim().min(10).max(8000), stationId: z.string().max(64).optional(), officerId: z.string().max(64).optional() }),
]);
export type IssueInput = z.infer<typeof issueSchema>;

function need(actor: Actor, permission: Permission) {
  if (!actor.permissions.has(permission)) throw new AuthError("forbidden", `Permission ${permission} required`);
}
const HEADER = ["RÉPUBLIQUE DU TCHAD — POLICE NATIONALE", "Direction des ressources humaines"];
const fr = (d: Date | null | undefined) => (d ? fmtDate(d, "fr") : "—");
const person = (o: { firstName: string; lastName: string }) => `${o.firstName} ${o.lastName}`;

type Built = { title: string; kind: HrDocumentKind; officerId: string | null; stationId: string | null; confidential: boolean; relatedType: string | null; relatedId: string | null; content: Omit<DocContent, "number" | "issuedAt"> };

const officerSelect = { id: true, badgeNumber: true, firstName: true, lastName: true, dateOfBirth: true, birthPlace: true, hiredAt: true, serviceStartDate: true, currentPostSince: true, stationId: true, administrativeStatus: true, isActive: true, rank: { select: { name: true } }, corps: { select: { name: true } }, position: { select: { name: true } }, station: { select: { name: true, region: { select: { name: true } } } } } satisfies Prisma.OfficerSelect;

// ---------------- Builders (content is frozen at issue time) ----------------

async function buildWorkCertificate(actor: Actor, officerId: string): Promise<Built> {
  await getOfficer(actor, officerId);
  const o = await prisma.officer.findUniqueOrThrow({ where: { id: officerId }, select: officerSelect });
  if (!o.isActive || o.administrativeStatus !== "ACTIVE") throw new BusinessError("A work certificate is only issued to an officer in active service.", "STATE");
  return {
    title: "Attestation de travail", kind: "WORK_CERTIFICATE", officerId, stationId: o.stationId, confidential: false, relatedType: null, relatedId: null,
    content: {
      header: HEADER, title: "Attestation de travail",
      paragraphs: [
        `Le Directeur des ressources humaines de la Police nationale atteste que ${o.rank.name} ${person(o)}, matricule ${o.badgeNumber}${o.dateOfBirth ? `, né(e) le ${fr(o.dateOfBirth)}${o.birthPlace ? ` à ${o.birthPlace}` : ""}` : ""}, est en service au sein de la Police nationale${o.hiredAt ? ` depuis le ${fr(o.hiredAt)}` : ""}.`,
        `L'intéressé(e) est actuellement affecté(e) à ${o.station.name} (${o.station.region.name})${o.position ? ` en qualité de ${o.position.name}` : ""}.`,
        "La présente attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit.",
      ],
      table: [{ label: "Agent", value: `${o.rank.name} ${person(o)}` }, { label: "Matricule", value: o.badgeNumber }, { label: "Corps", value: o.corps?.name ?? "" }, { label: "Affectation", value: o.station.name }],
      signatures: [{ role: "Le Directeur des ressources humaines", name: actor.fullName }],
    },
  };
}

async function buildAssignmentDecision(actor: Actor, officerId: string): Promise<Built> {
  await getOfficer(actor, officerId);
  const o = await prisma.officer.findUniqueOrThrow({ where: { id: officerId }, select: officerSelect });
  if (!o.isActive || o.administrativeStatus !== "ACTIVE") throw new BusinessError("An assignment decision concerns an officer in active service.", "STATE");
  return {
    title: "Décision d'affectation", kind: "ASSIGNMENT_DECISION", officerId, stationId: o.stationId, confidential: false, relatedType: null, relatedId: null,
    content: {
      header: HEADER, title: "Décision d'affectation",
      visas: ["Vu le dossier individuel de l'intéressé(e) ;"],
      articles: [
        { text: `${o.rank.name} ${person(o)}, matricule ${o.badgeNumber}, est affecté(e) à ${o.station.name} (${o.station.region.name})${o.position ? ` en qualité de ${o.position.name}` : ""}${o.currentPostSince ? `, à compter du ${fr(o.currentPostSince)}` : ""}.` },
        { text: "Le responsable de la structure d'accueil est chargé de l'exécution de la présente décision, qui sera enregistrée au dossier individuel de l'intéressé(e)." },
      ],
      signatures: [{ role: "Le Directeur des ressources humaines", name: actor.fullName }],
    },
  };
}

async function buildAppointmentOrder(actor: Actor, careerEventId: string): Promise<Built> {
  const e = await prisma.careerEvent.findUnique({ where: { id: careerEventId } });
  if (!e) throw new NotFoundError("Career decision");
  await getOfficer(actor, e.officerId);
  if (!["APPOINTMENT", "FUNCTION_CHANGE", "PROMOTION", "ADVANCEMENT"].includes(e.type)) throw new BusinessError("An order can only be issued for an appointment, promotion or advancement.", "STATE");
  const [o, toRank, toPos] = await Promise.all([prisma.officer.findUniqueOrThrow({ where: { id: e.officerId }, select: officerSelect }), e.toRankId ? prisma.rank.findUnique({ where: { id: e.toRankId }, select: { name: true } }) : null, e.toPositionId ? prisma.position.findUnique({ where: { id: e.toPositionId }, select: { name: true } }) : null]);
  const title = e.type === "PROMOTION" ? "Arrêté de promotion" : e.type === "ADVANCEMENT" ? "Arrêté d'avancement" : "Arrêté de nomination";
  const effect = toRank ? `${e.type === "PROMOTION" ? "est promu(e) au grade de" : "est classé(e) au grade de"} ${toRank.name}` : `est nommé(e) ${toPos?.name ?? "à ses nouvelles fonctions"}`;
  return {
    title, kind: "APPOINTMENT_ORDER", officerId: o.id, stationId: o.stationId, confidential: false, relatedType: "CareerEvent", relatedId: e.id,
    content: {
      header: HEADER, title,
      visas: [`Vu la décision n° ${e.reference}${e.reason ? ` (${e.reason})` : ""} ;`, "Vu le dossier individuel de l'intéressé(e) ;"],
      articles: [{ text: `${o.rank.name} ${person(o)}, matricule ${o.badgeNumber}, ${effect}, à compter du ${fr(e.effectiveDate)}.` }, { text: "Le présent arrêté sera enregistré et communiqué à l'intéressé(e) et à sa structure d'affectation." }],
      signatures: [{ role: "Le Directeur des ressources humaines", name: actor.fullName }],
    },
  };
}

async function buildTransferDecision(actor: Actor, transferId: string): Promise<Built> {
  const t = await prisma.transferRequest.findUnique({ where: { id: transferId }, include: { officer: { select: officerSelect }, fromStation: { select: { id: true, name: true, regionId: true } }, toStation: { select: { id: true, name: true, regionId: true } } } });
  if (!t || !(inScope(actor, { stationId: t.fromStation.id, regionId: t.fromStation.regionId }) || inScope(actor, { stationId: t.toStation.id, regionId: t.toStation.regionId }))) throw new NotFoundError("Transfer");
  if (!t.decisionNumber || (t.status !== "APPROVED" && t.status !== "EXECUTED")) throw new BusinessError("No decision exists before validation by the competent authority.", "STATE");
  const o = t.officer;
  return {
    title: "Décision de mutation", kind: "TRANSFER_DECISION", officerId: o.id, stationId: t.toStationId, confidential: false, relatedType: "TransferRequest", relatedId: t.id,
    content: {
      header: HEADER, title: "Décision de mutation",
      visas: [`Vu la proposition de mutation n° ${t.number}, examinée par le service des ressources humaines et validée par l'autorité compétente (décision n° ${t.decisionNumber}) ;`],
      articles: [{ text: `${o.rank.name} ${person(o)}, matricule ${o.badgeNumber}, affecté(e) à ${t.fromStation.name}, est muté(e) à ${t.toStation.name}, à compter du ${fr(t.effectiveDate)}.` }, { text: "Les responsables des structures concernées sont chargés, chacun en ce qui le concerne, de l'exécution de la présente décision." }],
      table: [{ label: "Motif", value: t.reason }],
      signatures: [{ role: "L'autorité compétente", name: undefined }, { role: "Le Directeur des ressources humaines", name: actor.fullName }],
    },
  };
}

async function buildTrainingDocument(actor: Actor, trainingId: string): Promise<Built> {
  const t = await prisma.training.findUnique({ where: { id: trainingId }, include: { officer: { select: officerSelect } } });
  if (!t) throw new NotFoundError("Training");
  await getOfficer(actor, t.officerId);
  if (t.status !== "COMPLETED" || t.passed !== true) throw new BusinessError("A training document is only issued for a training that was passed.", "STATE");
  const o = t.officer;
  return {
    title: "Document de formation", kind: "TRAINING_DOCUMENT", officerId: o.id, stationId: o.stationId, confidential: false, relatedType: "Training", relatedId: t.id,
    content: {
      header: HEADER, title: "Document de formation",
      paragraphs: [`Il est établi le présent document pour ${o.rank.name} ${person(o)}, matricule ${o.badgeNumber}, ayant suivi avec succès la formation « ${t.title} ».`],
      table: [
        { label: "Type", value: labelOf(TRAINING_KIND, t.kind, "fr").label },
        { label: "Organisme", value: t.provider ?? "" },
        { label: "Période", value: `${fr(t.startDate)}${t.endDate ? ` au ${fr(t.endDate)}` : ""}` },
        { label: "Note", value: t.score != null ? `${t.score}/20` : "" },
        { label: "Résultat", value: t.result ?? "" },
        { label: "Attestation n°", value: t.certificateNo ?? "" },
      ],
      signatures: [{ role: "Le Directeur des ressources humaines", name: actor.fullName }],
    },
  };
}

async function buildDisciplinaryDocument(actor: Actor, caseId: string): Promise<Built> {
  need(actor, "hr:discipline_view");
  const c = await prisma.disciplinaryCase.findUnique({ where: { id: caseId }, include: { officer: { select: officerSelect } } });
  if (!c) throw new NotFoundError("Disciplinary case");
  await getOfficer(actor, c.officerId);
  if (!c.sanction || (c.sanction !== "NO_ACTION" && !c.decisionNumber)) throw new BusinessError("The disciplinary file has not been decided.", "STATE");
  const o = c.officer;
  const sanction = labelOf(SANCTION_KIND, c.sanction, "fr").label;
  return {
    title: "Décision disciplinaire", kind: "DISCIPLINARY_DOCUMENT", officerId: o.id, stationId: o.stationId, confidential: true, relatedType: "DisciplinaryCase", relatedId: c.id,
    content: {
      header: HEADER, title: "Décision disciplinaire", confidential: true,
      visas: [`Vu le dossier disciplinaire n° ${c.number} ouvert à l'encontre de ${o.rank.name} ${person(o)}, matricule ${o.badgeNumber} ;`, "Vu les pièces de la procédure et l'audition de l'intéressé(e) ;"],
      articles: [
        { text: c.sanction === "NO_ACTION" ? "Le dossier est classé sans suite." : `La sanction suivante est prononcée : ${sanction}${c.sanction === "SUSPENSION" ? ` du ${fr(c.sanctionStart)} au ${fr(c.sanctionEnd)}` : ""}.` },
        { text: `Motifs : ${c.decisionReason ?? ""}` },
      ],
      table: [{ label: "Décision n°", value: c.decisionNumber ?? "" }, { label: "Dossier n°", value: c.number }],
      signatures: [{ role: "L'autorité disciplinaire", name: actor.fullName }],
    },
  };
}

async function buildServiceNote(actor: Actor, i: Extract<IssueInput, { kind: "SERVICE_NOTE" }>): Promise<Built> {
  let stationId: string | null = null;
  if (i.officerId) {
    await getOfficer(actor, i.officerId);
  }
  if (i.stationId) {
    const st = await prisma.station.findUnique({ where: { id: i.stationId }, select: { id: true, regionId: true } });
    if (!st || !inScope(actor, { stationId: st.id, regionId: st.regionId })) throw new NotFoundError("Station");
    stationId = st.id;
  } else if (actor.scopeLevel !== "NATIONAL") {
    throw new BusinessError("Choose the structure concerned by this note.", "VALIDATION", { stationId: "required" });
  }
  return {
    title: i.title, kind: "SERVICE_NOTE", officerId: i.officerId ?? null, stationId, confidential: false, relatedType: null, relatedId: null,
    content: { header: HEADER, title: `Note de service — ${i.title}`, paragraphs: i.body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean), signatures: [{ role: "Le Directeur des ressources humaines", name: actor.fullName }] },
  };
}

// ---------------- Issue / list / read ----------------

export async function issueDocument(actor: Actor, input: IssueInput, ctx: RequestContext) {
  need(actor, "hr:document_issue");
  let built: Built;
  switch (input.kind) {
    case "WORK_CERTIFICATE": built = await buildWorkCertificate(actor, input.officerId); break;
    case "ASSIGNMENT_DECISION": built = await buildAssignmentDecision(actor, input.officerId); break;
    case "APPOINTMENT_ORDER": built = await buildAppointmentOrder(actor, input.careerEventId); break;
    case "TRANSFER_DECISION": built = await buildTransferDecision(actor, input.transferId); break;
    case "TRAINING_DOCUMENT": built = await buildTrainingDocument(actor, input.trainingId); break;
    case "DISCIPLINARY_DOCUMENT": built = await buildDisciplinaryDocument(actor, input.caseId); break;
    case "SERVICE_NOTE": built = await buildServiceNote(actor, input); break;
  }
  if (ONCE.has(built.kind) && built.relatedId && (await prisma.hrDocument.findFirst({ where: { kind: built.kind, relatedId: built.relatedId }, select: { id: true } }))) throw new BusinessError("This document has already been issued.", "CONFLICT");
  return prisma.$transaction(async (tx) => {
    const number = await nextNumber("HR_DOCUMENT", tx);
    const content: DocContent = { ...built.content, number, issuedAt: new Date().toISOString() };
    const d = await tx.hrDocument.create({ data: { number, kind: built.kind, title: built.title, source: "GENERATED", confidential: built.confidential, officerId: built.officerId, stationId: built.stationId, relatedType: built.relatedType, relatedId: built.relatedId, snapshot: content as unknown as Prisma.InputJsonValue, createdById: actor.id } });
    await logAudit({ actor, action: "HR_DOCUMENT_ISSUED", module: "hr", entityType: "HrDocument", entityId: d.id, entityLabel: number, summary: `${built.kind} ${number} issued`, context: ctx }, tx);
    return d;
  });
}

const sniff = (b: Buffer): string | null => {
  if (b.length > 4 && b.subarray(0, 4).toString("latin1") === "%PDF") return "application/pdf";
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b.length > 4 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return null;
};

/** Supporting file (scan, administrative file…). The type is verified on the content, not on the name or declared type. */
export async function uploadDocument(actor: Actor, input: { kind: (typeof UPLOAD_KINDS)[number]; title: string; officerId?: string; confidential?: boolean }, file: File, ctx: RequestContext) {
  need(actor, "hr:document_issue");
  if (!(UPLOAD_KINDS as readonly string[]).includes(input.kind)) throw new BusinessError("This kind of document cannot be uploaded.", "VALIDATION", { kind: "invalid" });
  if (input.kind === "DISCIPLINARY_DOCUMENT") need(actor, "hr:discipline_manage");
  const title = input.title.trim();
  if (title.length < 3) throw new BusinessError("A title is required.", "VALIDATION", { title: "required" });
  let stationId: string | null = null;
  if (input.officerId) {
    await getOfficer(actor, input.officerId);
    stationId = (await prisma.officer.findUniqueOrThrow({ where: { id: input.officerId }, select: { stationId: true } })).stationId;
  } else if (actor.scopeLevel !== "NATIONAL") throw new BusinessError("Choose the officer concerned.", "VALIDATION", { officerId: "required" });
  const head = Buffer.from(await file.slice(0, 16).arrayBuffer());
  const mime = sniff(head);
  if (!mime) throw new BusinessError("Only PDF, JPEG, PNG or Word (.docx) files are accepted.", "VALIDATION", { file: "unsupported type" });
  const saved = await saveUpload("hr-documents", new File([await file.arrayBuffer()], file.name, { type: mime }));
  const confidential = input.kind === "DISCIPLINARY_DOCUMENT" || !!input.confidential;
  return prisma.$transaction(async (tx) => {
    const number = await nextNumber("HR_DOCUMENT", tx);
    const d = await tx.hrDocument.create({ data: { number, kind: input.kind, title, source: "UPLOADED", confidential, officerId: input.officerId ?? null, stationId, storagePath: saved.relPath, fileName: file.name.slice(0, 200), mimeType: mime, sizeBytes: saved.size, sha256: saved.sha256, createdById: actor.id } });
    await logAudit({ actor, action: "HR_DOCUMENT_UPLOADED", module: "hr", entityType: "HrDocument", entityId: d.id, entityLabel: number, summary: `${input.kind} ${number} uploaded (${saved.size} bytes)`, context: ctx }, tx);
    return d;
  });
}

const listInclude = { officer: { select: { id: true, badgeNumber: true, firstName: true, lastName: true } }, createdBy: { select: { username: true } } } satisfies Prisma.HrDocumentInclude;

function visibility(actor: Actor): Prisma.HrDocumentWhereInput {
  const sw = scopeWhere(actor, { stationId: "id", regionId: "regionId" });
  // NB: an empty relation filter (`station: {}`) matches nothing on an optional relation, so a national scope adds no station clause at all.
  const station: Prisma.HrDocumentWhereInput = Object.keys(sw).length === 0 ? {} : { OR: [{ stationId: null }, { station: sw as Prisma.StationWhereInput }] };
  return { AND: [station, actor.permissions.has("hr:discipline_view") ? {} : { confidential: false }] };
}

export type DocFilter = { kind?: HrDocumentKind; officerId?: string; q?: string; page?: number; pageSize?: number };

export async function listDocuments(actor: Actor, f: DocFilter = {}) {
  need(actor, "hr:view");
  const page = Math.max(f.page ?? 1, 1);
  const pageSize = Math.min(f.pageSize ?? 25, 100);
  const where: Prisma.HrDocumentWhereInput = { AND: [visibility(actor), f.kind ? { kind: f.kind } : {}, f.officerId ? { officerId: f.officerId } : {}, f.q ? { OR: [{ number: { contains: f.q, mode: "insensitive" } }, { title: { contains: f.q, mode: "insensitive" } }, { officer: { OR: [{ badgeNumber: { contains: f.q, mode: "insensitive" } }, { lastName: { contains: f.q, mode: "insensitive" } }] } }] } : {}] };
  const [items, total] = await Promise.all([prisma.hrDocument.findMany({ where, include: listInclude, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, omit: { snapshot: true } }), prisma.hrDocument.count({ where })]);
  return { items, total, page, pageSize };
}

export async function getDocument(actor: Actor, id: string) {
  need(actor, "hr:view");
  const d = await prisma.hrDocument.findFirst({ where: { AND: [{ id }, visibility(actor)] }, include: listInclude });
  if (!d) throw new NotFoundError("Document");
  return d;
}

/** Bytes of a document. Generated documents are rendered from their frozen snapshot (PDF or Word); every download is audited. */
export async function getDocumentFile(actor: Actor, id: string, format: "pdf" | "docx", ctx: RequestContext) {
  const d = await getDocument(actor, id);
  let out: { body: Buffer; mime: string; name: string };
  if (d.source === "GENERATED") {
    const content = d.snapshot as unknown as DocContent;
    out = format === "docx" ? { body: await renderDocDocx(content), mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", name: `${d.number}.docx` } : { body: await renderDocPdf(content), mime: "application/pdf", name: `${d.number}.pdf` };
  } else {
    out = { body: await readUpload(d.storagePath!), mime: d.mimeType ?? "application/octet-stream", name: d.fileName ?? `${d.number}.bin` };
  }
  await logAudit({ actor, action: d.confidential ? "HR_DOCUMENT_DOWNLOADED_CONFIDENTIAL" : "HR_DOCUMENT_DOWNLOADED", module: "hr", entityType: "HrDocument", entityId: d.id, entityLabel: d.number, summary: `Document ${d.number} downloaded (${out.name})`, context: ctx });
  return out;
}

// ---------------- Identity photo ----------------

const PHOTO_MAX = 2 * 1024 * 1024;

export async function setOfficerPhoto(actor: Actor, officerId: string, file: File, ctx: RequestContext) {
  need(actor, "hr:manage");
  const o = await getOfficer(actor, officerId);
  if (file.size > PHOTO_MAX) throw new BusinessError("The photo cannot exceed 2 MB.", "VALIDATION", { file: "too large" });
  const mime = sniff(Buffer.from(await file.slice(0, 16).arrayBuffer()));
  if (mime !== "image/jpeg" && mime !== "image/png") throw new BusinessError("The photo must be a JPEG or PNG image.", "VALIDATION", { file: "unsupported type" });
  const saved = await saveUpload("hr-photos", new File([await file.arrayBuffer()], file.name, { type: mime }));
  await prisma.$transaction(async (tx) => {
    await tx.officer.update({ where: { id: o.id }, data: { photoPath: saved.relPath } });
    await logAudit({ actor, action: "HR_PHOTO_UPDATED", module: "hr", entityType: "Officer", entityId: o.id, entityLabel: o.badgeNumber, summary: `Identity photo of ${o.badgeNumber} updated`, context: ctx }, tx);
  });
}

export async function getOfficerPhoto(actor: Actor, officerId: string) {
  need(actor, "hr:view");
  await getOfficer(actor, officerId);
  const o = await prisma.officer.findUniqueOrThrow({ where: { id: officerId }, select: { photoPath: true } });
  if (!o.photoPath) throw new NotFoundError("Photo");
  const body = await readUpload(o.photoPath);
  return { body, mime: sniff(body) ?? "image/jpeg" };
}
