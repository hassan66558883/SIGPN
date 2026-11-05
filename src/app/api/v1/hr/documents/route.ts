import { z } from "zod";
import { apiOk, paginationSchema, parseJson, parseQuery, withApi } from "@/server/api";
import { DOC_KINDS, issueDocument, issueSchema, listDocuments } from "@/server/hr/documents";

const query = paginationSchema.extend({ q: z.string().trim().max(100).optional(), kind: z.enum(DOC_KINDS).optional(), officerId: z.string().max(64).optional() });

/** GET /api/v1/hr/documents — the central HR document space inside the caller's scope (confidential ones only with hr:discipline_view). */
export const GET = withApi({ permission: "hr:view" }, async ({ actor, req }) => {
  const r = await listDocuments(actor, parseQuery(req, query));
  return apiOk(r.items, { meta: { page: r.page, pageSize: r.pageSize, total: r.total } });
});

/** POST /api/v1/hr/documents — generate a document (certificate, order, decision, note…); its content is frozen, PDF and Word are rendered on demand. */
export const POST = withApi({ permission: "hr:document_issue" }, async ({ actor, ctx, req }) => apiOk(await issueDocument(actor, await parseJson(req, issueSchema), ctx), { status: 201 }));
