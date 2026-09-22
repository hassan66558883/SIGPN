import "server-only";

/** A provider's own opaque template string — never a raw image/audio buffer. */
export type BiometricTemplate = string;

export type ExtractResult = { template: BiometricTemplate; quality: number };
export type VerifyResult = { matched: boolean; score: number };
export type IdentifyCandidate = { personId: string; template: BiometricTemplate };
export type IdentifyResult = { personId: string; score: number };

export interface FingerprintProvider {
  readonly name: string;
  readonly isDemo: boolean;
  extractTemplate(imageBuffer: Buffer): Promise<ExtractResult>;
  verify(templateA: BiometricTemplate, templateB: BiometricTemplate): Promise<VerifyResult>;
  identify(template: BiometricTemplate, candidates: IdentifyCandidate[]): Promise<IdentifyResult[]>;
}

export interface FaceRecognitionProvider {
  readonly name: string;
  readonly isDemo: boolean;
  extractTemplate(imageBuffer: Buffer): Promise<ExtractResult>;
  verify(templateA: BiometricTemplate, templateB: BiometricTemplate): Promise<VerifyResult>;
  identify(template: BiometricTemplate, candidates: IdentifyCandidate[]): Promise<IdentifyResult[]>;
  /** Number of distinct faces detected in the uploaded image (for multi-person photos). */
  detectFaceCount(imageBuffer: Buffer): Promise<number>;
}

export interface VoiceRecognitionProvider {
  readonly name: string;
  readonly isDemo: boolean;
  extractTemplate(audioBuffer: Buffer): Promise<ExtractResult>;
  verify(templateA: BiometricTemplate, templateB: BiometricTemplate): Promise<VerifyResult>;
  identify(template: BiometricTemplate, candidates: IdentifyCandidate[]): Promise<IdentifyResult[]>;
}

export type PlateReadResult = { plateNumber: string; confidence: number };

export interface LicensePlateProvider {
  readonly name: string;
  readonly isDemo: boolean;
  readPlate(imageBuffer: Buffer): Promise<PlateReadResult>;
}
