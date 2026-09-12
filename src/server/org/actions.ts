"use server";

import { redirect } from "next/navigation";
import type { DutyStatus } from "@/generated/prisma/client";
import { getRequestContext } from "@/server/request-context";
import { fail, formEntries, revalidateAll } from "@/server/action-utils";
import { requirePermissionForAction } from "@/server/auth/dal";
import * as svc from "@/server/org/service";
import { adminDepartmentSchema, assignmentSchema, communeSchema, departmentSchema, dutyStatusSchema, localitySchema, officerSchema, organizationSchema, rankSchema, regionSchema, stationSchema } from "@/server/org/schemas";
import type { FormState } from "@/components/forms";

const id = (fd: FormData, key = "id") => String(fd.get(key) ?? "");

export async function updateOrganizationAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("org:manage");
    await svc.updateOrganization(actor, id(fd), organizationSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Organization updated." };
  } catch (e) {
    return fail(e, "Could not update the organization.", "org");
  }
}

export async function createRegionAction(_p: FormState, fd: FormData): Promise<FormState> {
  let created: string;
  try {
    const actor = await requirePermissionForAction("org:manage");
    const r = await svc.createRegion(actor, regionSchema.parse(formEntries(fd)), await getRequestContext());
    created = r.id;
    revalidateAll();
  } catch (e) {
    return fail(e, "Could not create the province.", "org");
  }
  redirect(`/admin/organization/regions/${created}?created=1`);
}

export async function updateRegionAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("org:manage");
    await svc.updateRegion(actor, id(fd), regionSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Province updated." };
  } catch (e) {
    return fail(e, "Could not update the province.", "org");
  }
}

export async function createAdminDepartmentAction(_p: FormState, fd: FormData): Promise<FormState> {
  let created: string;
  try {
    const actor = await requirePermissionForAction("org:manage");
    const d = await svc.createAdminDepartment(actor, adminDepartmentSchema.parse(formEntries(fd)), await getRequestContext());
    created = d.id;
    revalidateAll();
  } catch (e) {
    return fail(e, "Could not create the department.", "org");
  }
  redirect(`/admin/organization/departments/${created}?created=1`);
}

export async function updateAdminDepartmentAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("org:manage");
    await svc.updateAdminDepartment(actor, id(fd), adminDepartmentSchema.omit({ regionId: true }).parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Department updated." };
  } catch (e) {
    return fail(e, "Could not update the department.", "org");
  }
}

export async function createCommuneAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("org:manage");
    await svc.createCommune(actor, communeSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Commune created." };
  } catch (e) {
    return fail(e, "Could not create the commune.", "org");
  }
}

export async function updateCommuneAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("org:manage");
    await svc.updateCommune(actor, id(fd), communeSchema.omit({ adminDepartmentId: true }).parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Commune updated." };
  } catch (e) {
    return fail(e, "Could not update the commune.", "org");
  }
}

export async function createLocalityAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("org:manage");
    await svc.createLocality(actor, localitySchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Locality created." };
  } catch (e) {
    return fail(e, "Could not create the locality.", "org");
  }
}

export async function createStationAction(_p: FormState, fd: FormData): Promise<FormState> {
  let created: string;
  try {
    const actor = await requirePermissionForAction("org:manage");
    const s = await svc.createStation(actor, stationSchema.parse(formEntries(fd)), await getRequestContext());
    created = s.id;
    revalidateAll();
  } catch (e) {
    return fail(e, "Could not create the station.", "org");
  }
  redirect(`/admin/organization/stations/${created}?created=1`);
}

export async function updateStationAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("org:manage");
    await svc.updateStation(actor, id(fd), stationSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Station updated." };
  } catch (e) {
    return fail(e, "Could not update the station.", "org");
  }
}

export async function createDepartmentAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("org:manage");
    await svc.createDepartment(actor, departmentSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Department created." };
  } catch (e) {
    return fail(e, "Could not create the department.", "org");
  }
}

export async function updateDepartmentAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("org:manage");
    await svc.updateDepartment(actor, id(fd), departmentSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Department updated." };
  } catch (e) {
    return fail(e, "Could not update the department.", "org");
  }
}

export async function createRankAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("org:manage");
    await svc.createRank(actor, rankSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Rank created." };
  } catch (e) {
    return fail(e, "Could not create the rank.", "org");
  }
}

export async function updateRankAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("org:manage");
    await svc.updateRank(actor, id(fd), rankSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Rank updated." };
  } catch (e) {
    return fail(e, "Could not update the rank.", "org");
  }
}

export async function createOfficerAction(_p: FormState, fd: FormData): Promise<FormState> {
  let created: string;
  try {
    const actor = await requirePermissionForAction("officers:manage");
    const o = await svc.createOfficer(actor, officerSchema.parse(formEntries(fd)), await getRequestContext());
    created = o.id;
    revalidateAll();
  } catch (e) {
    return fail(e, "Could not create the officer.", "officers");
  }
  redirect(`/officers/${created}?created=1`);
}

export async function updateOfficerAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("officers:manage");
    const input = officerSchema.omit({ stationId: true, rankId: true, departmentId: true }).parse(formEntries(fd));
    await svc.updateOfficer(actor, id(fd), input, await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Officer updated." };
  } catch (e) {
    return fail(e, "Could not update the officer.", "officers");
  }
}

export async function assignOfficerAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("officers:manage");
    await svc.assignOfficer(actor, assignmentSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Assignment recorded." };
  } catch (e) {
    return fail(e, "Could not record the assignment.", "officers");
  }
}

export async function setDutyStatusAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("officers:manage");
    const v = dutyStatusSchema.parse(formEntries(fd));
    await svc.setDutyStatus(actor, v.officerId, v.dutyStatus as DutyStatus, v.reason || undefined, await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Duty status updated." };
  } catch (e) {
    return fail(e, "Could not update the duty status.", "officers");
  }
}

export async function deactivateOfficerAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("officers:manage");
    await svc.deactivateOfficer(actor, id(fd, "officerId"), String(fd.get("reason") ?? "") || undefined, await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Officer deactivated." };
  } catch (e) {
    return fail(e, "Could not deactivate the officer.", "officers");
  }
}

export async function reactivateOfficerAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("officers:manage");
    await svc.reactivateOfficer(actor, id(fd, "officerId"), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Officer reactivated." };
  } catch (e) {
    return fail(e, "Could not reactivate the officer.", "officers");
  }
}
