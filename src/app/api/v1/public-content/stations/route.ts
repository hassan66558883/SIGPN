import { apiOk, withApi } from "@/server/api";
import { listStationsAdmin } from "@/server/public/admin";

export const GET = withApi({ permission: "public:content" }, async ({ actor }) => apiOk(await listStationsAdmin(actor)));
