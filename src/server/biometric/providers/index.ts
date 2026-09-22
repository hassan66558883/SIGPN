import "server-only";
import { env } from "@/server/env";
import { BusinessError } from "@/server/errors";
import { MockFingerprintProvider } from "@/server/biometric/providers/mock-fingerprint";
import { MockFaceProvider } from "@/server/biometric/providers/mock-face";
import { MockVoiceProvider } from "@/server/biometric/providers/mock-voice";
import { MockAnprProvider } from "@/server/biometric/providers/mock-anpr";
import type { FaceRecognitionProvider, FingerprintProvider, LicensePlateProvider, VoiceRecognitionProvider } from "@/server/biometric/providers/types";

/**
 * Provider seam (spec §18/§19): swapping in a real AFIS/face/voice/ANPR vendor means implementing
 * the matching interface in `types.ts` and adding a case below — no change to service/UI code.
 */
export function getFingerprintProvider(): FingerprintProvider {
  if (env.biometric.fingerprintProvider === "mock") return MockFingerprintProvider;
  throw new BusinessError(`Fingerprint provider "${env.biometric.fingerprintProvider}" is not integrated yet.`);
}

export function getFaceProvider(): FaceRecognitionProvider {
  if (env.biometric.faceProvider === "mock") return MockFaceProvider;
  throw new BusinessError(`Face recognition provider "${env.biometric.faceProvider}" is not integrated yet.`);
}

export function getVoiceProvider(): VoiceRecognitionProvider {
  if (env.biometric.voiceProvider === "mock") return MockVoiceProvider;
  throw new BusinessError(`Voice recognition provider "${env.biometric.voiceProvider}" is not integrated yet.`);
}

export function getAnprProvider(): LicensePlateProvider {
  if (env.biometric.anprProvider === "mock") return MockAnprProvider;
  throw new BusinessError(`ANPR provider "${env.biometric.anprProvider}" is not integrated yet.`);
}
