import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "@/server/env";

export function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hmacSha256(key: Buffer, value: string | Buffer): Buffer {
  return createHmac("sha256", key).update(value).digest();
}

/** HMAC-SHA1 is required for TOTP interoperability with authenticator apps (RFC 6238 default). */
export function hmacSha1(key: Buffer, value: string | Buffer): Buffer {
  return createHmac("sha1", key).update(value).digest();
}

/** URL-safe random token (default 256 bits). */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function randomDigits(n: number): string {
  let out = "";
  while (out.length < n) out += (randomBytes(1)[0] % 10).toString();
  return out;
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function dataKey(): Buffer {
  const raw = Buffer.from(env.dataEncryptionKey, "base64");
  // Accept any length by deriving a 32-byte key deterministically.
  return raw.length === 32 ? raw : createHash("sha256").update(raw.length ? raw : Buffer.from(env.dataEncryptionKey)).digest();
}

/** AES-256-GCM. Output: base64url(iv).base64url(tag).base64url(ciphertext) */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", dataKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${enc.toString("base64url")}`;
}

export function decryptSecret(payload: string): string {
  const [ivB, tagB, encB] = payload.split(".");
  if (!ivB || !tagB || !encB) throw new Error("malformed ciphertext");
  const decipher = createDecipheriv("aes-256-gcm", dataKey(), Buffer.from(ivB, "base64url"));
  decipher.setAuthTag(Buffer.from(tagB, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encB, "base64url")), decipher.final()]).toString("utf8");
}

// ---- Base32 (RFC 4648) for TOTP secrets ----
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(str: string): Buffer {
  const clean = str.toUpperCase().replace(/=+$/, "").replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | B32.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}
