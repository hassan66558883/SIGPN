import { apiError, apiOk, parseJson, withApi } from "@/server/api";
import { getBiometricSearch } from "@/server/biometric/queries";
import { recordBiometricAction } from "@/server/biometric/service";
import { recordActionSchema } from "@/server/biometric/schemas";

type P = { id: string };

export const GET = withApi<P>({ permission: "biometric:history_view" }, async ({ actor, params }) => {
  const s = await getBiometricSearch(actor, params.id);
  if (!s) return apiError(404, "NOT_FOUND", "Biometric search not found.");
  return apiOk(s);
});

/** PATCH /api/v1/biometric/history/{id} — investigator verification action only (biometric:verify). No delete endpoint exists. */
export const PATCH = withApi<P>({ permission: "biometric:verify" }, async ({ actor, ctx, params, req }) => {
  const body = await parseJson(req, recordActionSchema.omit({ searchId: true }));
  const s = await recordBiometricAction(actor, { searchId: params.id, ...body }, ctx);
  return apiOk(s);
});
