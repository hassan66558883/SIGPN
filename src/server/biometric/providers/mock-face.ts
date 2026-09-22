import "server-only";
import type { FaceRecognitionProvider } from "@/server/biometric/providers/types";
import { mockIdentify, mockTemplateOf, mockVerify } from "@/server/biometric/providers/mock-common";

export const MockFaceProvider: FaceRecognitionProvider = {
  name: "DEMO Face Recognition Engine",
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
  /** No real face detector; deterministically reports one face unless the file looks like a group shot by size heuristic (DEMO only). */
  async detectFaceCount(buf) {
    return 1 + (buf.length % 3 === 0 ? 1 : 0);
  },
};
