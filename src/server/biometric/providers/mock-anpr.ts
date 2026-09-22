import "server-only";
import { sha256 } from "@/server/crypto";
import type { LicensePlateProvider } from "@/server/biometric/providers/types";

const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";

/** DEMO plate reader — deterministically derives a plausible Chad-format plate from the image hash. Not real OCR. */
export const MockAnprProvider: LicensePlateProvider = {
  name: "DEMO ANPR Engine",
  isDemo: true,
  async readPlate(buf) {
    const h = sha256(buf);
    const digits = (Number.parseInt(h.slice(0, 8), 16) % 10000).toString().padStart(4, "0");
    const l1 = LETTERS[Number.parseInt(h.slice(8, 10), 16) % LETTERS.length];
    const l2 = LETTERS[Number.parseInt(h.slice(10, 12), 16) % LETTERS.length];
    const confidence = 70 + (Number.parseInt(h.slice(12, 14), 16) % 26); // 70-95
    return { plateNumber: `TD-${digits}-${l1}${l2}`, confidence };
  },
};
