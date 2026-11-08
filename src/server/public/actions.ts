"use server";

import { z } from "zod";
import { getRequestContext } from "@/server/request-context";
import { fail, formEntries, revalidateAll } from "@/server/action-utils";
import { requirePermissionForAction } from "@/server/auth/dal";
import * as admin from "@/server/public/admin";
import { publishWantedPublicly, unpublishWantedPublicly } from "@/server/wanted/service";
import type { FormState } from "@/components/forms";

const bool = z.preprocess((v) => v === "on" || v === "true" || v === "1" || v === true, z.boolean());

export async function updateSubmissionAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("intake:manage");
    await admin.updateSubmission(actor, admin.submissionUpdateSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Submission updated." };
  } catch (e) {
    return fail(e, "Could not update the submission.", "public");
  }
}

export async function convertSubmissionAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("intake:manage");
    const input = z.object({ id: z.string().min(1), stationId: z.string().optional() }).parse(formEntries(fd));
    const c = await admin.convertToComplaint(actor, input.id, input.stationId || null, await getRequestContext());
    revalidateAll();
    return { ok: true, message: `Complaint ${c.number} created.` };
  } catch (e) {
    return fail(e, "Could not convert the submission.", "public");
  }
}

export async function saveNewsAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("public:content");
    await admin.saveNews(actor, admin.newsSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "News saved as a draft." };
  } catch (e) {
    return fail(e, "Could not save the news.", "public");
  }
}

export async function setNewsPublishedAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("public:content");
    const input = z.object({ id: z.string().min(1), published: bool }).parse(formEntries(fd));
    await admin.setNewsPublished(actor, input.id, input.published, await getRequestContext());
    revalidateAll();
    return { ok: true, message: input.published ? "News published." : "News withdrawn." };
  } catch (e) {
    return fail(e, "Could not change the publication.", "public");
  }
}

export async function saveStationPublicAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("public:content");
    const raw = formEntries(fd);
    await admin.saveStationPublic(actor, admin.stationPublicSchema.parse({ ...raw, publicVisible: raw.publicVisible === "on", verified: raw.verified === "on" }), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Directory entry saved." };
  } catch (e) {
    return fail(e, "Could not save the directory entry.", "public");
  }
}

export async function publishWantedPubliclyAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("wanted:publish");
    const input = z.object({ id: z.string().min(1), notice: z.string().default(""), confirm: bool }).parse(formEntries(fd));
    await publishWantedPublicly(actor, input.id, { notice: input.notice, confirm: input.confirm }, await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Notice published on the public site." };
  } catch (e) {
    return fail(e, "Could not publish the notice.", "wanted");
  }
}

export async function unpublishWantedPubliclyAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("wanted:publish");
    await unpublishWantedPublicly(actor, z.object({ id: z.string().min(1) }).parse(formEntries(fd)).id, await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Notice withdrawn from the public site." };
  } catch (e) {
    return fail(e, "Could not withdraw the notice.", "wanted");
  }
}
