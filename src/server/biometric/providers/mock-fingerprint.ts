import "server-only";
import type { FingerprintProvider } from "@/server/biometric/providers/types";
import { mockIdentify, mockTemplateOf, mockVerify } from "@/server/biometric/providers/mock-common";

export const MockFingerprintProvider: FingerprintProvider = {
  name: "DEMO Fingerprint Engine",
  isDemo: true,
  async extractTemplate(buf) {
    return mockTemplateOf(buf);
  },
  async verify(a, b) {
    return mockVerify(a, b);
  },
  async identify(template, candidates) {
    return mockIdentify(template, candidates);
  },
};
