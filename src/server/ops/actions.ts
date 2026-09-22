"use server";

import { redirect } from "next/navigation";
import { getRequestContext } from "@/server/request-context";
import { fail, formEntries, formList, revalidateAll } from "@/server/action-utils";
import { requirePermissionForAction } from "@/server/auth/dal";
import * as svc from "@/server/ops/service";
import { incidentEscalateSchema, incidentOfficerSchema, incidentPersonSchema, incidentSchema, incidentStatusSchema, patrolCancelSchema, patrolCompleteSchema, patrolOfficerSchema, patrolSchema, patrolStartSchema, zoneSchema } from "@/server/ops/schemas";
import type { FormState } from "@/components/forms";

const id = (fd: FormData) => String(fd.get("id") ?? "");

/* incidents */

export async function createIncidentAction(_p: FormState, fd: FormData): Promise<FormState> {
  let created: string;
  try {
    const actor = await requirePermissionForAction("incidents:create");
    const i = await svc.createIncident(actor, incidentSchema.parse(formEntries(fd)), await getRequestContext());
    created = i.id;
    revalidateAll();
  } catch (e) {
    return fail(e, "Could not record the incident.", "incidents");
  }
  redirect(`/incidents/${created}?created=1`);
}

export async function updateIncidentAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("incidents:update");
    await svc.updateIncident(actor, id(fd), incidentSchema.omit({ stationId: true, patrolId: true }).parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Incident updated." };
  } catch (e) {
    return fail(e, "Could not update the incident.", "incidents");
  }
}

export async function incidentStatusAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("incidents:update");
    const v = incidentStatusSchema.parse(formEntries(fd));
    await svc.setIncidentStatus(actor, v.id, v.status, v.report || undefined, await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Incident status updated." };
  } catch (e) {
    return fail(e, "Could not update the incident status.", "incidents");
  }
}

export async function escalateIncidentAction(_p: FormState, fd: FormData): Promise<FormState> {
  let caseId: string;
  try {
    const actor = await requirePermissionForAction("incidents:update");
    await requirePermissionForAction("cases:create", actor);
    const v = incidentEscalateSchema.parse(formEntries(fd));
    const r = await svc.escalateIncident(actor, v.id, { title: v.title, leadId: v.leadId, isSensitive: v.isSensitive }, await getRequestContext());
    caseId = r.case.id;
    revalidateAll();
  } catch (e) {
    return fail(e, "Could not escalate the incident.", "incidents");
  }
  redirect(`/cases/${caseId}?created=1`);
}

export async function addIncidentOfficerAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("incidents:update");
    const v = incidentOfficerSchema.parse(formEntries(fd));
    await svc.addIncidentOfficer(actor, { incidentId: v.incidentId, officerId: v.officerId, role: v.role || undefined }, await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Officer dispatched." };
  } catch (e) {
    return fail(e, "Could not add the officer.", "incidents");
  }
}

export async function addIncidentPersonAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("incidents:update");
    const v = incidentPersonSchema.parse(formEntries(fd));
    await svc.addIncidentPerson(actor, { incidentId: v.incidentId, personId: v.personId, role: v.role, notes: v.notes || undefined }, await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Person recorded." };
  } catch (e) {
    return fail(e, "Could not add the person.", "incidents");
  }
}

/* zones */

export async function upsertZoneAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("patrols:manage");
    await svc.upsertZone(actor, zoneSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Zone saved." };
  } catch (e) {
    return fail(e, "Could not save the zone.", "patrols");
  }
}

/* patrols */

export async function createPatrolAction(_p: FormState, fd: FormData): Promise<FormState> {
  let created: string;
  try {
    const actor = await requirePermissionForAction("patrols:manage");
    const p = await svc.createPatrol(actor, patrolSchema.parse(formEntries(fd)), formList(fd, "officerIds"), await getRequestContext());
    created = p.id;
    revalidateAll();
  } catch (e) {
    return fail(e, "Could not plan the patrol.", "patrols");
  }
  redirect(`/patrols/${created}?created=1`);
}

export async function updatePatrolAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("patrols:manage");
    await svc.updatePatrol(actor, id(fd), patrolSchema.omit({ stationId: true }).parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Patrol updated." };
  } catch (e) {
    return fail(e, "Could not update the patrol.", "patrols");
  }
}

export async function addPatrolOfficerAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("patrols:manage");
    const v = patrolOfficerSchema.parse(formEntries(fd));
    await svc.addPatrolOfficer(actor, { patrolId: v.patrolId, officerId: v.officerId, role: v.role || undefined }, await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Officer added to the patrol." };
  } catch (e) {
    return fail(e, "Could not add the officer.", "patrols");
  }
}

export async function startPatrolAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("patrols:manage");
    const v = patrolStartSchema.parse(formEntries(fd));
    await svc.startPatrol(actor, v.id, v.startKm || undefined, await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Patrol started." };
  } catch (e) {
    return fail(e, "Could not start the patrol.", "patrols");
  }
}

export async function completePatrolAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("patrols:manage");
    const v = patrolCompleteSchema.parse(formEntries(fd));
    await svc.completePatrol(actor, v.id, { endKm: v.endKm || undefined, report: v.report }, await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Patrol completed." };
  } catch (e) {
    return fail(e, "Could not complete the patrol.", "patrols");
  }
}

export async function cancelPatrolAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("patrols:manage");
    const v = patrolCancelSchema.parse(formEntries(fd));
    await svc.cancelPatrol(actor, v.id, v.reason, await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Patrol cancelled." };
  } catch (e) {
    return fail(e, "Could not cancel the patrol.", "patrols");
  }
}
