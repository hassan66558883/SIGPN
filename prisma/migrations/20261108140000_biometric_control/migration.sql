-- Biometric control screen (SIGPN-T v2.0, section 6): simulated identity checks. Additive only.
-- Rollback: DROP TABLE "BiometricControl"; DROP TYPE "BiometricErrorKind", "BiometricControlStatus", "BiometricControlResult";

CREATE TYPE "BiometricControlResult" AS ENUM ('POSSIBLE_MATCH', 'UNCERTAIN', 'NO_MATCH', 'UNAVAILABLE');
CREATE TYPE "BiometricControlStatus" AS ENUM ('NEW', 'VERIFICATION_REQUESTED', 'SUPERIOR_NOTIFIED', 'ERROR_REPORTED', 'CONFIRMED_BY_HUMAN', 'REJECTED_BY_HUMAN');
CREATE TYPE "BiometricErrorKind" AS ENUM ('FALSE_POSITIVE', 'FALSE_NEGATIVE', 'POOR_CAPTURE', 'CONTESTED');

CREATE TABLE "BiometricControl" (
  "id" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "modality" "BiometricType" NOT NULL,
  "result" "BiometricControlResult" NOT NULL,
  "score" DECIMAL(5,2),
  "captureQuality" INTEGER NOT NULL,
  "referenceAlertId" TEXT,
  "subjectLabel" TEXT,
  "officerId" TEXT NOT NULL,
  "stationId" TEXT,
  "device" TEXT,
  "reason" TEXT NOT NULL,
  "status" "BiometricControlStatus" NOT NULL DEFAULT 'NEW',
  "verificationRequestedAt" TIMESTAMP(3),
  "superiorNotifiedAt" TIMESTAMP(3),
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewNotes" TEXT,
  "errorKind" "BiometricErrorKind",
  "errorNotes" TEXT,
  "errorReportedAt" TIMESTAMP(3),
  "isSimulation" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BiometricControl_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BiometricControl_number_key" ON "BiometricControl"("number");
CREATE INDEX "BiometricControl_officerId_createdAt_idx" ON "BiometricControl"("officerId", "createdAt");
CREATE INDEX "BiometricControl_stationId_createdAt_idx" ON "BiometricControl"("stationId", "createdAt");
CREATE INDEX "BiometricControl_result_idx" ON "BiometricControl"("result");

-- The reviewer of a match is never the officer who ran the control (four-eyes).
ALTER TABLE "BiometricControl" ADD CONSTRAINT "BiometricControl_reviewer_not_officer" CHECK ("reviewedById" IS NULL OR "reviewedById" <> "officerId");
-- Nothing but a simulation can be recorded until a legally approved provider is integrated.
ALTER TABLE "BiometricControl" ADD CONSTRAINT "BiometricControl_simulation_only" CHECK ("isSimulation" = true);
