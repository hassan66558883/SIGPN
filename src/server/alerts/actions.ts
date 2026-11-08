"use server";

import { z } from "zod";
import { getRequestContext } from "@/server/request-context";
import { fail, formEntries, revalidateAll } from "@/server/action-utils";
import { requirePermissionForAction } from "@/server/auth/dal";
import * as svc from "@/server/alerts/service";
import type { FormState } from "@/components/forms";

const idSchema = z.object({ id: z.string().min(1) });

export async function markAlertReadAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("alerts:view");
    await svc.markRead(actor, idSchema.parse(formEntries(fd)).id, await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Alert marked as read." };
  } catch (e) {
    return fail(e, "Could not record the read receipt.", "alerts");
  }
}

export async function acknowledgeAlertAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("alerts:ack");
    await svc.acknowledge(actor, idSchema.parse(formEntries(fd)).id, await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Alert acknowledged." };
  } catch (e) {
    return fail(e, "Could not record the acknowledgement.", "alerts");
  }
}

export async function remindAlertAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("alerts:supervise");
    const r = await svc.remindPending(actor, idSchema.parse(formEntries(fd)).id, await getRequestContext());
    revalidateAll();
    return { ok: true, message: `Reminder sent to ${r.reminded} unit(s).` };
  } catch (e) {
    return fail(e, "Could not send the reminder.", "alerts");
  }
}

export async function setUnitOfflineAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("alerts:simulate");
    const input = z.object({ id: z.string().min(1), offline: z.enum(["true", "false"]) }).parse(formEntries(fd));
    await svc.setSimulatedOffline(actor, input.id, input.offline === "true", await getRequestContext());
    revalidateAll();
    return { ok: true, message: input.offline === "true" ? "Unit set offline (simulation)." : "Unit back online." };
  } catch (e) {
    return fail(e, "Could not change the unit connectivity.", "alerts");
  }
}

export async function publishSimulationAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("alerts:simulate");
    const input = z.object({ title: z.string().trim().min(3).max(120), stationId: z.string().min(1) }).parse(formEntries(fd));
    const r = await svc.publishSimulation(actor, { title: input.title, diffusion: "NATIONAL", stationId: input.stationId }, await getRequestContext());
    revalidateAll();
    return { ok: true, message: `Simulation ${r.alert.number} published to ${r.recipients} unit(s).` };
  } catch (e) {
    return fail(e, "Could not publish the simulation.", "alerts");
  }
}
