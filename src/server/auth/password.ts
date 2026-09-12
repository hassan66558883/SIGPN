import bcrypt from "bcryptjs";
import { env } from "@/server/env";

const ROUNDS = 12;
// Valid bcrypt hash of a random string; used so that unknown users take the same time as known users.
const DUMMY_HASH = "$2a$12$CwTycUXWue0Thq9StjUM0uJ8Zc8fVdG1vGdHx8lQxq5mWlzM2kZ7O";

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(plain: string, hash: string | null | undefined): Promise<boolean> {
  try {
    const ok = await bcrypt.compare(plain, hash ?? DUMMY_HASH);
    return hash ? ok : false;
  } catch {
    return false;
  }
}

const COMMON = new Set(["password", "password1", "password123", "123456789012", "qwertyuiop12", "administrator", "welcome12345", "changeme1234", "letmein12345", "police123456"]);

/** Returns a list of violated rules (empty = compliant). */
export function passwordPolicyErrors(password: string, opts: { username?: string; email?: string } = {}): string[] {
  const errors: string[] = [];
  const min = env.password.minLength;
  if (password.length < min) errors.push(`at least ${min} characters`);
  if (password.length > 128) errors.push("at most 128 characters");
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length;
  if (classes < 3) errors.push("at least three of: lowercase, uppercase, digit, symbol");
  const lower = password.toLowerCase();
  if (COMMON.has(lower)) errors.push("not a commonly used password");
  if (opts.username && opts.username.length >= 3 && lower.includes(opts.username.toLowerCase())) errors.push("must not contain your username");
  const local = opts.email?.split("@")[0];
  if (local && local.length >= 3 && lower.includes(local.toLowerCase())) errors.push("must not contain your e-mail name");
  if (/^(.)\1+$/.test(password)) errors.push("must not repeat a single character");
  return errors;
}

export function isPasswordExpired(passwordChangedAt: Date): boolean {
  const maxAge = env.password.maxAgeDays;
  if (!maxAge) return false;
  return Date.now() - passwordChangedAt.getTime() > maxAge * 86_400_000;
}
