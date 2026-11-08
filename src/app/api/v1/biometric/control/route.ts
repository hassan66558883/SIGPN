import { z } from "zod";
import { apiOk, parseJson, withApi } from "@/server/api";
import { listControls, runControl } from "@/server/biometric/control";

const createSchema = z.object({
  scenario: z.enum(["RANDOM", "POSSIBLE_MATCH", "UNCERTAIN", "NO_MATCH", "UNAVAILABLE"]).default("RANDOM"),
  modality: z.enum(["FINGERPRINT", "FACE"]).default("FINGERPRINT"),
  reason: z.string().trim().min(5, "state the purpose of the control").max(300),
  device: z.string().trim().max(120).optional(),
});

export const GET = withApi({ permission: "biometric:control" }, async ({ actor }) => apiOk(await listControls(actor)));

/** POST /api/v1/biometric/control — one simulated identity check (fictitious identities; nothing real is matched or stored). */
export const POST = withApi({ permission: "biometric:control" }, async ({ actor, ctx, req }) => apiOk(await runControl(actor, await parseJson(req, createSchema), ctx), { status: 201 }));
