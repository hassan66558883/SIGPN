import "server-only";
import type { VoiceRecognitionProvider } from "@/server/biometric/providers/types";
import { mockIdentify, mockTemplateOf, mockVerify } from "@/server/biometric/providers/mock-common";

export const MockVoiceProvider: VoiceRecognitionProvider = {
  name: "DEMO Voice Recognition Engine",
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
