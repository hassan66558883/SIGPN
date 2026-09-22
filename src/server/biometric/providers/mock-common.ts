import "server-only";
import { sha256 } from "@/server/crypto";
import type { BiometricTemplate, ExtractResult, IdentifyCandidate, IdentifyResult, VerifyResult } from "@/server/biometric/providers/types";

/**
 * DEMO scoring — not a real biometric algorithm. The "template" is a plain sha256 of the input
 * bytes, so re-submitting the exact same capture always verifies at 100%, and unrelated captures
 * score near 0 (hex-digit agreement is ~1/16 by chance) instead of producing misleading random
 * "matches". Every result from these mock providers must be shown to the user with a DEMO/TEST badge.
 */
export function mockTemplateOf(buffer: Buffer): ExtractResult {
  const template = sha256(buffer);
  const quality = 60 + (buffer.length % 41); // 60-100, deterministic, not meaningful
  return { template, quality };
}

export function mockSimilarity(a: BiometricTemplate, b: BiometricTemplate): number {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0;
  let matches = 0;
  for (let i = 0; i < len; i++) if (a[i] === b[i]) matches++;
  return Math.round((matches / len) * 1000) / 10;
}

export async function mockVerify(a: BiometricTemplate, b: BiometricTemplate): Promise<VerifyResult> {
  const score = mockSimilarity(a, b);
  return { matched: score >= 90, score };
}

export async function mockIdentify(template: BiometricTemplate, candidates: IdentifyCandidate[]): Promise<IdentifyResult[]> {
  return candidates
    .map((c) => ({ personId: c.personId, score: mockSimilarity(template, c.template) }))
    .sort((x, y) => y.score - x.score)
    .slice(0, 10);
}
