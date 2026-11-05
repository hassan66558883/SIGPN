-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PROPOSED', 'HR_APPROVED', 'APPROVED', 'EXECUTED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransferOrigin" AS ENUM ('MANUAL', 'AUTOMATIC');

-- CreateTable
CREATE TABLE "TransferRequest" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "officerId" TEXT NOT NULL,
    "fromStationId" TEXT NOT NULL,
    "fromDepartmentId" TEXT,
    "toStationId" TEXT NOT NULL,
    "toDepartmentId" TEXT,
    "toPositionId" TEXT,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "origin" "TransferOrigin" NOT NULL DEFAULT 'MANUAL',
    "status" "TransferStatus" NOT NULL DEFAULT 'PROPOSED',
    "proposedById" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "validatedById" TEXT,
    "validatedAt" TIMESTAMP(3),
    "validationNote" TEXT,
    "decisionNumber" TEXT,
    "executedAt" TIMESTAMP(3),
    "closeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransferRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TransferRequest_number_key" ON "TransferRequest"("number");

-- CreateIndex
CREATE UNIQUE INDEX "TransferRequest_decisionNumber_key" ON "TransferRequest"("decisionNumber");

-- CreateIndex
CREATE INDEX "TransferRequest_officerId_idx" ON "TransferRequest"("officerId");

-- CreateIndex
CREATE INDEX "TransferRequest_status_createdAt_idx" ON "TransferRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "TransferRequest_fromStationId_idx" ON "TransferRequest"("fromStationId");

-- CreateIndex
CREATE INDEX "TransferRequest_toStationId_idx" ON "TransferRequest"("toStationId");

-- AddForeignKey
ALTER TABLE "TransferRequest" ADD CONSTRAINT "TransferRequest_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "Officer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferRequest" ADD CONSTRAINT "TransferRequest_fromStationId_fkey" FOREIGN KEY ("fromStationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferRequest" ADD CONSTRAINT "TransferRequest_toStationId_fkey" FOREIGN KEY ("toStationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferRequest" ADD CONSTRAINT "TransferRequest_proposedById_fkey" FOREIGN KEY ("proposedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferRequest" ADD CONSTRAINT "TransferRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferRequest" ADD CONSTRAINT "TransferRequest_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- At most one open (not yet executed/closed) transfer per officer.
CREATE UNIQUE INDEX "TransferRequest_one_open_per_officer" ON "TransferRequest"("officerId") WHERE "status" IN ('PROPOSED', 'HR_APPROVED', 'APPROVED');

-- An executed transfer must carry its decision number and validator; a transfer is never deleted.
ALTER TABLE "TransferRequest" ADD CONSTRAINT "TransferRequest_executed_has_decision" CHECK ("status" <> 'EXECUTED' OR ("decisionNumber" IS NOT NULL AND "validatedById" IS NOT NULL));
ALTER TABLE "TransferRequest" ADD CONSTRAINT "TransferRequest_approved_has_decision" CHECK ("status" NOT IN ('APPROVED', 'EXECUTED') OR "decisionNumber" IS NOT NULL);
CREATE TRIGGER transfer_request_no_delete BEFORE DELETE ON "TransferRequest" FOR EACH ROW EXECUTE FUNCTION pms_forbid_mutation();
