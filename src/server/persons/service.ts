import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { logAudit } from "@/server/audit";
import { BusinessError, NotFoundError } from "@/server/errors";
import { inScope, scopeWhere, type Actor } from "@/server/auth/dal";
import type { RequestContext } from "@/server/request-context";
import { nextNumber } from "@/server/sequences";
import type { AliasInput, IdentifierInput, PersonInput, RelationshipInput } from "@/server/persons/types";

const nul = (v: string | undefined | null) => (v ? v : null);

/**
 * Persons are a centralized identity register. Visibility follows the territorial scope of the
 * REGISTERING station (Person.stationId / regionId); persons with no station (legacy) are visible
 * to everyone holding persons:view. Duplicate detection deliberately searches the WHOLE register
 * and returns only identity fields, so two stations do not create two records for the same person.
 */
export function personScopeWhere(actor: Actor): Prisma.PersonWhereInput {
  if (actor.scopeLevel === "NATIONAL") return {};
  return { OR: [{ stationId: null }, scopeWhere(actor) as Prisma.PersonWhereInput] };
}

export const personSelect = {
  id: true,
  number: true,
  firstName: true,
  lastName: true,
  otherNames: true,
  gender: true,
  dateOfBirth: true,
  placeOfBirth: true,
  nationality: true,
  maritalStatus: true,
  occupation: true,
  phone: true,
  email: true,
  address: true,
  city: true,
  regionId: true,
  region: { select: { id: true, name: true } },
  stationId: true,
  station: { select: { id: true, code: true, name: true, regionId: true } },
  physicalDescription: true,
  distinguishingMarks: true,
  notes: true,
  isDeceased: true,
  mergedIntoId: true,
  createdAt: true,
  updatedAt: true,
  createdBy: { select: { username: true } },
  identifiers: { orderBy: { createdAt: "asc" as const } },
  aliases: true,
  relationsFrom: { include: { toPerson: { select: { id: true, number: true, firstName: true, lastName: true } } } },
  relationsTo: { include: { fromPerson: { select: { id: true, number: true, firstName: true, lastName: true } } } },
  caseParties: { include: { case: { select: { id: true, number: true, title: true, status: true, stationId: true, regionId: true, isSensitive: true } } }, orderBy: { addedAt: "desc" as const } },
  complaints: { select: { id: true, number: true, title: true, status: true, receivedAt: true, stationId: true, regionId: true }, orderBy: { receivedAt: "desc" as const } },
} satisfies Prisma.PersonSelect;

export async function getPerson(actor: Actor, id: string) {
  const p = await prisma.person.findFirst({ where: { id, deletedAt: null }, select: personSelect });
  if (!p) throw new NotFoundError("Person");
  if (p.stationId && !inScope(actor, { stationId: p.stationId, regionId: p.station?.regionId ?? p.regionId })) throw new NotFoundError("Person");
  return p;
}

function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export type DuplicateCandidate = { id: string; number: string; firstName: string; lastName: string; dateOfBirth: Date | null; phone: string | null; stationName: string | null; reason: string };

/** Whole-register duplicate detection: same identifier, same phone, or same normalized name (+ same birth date when known). */
export async function findDuplicates(input: { firstName: string; lastName: string; dateOfBirth?: Date | null; phone?: string | null; idType?: string; idValue?: string | null }, excludeId?: string): Promise<DuplicateCandidate[]> {
  const out = new Map<string, DuplicateCandidate>();
  const add = (p: { id: string; number: string; firstName: string; lastName: string; dateOfBirth: Date | null; phone: string | null; station: { name: string } | null }, reason: string) => {
    if (p.id === excludeId) return;
    if (!out.has(p.id)) out.set(p.id, { id: p.id, number: p.number, firstName: p.firstName, lastName: p.lastName, dateOfBirth: p.dateOfBirth, phone: p.phone, stationName: p.station?.name ?? null, reason });
  };
  const sel = { id: true, number: true, firstName: true, lastName: true, dateOfBirth: true, phone: true, deletedAt: true, station: { select: { name: true } } };
  if (input.idType && input.idValue) {
    const byId = await prisma.personIdentifier.findFirst({ where: { type: input.idType as never, value: input.idValue.trim() }, include: { person: { select: sel } } });
    if (byId && !byId.person.deletedAt) add(byId.person, "identifier");
  }
  if (input.phone && input.phone.replace(/\D/g, "").length >= 6) {
    const digits = input.phone.replace(/\D/g, "").slice(-8);
    const byPhone = await prisma.person.findMany({ where: { deletedAt: null, phone: { contains: digits } }, select: sel, take: 5 });
    for (const p of byPhone) add(p, "phone");
  }
  const byName = await prisma.person.findMany({ where: { deletedAt: null, lastName: { equals: input.lastName.trim(), mode: "insensitive" }, firstName: { equals: input.firstName.trim(), mode: "insensitive" } }, select: sel, take: 10 });
  for (const p of byName) {
    if (input.dateOfBirth && p.dateOfBirth && p.dateOfBirth.toDateString() !== input.dateOfBirth.toDateString()) continue;
    add(p, input.dateOfBirth && p.dateOfBirth ? "name+birthdate" : "name");
  }
  // Accent-insensitive fallback for names with diacritics
  if (out.size === 0) {
    const nf = normalize(input.firstName);
    const nl = normalize(input.lastName);
    const rows = await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM "Person" WHERE "deletedAt" IS NULL AND lower(unaccent_safe("lastName")) = ${nl} AND lower(unaccent_safe("firstName")) = ${nf} LIMIT 10`.catch(() => [] as { id: string }[]);
    if (rows.length) {
      const ps = await prisma.person.findMany({ where: { id: { in: rows.map((r) => r.id) } }, select: sel });
      for (const p of ps) add(p, "name");
    }
  }
  return [...out.values()];
}

export async function createPerson(actor: Actor, input: PersonInput, ctx: RequestContext): Promise<{ person: { id: string; number: string }; duplicates?: DuplicateCandidate[] }> {
  const duplicates = await findDuplicates({ firstName: input.firstName, lastName: input.lastName, dateOfBirth: input.dateOfBirth, phone: input.phone, idType: input.idType || undefined, idValue: input.idValue });
  const hardDuplicate = duplicates.find((d) => d.reason === "identifier");
  if (hardDuplicate) throw new BusinessError(`This identifier already belongs to ${hardDuplicate.firstName} ${hardDuplicate.lastName} (${hardDuplicate.number}).`, "CONFLICT");
  if (duplicates.length && input.forceCreate !== "1") return { person: { id: "", number: "" }, duplicates };
  const stationId = actor.stationId ?? null;
  const regionId = nul(input.regionId) ?? actor.regionId ?? null;
  const person = await prisma.$transaction(async (tx) => {
    const number = await nextNumber("PERSON", tx);
    const p = await tx.person.create({
      data: {
        number,
        firstName: input.firstName,
        lastName: input.lastName,
        otherNames: nul(input.otherNames),
        gender: input.gender,
        dateOfBirth: input.dateOfBirth,
        placeOfBirth: nul(input.placeOfBirth),
        nationality: nul(input.nationality) ?? "Tchadienne",
        maritalStatus: input.maritalStatus,
        occupation: nul(input.occupation),
        phone: nul(input.phone),
        email: nul(input.email),
        address: nul(input.address),
        city: nul(input.city),
        regionId,
        stationId,
        physicalDescription: nul(input.physicalDescription),
        distinguishingMarks: nul(input.distinguishingMarks),
        notes: nul(input.notes),
        isDeceased: input.isDeceased,
        createdById: actor.id,
      },
    });
    if (input.idType && input.idValue) await tx.personIdentifier.create({ data: { personId: p.id, type: input.idType, value: input.idValue.trim() } });
    await logAudit({ actor, action: "PERSON_CREATED", module: "persons", entityType: "Person", entityId: p.id, entityLabel: p.number, summary: `Person ${p.number} — ${p.firstName} ${p.lastName} registered${duplicates.length ? ` (duplicate warning acknowledged: ${duplicates.length} candidate(s))` : ""}`, after: p, context: ctx }, tx);
    return p;
  });
  return { person: { id: person.id, number: person.number } };
}

export async function updatePerson(actor: Actor, id: string, input: Omit<PersonInput, "idType" | "idValue" | "forceCreate">, ctx: RequestContext) {
  const before = await getPerson(actor, id);
  if (before.mergedIntoId) throw new BusinessError("This record was merged into another person and is read-only.", "STATE");
  const after = await prisma.person.update({
    where: { id },
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      otherNames: nul(input.otherNames),
      gender: input.gender,
      dateOfBirth: input.dateOfBirth,
      placeOfBirth: nul(input.placeOfBirth),
      nationality: nul(input.nationality),
      maritalStatus: input.maritalStatus,
      occupation: nul(input.occupation),
      phone: nul(input.phone),
      email: nul(input.email),
      address: nul(input.address),
      city: nul(input.city),
      regionId: nul(input.regionId) ?? before.regionId,
      physicalDescription: nul(input.physicalDescription),
      distinguishingMarks: nul(input.distinguishingMarks),
      notes: nul(input.notes),
      isDeceased: input.isDeceased,
    },
  });
  await logAudit({ actor, action: "PERSON_UPDATED", module: "persons", entityType: "Person", entityId: id, entityLabel: after.number, summary: `Person ${after.number} updated`, before: { ...before, identifiers: undefined, aliases: undefined, relationsFrom: undefined, relationsTo: undefined, caseParties: undefined, complaints: undefined }, after, context: ctx });
  return after;
}

export async function addIdentifier(actor: Actor, input: IdentifierInput, ctx: RequestContext) {
  const p = await getPerson(actor, input.personId);
  const value = input.value.trim();
  const dup = await prisma.personIdentifier.findUnique({ where: { type_value: { type: input.type, value } }, include: { person: { select: { number: true, firstName: true, lastName: true } } } });
  if (dup) throw new BusinessError(dup.personId === p.id ? "This identifier is already recorded for this person." : `This identifier already belongs to ${dup.person.firstName} ${dup.person.lastName} (${dup.person.number}).`, "CONFLICT");
  const row = await prisma.personIdentifier.create({ data: { personId: p.id, type: input.type, value, issuedBy: nul(input.issuedBy), issuedAt: input.issuedAt, expiresAt: input.expiresAt } });
  await logAudit({ actor, action: "PERSON_IDENTIFIER_ADDED", module: "persons", entityType: "Person", entityId: p.id, entityLabel: p.number, summary: `${input.type} added to ${p.number}`, after: { type: input.type, value: `…${value.slice(-4)}` }, context: ctx });
  return row;
}

export async function removeIdentifier(actor: Actor, identifierId: string, ctx: RequestContext) {
  const row = await prisma.personIdentifier.findUnique({ where: { id: identifierId } });
  if (!row) throw new NotFoundError("Identifier");
  const p = await getPerson(actor, row.personId);
  await prisma.personIdentifier.delete({ where: { id: identifierId } });
  await logAudit({ actor, action: "PERSON_IDENTIFIER_REMOVED", module: "persons", entityType: "Person", entityId: p.id, entityLabel: p.number, summary: `${row.type} removed from ${p.number}`, before: { type: row.type, value: `…${row.value.slice(-4)}` }, context: ctx });
}

export async function addAlias(actor: Actor, input: AliasInput, ctx: RequestContext) {
  const p = await getPerson(actor, input.personId);
  const alias = input.alias.trim();
  if (p.aliases.some((a) => a.alias.toLowerCase() === alias.toLowerCase())) throw new BusinessError("This alias is already recorded.", "CONFLICT");
  const row = await prisma.personAlias.create({ data: { personId: p.id, alias } });
  await logAudit({ actor, action: "PERSON_ALIAS_ADDED", module: "persons", entityType: "Person", entityId: p.id, entityLabel: p.number, summary: `Alias "${alias}" added to ${p.number}`, context: ctx });
  return row;
}

export async function addRelationship(actor: Actor, input: RelationshipInput, ctx: RequestContext) {
  if (input.fromPersonId === input.toPersonId) throw new BusinessError("A person cannot be related to themselves.");
  const [from, to] = await Promise.all([getPerson(actor, input.fromPersonId), getPerson(actor, input.toPersonId)]);
  const exists = await prisma.personRelationship.findUnique({ where: { fromPersonId_toPersonId_type: { fromPersonId: from.id, toPersonId: to.id, type: input.type } } });
  if (exists) throw new BusinessError("This relationship is already recorded.", "CONFLICT");
  const row = await prisma.personRelationship.create({ data: { fromPersonId: from.id, toPersonId: to.id, type: input.type, notes: nul(input.notes) } });
  await logAudit({ actor, action: "PERSON_RELATIONSHIP_ADDED", module: "persons", entityType: "Person", entityId: from.id, entityLabel: from.number, summary: `${from.number} —${input.type}→ ${to.number}`, after: input, context: ctx });
  return row;
}

/** Merges `mergeId` into `keepId`: re-points identifiers, aliases, relationships, case parties and complaints; the merged record is kept (read-only) with mergedIntoId. */
export async function mergePersons(actor: Actor, keepId: string, mergeId: string, reason: string, ctx: RequestContext) {
  if (keepId === mergeId) throw new BusinessError("Choose two different persons.");
  const [keep, merge] = await Promise.all([getPerson(actor, keepId), getPerson(actor, mergeId)]);
  if (keep.mergedIntoId || merge.mergedIntoId) throw new BusinessError("One of the records was already merged.", "STATE");
  await prisma.$transaction(async (tx) => {
    // identifiers: move unless the same (type,value) already exists on keep
    for (const idf of merge.identifiers) {
      const clash = await tx.personIdentifier.findUnique({ where: { type_value: { type: idf.type, value: idf.value } } });
      if (clash && clash.personId === keep.id) await tx.personIdentifier.delete({ where: { id: idf.id } });
      else await tx.personIdentifier.update({ where: { id: idf.id }, data: { personId: keep.id } });
    }
    for (const a of merge.aliases) {
      if (!keep.aliases.some((k) => k.alias.toLowerCase() === a.alias.toLowerCase())) await tx.personAlias.update({ where: { id: a.id }, data: { personId: keep.id } });
      else await tx.personAlias.delete({ where: { id: a.id } });
    }
    if (`${merge.firstName} ${merge.lastName}`.toLowerCase() !== `${keep.firstName} ${keep.lastName}`.toLowerCase()) await tx.personAlias.create({ data: { personId: keep.id, alias: `${merge.firstName} ${merge.lastName}` } });
    await tx.personRelationship.updateMany({ where: { fromPersonId: merge.id, toPersonId: { not: keep.id } }, data: { fromPersonId: keep.id } });
    await tx.personRelationship.updateMany({ where: { toPersonId: merge.id, fromPersonId: { not: keep.id } }, data: { toPersonId: keep.id } });
    await tx.personRelationship.deleteMany({ where: { OR: [{ fromPersonId: merge.id }, { toPersonId: merge.id }] } });
    // case parties: move when (case, role) not already present on keep
    for (const cp of merge.caseParties) {
      const clash = await tx.caseParty.findUnique({ where: { caseId_personId_role: { caseId: cp.caseId, personId: keep.id, role: cp.role } } });
      if (clash) await tx.caseParty.delete({ where: { id: cp.id } });
      else await tx.caseParty.update({ where: { id: cp.id }, data: { personId: keep.id } });
    }
    await tx.complaint.updateMany({ where: { complainantId: merge.id }, data: { complainantId: keep.id } });
    await tx.statement.updateMany({ where: { personId: merge.id }, data: { personId: keep.id } });
    await tx.interview.updateMany({ where: { personId: merge.id }, data: { personId: keep.id } });
    await tx.warrant.updateMany({ where: { personId: merge.id }, data: { personId: keep.id } });
    await tx.arrest.updateMany({ where: { personId: merge.id }, data: { personId: keep.id } });
    await tx.wantedPerson.updateMany({ where: { personId: merge.id }, data: { personId: keep.id } });
    await tx.person.update({ where: { id: merge.id }, data: { mergedIntoId: keep.id, notes: `${merge.notes ?? ""}\n[merged into ${keep.number}: ${reason}]`.trim() } });
    await logAudit({ actor, action: "PERSON_MERGED", module: "persons", entityType: "Person", entityId: keep.id, entityLabel: keep.number, summary: `Person ${merge.number} merged into ${keep.number}: ${reason}`, before: { mergedNumber: merge.number }, after: { keepNumber: keep.number, reason }, context: ctx }, tx);
  });
}
