-- CreateEnum
CREATE TYPE "BiometricType" AS ENUM ('FINGERPRINT', 'FACE', 'VOICE', 'ANPR');

-- CreateEnum
CREATE TYPE "BiometricSearchMode" AS ENUM ('VERIFY_1_1', 'IDENTIFY_1_N');

-- CreateEnum
CREATE TYPE "BiometricSearchResult" AS ENUM ('NO_MATCH', 'POTENTIAL_MATCH', 'VERIFIED_MATCH', 'ERROR');

-- CreateEnum
CREATE TYPE "BiometricAction" AS ENUM ('NONE', 'SENT_FOR_VERIFICATION', 'VERIFIED_BY_INVESTIGATOR', 'REJECTED', 'LINKED_TO_CASE');

-- CreateEnum
CREATE TYPE "FingerPosition" AS ENUM ('RIGHT_THUMB', 'RIGHT_INDEX', 'RIGHT_MIDDLE', 'RIGHT_RING', 'RIGHT_LITTLE', 'LEFT_THUMB', 'LEFT_INDEX', 'LEFT_MIDDLE', 'LEFT_RING', 'LEFT_LITTLE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "LprStatus" AS ENUM ('NEW', 'REVIEWED', 'LINKED_TO_CASE', 'DISMISSED');

-- CreateTable
CREATE TABLE "FingerprintRecord" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "position" "FingerPosition" NOT NULL DEFAULT 'UNKNOWN',
    "templateSecretEnc" TEXT NOT NULL,
    "quality" INTEGER,
    "device" TEXT,
    "sourceEvidenceId" TEXT,
    "capturedById" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FingerprintRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaceRecord" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "templateSecretEnc" TEXT NOT NULL,
    "quality" INTEGER,
    "device" TEXT,
    "sourceEvidenceId" TEXT,
    "capturedById" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FaceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceRecord" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "templateSecretEnc" TEXT NOT NULL,
    "durationSeconds" INTEGER,
    "device" TEXT,
    "sourceEvidenceId" TEXT,
    "capturedById" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoiceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LicensePlateDetection" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "plateNumber" TEXT NOT NULL,
    "vehicleMake" TEXT,
    "vehicleModel" TEXT,
    "vehicleColor" TEXT,
    "cameraId" TEXT,
    "locationText" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "detectedAt" TIMESTAMP(3) NOT NULL,
    "caseId" TEXT,
    "personId" TEXT,
    "sourceEvidenceId" TEXT,
    "status" "LprStatus" NOT NULL DEFAULT 'NEW',
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LicensePlateDetection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BiometricSearch" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "type" "BiometricType" NOT NULL,
    "mode" "BiometricSearchMode" NOT NULL,
    "caseId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "officerId" TEXT NOT NULL,
    "device" TEXT,
    "location" TEXT,
    "parameters" JSONB,
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "result" "BiometricSearchResult" NOT NULL DEFAULT 'NO_MATCH',
    "topMatchScore" DECIMAL(5,2),
    "topMatchPersonId" TEXT,
    "action" "BiometricAction" NOT NULL DEFAULT 'NONE',
    "actionNotes" TEXT,
    "actionById" TEXT,
    "actionAt" TIMESTAMP(3),
    "isDemo" BOOLEAN NOT NULL DEFAULT true,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BiometricSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BiometricMatch" (
    "id" TEXT NOT NULL,
    "searchId" TEXT NOT NULL,
    "personId" TEXT,
    "score" DECIMAL(5,2) NOT NULL,
    "sourceLabel" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BiometricMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FingerprintRecord_number_key" ON "FingerprintRecord"("number");

-- CreateIndex
CREATE INDEX "FingerprintRecord_personId_idx" ON "FingerprintRecord"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "FaceRecord_number_key" ON "FaceRecord"("number");

-- CreateIndex
CREATE INDEX "FaceRecord_personId_idx" ON "FaceRecord"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "VoiceRecord_number_key" ON "VoiceRecord"("number");

-- CreateIndex
CREATE INDEX "VoiceRecord_personId_idx" ON "VoiceRecord"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "LicensePlateDetection_number_key" ON "LicensePlateDetection"("number");

-- CreateIndex
CREATE INDEX "LicensePlateDetection_plateNumber_idx" ON "LicensePlateDetection"("plateNumber");

-- CreateIndex
CREATE INDEX "LicensePlateDetection_caseId_idx" ON "LicensePlateDetection"("caseId");

-- CreateIndex
CREATE INDEX "LicensePlateDetection_detectedAt_idx" ON "LicensePlateDetection"("detectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BiometricSearch_number_key" ON "BiometricSearch"("number");

-- CreateIndex
CREATE INDEX "BiometricSearch_caseId_idx" ON "BiometricSearch"("caseId");

-- CreateIndex
CREATE INDEX "BiometricSearch_type_idx" ON "BiometricSearch"("type");

-- CreateIndex
CREATE INDEX "BiometricSearch_officerId_idx" ON "BiometricSearch"("officerId");

-- CreateIndex
CREATE INDEX "BiometricSearch_createdAt_idx" ON "BiometricSearch"("createdAt");

-- CreateIndex
CREATE INDEX "BiometricMatch_searchId_idx" ON "BiometricMatch"("searchId");

-- CreateIndex
CREATE UNIQUE INDEX "BiometricMatch_searchId_rank_key" ON "BiometricMatch"("searchId", "rank");

-- AddForeignKey
ALTER TABLE "FingerprintRecord" ADD CONSTRAINT "FingerprintRecord_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FingerprintRecord" ADD CONSTRAINT "FingerprintRecord_sourceEvidenceId_fkey" FOREIGN KEY ("sourceEvidenceId") REFERENCES "Evidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FingerprintRecord" ADD CONSTRAINT "FingerprintRecord_capturedById_fkey" FOREIGN KEY ("capturedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaceRecord" ADD CONSTRAINT "FaceRecord_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaceRecord" ADD CONSTRAINT "FaceRecord_sourceEvidenceId_fkey" FOREIGN KEY ("sourceEvidenceId") REFERENCES "Evidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaceRecord" ADD CONSTRAINT "FaceRecord_capturedById_fkey" FOREIGN KEY ("capturedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceRecord" ADD CONSTRAINT "VoiceRecord_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceRecord" ADD CONSTRAINT "VoiceRecord_sourceEvidenceId_fkey" FOREIGN KEY ("sourceEvidenceId") REFERENCES "Evidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceRecord" ADD CONSTRAINT "VoiceRecord_capturedById_fkey" FOREIGN KEY ("capturedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicensePlateDetection" ADD CONSTRAINT "LicensePlateDetection_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicensePlateDetection" ADD CONSTRAINT "LicensePlateDetection_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicensePlateDetection" ADD CONSTRAINT "LicensePlateDetection_sourceEvidenceId_fkey" FOREIGN KEY ("sourceEvidenceId") REFERENCES "Evidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicensePlateDetection" ADD CONSTRAINT "LicensePlateDetection_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BiometricSearch" ADD CONSTRAINT "BiometricSearch_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BiometricSearch" ADD CONSTRAINT "BiometricSearch_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BiometricSearch" ADD CONSTRAINT "BiometricSearch_topMatchPersonId_fkey" FOREIGN KEY ("topMatchPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BiometricSearch" ADD CONSTRAINT "BiometricSearch_actionById_fkey" FOREIGN KEY ("actionById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BiometricMatch" ADD CONSTRAINT "BiometricMatch_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "BiometricSearch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BiometricMatch" ADD CONSTRAINT "BiometricMatch_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

