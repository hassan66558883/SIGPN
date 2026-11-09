/**
 * Wanted-persons search (pure part: parsing the criteria and the visibility rule, no database).
 *
 * Sources: only the two that exist are queried: the national base (the persons registry within the actor's scope) and the wanted
 * notices in force. Borders, video surveillance and interoperability (customs, judiciary) are NOT connected: they are listed as such
 * and never produce a result.
 */
export const SEARCH_SOURCES = [
  { key: "NATIONAL_DB", available: true },
  { key: "WANTED", available: true },
  { key: "BORDERS", available: false },
  { key: "VIDEO", available: false },
  { key: "INTEROP", available: false },
] as const;
export type SearchSourceKey = (typeof SEARCH_SOURCES)[number]["key"];
export const AVAILABLE_SOURCES: SearchSourceKey[] = SEARCH_SOURCES.filter((s) => s.available).map((s) => s.key);
export const UNAVAILABLE_SOURCES: SearchSourceKey[] = SEARCH_SOURCES.filter((s) => !s.available).map((s) => s.key);

export type SearchParams = {
  mode: "quick" | "advanced";
  /** True when the form was submitted (an empty first visit searches nothing). */
  submitted: boolean;
  q: string;
  sources: SearchSourceKey[];
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  idNumber: string;
  alias: string;
  offense: string;
};

type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim().slice(0, 120) ?? "";

export function parseSearchParams(raw: Raw): SearchParams {
  const submitted = one(raw.go) === "1";
  const asked = (Array.isArray(raw.src) ? raw.src : raw.src ? [raw.src] : []).filter((s): s is SearchSourceKey => AVAILABLE_SOURCES.includes(s as SearchSourceKey));
  const dob = one(raw.dateOfBirth);
  const gender = one(raw.gender);
  return {
    mode: one(raw.mode) === "advanced" ? "advanced" : "quick",
    submitted,
    q: one(raw.search),
    // the first visit proposes every available source; a submitted form keeps exactly what was ticked
    sources: submitted ? Array.from(new Set(asked)) : [...AVAILABLE_SOURCES],
    firstName: one(raw.firstName),
    lastName: one(raw.lastName),
    dateOfBirth: /^\d{4}-\d{2}-\d{2}$/.test(dob) && !Number.isNaN(Date.parse(dob)) ? dob : "",
    gender: ["MALE", "FEMALE", "OTHER"].includes(gender) ? gender : "",
    idNumber: one(raw.idNumber),
    alias: one(raw.alias),
    offense: one(raw.offense),
  };
}

/** Words of the quick search: each one must be found somewhere on the person (name, alias, number, identifier). */
export function tokens(q: string): string[] {
  return q.split(/\s+/).map((t) => t.trim()).filter(Boolean).slice(0, 5);
}

/** At least one real criterion: two characters in the quick box, or any advanced field (a date of birth or a gender counts alone). */
export function hasCriteria(p: SearchParams): boolean {
  if (p.mode === "quick") return p.q.length >= 2;
  return [p.firstName, p.lastName, p.idNumber, p.alias, p.offense].some((v) => v.length >= 2) || !!p.dateOfBirth;
}

/** What the person is looked up for, in words, for the audit trail and the "no result" message. */
export function describeCriteria(p: SearchParams): string {
  if (p.mode === "quick") return p.q;
  const parts = [p.firstName, p.lastName, p.idNumber && `ID ${p.idNumber}`, p.alias && `alias ${p.alias}`, p.dateOfBirth, p.gender, p.offense && `infraction ${p.offense}`].filter(Boolean);
  return parts.join(" · ");
}

export const LIVE_STATUSES = ["ACTIVE", "LOCATED"] as const;

/**
 * A notice in force can be seen by a search outside its own unit through its DIFFUSION: national for everybody, regional for the
 * province, local only for the unit and its sub-units (already covered by the territorial scope). Pure rule, used by the search and by
 * the delivery of the main photo.
 */
export function diffusionVisible(actor: { regionId: string | null }, n: { diffusionLevel: string; regionId: string; status: string }): boolean {
  if (!(LIVE_STATUSES as readonly string[]).includes(n.status)) return false;
  if (n.diffusionLevel === "NATIONAL") return true;
  if (n.diffusionLevel === "REGIONAL") return !!actor.regionId && actor.regionId === n.regionId;
  return false;
}
