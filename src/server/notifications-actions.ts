"use server";

import { prisma } from "@/server/db";
import { requireActorForAction } from "@/server/auth/dal";
import { fail, revalidateAll } from "@/server/action-utils";
import type { FormState } from "@/components/forms";

export async function markReadAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActorForAction();
    await prisma.notification.updateMany({ where: { id: String(formData.get("id") ?? ""), userId: actor.id, readAt: null }, data: { readAt: new Date() } });
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return fail(e, "Could not update the notification.");
  }
}

export async function markAllReadAction(): Promise<FormState> {
  try {
    const actor = await requireActorForAction();
    await prisma.notification.updateMany({ where: { userId: actor.id, readAt: null }, data: { readAt: new Date() } });
    revalidateAll();
    return { ok: true, message: "All notifications marked as read." };
  } catch (e) {
    return fail(e, "Could not update notifications.");
  }
}
