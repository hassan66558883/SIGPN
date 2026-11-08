import { apiOk, withApi } from "@/server/api";
import { publicWanted } from "@/server/public/service";

/** GET /api/v1/public/wanted — only notices expressly published and still active; presumption of innocence applies. */
export const GET = withApi({ public: true }, async () => apiOk(await publicWanted()));
