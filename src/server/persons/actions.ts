"use server";

import { redirect } from "next/navigation";
import { getRequestContext } from "@/server/request-context";
import { fail, formEntries, revalidateAll } from "@/server/action-utils";
import { requirePermissionForAction } from "@/server/auth/dal";
import * as svc from "@/server/persons/service";
import { aliasSchema, identifierSchema, mergeSchema, personSchema, relationshipSchema } from "@/server/persons/schemas";
import type { FormState } from "@/components/forms";

export type PersonFormState = FormState & { duplicates?: svc.DuplicateCandidate[] };

export async function createPersonAction(_p: PersonFormState, fd: FormData): Promise<PersonFormState> {
  let id: string;
  try {
    const actor = await requirePermissionForAction("persons:create");
    const input = personSchema.parse(formEntries(fd));
    const r = await svc.createPerson(actor, input, await getRequestContext());
    if (r.duplicates?.length) return { error: "Possible duplicate(s) found. Review them below, or confirm the creation.", duplicates: r.duplicates };
    id = r.person.id;
    revalidateAll();
  } catch (e) {
    return fail(e, "Could not register the person.", "persons");
  }
  redirect(`/persons/${id}?created=1`);
}

export async function updatePersonAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("persons:update");
    const input = personSchema.omit({ idType: true, idValue: true, forceCreate: true }).parse(formEntries(fd));
    await svc.updatePerson(actor, String(fd.get("id") ?? ""), input, await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Person updated." };
  } catch (e) {
    return fail(e, "Could not update the person.", "persons");
  }
}

export async function addIdentifierAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("persons:update");
    await svc.addIdentifier(actor, identifierSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Identifier added." };
  } catch (e) {
    return fail(e, "Could not add the identifier.", "persons");
  }
}

export async function removeIdentifierAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("persons:update");
    await svc.removeIdentifier(actor, String(fd.get("id") ?? ""), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Identifier removed." };
  } catch (e) {
    return fail(e, "Could not remove the identifier.", "persons");
  }
}

export async function addAliasAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("persons:update");
    await svc.addAlias(actor, aliasSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Alias added." };
  } catch (e) {
    return fail(e, "Could not add the alias.", "persons");
  }
}

export async function addRelationshipAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("persons:update");
    await svc.addRelationship(actor, relationshipSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Relationship added." };
  } catch (e) {
    return fail(e, "Could not add the relationship.", "persons");
  }
}

export async function mergePersonsAction(_p: FormState, fd: FormData): Promise<FormState> {
  let keepId: string;
  try {
    const actor = await requirePermissionForAction("persons:merge");
    const v = mergeSchema.parse(formEntries(fd));
    await svc.mergePersons(actor, v.keepId, v.mergeId, v.reason, await getRequestContext());
    keepId = v.keepId;
    revalidateAll();
  } catch (e) {
    return fail(e, "Could not merge the persons.", "persons");
  }
  redirect(`/persons/${keepId}?merged=1`);
}
