-- CreateEnum
CREATE TYPE "DisciplineStatus" AS ENUM ('OPEN', 'IN_PROCEDURE', 'DECIDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "DisciplineStepKind" AS ENUM ('NOTIFICATION', 'HEARING', 'REPORT', 'NOTE');

-- CreateEnum
CREATE TYPE "SanctionKind" AS ENUM ('NO_ACTION', 'WARNING', 'REPRIMAND', 'SUSPENSION', 'DISMISSAL');

-- CreateEnum
CREATE TYPE "DistinctionKind" AS ENUM ('COMMENDATION', 'CITATION', 'MEDAL', 'REWARD');

-- CreateEnum
CREATE TYPE "HrDocumentKind" AS ENUM ('ASSIGNMENT_DECISION', 'APPOINTMENT_ORDER', 'TRANSFER_DECISION', 'WORK_CERTIFICATE', 'TRAINING_DOCUMENT', 'ADMIN_FILE', 'DISCIPLINARY_DOCUMENT', 'SERVICE_NOTE');

-- CreateEnum
CREATE TYPE "HrDocumentSource" AS ENUM ('GENERATED', 'UPLOADED');

-- AlterEnum
ALTER TYPE "CareerEventType" ADD VALUE 'SUSPENSION';

-- CreateTable
CREATE TABLE "DisciplinaryCase" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "officerId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "facts" TEXT NOT NULL,
    "factsDate" DATE NOT NULL,
    "status" "DisciplineStatus" NOT NULL DEFAULT 'OPEN',
    "openedById" TEXT,
    "sanction" "SanctionKind",
    "sanctionStart" DATE,
    "sanctionEnd" DATE,
    "sanctionActive" BOOLEAN NOT NULL DEFAULT false,
    "decisionNumber" TEXT,
    "decisionReason" TEXT,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DisciplinaryCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisciplinaryStep" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "kind" "DisciplineStepKind" NOT NULL,
    "date" DATE NOT NULL,
    "note" TEXT NOT NULL,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisciplinaryStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Distinction" (
    "id" TEXT NOT NULL,
    "officerId" TEXT NOT NULL,
    "kind" "DistinctionKind" NOT NULL,
    "title" TEXT NOT NULL,
    "reason" TEXT,
    "reference" TEXT,
    "awardedAt" DATE NOT NULL,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Distinction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrDocument" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "kind" "HrDocumentKind" NOT NULL,
    "title" TEXT NOT NULL,
    "source" "HrDocumentSource" NOT NULL,
    "confidential" BOOLEAN NOT NULL DEFAULT false,
    "officerId" TEXT,
    "stationId" TEXT,
    "relatedType" TEXT,
    "relatedId" TEXT,
    "snapshot" JSONB,
    "storagePath" TEXT,
    "fileName" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "sha256" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HrDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DisciplinaryCase_number_key" ON "DisciplinaryCase"("number");

-- CreateIndex
CREATE UNIQUE INDEX "DisciplinaryCase_decisionNumber_key" ON "DisciplinaryCase"("decisionNumber");

-- CreateIndex
CREATE INDEX "DisciplinaryCase_officerId_idx" ON "DisciplinaryCase"("officerId");

-- CreateIndex
CREATE INDEX "DisciplinaryCase_status_idx" ON "DisciplinaryCase"("status");

-- CreateIndex
CREATE INDEX "DisciplinaryCase_stationId_idx" ON "DisciplinaryCase"("stationId");

-- CreateIndex
CREATE INDEX "DisciplinaryStep_caseId_date_idx" ON "DisciplinaryStep"("caseId", "date");

-- CreateIndex
CREATE INDEX "Distinction_officerId_awardedAt_idx" ON "Distinction"("officerId", "awardedAt");

-- CreateIndex
CREATE UNIQUE INDEX "HrDocument_number_key" ON "HrDocument"("number");

-- CreateIndex
CREATE INDEX "HrDocument_officerId_createdAt_idx" ON "HrDocument"("officerId", "createdAt");

-- CreateIndex
CREATE INDEX "HrDocument_kind_createdAt_idx" ON "HrDocument"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "HrDocument_stationId_idx" ON "HrDocument"("stationId");

-- AddForeignKey
ALTER TABLE "DisciplinaryCase" ADD CONSTRAINT "DisciplinaryCase_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "Officer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisciplinaryCase" ADD CONSTRAINT "DisciplinaryCase_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisciplinaryCase" ADD CONSTRAINT "DisciplinaryCase_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisciplinaryStep" ADD CONSTRAINT "DisciplinaryStep_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "DisciplinaryCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Distinction" ADD CONSTRAINT "Distinction_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "Officer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrDocument" ADD CONSTRAINT "HrDocument_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "Officer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrDocument" ADD CONSTRAINT "HrDocument_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrDocument" ADD CONSTRAINT "HrDocument_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Disciplinary history is never deleted; steps are append-only; a decided case carries its decision number.
CREATE TRIGGER disciplinary_case_no_delete BEFORE DELETE ON "DisciplinaryCase" FOR EACH ROW EXECUTE FUNCTION pms_forbid_mutation();
CREATE TRIGGER disciplinary_step_append_only BEFORE UPDATE OR DELETE ON "DisciplinaryStep" FOR EACH ROW EXECUTE FUNCTION pms_forbid_mutation();
ALTER TABLE "DisciplinaryCase" ADD CONSTRAINT "DisciplinaryCase_decided_has_sanction" CHECK ("status" NOT IN ('DECIDED', 'CLOSED') OR "sanction" IS NULL OR "decisionNumber" IS NOT NULL);
ALTER TABLE "DisciplinaryCase" ADD CONSTRAINT "DisciplinaryCase_suspension_dates" CHECK ("sanction" <> 'SUSPENSION' OR ("sanctionStart" IS NOT NULL AND "sanctionEnd" IS NOT NULL AND "sanctionEnd" >= "sanctionStart"));
-- HR documents are never deleted (generated ones are frozen snapshots).
CREATE TRIGGER hr_document_no_delete BEFORE DELETE ON "HrDocument" FOR EACH ROW EXECUTE FUNCTION pms_forbid_mutation();
ALTER TABLE "HrDocument" ADD CONSTRAINT "HrDocument_has_content" CHECK (("source" = 'GENERATED' AND "snapshot" IS NOT NULL) OR ("source" = 'UPLOADED' AND "storagePath" IS NOT NULL));
