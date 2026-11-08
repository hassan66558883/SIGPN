import { z } from "zod";
import { apiOk, parseQuery, withApi } from "@/server/api";
import { publicStations } from "@/server/public/service";

/** GET /api/v1/public/stations — verified public coordinates of the units that agreed to be listed. */
export const GET = withApi({ public: true }, async ({ req }) => apiOk(await publicStations(parseQuery(req, z.object({ q: z.string().max(80).optional(), regionId: z.string().max(64).optional() })))));
