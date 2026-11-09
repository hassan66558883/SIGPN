import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { logAudit } from "@/server/audit";
import { inScope, type Actor } from "@/server/auth/dal";
import type { RequestContext } from "@/server/request-context";
import { personScopeWhere } from "@/server/persons/service";
import { wantedScopeWhere } from "@/server/wanted/service";
import { LIVE_STATUSES, UNAVAILABLE_SOURCES, describeCriteria, hasCriteria, tokens, type SearchParams, type SearchSourceKey } from "@/server/wanted/search-criteria";

/**
 * Wanted-persons search (the screen of the client's mock-up): one request across the sources that really exist, with an honest
 * journal of what was queried. The reason of a notice (internal, confidential) never leaves; the offence does, as in the mock-up.
 */
export type SearchMatch = {
  noticeId: string;
  number: string;
  kind: string;
  status: string;
  dangerLevel: string;
  offense: string;
  person: { id: string; number: string; firstName: string; lastName: string; gender: string; dateOfBirth: Date | null; identifier: { type: string; value: string } | null };
  warrant: { number: string; date: Date | null } | null;
  photoUrl: string | null;
  issuedAt: Date;
  /** The unit that holds the file. `dossierAccessible` = the actor may open it. */
  station: { code: string; name: string; phone: string | null };
  dossierAccessible: boolean;
};
export type KnownPerson = { id: string; number: string; firstName: string; lastName: string; gender: string; dateOfBirth: Date | null; city: string | null };
export type SearchStep = { source: SearchSourceKey; ms: number; count: number };
export type SearchOutcome = {
  state: "EMPTY" | "MATCH" | "KNOWN" | "NONE";
  matches: SearchMatch[];
  known: KnownPerson[];
  steps: SearchStep[];
  /** Sources that were asked for but are not connected: never queried, never answered. */
  notQueried: SearchSourceKey[];
  totalMs: number;
  problem?: "NO_SOURCE" | "NO_CRITERIA";
};

/** The persons that match the criteria (without any scope: the callers add their own). */
function personMatch(p: SearchParams): Prisma.PersonWhereInput[] {
  const and: Prisma.PersonWhereInput[] = [];
  if (p.mode === "quick") {
    for (const t of tokens(p.q)) {
      and.push({
        OR: [
          { number: { contains: t, mode: "insensitive" } },
          { firstName: { contains: t, mode: "insensitive" } },
          { lastName: { contains: t, mode: "insensitive" } },
          { otherNames: { contains: t, mode: "insensitive" } },
          { aliases: { some: { alias: { contains: t, mode: "insensitive" } } } },
          { identifiers: { some: { value: { contains: t, mode: "insensitive" } } } },
        ],
      });
    }
    return and;
  }
  if (p.firstName.length >= 2) and.push({ firstName: { contains: p.firstName, mode: "insensitive" } });
  if (p.lastName.length >= 2) and.push({ lastName: { contains: p.lastName, mode: "insensitive" } });
  if (p.dateOfBirth) {
    const start = new Date(`${p.dateOfBirth}T00:00:00.000Z`);
    and.push({ dateOfBirth: { gte: start, lt: new Date(start.getTime() + 86_400_000) } });
  }
  if (p.gender) and.push({ gender: p.gender as "MALE" | "FEMALE" | "OTHER" });
  if (p.idNumber.length >= 2) and.push({ identifiers: { some: { value: { contains: p.idNumber, mode: "insensitive" } } } });
  if (p.alias.length >= 2) and.push({ aliases: { some: { alias: { contains: p.alias, mode: "insensitive" } } } });
  return and;
}

export async function searchWanted(actor: Actor, p: SearchParams, ctx: RequestContext): Promise<SearchOutcome> {
  const empty = (problem?: SearchOutcome["problem"]): SearchOutcome => ({ state: "EMPTY", matches: [], known: [], steps: [], notQueried: [], totalMs: 0, problem });
  if (!p.submitted) return empty();
  const wantsDb = p.sources.includes("NATIONAL_DB") && actor.permissions.has("persons:view");
  const wantsWanted = p.sources.includes("WANTED");
  if (!wantsDb && !wantsWanted) return empty("NO_SOURCE");
  if (!hasCriteria(p)) return empty("NO_CRITERIA");

  const t0 = Date.now();
  const steps: SearchStep[] = [];
  const personAnd = personMatch(p);
  let matches: SearchMatch[] = [];
  let known: KnownPerson[] = [];

  if (wantsWanted) {
    const s = Date.now();
    // In force, and visible: in the actor's scope, or through the diffusion of the notice (national, or regional for the province).
    // A national actor is not restricted at all: an empty condition inside an OR is dropped by Prisma, which would silently hide
    // every notice that is not nationally diffused from exactly the people who may see them all.
    const visible: Prisma.WantedPersonWhereInput = actor.scopeLevel === "NATIONAL" ? {} : { OR: [wantedScopeWhere(actor), { diffusionLevel: "NATIONAL" }, ...(actor.regionId ? [{ diffusionLevel: "REGIONAL" as const, regionId: actor.regionId }] : [])] };
    const rows = await prisma.wantedPerson.findMany({
      where: { status: { in: [...LIVE_STATUSES] }, AND: [visible, ...(p.offense.length >= 2 ? [{ offense: { contains: p.offense, mode: "insensitive" as const } }] : [])], person: { deletedAt: null, AND: personAnd } },
      orderBy: [{ issuedAt: "desc" }],
      take: 10,
      select: {
        id: true, number: true, kind: true, status: true, dangerLevel: true, offense: true, issuedAt: true, stationId: true, regionId: true,
        station: { select: { code: true, name: true, phone: true } },
        warrant: { select: { number: true, issuedAt: true, approvedAt: true } },
        mainPhoto: { select: { id: true, versions: { orderBy: { version: "desc" }, take: 1, select: { id: true } } } },
        person: { select: { id: true, number: true, firstName: true, lastName: true, gender: true, dateOfBirth: true, identifiers: { select: { type: true, value: true }, orderBy: { createdAt: "asc" } } } },
      },
    });
    matches = rows.map((r) => {
      const idf = r.person.identifiers.find((i) => i.type === "NATIONAL_ID") ?? r.person.identifiers[0] ?? null;
      return {
        noticeId: r.id, number: r.number, kind: r.kind, status: r.status, dangerLevel: r.dangerLevel, offense: r.offense,
        person: { id: r.person.id, number: r.person.number, firstName: r.person.firstName, lastName: r.person.lastName, gender: r.person.gender, dateOfBirth: r.person.dateOfBirth, identifier: idf },
        warrant: r.warrant ? { number: r.warrant.number, date: r.warrant.approvedAt ?? r.warrant.issuedAt } : null,
        photoUrl: r.mainPhoto?.versions[0] ? `/api/v1/documents/${r.mainPhoto.id}/download` : null,
        issuedAt: r.issuedAt,
        station: r.station,
        dossierAccessible: actor.permissions.has("wanted:view") && inScope(actor, { stationId: r.stationId, regionId: r.regionId }),
      };
    });
    steps.push({ source: "WANTED", ms: Date.now() - s, count: matches.length });
  }

  if (wantsDb) {
    const s = Date.now();
    const rows = await prisma.person.findMany({
      where: { deletedAt: null, mergedIntoId: null, AND: [personScopeWhere(actor), ...personAnd] },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 10,
      select: { id: true, number: true, firstName: true, lastName: true, gender: true, dateOfBirth: true, city: true },
    });
    const wantedIds = new Set(matches.map((m) => m.person.id));
    known = rows.filter((r) => !wantedIds.has(r.id));
    steps.push({ source: "NATIONAL_DB", ms: Date.now() - s, count: rows.length });
  }

  const state: SearchOutcome["state"] = matches.length ? "MATCH" : known.length ? "KNOWN" : "NONE";
  const outcome: SearchOutcome = { state, matches, known, steps, notQueried: UNAVAILABLE_SOURCES, totalMs: Date.now() - t0 };
  // A search of this register is itself sensitive (who looked up whom, and what they found): audited.
  await logAudit({
    actor,
    action: "WANTED_SEARCHED",
    module: "wanted",
    summary: `Search « ${describeCriteria(p).slice(0, 120)} »: ${state === "MATCH" ? `${matches.length} wanted match(es)` : state === "KNOWN" ? `${known.length} known person(s), none wanted` : "no result"}`,
    after: { mode: p.mode, sources: p.sources, state, noticeIds: matches.map((m) => m.noticeId), personCount: known.length },
    context: ctx,
  });
  return outcome;
}
