"use server";

import { getRequestContext } from "@/server/request-context";
import { fail, revalidateAll } from "@/server/action-utils";
import { requirePermissionForAction } from "@/server/auth/dal";
import { cancelApproval, decideApproval } from "@/server/approvals/service";
import type { FormState } from "@/components/forms";

export async function decideApprovalAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("approvals:decide");
    const vote = String(formData.get("vote") ?? "") === "REJECT" ? "REJECT" : "APPROVE";
    const r = await decideApproval(actor, String(formData.get("id") ?? ""), vote, String(formData.get("comment") ?? ""), await getRequestContext());
    revalidateAll();
    return { ok: true, message: vote === "REJECT" ? "Request rejected." : r.status === "PENDING" ? "Approval recorded. A second approval is still needed." : "Approval recorded." };
  } catch (e) {
    return fail(e, "Could not record the decision.", "approvals");
  }
}

export async function cancelApprovalAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("approvals:view");
    await cancelApproval(actor, String(formData.get("id") ?? ""), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Request cancelled." };
  } catch (e) {
    return fail(e, "Could not cancel the request.", "approvals");
  }
}
