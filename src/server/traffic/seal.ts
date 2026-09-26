/**
 * Electronic seal of a PV («cachet électronique»): a SHA-256 hash over the canonical content of the
 * PV and an HMAC (server secret) binding it to its number and issuing user. It makes any later
 * alteration of the stored PV detectable when the QR code is verified. It is an integrity seal, not a
 * qualified electronic signature in the legal sense of the term.
 */
import { createHmac } from "node:crypto";
import { env } from "@/server/env";
import { safeEqual, sha256 } from "@/server/crypto";

export type SealableTicket = {
  number: string;
  issuedAt: Date;
  stationCode: string;
  issuedByUsername: string;
  driver: { number: string; lastName: string; firstName: string } | null;
  plateNumber: string | null;
  offences: { code: string; name: string; classText: string; legalReference: string; amountText: string; amountFcfa: number | null }[];
  totalFineFcfa: number;
  observations: string | null;
};

export function canonicalTicket(t: SealableTicket): string {
  const offences = [...t.offences].sort((a, b) => a.code.localeCompare(b.code));
  return JSON.stringify({
    v: 1,
    number: t.number,
    issuedAt: t.issuedAt.toISOString(),
    station: t.stationCode,
    officer: t.issuedByUsername,
    driver: t.driver ? [t.driver.number, t.driver.lastName, t.driver.firstName] : null,
    plate: t.plateNumber,
    offences: offences.map((o) => [o.code, o.name, o.classText, o.legalReference, o.amountText, o.amountFcfa]),
    total: t.totalFineFcfa,
    observations: t.observations ?? "",
  });
}

function hmac(contentHash: string, number: string, issuedById: string): string {
  return createHmac("sha256", env.authSecret).update(`${contentHash}|${number}|${issuedById}`).digest("hex");
}

export function sealTicket(t: SealableTicket, issuedById: string): { contentHash: string; signature: string } {
  const contentHash = sha256(canonicalTicket(t));
  return { contentHash, signature: hmac(contentHash, t.number, issuedById) };
}

export function verifySeal(t: SealableTicket, issuedById: string, stored: { contentHash: string; signature: string }): boolean {
  const recomputed = sealTicket(t, issuedById);
  return safeEqual(recomputed.contentHash, stored.contentHash) && safeEqual(recomputed.signature, stored.signature);
}
