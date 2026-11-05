import { apiOk, withApi } from "@/server/api";
import { getDocument } from "@/server/hr/documents";

/** GET /api/v1/hr/documents/:id — document metadata (the content is downloaded through /file). */
export const GET = withApi<{ id: string }>({ permission: "hr:view" }, async ({ actor, params }) => {
  const d = await getDocument(actor, params.id);
  return apiOk({ ...d, snapshot: undefined });
});
