-- CreateEnum
CREATE TYPE "PayComponentKind" AS ENUM ('BONUS', 'ALLOWANCE', 'BENEFIT', 'DEDUCTION');

-- CreateEnum
CREATE TYPE "PayCalculation" AS ENUM ('FIXED', 'PERCENT_OF_BASE');

-- CreateEnum
CREATE TYPE "PayApprovalStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED');

-- CreateEnum
CREATE TYPE "PayRunStatus" AS ENUM ('DRAFT', 'VALIDATED');

-- CreateTable
CREATE TABLE "PayComponent" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "PayComponentKind" NOT NULL,
    "calculation" "PayCalculation" NOT NULL DEFAULT 'FIXED',
    "defaultValue" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayScaleEntry" (
    "id" TEXT NOT NULL,
    "rankId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "status" "PayApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "createdById" TEXT,
    "validatedById" TEXT,
    "validatedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayScaleEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfficerPayElement" (
    "id" TEXT NOT NULL,
    "officerId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "value" INTEGER,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "status" "PayApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT NOT NULL,
    "decisionRef" TEXT,
    "requestedById" TEXT,
    "validatedById" TEXT,
    "validatedAt" TIMESTAMP(3),
    "note" TEXT,
    "endReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfficerPayElement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayRun" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "status" "PayRunStatus" NOT NULL DEFAULT 'DRAFT',
    "generatedById" TEXT,
    "validatedById" TEXT,
    "validatedAt" TIMESTAMP(3),
    "exportedAt" TIMESTAMP(3),
    "exportCount" INTEGER NOT NULL DEFAULT 0,
    "officers" INTEGER NOT NULL DEFAULT 0,
    "suspendedCount" INTEGER NOT NULL DEFAULT 0,
    "excludedNoScale" INTEGER NOT NULL DEFAULT 0,
    "excludedStatus" INTEGER NOT NULL DEFAULT 0,
    "totalBase" BIGINT NOT NULL DEFAULT 0,
    "totalGross" BIGINT NOT NULL DEFAULT 0,
    "totalDeductions" BIGINT NOT NULL DEFAULT 0,
    "totalNet" BIGINT NOT NULL DEFAULT 0,
    "suspendedPercent" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayRunLine" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "officerId" TEXT NOT NULL,
    "rankId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "status" "AdministrativeStatus" NOT NULL,
    "base" INTEGER NOT NULL,
    "gross" INTEGER NOT NULL,
    "deductions" INTEGER NOT NULL,
    "net" INTEGER NOT NULL,
    "detail" JSONB NOT NULL,

    CONSTRAINT "PayRunLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PayComponent_code_key" ON "PayComponent"("code");

-- CreateIndex
CREATE INDEX "PayScaleEntry_rankId_status_effectiveFrom_idx" ON "PayScaleEntry"("rankId", "status", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "PayScaleEntry_rankId_effectiveFrom_key" ON "PayScaleEntry"("rankId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "OfficerPayElement_officerId_status_idx" ON "OfficerPayElement"("officerId", "status");

-- CreateIndex
CREATE INDEX "OfficerPayElement_status_createdAt_idx" ON "OfficerPayElement"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PayRun_period_key" ON "PayRun"("period");

-- CreateIndex
CREATE INDEX "PayRunLine_officerId_idx" ON "PayRunLine"("officerId");

-- CreateIndex
CREATE INDEX "PayRunLine_runId_rankId_idx" ON "PayRunLine"("runId", "rankId");

-- CreateIndex
CREATE INDEX "PayRunLine_runId_regionId_idx" ON "PayRunLine"("runId", "regionId");

-- CreateIndex
CREATE UNIQUE INDEX "PayRunLine_runId_officerId_key" ON "PayRunLine"("runId", "officerId");

-- AddForeignKey
ALTER TABLE "PayScaleEntry" ADD CONSTRAINT "PayScaleEntry_rankId_fkey" FOREIGN KEY ("rankId") REFERENCES "Rank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayScaleEntry" ADD CONSTRAINT "PayScaleEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayScaleEntry" ADD CONSTRAINT "PayScaleEntry_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficerPayElement" ADD CONSTRAINT "OfficerPayElement_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "Officer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficerPayElement" ADD CONSTRAINT "OfficerPayElement_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "PayComponent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficerPayElement" ADD CONSTRAINT "OfficerPayElement_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficerPayElement" ADD CONSTRAINT "OfficerPayElement_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayRun" ADD CONSTRAINT "PayRun_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayRun" ADD CONSTRAINT "PayRun_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayRunLine" ADD CONSTRAINT "PayRunLine_runId_fkey" FOREIGN KEY ("runId") REFERENCES "PayRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayRunLine" ADD CONSTRAINT "PayRunLine_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "Officer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Integrity of the money data -------------------------------------------------------------
ALTER TABLE "PayComponent" ADD CONSTRAINT "PayComponent_value_ok" CHECK ("defaultValue" >= 0 AND ("calculation" <> 'PERCENT_OF_BASE' OR "defaultValue" <= 100));
ALTER TABLE "PayScaleEntry" ADD CONSTRAINT "PayScaleEntry_amount_ok" CHECK ("amount" > 0);
ALTER TABLE "OfficerPayElement" ADD CONSTRAINT "OfficerPayElement_value_ok" CHECK (("value" IS NULL OR "value" >= 0) AND ("endDate" IS NULL OR "endDate" >= "startDate"));
ALTER TABLE "PayRunLine" ADD CONSTRAINT "PayRunLine_amounts_ok" CHECK ("base" >= 0 AND "gross" >= 0 AND "deductions" >= 0 AND "net" = "gross" - "deductions");

-- A scale entry can only be decided while PENDING; it is never deleted and its amount never changes.
CREATE OR REPLACE FUNCTION pms_pay_scale_guard() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Table PayScaleEntry is append-only: DELETE is not allowed' USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  IF OLD."status" <> 'PENDING' THEN
    RAISE EXCEPTION 'A decided pay scale entry cannot be modified' USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  IF NEW."amount" <> OLD."amount" OR NEW."rankId" <> OLD."rankId" OR NEW."effectiveFrom" <> OLD."effectiveFrom" THEN
    RAISE EXCEPTION 'The amount, rank and date of a pay scale entry cannot be modified' USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER pay_scale_guard BEFORE UPDATE OR DELETE ON "PayScaleEntry" FOR EACH ROW EXECUTE FUNCTION pms_pay_scale_guard();

-- A validated pay statement is frozen (only the export counters move); it is never deleted.
CREATE OR REPLACE FUNCTION pms_pay_run_guard() RETURNS trigger AS $$
BEGIN
  IF OLD."status" = 'VALIDATED' THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'A validated pay statement cannot be deleted' USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    IF NEW."status" <> OLD."status" OR NEW."period" <> OLD."period" OR NEW."totalBase" <> OLD."totalBase" OR NEW."totalGross" <> OLD."totalGross" OR NEW."totalDeductions" <> OLD."totalDeductions" OR NEW."totalNet" <> OLD."totalNet" OR NEW."officers" <> OLD."officers" OR NEW."validatedById" IS DISTINCT FROM OLD."validatedById" THEN
      RAISE EXCEPTION 'A validated pay statement is frozen' USING ERRCODE = 'integrity_constraint_violation';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER pay_run_guard BEFORE UPDATE OR DELETE ON "PayRun" FOR EACH ROW EXECUTE FUNCTION pms_pay_run_guard();

CREATE OR REPLACE FUNCTION pms_pay_line_guard() RETURNS trigger AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "PayRun" WHERE "id" = OLD."runId" AND "status" = 'VALIDATED') THEN
    RAISE EXCEPTION 'The lines of a validated pay statement are frozen' USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER pay_line_guard BEFORE UPDATE OR DELETE ON "PayRunLine" FOR EACH ROW EXECUTE FUNCTION pms_pay_line_guard();

-- Templates of the pay-element referential. Amounts are deliberately 0: they are decided by the Direction, not by the software.
INSERT INTO "PayComponent" ("id", "code", "name", "kind", "calculation", "defaultValue", "description") VALUES
  ('pc_prime_risque', 'PRIME_RISQUE', 'Prime de risque', 'BONUS', 'PERCENT_OF_BASE', 0, 'Modèle à paramétrer par la Direction'),
  ('pc_prime_sujetion', 'PRIME_SUJETION', 'Prime de sujétion', 'BONUS', 'PERCENT_OF_BASE', 0, 'Modèle à paramétrer par la Direction'),
  ('pc_ind_logement', 'IND_LOGEMENT', 'Indemnité de logement', 'ALLOWANCE', 'FIXED', 0, 'Modèle à paramétrer par la Direction'),
  ('pc_ind_transport', 'IND_TRANSPORT', 'Indemnité de transport', 'ALLOWANCE', 'FIXED', 0, 'Modèle à paramétrer par la Direction'),
  ('pc_av_logement', 'AV_LOGEMENT', 'Logement de fonction (avantage en nature)', 'BENEFIT', 'FIXED', 0, 'Modèle à paramétrer par la Direction'),
  ('pc_ret_retraite', 'RET_RETRAITE', 'Retenue pour pension', 'DEDUCTION', 'PERCENT_OF_BASE', 0, 'Modèle à paramétrer par la Direction')
ON CONFLICT ("code") DO NOTHING;
