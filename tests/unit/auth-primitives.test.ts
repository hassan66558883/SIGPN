/**
 * Unit tests for auth primitives (no database needed).
 *   npx tsx --test tests/unit/auth-primitives.test.ts
 */
import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { totpCode, verifyTotp, generateTotpSecret, generateRecoveryCodes, hashRecoveryCode, otpauthUri } from "../../src/server/auth/mfa";
import { encryptSecret, decryptSecret, base32Decode, base32Encode, sha256 } from "../../src/server/crypto";
import { passwordPolicyErrors, hashPassword, verifyPassword } from "../../src/server/auth/password";
import { enforceRateLimit, resetRateLimit } from "../../src/server/auth/rate-limit";

test("TOTP: RFC 6238 test vector (SHA1, secret '12345678901234567890', T=59 → 287082)", () => {
  const secret = base32Encode(Buffer.from("12345678901234567890"));
  assert.equal(totpCode(secret, 59 * 1000), "287082");
  assert.equal(totpCode(secret, 1111111109 * 1000), "081804");
});

test("TOTP: verify accepts ±1 step and rejects garbage", () => {
  const secret = generateTotpSecret();
  const now = Date.now();
  const code = totpCode(secret, now);
  assert.notEqual(verifyTotp(secret, code, now), null);
  assert.notEqual(verifyTotp(secret, totpCode(secret, now - 30_000), now), null);
  assert.equal(verifyTotp(secret, totpCode(secret, now - 90_000), now), null);
  assert.equal(verifyTotp(secret, "abcdef", now), null);
  assert.equal(verifyTotp(secret, "12345", now), null);
});

test("base32 round-trip", () => {
  const buf = Buffer.from("hello world, pms");
  assert.equal(base32Decode(base32Encode(buf)).toString(), buf.toString());
});

test("otpauth URI includes issuer, account and secret", () => {
  const uri = otpauthUri("JBSWY3DPEHPK3PXP", "admin");
  assert.match(uri, /^otpauth:\/\/totp\//);
  assert.match(uri, /secret=JBSWY3DPEHPK3PXP/);
  assert.match(uri, /issuer=/);
});

test("recovery codes: 8 unique, hashed, hash is case/format insensitive", () => {
  const codes = generateRecoveryCodes();
  assert.equal(codes.length, 8);
  assert.equal(new Set(codes.map((c) => c.plain)).size, 8);
  assert.equal(hashRecoveryCode(codes[0].plain.toLowerCase().replace("-", " ")), codes[0].hash);
});

test("AES-256-GCM encrypt/decrypt round-trip and tamper detection", () => {
  const enc = encryptSecret("super-secret");
  assert.notEqual(enc, "super-secret");
  assert.equal(decryptSecret(enc), "super-secret");
  const [iv, tag, ct] = enc.split(".");
  const tampered = `${iv}.${tag}.${ct.slice(0, -2)}AA`;
  assert.throws(() => decryptSecret(tampered));
});

test("password policy rules", () => {
  assert.ok(passwordPolicyErrors("short").length > 0);
  assert.ok(passwordPolicyErrors("alllowercaseletters").length > 0);
  assert.ok(passwordPolicyErrors("Fatou.Diallo.2026!", { username: "fatou.diallo" }).length > 0);
  assert.deepEqual(passwordPolicyErrors("Correct-Horse-Battery-9"), []);
});

test("bcrypt hash verifies and rejects wrong password; unknown hash never verifies", async () => {
  const h = await hashPassword("Correct-Horse-Battery-9");
  assert.match(h, /^\$2[aby]\$12\$/);
  assert.equal(await verifyPassword("Correct-Horse-Battery-9", h), true);
  assert.equal(await verifyPassword("wrong", h), false);
  assert.equal(await verifyPassword("anything", null), false);
});

test("rate limiter blocks after the limit and resets", () => {
  const key = `unit-${Date.now()}`;
  for (let i = 0; i < 10; i++) enforceRateLimit("mfa", key);
  assert.throws(() => enforceRateLimit("mfa", key), /Too many requests/);
  resetRateLimit("mfa", key);
  enforceRateLimit("mfa", key);
});

test("sha256 is deterministic hex", () => {
  assert.equal(sha256("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});
