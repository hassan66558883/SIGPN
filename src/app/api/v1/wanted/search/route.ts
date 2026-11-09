import { apiOk, withApi } from "@/server/api";
import { searchWanted } from "@/server/wanted/search";
import { parseSearchParams } from "@/server/wanted/search-criteria";

/**
 * GET /api/v1/wanted/search — one search across the sources that exist (national base within the caller's scope, wanted notices in
 * force). Quick: ?search=Mahamat Idriss. Advanced: ?mode=advanced&firstName=&lastName=&dateOfBirth=YYYY-MM-DD&gender=&idNumber=&alias=&offense=.
 * ?src=NATIONAL_DB&src=WANTED limits the sources (default: all available). The result states which sources were not connected.
 */
export const GET = withApi({ permission: "wanted:view" }, async ({ actor, ctx, req }) => {
  const sp = req.nextUrl.searchParams;
  const raw: Record<string, string | string[]> = { go: "1" };
  for (const k of ["search", "mode", "firstName", "lastName", "dateOfBirth", "gender", "idNumber", "alias", "offense"]) if (sp.get(k)) raw[k] = sp.get(k)!;
  const src = sp.getAll("src");
  raw.src = src.length ? src : ["NATIONAL_DB", "WANTED"];
  return apiOk(await searchWanted(actor, parseSearchParams(raw), ctx));
});
