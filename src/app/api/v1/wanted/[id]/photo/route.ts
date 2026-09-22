import { apiOk, withApi } from "@/server/api";
import { attachPhoto } from "@/server/wanted/service";
import { BusinessError } from "@/server/errors";

type P = { id: string };

/** POST /api/v1/wanted/{id}/photo — multipart form: `file`, optional `setAsMain=1`. */
export const POST = withApi<P>({ permission: "wanted:update" }, async ({ actor, ctx, params, req }) => {
  const fd = await req.formData();
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) throw new BusinessError("`file` upload is required.");
  const setAsMain = fd.get("setAsMain") === "1";
  const doc = await attachPhoto(actor, params.id, file, setAsMain, ctx);
  return apiOk(doc, { status: 201 });
});
