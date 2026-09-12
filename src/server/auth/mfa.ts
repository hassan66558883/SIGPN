import { randomBytes } from "node:crypto";
import { base32Decode, base32Encode, hmacSha1, randomToken, safeEqual, sha256 } from "@/server/crypto";
import { env } from "@/server/env";

const STEP_SECONDS = 30;
const DIGITS = 6;

export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

function hotp(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const h = hmacSha1(secret, buf);
  const offset = h[h.length - 1] & 0x0f;
  const code = ((h[offset] & 0x7f) << 24) | ((h[offset + 1] & 0xff) << 16) | ((h[offset + 2] & 0xff) << 8) | (h[offset + 3] & 0xff);
  return String(code % 10 ** DIGITS).padStart(DIGITS, "0");
}

export function totpCode(secretBase32: string, at = Date.now()): string {
  return hotp(base32Decode(secretBase32), Math.floor(at / 1000 / STEP_SECONDS));
}

/** RFC 6238 verification with ±1 step tolerance. Returns the matched counter (for replay protection) or null. */
export function verifyTotp(secretBase32: string, code: string, at = Date.now(), window = 1): number | null {
  const clean = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(clean)) return null;
  const secret = base32Decode(secretBase32);
  const counter = Math.floor(at / 1000 / STEP_SECONDS);
  for (let w = -window; w <= window; w++) {
    if (safeEqual(hotp(secret, counter + w), clean)) return counter + w;
  }
  return null;
}

export function otpauthUri(secretBase32: string, accountName: string): string {
  const issuer = encodeURIComponent(env.appName.replace(/\s+/g, ""));
  return `otpauth://totp/${issuer}:${encodeURIComponent(accountName)}?secret=${secretBase32}&issuer=${issuer}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;
}

/** 8 recovery codes of the form XXXX-XXXX (uppercase, unambiguous alphabet). */
export function generateRecoveryCodes(count = 8): { plain: string; hash: string }[] {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const out: { plain: string; hash: string }[] = [];
  for (let i = 0; i < count; i++) {
    const bytes = randomBytes(8);
    let s = "";
    for (let j = 0; j < 8; j++) s += alphabet[bytes[j] % alphabet.length];
    const plain = `${s.slice(0, 4)}-${s.slice(4)}`;
    out.push({ plain, hash: hashRecoveryCode(plain) });
  }
  return out;
}

export function hashRecoveryCode(plain: string): string {
  return sha256(`recovery:${plain.toUpperCase().replace(/[^A-Z0-9]/g, "")}`);
}

export function challengeToken(): string {
  return randomToken(32);
}
