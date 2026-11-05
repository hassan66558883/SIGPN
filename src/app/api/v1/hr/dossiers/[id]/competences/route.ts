import { apiOk, withApi } from "@/server/api";
import { officerCompetences } from "@/server/hr/training";

/** GET /api/v1/hr/dossiers/:id/competences — training history and competences of an officer. */
export const GET = withApi<{ id: string }>({ permission: "hr:view" }, async ({ actor, params }) => apiOk(await officerCompetences(actor, params.id)));
