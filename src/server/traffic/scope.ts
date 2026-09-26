import "server-only";
import { Prisma as PrismaRuntime, type Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { BusinessError } from "@/server/errors";
import { inScope, scopeWhere, type Actor } from "@/server/auth/dal";

/** Controls, PV and fines all carry stationId + regionId, so one scope filter serves them all. */
export function trafficScopeWhere(actor: Actor): Prisma.TrafficControlWhereInput {
  return scopeWhere(actor) as Prisma.TrafficControlWhereInput;
}

export async function resolveTrafficStation(actor: Actor, stationId: string | null | undefined) {
  const id = stationId || actor.stationId;
  if (!id) throw new BusinessError("Select the station or unit that carries out the control.");
  const st = await prisma.station.findUnique({ where: { id }, select: { id: true, regionId: true, isActive: true, name: true, code: true } });
  if (!st || !st.isActive) throw new BusinessError("Selected station is invalid or inactive.");
  if (!inScope(actor, { stationId: st.id, regionId: st.regionId })) throw new BusinessError("You can only record controls for a station inside your scope.", "STATE");
  return st;
}

/** Full identity details of a person are shown only when the person is inside the actor's own scope. */
export function canSeePersonDetails(actor: Actor, person: { stationId: string | null; regionId: string | null }): boolean {
  if (!actor.permissions.has("persons:view")) return false;
  if (!person.stationId && !person.regionId) return true;
  return inScope(actor, { stationId: person.stationId, regionId: person.regionId });
}

/** Parameterized SQL fragment restricting `alias`.stationId / regionId to the actor's scope (raw statistics queries).
 * `alias` is always a code-controlled constant, never user input. */
export function scopeSql(actor: Actor, alias: "c" | "t" | "f" | "r"): Prisma.Sql {
  const col = (name: "stationId" | "regionId") => PrismaRuntime.raw(`"${alias}"."${name}"`);
  switch (actor.scopeLevel) {
    case "NATIONAL":
      return PrismaRuntime.sql`TRUE`;
    case "REGIONAL":
      return PrismaRuntime.sql`${col("regionId")} = ${actor.regionId ?? NONE}`;
    default: {
      const ids = actor.stationIds && actor.stationIds.length ? actor.stationIds : [NONE];
      return PrismaRuntime.sql`${col("stationId")} IN (${PrismaRuntime.join(ids)})`;
    }
  }
}

const NONE = "__none__";
