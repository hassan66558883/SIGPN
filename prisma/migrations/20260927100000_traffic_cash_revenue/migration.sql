-- CreateEnum
CREATE TYPE "TrafficCashRegisterStatus" AS ENUM ('OPEN', 'CLOSED', 'PENDING_DEPOSIT', 'DEPOSITED', 'VALIDATED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "TrafficCollectionStatus" AS ENUM ('TO_DEPOSIT', 'PARTIALLY_DEPOSITED', 'DEPOSITED', 'VALIDATED');

-- CreateEnum
CREATE TYPE "TrafficDepositStatus" AS ENUM ('SUBMITTED', 'VERIFIED', 'JUSTIFICATION_REQUESTED', 'VALIDATED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TrafficDepositMethod" AS ENUM ('BANK', 'TREASURY', 'CENTRAL_CASH', 'MOBILE_MONEY', 'OTHER');

-- CreateEnum
CREATE TYPE "TrafficReconciliationStatus" AS ENUM ('PENDING', 'CONFORME', 'GAP_TO_JUSTIFY', 'VALIDATED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TrafficDiscrepancyStatus" AS ENUM ('OPEN', 'JUSTIFIED', 'VALIDATED', 'REJECTED');

-- AlterEnum
ALTER TYPE "DocumentEntity" ADD VALUE 'TRAFFIC_DEPOSIT';

-- CreateTable
CREATE TABLE "TrafficCashRegister" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "agentBadge" TEXT,
    "stationId" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "status" "TrafficCashRegisterStatus" NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openingBalanceFcfa" INTEGER NOT NULL DEFAULT 0,
    "closedAt" TIMESTAMP(3),
    "closedById" TEXT,
    "blockedAt" TIMESTAMP(3),
    "blockedById" TEXT,
    "blockReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrafficCashRegister_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrafficCashTransaction" (
    "id" TEXT NOT NULL,
    "registerId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "amountFcfa" INTEGER NOT NULL,
    "method" "TrafficPaymentMethod" NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voidedAt" TIMESTAMP(3),

    CONSTRAINT "TrafficCashTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrafficDailyClosure" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "registerId" TEXT NOT NULL,
    "paymentsCount" INTEGER NOT NULL,
    "finesTotalFcfa" INTEGER NOT NULL,
    "collectedFcfa" INTEGER NOT NULL,
    "cashFcfa" INTEGER NOT NULL,
    "electronicFcfa" INTEGER NOT NULL,
    "mobileMoneyFcfa" INTEGER NOT NULL,
    "otherFcfa" INTEGER NOT NULL,
    "amountToDepositFcfa" INTEGER NOT NULL,
    "receiptNumbers" JSONB NOT NULL,
    "ticketNumbers" JSONB NOT NULL,
    "closedById" TEXT NOT NULL,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "TrafficDailyClosure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrafficRevenueCollection" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "registerId" TEXT NOT NULL,
    "closureId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "collectedFcfa" INTEGER NOT NULL,
    "depositedFcfa" INTEGER NOT NULL DEFAULT 0,
    "validatedFcfa" INTEGER NOT NULL DEFAULT 0,
    "status" "TrafficCollectionStatus" NOT NULL DEFAULT 'TO_DEPOSIT',
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrafficRevenueCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrafficDeposit" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "registerId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "agentBadge" TEXT,
    "stationId" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "collectedFcfa" INTEGER NOT NULL,
    "amountDueFcfa" INTEGER NOT NULL,
    "amountDepositedFcfa" INTEGER NOT NULL,
    "method" "TrafficDepositMethod" NOT NULL,
    "slipNumber" TEXT,
    "reference" TEXT,
    "recipient" TEXT,
    "depositedAt" TIMESTAMP(3) NOT NULL,
    "depositedById" TEXT NOT NULL,
    "receivedById" TEXT,
    "observations" TEXT,
    "attachmentDocumentId" TEXT,
    "status" "TrafficDepositStatus" NOT NULL DEFAULT 'SUBMITTED',
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "previousDepositId" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "validatedById" TEXT,
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrafficDeposit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrafficDepositItem" (
    "id" TEXT NOT NULL,
    "depositId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "amountFcfa" INTEGER NOT NULL,

    CONSTRAINT "TrafficDepositItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrafficDepositReceipt" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "verificationToken" TEXT NOT NULL,
    "depositId" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issuedById" TEXT NOT NULL,

    CONSTRAINT "TrafficDepositReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrafficReconciliation" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "collectedFcfa" INTEGER NOT NULL,
    "depositedFcfa" INTEGER NOT NULL,
    "validatedFcfa" INTEGER NOT NULL,
    "gapFcfa" INTEGER NOT NULL,
    "status" "TrafficReconciliationStatus" NOT NULL DEFAULT 'PENDING',
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "note" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrafficReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrafficCashDiscrepancy" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "reconciliationId" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "registerId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "amountFcfa" INTEGER NOT NULL,
    "reason" TEXT,
    "justification" TEXT,
    "attachmentDocumentId" TEXT,
    "status" "TrafficDiscrepancyStatus" NOT NULL DEFAULT 'OPEN',
    "validatedById" TEXT,
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrafficCashDiscrepancy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrafficCashRegister_number_key" ON "TrafficCashRegister"("number");

-- CreateIndex
CREATE INDEX "TrafficCashRegister_agentId_status_idx" ON "TrafficCashRegister"("agentId", "status");

-- CreateIndex
CREATE INDEX "TrafficCashRegister_stationId_openedAt_idx" ON "TrafficCashRegister"("stationId", "openedAt");

-- CreateIndex
CREATE INDEX "TrafficCashRegister_regionId_openedAt_idx" ON "TrafficCashRegister"("regionId", "openedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficCashTransaction_paymentId_key" ON "TrafficCashTransaction"("paymentId");

-- CreateIndex
CREATE INDEX "TrafficCashTransaction_registerId_idx" ON "TrafficCashTransaction"("registerId");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficDailyClosure_number_key" ON "TrafficDailyClosure"("number");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficDailyClosure_registerId_key" ON "TrafficDailyClosure"("registerId");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficRevenueCollection_number_key" ON "TrafficRevenueCollection"("number");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficRevenueCollection_registerId_key" ON "TrafficRevenueCollection"("registerId");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficRevenueCollection_closureId_key" ON "TrafficRevenueCollection"("closureId");

-- CreateIndex
CREATE INDEX "TrafficRevenueCollection_stationId_createdAt_idx" ON "TrafficRevenueCollection"("stationId", "createdAt");

-- CreateIndex
CREATE INDEX "TrafficRevenueCollection_regionId_createdAt_idx" ON "TrafficRevenueCollection"("regionId", "createdAt");

-- CreateIndex
CREATE INDEX "TrafficRevenueCollection_agentId_idx" ON "TrafficRevenueCollection"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficDeposit_number_key" ON "TrafficDeposit"("number");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficDeposit_attachmentDocumentId_key" ON "TrafficDeposit"("attachmentDocumentId");

-- CreateIndex
CREATE INDEX "TrafficDeposit_collectionId_idx" ON "TrafficDeposit"("collectionId");

-- CreateIndex
CREATE INDEX "TrafficDeposit_status_idx" ON "TrafficDeposit"("status");

-- CreateIndex
CREATE INDEX "TrafficDeposit_stationId_depositedAt_idx" ON "TrafficDeposit"("stationId", "depositedAt");

-- CreateIndex
CREATE INDEX "TrafficDeposit_regionId_depositedAt_idx" ON "TrafficDeposit"("regionId", "depositedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficDepositItem_depositId_paymentId_key" ON "TrafficDepositItem"("depositId", "paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficDepositReceipt_number_key" ON "TrafficDepositReceipt"("number");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficDepositReceipt_verificationToken_key" ON "TrafficDepositReceipt"("verificationToken");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficDepositReceipt_depositId_key" ON "TrafficDepositReceipt"("depositId");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficReconciliation_number_key" ON "TrafficReconciliation"("number");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficReconciliation_collectionId_key" ON "TrafficReconciliation"("collectionId");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficCashDiscrepancy_number_key" ON "TrafficCashDiscrepancy"("number");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficCashDiscrepancy_attachmentDocumentId_key" ON "TrafficCashDiscrepancy"("attachmentDocumentId");

-- CreateIndex
CREATE INDEX "TrafficCashDiscrepancy_status_idx" ON "TrafficCashDiscrepancy"("status");

-- CreateIndex
CREATE INDEX "TrafficCashDiscrepancy_agentId_idx" ON "TrafficCashDiscrepancy"("agentId");

-- AddForeignKey
ALTER TABLE "TrafficCashRegister" ADD CONSTRAINT "TrafficCashRegister_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficCashRegister" ADD CONSTRAINT "TrafficCashRegister_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficCashRegister" ADD CONSTRAINT "TrafficCashRegister_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficCashRegister" ADD CONSTRAINT "TrafficCashRegister_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficCashRegister" ADD CONSTRAINT "TrafficCashRegister_blockedById_fkey" FOREIGN KEY ("blockedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficCashTransaction" ADD CONSTRAINT "TrafficCashTransaction_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "TrafficCashRegister"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficCashTransaction" ADD CONSTRAINT "TrafficCashTransaction_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "TrafficPayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficDailyClosure" ADD CONSTRAINT "TrafficDailyClosure_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "TrafficCashRegister"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficDailyClosure" ADD CONSTRAINT "TrafficDailyClosure_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficRevenueCollection" ADD CONSTRAINT "TrafficRevenueCollection_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "TrafficCashRegister"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficRevenueCollection" ADD CONSTRAINT "TrafficRevenueCollection_closureId_fkey" FOREIGN KEY ("closureId") REFERENCES "TrafficDailyClosure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficRevenueCollection" ADD CONSTRAINT "TrafficRevenueCollection_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficRevenueCollection" ADD CONSTRAINT "TrafficRevenueCollection_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficRevenueCollection" ADD CONSTRAINT "TrafficRevenueCollection_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficRevenueCollection" ADD CONSTRAINT "TrafficRevenueCollection_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficDeposit" ADD CONSTRAINT "TrafficDeposit_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "TrafficRevenueCollection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficDeposit" ADD CONSTRAINT "TrafficDeposit_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "TrafficCashRegister"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficDeposit" ADD CONSTRAINT "TrafficDeposit_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficDeposit" ADD CONSTRAINT "TrafficDeposit_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficDeposit" ADD CONSTRAINT "TrafficDeposit_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficDeposit" ADD CONSTRAINT "TrafficDeposit_depositedById_fkey" FOREIGN KEY ("depositedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficDeposit" ADD CONSTRAINT "TrafficDeposit_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficDeposit" ADD CONSTRAINT "TrafficDeposit_attachmentDocumentId_fkey" FOREIGN KEY ("attachmentDocumentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficDeposit" ADD CONSTRAINT "TrafficDeposit_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficDeposit" ADD CONSTRAINT "TrafficDeposit_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficDepositItem" ADD CONSTRAINT "TrafficDepositItem_depositId_fkey" FOREIGN KEY ("depositId") REFERENCES "TrafficDeposit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficDepositItem" ADD CONSTRAINT "TrafficDepositItem_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "TrafficPayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficDepositReceipt" ADD CONSTRAINT "TrafficDepositReceipt_depositId_fkey" FOREIGN KEY ("depositId") REFERENCES "TrafficDeposit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficDepositReceipt" ADD CONSTRAINT "TrafficDepositReceipt_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficReconciliation" ADD CONSTRAINT "TrafficReconciliation_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "TrafficRevenueCollection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficReconciliation" ADD CONSTRAINT "TrafficReconciliation_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficCashDiscrepancy" ADD CONSTRAINT "TrafficCashDiscrepancy_reconciliationId_fkey" FOREIGN KEY ("reconciliationId") REFERENCES "TrafficReconciliation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficCashDiscrepancy" ADD CONSTRAINT "TrafficCashDiscrepancy_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "TrafficRevenueCollection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficCashDiscrepancy" ADD CONSTRAINT "TrafficCashDiscrepancy_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "TrafficCashRegister"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficCashDiscrepancy" ADD CONSTRAINT "TrafficCashDiscrepancy_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficCashDiscrepancy" ADD CONSTRAINT "TrafficCashDiscrepancy_attachmentDocumentId_fkey" FOREIGN KEY ("attachmentDocumentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficCashDiscrepancy" ADD CONSTRAINT "TrafficCashDiscrepancy_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ===== integrity rules (financial records are never deleted, closed registers take no new operation)
CREATE UNIQUE INDEX "TrafficCashRegister_one_open_per_agent" ON "TrafficCashRegister"("agentId") WHERE status = 'OPEN';

CREATE TRIGGER traffic_cash_register_no_delete BEFORE DELETE ON "TrafficCashRegister" FOR EACH ROW EXECUTE FUNCTION pms_forbid_delete();
CREATE TRIGGER traffic_cash_tx_no_delete BEFORE DELETE ON "TrafficCashTransaction" FOR EACH ROW EXECUTE FUNCTION pms_forbid_delete();
CREATE TRIGGER traffic_collection_no_delete BEFORE DELETE ON "TrafficRevenueCollection" FOR EACH ROW EXECUTE FUNCTION pms_forbid_delete();
CREATE TRIGGER traffic_deposit_no_delete BEFORE DELETE ON "TrafficDeposit" FOR EACH ROW EXECUTE FUNCTION pms_forbid_delete();
CREATE TRIGGER traffic_reconciliation_no_delete BEFORE DELETE ON "TrafficReconciliation" FOR EACH ROW EXECUTE FUNCTION pms_forbid_delete();
CREATE TRIGGER traffic_discrepancy_no_delete BEFORE DELETE ON "TrafficCashDiscrepancy" FOR EACH ROW EXECUTE FUNCTION pms_forbid_delete();
CREATE TRIGGER traffic_daily_closure_append_only BEFORE UPDATE OR DELETE ON "TrafficDailyClosure" FOR EACH ROW EXECUTE FUNCTION pms_forbid_mutation();
CREATE TRIGGER traffic_deposit_item_append_only BEFORE UPDATE OR DELETE ON "TrafficDepositItem" FOR EACH ROW EXECUTE FUNCTION pms_forbid_mutation();
CREATE TRIGGER traffic_deposit_receipt_append_only BEFORE UPDATE OR DELETE ON "TrafficDepositReceipt" FOR EACH ROW EXECUTE FUNCTION pms_forbid_mutation();

-- a closed / blocked register receives no new operation, whatever the caller
CREATE OR REPLACE FUNCTION traffic_cash_tx_guard() RETURNS trigger AS $$
DECLARE reg_status "TrafficCashRegisterStatus";
BEGIN
  SELECT status INTO reg_status FROM "TrafficCashRegister" WHERE id = NEW."registerId";
  IF reg_status IS DISTINCT FROM 'OPEN' THEN
    RAISE EXCEPTION 'cash register is not open: no operation can be added' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER traffic_cash_tx_guard BEFORE INSERT ON "TrafficCashTransaction" FOR EACH ROW EXECUTE FUNCTION traffic_cash_tx_guard();

-- a transaction row may only be voided (voidedAt set) while its register is open; nothing else about it can change
CREATE OR REPLACE FUNCTION traffic_cash_tx_update_guard() RETURNS trigger AS $$
DECLARE reg_status "TrafficCashRegisterStatus";
BEGIN
  IF NEW."registerId" <> OLD."registerId" OR NEW."paymentId" <> OLD."paymentId" OR NEW."amountFcfa" <> OLD."amountFcfa" OR NEW.method <> OLD.method THEN
    RAISE EXCEPTION 'cash register transactions are immutable' USING ERRCODE = 'check_violation';
  END IF;
  SELECT status INTO reg_status FROM "TrafficCashRegister" WHERE id = OLD."registerId";
  IF reg_status IS DISTINCT FROM 'OPEN' THEN
    RAISE EXCEPTION 'cash register is not open: the operation cannot be modified' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER traffic_cash_tx_update_guard BEFORE UPDATE ON "TrafficCashTransaction" FOR EACH ROW EXECUTE FUNCTION traffic_cash_tx_update_guard();

ALTER TABLE "TrafficCashTransaction" ADD CONSTRAINT traffic_cash_tx_amount_ck CHECK ("amountFcfa" > 0);
ALTER TABLE "TrafficRevenueCollection" ADD CONSTRAINT traffic_collection_amounts_ck CHECK ("collectedFcfa" >= 0 AND "depositedFcfa" >= 0 AND "depositedFcfa" <= "collectedFcfa" AND "validatedFcfa" >= 0 AND "validatedFcfa" <= "depositedFcfa");
ALTER TABLE "TrafficDeposit" ADD CONSTRAINT traffic_deposit_amount_ck CHECK ("amountDepositedFcfa" > 0 AND "amountDepositedFcfa" <= "amountDueFcfa");
ALTER TABLE "TrafficCashDiscrepancy" ADD CONSTRAINT traffic_discrepancy_amount_ck CHECK ("amountFcfa" > 0);
