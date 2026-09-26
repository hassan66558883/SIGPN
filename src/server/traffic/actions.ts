"use server";

import { redirect } from "next/navigation";
import { getRequestContext } from "@/server/request-context";
import { fail, formEntries, formFile, revalidateAll } from "@/server/action-utils";
import { requireActorForAction, requirePermissionForAction } from "@/server/auth/dal";
import { BusinessError } from "@/server/errors";
import type { FormState } from "@/components/forms";
import * as enforcement from "@/server/traffic/enforcement";
import * as payments from "@/server/traffic/payments";
import * as registry from "@/server/traffic/registry";
import { controlSchema, driverCreateSchema, driverUpdateSchema, evidenceSchema, fineStatusSchema, openCaseSchema, paymentSchema, paymentVoidSchema, ticketCancelSchema, vehicleCreateSchema, vehicleDocumentSchema, vehicleUpdateSchema, violationToggleSchema } from "@/server/traffic/schemas";

/** Payments are recorded by finance roles (traffic:payment_*) or collected in the field by an agent (cash:collect). */
async function requirePaymentActor(primary: "traffic:payment_record" | "traffic:payment_void", field: "cash:collect") {
  const actor = await requireActorForAction();
  return requirePermissionForAction(actor.permissions.has(field) ? field : primary, actor);
}

/** Form posts carry several `violationId` fields; formEntries() would keep only the last one. */
function controlEntries(fd: FormData) {
  return { ...formEntries(fd), violationIds: fd.getAll("violationId").filter((v): v is string => typeof v === "string" && v !== "") };
}

export async function recordControlAction(_p: FormState, fd: FormData): Promise<FormState> {
  let target: string;
  try {
    const actor = await requirePermissionForAction("traffic:control_create");
    const input = controlSchema.parse(controlEntries(fd));
    const ctx = await getRequestContext();
    const r = await enforcement.recordControl(actor, input, ctx);
    // Photos taken at the roadside travel with the form; a failed photo never cancels the recorded control.
    const photos = fd.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
    if (photos.length && actor.permissions.has("traffic:evidence_upload")) {
      for (const [i, file] of photos.slice(0, 8).entries()) {
        try {
          await enforcement.attachEvidence(actor, { controlId: r.control.id, caption: `Photo ${i + 1}`, latitude: input.latitude, longitude: input.longitude }, file, ctx);
        } catch (e) {
          console.error("[traffic] photo not attached", e);
        }
      }
    }
    target = `/traffic/controls/${r.control.id}?created=1`;
    revalidateAll();
  } catch (e) {
    return fail(e, "Could not record the control.", "traffic");
  }
  redirect(target);
}

export async function attachEvidenceAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("traffic:evidence_upload");
    const file = formFile(fd, "file");
    if (!file) throw new BusinessError("A photo or file is required.");
    await enforcement.attachEvidence(actor, evidenceSchema.parse(formEntries(fd)), file, await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Evidence attached." };
  } catch (e) {
    return fail(e, "Could not attach the file.", "traffic");
  }
}

export async function cancelTicketAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("traffic:ticket_cancel");
    await enforcement.cancelTicket(actor, ticketCancelSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "PV cancelled." };
  } catch (e) {
    return fail(e, "Could not cancel the PV.", "traffic");
  }
}

export async function openCaseFromTicketAction(_p: FormState, fd: FormData): Promise<FormState> {
  let target: string;
  try {
    const actor = await requirePermissionForAction("traffic:view");
    const input = openCaseSchema.parse(formEntries(fd));
    const kase = await enforcement.openCaseFromTicket(actor, input.ticketId, { title: input.title || undefined, description: input.description || undefined }, await getRequestContext());
    target = `/cases/${kase.id}`;
    revalidateAll();
  } catch (e) {
    return fail(e, "Could not open the case.", "traffic");
  }
  redirect(target);
}

export async function setFineStatusAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("traffic:fine_manage");
    await enforcement.setFineStatus(actor, fineStatusSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Fine status updated." };
  } catch (e) {
    return fail(e, "Could not update the fine.", "traffic");
  }
}

export async function recordPaymentAction(_p: FormState, fd: FormData): Promise<FormState> {
  let target: string;
  try {
    const actor = await requirePaymentActor("traffic:payment_record", "cash:collect");
    const r = await payments.recordPayment(actor, paymentSchema.parse(formEntries(fd)), await getRequestContext());
    target = `/traffic/receipts/${r.receipt.id}?created=1`;
    revalidateAll();
  } catch (e) {
    return fail(e, "Could not record the payment.", "traffic");
  }
  redirect(target);
}

export async function voidPaymentAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePaymentActor("traffic:payment_void", "cash:collect");
    await payments.voidPayment(actor, paymentVoidSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Payment voided." };
  } catch (e) {
    return fail(e, "Could not void the payment.", "traffic");
  }
}

export async function createDriverAction(_p: FormState, fd: FormData): Promise<FormState> {
  let target: string;
  try {
    const actor = await requirePermissionForAction("traffic:drivers_manage");
    const d = await registry.createDriver(actor, driverCreateSchema.parse(formEntries(fd)), await getRequestContext());
    target = `/traffic/drivers/${d.id}?created=1`;
    revalidateAll();
  } catch (e) {
    return fail(e, "Could not create the driver.", "traffic");
  }
  redirect(target);
}

export async function updateDriverAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("traffic:drivers_manage");
    await registry.updateDriver(actor, driverUpdateSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Driver updated." };
  } catch (e) {
    return fail(e, "Could not update the driver.", "traffic");
  }
}

export async function createVehicleAction(_p: FormState, fd: FormData): Promise<FormState> {
  let target: string;
  try {
    const actor = await requirePermissionForAction("traffic:vehicles_manage");
    const v = await registry.createVehicle(actor, vehicleCreateSchema.parse(formEntries(fd)), await getRequestContext());
    target = `/traffic/vehicles/${v.id}?created=1`;
    revalidateAll();
  } catch (e) {
    return fail(e, "Could not create the vehicle.", "traffic");
  }
  redirect(target);
}

export async function updateVehicleAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("traffic:vehicles_manage");
    await registry.updateVehicle(actor, vehicleUpdateSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Vehicle updated." };
  } catch (e) {
    return fail(e, "Could not update the vehicle.", "traffic");
  }
}

export async function addVehicleDocumentAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("traffic:vehicles_manage");
    await registry.addVehicleDocument(actor, vehicleDocumentSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Document recorded." };
  } catch (e) {
    return fail(e, "Could not record the document.", "traffic");
  }
}

export async function toggleViolationAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("traffic:catalog_manage");
    const input = violationToggleSchema.parse(formEntries(fd));
    await registry.setViolationActive(actor, input.id, input.isActive, await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Catalogue updated." };
  } catch (e) {
    return fail(e, "Could not update the catalogue.", "traffic");
  }
}
