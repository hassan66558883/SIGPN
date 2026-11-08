import { apiOk, withApi } from "@/server/api";
import { publicNews } from "@/server/public/service";

export const GET = withApi({ public: true }, async () => apiOk(await publicNews()));
