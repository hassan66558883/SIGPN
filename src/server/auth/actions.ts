"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import QRCode from "qrcode";
import { getRequestContext } from "@/server/request-context";
import { fail, formEntries, revalidateAll } from "@/server/action-utils";
import { getActor, requireActorForAction } from "@/server/auth/dal";
import { clearMfaCookie, clearSessionCookie, getMfaToken, getSessionToken, setMfaCookie, setSessionCookie } from "@/server/auth/session";
import * as svc from "@/server/auth/login";
import { revokeAnyApiKey } from "@/server/auth/api-keys-admin";
import type { FormState } from "@/components/forms";

function safeNext(value: unknown): string {
  if (typeof value !== "string") return "/dashboard";
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/login") || value.includes("\\")) return "/dashboard";
  return value.slice(0, 200);
}

const loginSchema = z.object({ identifier: z.string().trim().min(1).max(120), password: z.string().min(1).max(200), next: z.string().optional() });

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const context = await getRequestContext();
  const parsed = loginSchema.safeParse(formEntries(formData));
  if (!parsed.success) return { error: "Enter your username and password." };
  const next = safeNext(parsed.data.next);
  let result: svc.LoginResult;
  try {
    result = await svc.login(parsed.data, context);
  } catch (e) {
    return fail(e, "Sign-in failed.", "login");
  }
  if (result.kind === "mfa") {
    await setMfaCookie(result.challenge);
    redirect(`/login/mfa?next=${encodeURIComponent(next)}`);
  }
  await setSessionCookie(result.token);
  redirect(next);
}

const mfaSchema = z.object({ code: z.string().trim().min(6).max(12), next: z.string().optional() });

export async function verifyMfaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const context = await getRequestContext();
  const parsed = mfaSchema.safeParse(formEntries(formData));
  if (!parsed.success) return { error: "Enter the 6-digit code from your authenticator or a recovery code." };
  const next = safeNext(parsed.data.next);
  try {
    const r = await svc.verifyMfaChallenge({ challenge: await getMfaToken(), code: parsed.data.code }, context);
    await clearMfaCookie();
    await setSessionCookie(r.token);
  } catch (e) {
    return fail(e, "Verification failed.", "mfa");
  }
  redirect(next);
}

export async function logoutAction() {
  const context = await getRequestContext();
  const actor = await getActor();
  const token = await getSessionToken();
  if (actor) await svc.logout(actor, token, context);
  await clearSessionCookie();
  await clearMfaCookie();
  redirect("/login?loggedOut=1");
}

const changePasswordSchema = z.object({ currentPassword: z.string().min(1).max(200), newPassword: z.string().min(1).max(200), confirmPassword: z.string().min(1).max(200) });

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActorForAction({ allowPending: true });
    const context = await getRequestContext();
    const parsed = changePasswordSchema.safeParse(formEntries(formData));
    if (!parsed.success) return { error: "All three fields are required." };
    if (parsed.data.newPassword !== parsed.data.confirmPassword) return { error: "The new passwords do not match.", fieldErrors: { confirmPassword: "does not match" } };
    await svc.changePassword(actor, parsed.data, context);
    revalidateAll();
    return { ok: true, message: "Password changed. Your other sessions were signed out." };
  } catch (e) {
    return fail(e, "Password change failed.", "password");
  }
}

export async function forgotPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const context = await getRequestContext();
  const identifier = String(formData.get("identifier") ?? "").trim();
  if (!identifier) return { error: "Enter your username or e-mail." };
  try {
    await svc.requestPasswordReset(identifier, context);
  } catch (e) {
    return fail(e, "Request failed.", "forgot");
  }
  return { ok: true, message: "If the account exists, an administrator has been notified and will provide you with a reset link." };
}

const resetSchema = z.object({ token: z.string().min(20).max(200), newPassword: z.string().min(1).max(200), confirmPassword: z.string().min(1).max(200) });

export async function resetPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const context = await getRequestContext();
  const parsed = resetSchema.safeParse(formEntries(formData));
  if (!parsed.success) return { error: "Invalid request." };
  if (parsed.data.newPassword !== parsed.data.confirmPassword) return { error: "The passwords do not match." };
  try {
    await svc.resetPasswordWithToken(parsed.data.token, parsed.data.newPassword, context);
  } catch (e) {
    return fail(e, "Reset failed.", "reset");
  }
  redirect("/login?reset=1");
}

export async function beginMfaAction(): Promise<FormState & { secret?: string; uri?: string; qr?: string }> {
  try {
    const actor = await requireActorForAction({ allowPending: true });
    const r = await svc.beginMfaEnrolment(actor);
    const qr = await QRCode.toDataURL(r.uri, { margin: 1, width: 220 });
    return { ok: true, secret: r.secret, uri: r.uri, qr };
  } catch (e) {
    return fail(e, "Could not start enrolment.", "mfa");
  }
}

export async function confirmMfaAction(_prev: FormState, formData: FormData): Promise<FormState & { recoveryCodes?: string[] }> {
  try {
    const actor = await requireActorForAction({ allowPending: true });
    const context = await getRequestContext();
    const code = String(formData.get("code") ?? "").trim();
    if (!/^\d{6}$/.test(code.replace(/\s+/g, ""))) return { error: "Enter the 6-digit code." };
    const recoveryCodes = await svc.confirmMfaEnrolment(actor, code, context);
    // No revalidation here on purpose: the recovery codes are shown exactly once by the client
    // component; a re-render of the page would replace it with the "manage" view before they are read.
    return { ok: true, message: "Multi-factor authentication is now enabled.", recoveryCodes };
  } catch (e) {
    return fail(e, "Enrolment failed.", "mfa");
  }
}

export async function disableMfaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActorForAction();
    const context = await getRequestContext();
    await svc.disableMfa(actor, String(formData.get("password") ?? ""), context);
    revalidateAll();
    return { ok: true, message: "Multi-factor authentication disabled." };
  } catch (e) {
    return fail(e, "Could not disable MFA.", "mfa");
  }
}

export async function regenerateRecoveryCodesAction(_prev: FormState, formData: FormData): Promise<FormState & { recoveryCodes?: string[] }> {
  try {
    const actor = await requireActorForAction();
    const context = await getRequestContext();
    const recoveryCodes = await svc.regenerateRecoveryCodes(actor, String(formData.get("code") ?? ""), context);
    return { ok: true, message: "New recovery codes generated. The old ones no longer work.", recoveryCodes };
  } catch (e) {
    return fail(e, "Could not regenerate codes.", "mfa");
  }
}

export async function revokeOwnSessionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActorForAction();
    const context = await getRequestContext();
    await svc.revokeOwnSession(actor, String(formData.get("sessionId") ?? ""), context);
    revalidateAll();
    return { ok: true, message: "Session revoked." };
  } catch (e) {
    return fail(e, "Could not revoke session.", "sessions");
  }
}

export async function createApiKeyAction(_prev: FormState, formData: FormData): Promise<FormState & { apiKey?: string }> {
  try {
    const actor = await requireActorForAction();
    const context = await getRequestContext();
    const days = Number(formData.get("expiresInDays") ?? 0);
    const apiKey = await svc.createApiKey(actor, String(formData.get("name") ?? ""), Number.isFinite(days) && days > 0 ? days : null, context);
    revalidateAll();
    return { ok: true, message: "API key created. Copy it now — it will not be shown again.", apiKey };
  } catch (e) {
    return fail(e, "Could not create API key.", "apikeys");
  }
}

export async function revokeApiKeyAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActorForAction();
    const context = await getRequestContext();
    await svc.revokeApiKey(actor, String(formData.get("id") ?? ""), context);
    revalidateAll();
    return { ok: true, message: "API key revoked." };
  } catch (e) {
    return fail(e, "Could not revoke API key.", "apikeys");
  }
}

/** The security administrator revokes any API key (lot 7). */
export async function revokeAnyApiKeyAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActorForAction();
    const context = await getRequestContext();
    await revokeAnyApiKey(actor, String(formData.get("id") ?? ""), context);
    revalidateAll();
    return { ok: true, message: "API key revoked." };
  } catch (e) {
    return fail(e, "Could not revoke API key.", "apikeys");
  }
}
