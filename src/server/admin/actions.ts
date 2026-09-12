"use server";

import { redirect } from "next/navigation";
import type { UserStatus } from "@/generated/prisma/client";
import { getRequestContext } from "@/server/request-context";
import { checkbox, fail, formEntries, formList, revalidateAll } from "@/server/action-utils";
import { requirePermissionForAction } from "@/server/auth/dal";
import * as users from "@/server/admin/users";
import * as roles from "@/server/admin/roles";
import { issuePasswordReset } from "@/server/auth/login";
import type { FormState } from "@/components/forms";

export async function createUserAction(_prev: FormState, formData: FormData): Promise<FormState> {
  let id: string;
  try {
    const actor = await requirePermissionForAction("users:create");
    const ctx = await getRequestContext();
    const input = users.userCreateSchema.parse(formEntries(formData));
    const u = await users.createUser(actor, input, ctx);
    id = u.id;
    revalidateAll();
  } catch (e) {
    return fail(e, "Could not create the user.", "users");
  }
  redirect(`/admin/users/${id}?created=1`);
}

export async function updateUserAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("users:update");
    const ctx = await getRequestContext();
    const id = String(formData.get("id") ?? "");
    const input = users.userUpdateSchema.parse(formEntries(formData));
    await users.updateUser(actor, id, input, ctx);
    revalidateAll();
    return { ok: true, message: "User updated." };
  } catch (e) {
    return fail(e, "Could not update the user.", "users");
  }
}

export async function setUserStatusAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("users:manage_status");
    const ctx = await getRequestContext();
    const id = String(formData.get("id") ?? "");
    const status = String(formData.get("status") ?? "") as UserStatus;
    if (!["ACTIVE", "SUSPENDED", "DISABLED"].includes(status)) return { error: "Invalid status." };
    await users.setUserStatus(actor, id, status, String(formData.get("reason") ?? ""), ctx);
    revalidateAll();
    return { ok: true, message: `Account is now ${status}.` };
  } catch (e) {
    return fail(e, "Could not change the status.", "users");
  }
}

export async function issueResetAction(_prev: FormState, formData: FormData): Promise<FormState & { resetUrl?: string; expiresAt?: string }> {
  try {
    const actor = await requirePermissionForAction("users:reset_password");
    const ctx = await getRequestContext();
    const r = await issuePasswordReset(actor, String(formData.get("id") ?? ""), ctx);
    revalidateAll();
    return { ok: true, message: "One-time reset link issued. Hand it to the user through a secure channel; it is shown only once.", resetUrl: r.url, expiresAt: r.expiresAt.toISOString() };
  } catch (e) {
    return fail(e, "Could not issue a reset link.", "users");
  }
}

export async function revokeUserSessionsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("users:manage_sessions");
    const ctx = await getRequestContext();
    const n = await users.revokeUserSessions(actor, String(formData.get("id") ?? ""), ctx);
    revalidateAll();
    return { ok: true, message: `${n} session(s) revoked.` };
  } catch (e) {
    return fail(e, "Could not revoke sessions.", "users");
  }
}

export async function resetUserMfaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("security:manage");
    const ctx = await getRequestContext();
    await users.resetUserMfa(actor, String(formData.get("id") ?? ""), ctx);
    revalidateAll();
    return { ok: true, message: "MFA reset. The user must enrol again." };
  } catch (e) {
    return fail(e, "Could not reset MFA.", "users");
  }
}

export async function createRoleAction(_prev: FormState, formData: FormData): Promise<FormState> {
  let id: string;
  try {
    const actor = await requirePermissionForAction("roles:manage");
    const ctx = await getRequestContext();
    const entries = formEntries(formData);
    const input = roles.roleSchema.parse({ ...entries, requiresMfa: checkbox.parse(entries.requiresMfa ?? "") });
    const r = await roles.createRole(actor, input, ctx);
    id = r.id;
    revalidateAll();
  } catch (e) {
    return fail(e, "Could not create the role.", "roles");
  }
  redirect(`/admin/roles/${id}?created=1`);
}

export async function updateRoleAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("roles:manage");
    const ctx = await getRequestContext();
    const entries = formEntries(formData);
    const input = roles.roleSchema.omit({ code: true }).parse({ ...entries, requiresMfa: checkbox.parse(entries.requiresMfa ?? "") });
    await roles.updateRole(actor, String(formData.get("id") ?? ""), input, ctx);
    revalidateAll();
    return { ok: true, message: "Role updated." };
  } catch (e) {
    return fail(e, "Could not update the role.", "roles");
  }
}

export async function setRolePermissionsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("roles:manage");
    const ctx = await getRequestContext();
    await roles.setRolePermissions(actor, String(formData.get("id") ?? ""), formList(formData, "permissions"), ctx);
    revalidateAll();
    return { ok: true, message: "Permissions saved. Users whose permissions were reduced must sign in again." };
  } catch (e) {
    return fail(e, "Could not save permissions.", "roles");
  }
}

export async function setRoleActiveAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("roles:manage");
    const ctx = await getRequestContext();
    await roles.setRoleActive(actor, String(formData.get("id") ?? ""), formData.get("isActive") === "1", ctx);
    revalidateAll();
    return { ok: true, message: "Role updated." };
  } catch (e) {
    return fail(e, "Could not update the role.", "roles");
  }
}
