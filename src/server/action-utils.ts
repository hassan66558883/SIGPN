import { z } from "zod";
import { revalidatePath } from "next/cache";
import { AuthError, BusinessError, NotFoundError, RateLimitError } from "@/server/errors";
import type { FormState } from "@/components/forms";

export const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));
export const nul = (v: string | undefined | null) => (v ? v : null);
export const dateInput = z
  .string()
  .trim()
  .min(1, "required")
  .transform((s) => new Date(s))
  .refine((d) => !Number.isNaN(d.getTime()), "invalid date");
export const optionalDate = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .transform((s) => (s ? new Date(s) : null))
  .refine((d) => d === null || !Number.isNaN(d.getTime()), "invalid date");
export const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === "1", z.boolean());
export const idString = z.string().trim().min(1).max(64);

/** Maps service errors to a FormState. Unknown errors are logged, never leaked. */
export function fail(error: unknown, fallback = "The operation failed.", tag = "action"): FormState {
  if (error instanceof AuthError) {
    if (error.kind === "forbidden") return { error: "Your role does not allow this action. The attempt has been recorded." };
    if (error.kind === "password_change_required") return { error: "You must change your password before continuing." };
    if (error.kind === "mfa_required") return { error: "Multi-factor authentication is required before continuing." };
    return { error: "Your session has expired. Please sign in again." };
  }
  if (error instanceof RateLimitError) return { error: error.message };
  if (error instanceof BusinessError) return { error: error.message, fieldErrors: error.fieldErrors };
  if (error instanceof NotFoundError) return { error: error.message };
  if (error instanceof z.ZodError) {
    const flat = z.flattenError(error).fieldErrors as Record<string, string[] | undefined>;
    const fieldErrors: Record<string, string> = {};
    for (const [k, v] of Object.entries(flat)) if (v?.[0]) fieldErrors[k] = v[0];
    return { error: "Please correct the highlighted fields.", fieldErrors };
  }
  console.error(`[${tag}]`, error);
  return { error: fallback };
}

export function revalidateAll() {
  revalidatePath("/", "layout");
}

export function formEntries(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string") out[k] = v;
  return out;
}

export function formList(formData: FormData, key: string): string[] {
  return formData.getAll(key).filter((v): v is string => typeof v === "string" && v !== "");
}

/** Returns the uploaded File for `key`, or null if the field is empty/not a file. */
export function formFile(formData: FormData, key: string): File | null {
  const v = formData.get(key);
  return v instanceof File && v.size > 0 ? v : null;
}
