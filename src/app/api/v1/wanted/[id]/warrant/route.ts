import { z } from "zod";
import { apiOk, parseJson, withApi } from "@/server/api";
import { createWarrantForWantedPerson, setWarrantStatus } from "@/server/wanted/service";
import { WARRANT_TYPES, WARRANT_STATUSES } from "@/server/wanted/schemas";

type P = { id: string };

const createSchema = z.object({ type: z.enum(WARRANT_TYPES).default("ARREST"), issuingAuthority: z.string().trim().min(3).max(200), issuingAuthorityRef: z.string().max(120).optional(), grounds: z.string().trim().min(10).max(3000), targetAddress: z.string().max(300).optional(), expiresAt: z.string().optional() });

export const POST = withApi<P>({ permission: "warrants:create" }, async ({ actor, ctx, params, req }) => {
  const body = await parseJson(req, createSchema);
  const w = await createWarrantForWantedPerson(actor, { wantedPersonId: params.id, type: body.type, issuingAuthority: body.issuingAuthority, issuingAuthorityRef: body.issuingAuthorityRef, grounds: body.grounds, targetAddress: body.targetAddress, expiresAt: body.expiresAt ? new Date(body.expiresAt) : null }, ctx);
  return apiOk(w, { status: 201 });
});

const statusSchema = z.object({ warrantId: z.string().min(1), status: z.enum(WARRANT_STATUSES), notes: z.string().max(2000).optional() });

export const PATCH = withApi<P>({ permission: "warrants:view" }, async ({ actor, ctx, req }) => {
  const body = await parseJson(req, statusSchema);
  const w = await setWarrantStatus(actor, body, ctx);
  return apiOk(w);
});
