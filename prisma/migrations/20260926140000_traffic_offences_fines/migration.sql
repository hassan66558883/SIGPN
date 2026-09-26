-- CreateEnum
CREATE TYPE "TrafficOffenceClass" AS ENUM ('CLASS_2', 'CLASS_3', 'CLASS_4', 'DELIT');

-- CreateEnum
CREATE TYPE "TrafficVehicleType" AS ENUM ('CAR', 'PICKUP', 'MOTORCYCLE', 'MOTO_TAXI', 'TRICYCLE', 'CYCLE', 'MINIBUS', 'BUS', 'TRUCK', 'TRACTOR_TRAILER', 'OTHER');

-- CreateEnum
CREATE TYPE "TrafficVehicleStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'SEIZED', 'STOLEN', 'SCRAPPED');

-- CreateEnum
CREATE TYPE "TrafficVehicleDocType" AS ENUM ('REGISTRATION_CARD', 'INSURANCE', 'TECHNICAL_INSPECTION', 'BLUE_CARD', 'TRANSPORT_LICENSE', 'STICKER', 'OTHER');

-- CreateEnum
CREATE TYPE "TrafficControlOutcome" AS ENUM ('COMPLIANT', 'INFRACTION');

-- CreateEnum
CREATE TYPE "TrafficTicketStatus" AS ENUM ('ISSUED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TrafficFineStatus" AS ENUM ('PENDING', 'TO_PAY', 'PARTIALLY_PAID', 'PAID', 'CONTESTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TrafficPaymentMethod" AS ENUM ('CASH', 'ELECTRONIC', 'MOBILE_MONEY', 'BANK_TRANSFER', 'OTHER');

-- CreateEnum
CREATE TYPE "TrafficPaymentStatus" AS ENUM ('COMPLETED', 'VOIDED');

-- CreateEnum
CREATE TYPE "TrafficEvidenceKind" AS ENUM ('PHOTO', 'VIDEO', 'DOCUMENT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DocumentEntity" ADD VALUE 'TRAFFIC_CONTROL';
ALTER TYPE "DocumentEntity" ADD VALUE 'TRAFFIC_TICKET';
ALTER TYPE "DocumentEntity" ADD VALUE 'TRAFFIC_DRIVER';
ALTER TYPE "DocumentEntity" ADD VALUE 'TRAFFIC_VEHICLE';

-- CreateTable
CREATE TABLE "TrafficViolationCategory" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceHeading" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrafficViolationCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrafficLegalReference" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrafficLegalReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrafficViolation" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "legalReferenceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "offenceClass" "TrafficOffenceClass" NOT NULL,
    "classText" TEXT NOT NULL,
    "fineAmountFcfa" INTEGER,
    "fineAmountText" TEXT NOT NULL,
    "isFineEligible" BOOLEAN NOT NULL,
    "sourcePage" INTEGER NOT NULL,
    "sourceOrder" INTEGER NOT NULL,
    "sourceNote" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrafficViolation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrafficDriver" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "licenseNumber" TEXT,
    "licenseCategory" TEXT,
    "licenseIssuedAt" TIMESTAMP(3),
    "licenseExpiresAt" TIMESTAMP(3),
    "licenseIssuedBy" TEXT,
    "photoDocumentId" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrafficDriver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrafficVehicle" (
    "id" TEXT NOT NULL,
    "plateNumber" TEXT NOT NULL,
    "registrationCardNumber" TEXT,
    "make" TEXT,
    "model" TEXT,
    "color" TEXT,
    "vehicleType" "TrafficVehicleType" NOT NULL DEFAULT 'CAR',
    "year" INTEGER,
    "ownerPersonId" TEXT,
    "chassisNumber" TEXT,
    "insuranceCompany" TEXT,
    "insurancePolicyNumber" TEXT,
    "insuranceExpiresAt" TIMESTAMP(3),
    "technicalInspectionExpiresAt" TIMESTAMP(3),
    "status" "TrafficVehicleStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrafficVehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrafficVehicleDocument" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "type" "TrafficVehicleDocType" NOT NULL,
    "number" TEXT,
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "documentId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrafficVehicleDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrafficControl" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "controlledAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "stationId" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "officerId" TEXT NOT NULL,
    "driverPersonId" TEXT,
    "driverId" TEXT,
    "licenseNumber" TEXT,
    "vehicleId" TEXT,
    "plateNumber" TEXT,
    "vehicleType" "TrafficVehicleType" NOT NULL DEFAULT 'CAR',
    "vehicleMake" TEXT,
    "vehicleColor" TEXT,
    "outcome" "TrafficControlOutcome" NOT NULL DEFAULT 'COMPLIANT',
    "observations" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrafficControl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrafficTicket" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "verificationToken" TEXT NOT NULL,
    "controlId" TEXT NOT NULL,
    "status" "TrafficTicketStatus" NOT NULL DEFAULT 'ISSUED',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stationId" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "issuedById" TEXT NOT NULL,
    "driverPersonId" TEXT,
    "plateNumber" TEXT,
    "totalFineFcfa" INTEGER NOT NULL,
    "hasNonSettleableOffence" BOOLEAN NOT NULL DEFAULT false,
    "observations" TEXT,
    "contentHash" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),
    "cancelledById" TEXT,
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrafficTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrafficTicketOffence" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "violationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "classText" TEXT NOT NULL,
    "legalReference" TEXT NOT NULL,
    "amountFcfa" INTEGER,
    "amountText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrafficTicketOffence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrafficFine" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "status" "TrafficFineStatus" NOT NULL DEFAULT 'TO_PAY',
    "amountFcfa" INTEGER NOT NULL,
    "amountPaidFcfa" INTEGER NOT NULL DEFAULT 0,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "driverPersonId" TEXT,
    "plateNumber" TEXT,
    "officerId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "contestedAt" TIMESTAMP(3),
    "contestReason" TEXT,
    "statusNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrafficFine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrafficPayment" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "fineId" TEXT NOT NULL,
    "amountFcfa" INTEGER NOT NULL,
    "method" "TrafficPaymentMethod" NOT NULL,
    "provider" TEXT,
    "transactionReference" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "receivedById" TEXT NOT NULL,
    "stationId" TEXT,
    "paymentPoint" TEXT,
    "status" "TrafficPaymentStatus" NOT NULL DEFAULT 'COMPLETED',
    "voidedAt" TIMESTAMP(3),
    "voidedById" TEXT,
    "voidReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrafficPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrafficReceipt" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "verificationToken" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "fineId" TEXT NOT NULL,
    "amountFcfa" INTEGER NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issuedById" TEXT NOT NULL,

    CONSTRAINT "TrafficReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrafficEvidence" (
    "id" TEXT NOT NULL,
    "controlId" TEXT NOT NULL,
    "kind" "TrafficEvidenceKind" NOT NULL DEFAULT 'PHOTO',
    "documentId" TEXT NOT NULL,
    "caption" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "capturedAt" TIMESTAMP(3),
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrafficEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrafficViolationCategory_code_key" ON "TrafficViolationCategory"("code");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficLegalReference_reference_key" ON "TrafficLegalReference"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficViolation_code_key" ON "TrafficViolation"("code");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficViolation_sourceOrder_key" ON "TrafficViolation"("sourceOrder");

-- CreateIndex
CREATE INDEX "TrafficViolation_categoryId_idx" ON "TrafficViolation"("categoryId");

-- CreateIndex
CREATE INDEX "TrafficViolation_offenceClass_idx" ON "TrafficViolation"("offenceClass");

-- CreateIndex
CREATE INDEX "TrafficViolation_name_idx" ON "TrafficViolation"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficDriver_personId_key" ON "TrafficDriver"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficDriver_licenseNumber_key" ON "TrafficDriver"("licenseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficDriver_photoDocumentId_key" ON "TrafficDriver"("photoDocumentId");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficVehicle_plateNumber_key" ON "TrafficVehicle"("plateNumber");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficVehicle_registrationCardNumber_key" ON "TrafficVehicle"("registrationCardNumber");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficVehicle_chassisNumber_key" ON "TrafficVehicle"("chassisNumber");

-- CreateIndex
CREATE INDEX "TrafficVehicle_ownerPersonId_idx" ON "TrafficVehicle"("ownerPersonId");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficVehicleDocument_documentId_key" ON "TrafficVehicleDocument"("documentId");

-- CreateIndex
CREATE INDEX "TrafficVehicleDocument_vehicleId_type_idx" ON "TrafficVehicleDocument"("vehicleId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficControl_number_key" ON "TrafficControl"("number");

-- CreateIndex
CREATE INDEX "TrafficControl_stationId_controlledAt_idx" ON "TrafficControl"("stationId", "controlledAt");

-- CreateIndex
CREATE INDEX "TrafficControl_regionId_controlledAt_idx" ON "TrafficControl"("regionId", "controlledAt");

-- CreateIndex
CREATE INDEX "TrafficControl_officerId_controlledAt_idx" ON "TrafficControl"("officerId", "controlledAt");

-- CreateIndex
CREATE INDEX "TrafficControl_controlledAt_idx" ON "TrafficControl"("controlledAt");

-- CreateIndex
CREATE INDEX "TrafficControl_plateNumber_idx" ON "TrafficControl"("plateNumber");

-- CreateIndex
CREATE INDEX "TrafficControl_driverPersonId_idx" ON "TrafficControl"("driverPersonId");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficTicket_number_key" ON "TrafficTicket"("number");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficTicket_verificationToken_key" ON "TrafficTicket"("verificationToken");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficTicket_controlId_key" ON "TrafficTicket"("controlId");

-- CreateIndex
CREATE INDEX "TrafficTicket_stationId_issuedAt_idx" ON "TrafficTicket"("stationId", "issuedAt");

-- CreateIndex
CREATE INDEX "TrafficTicket_regionId_issuedAt_idx" ON "TrafficTicket"("regionId", "issuedAt");

-- CreateIndex
CREATE INDEX "TrafficTicket_issuedById_issuedAt_idx" ON "TrafficTicket"("issuedById", "issuedAt");

-- CreateIndex
CREATE INDEX "TrafficTicket_plateNumber_idx" ON "TrafficTicket"("plateNumber");

-- CreateIndex
CREATE INDEX "TrafficTicket_driverPersonId_idx" ON "TrafficTicket"("driverPersonId");

-- CreateIndex
CREATE INDEX "TrafficTicketOffence_violationId_idx" ON "TrafficTicketOffence"("violationId");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficTicketOffence_ticketId_violationId_key" ON "TrafficTicketOffence"("ticketId", "violationId");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficFine_number_key" ON "TrafficFine"("number");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficFine_ticketId_key" ON "TrafficFine"("ticketId");

-- CreateIndex
CREATE INDEX "TrafficFine_status_idx" ON "TrafficFine"("status");

-- CreateIndex
CREATE INDEX "TrafficFine_stationId_issuedAt_idx" ON "TrafficFine"("stationId", "issuedAt");

-- CreateIndex
CREATE INDEX "TrafficFine_regionId_issuedAt_idx" ON "TrafficFine"("regionId", "issuedAt");

-- CreateIndex
CREATE INDEX "TrafficFine_driverPersonId_idx" ON "TrafficFine"("driverPersonId");

-- CreateIndex
CREATE INDEX "TrafficFine_plateNumber_idx" ON "TrafficFine"("plateNumber");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficPayment_number_key" ON "TrafficPayment"("number");

-- CreateIndex
CREATE INDEX "TrafficPayment_fineId_idx" ON "TrafficPayment"("fineId");

-- CreateIndex
CREATE INDEX "TrafficPayment_paidAt_idx" ON "TrafficPayment"("paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficPayment_method_transactionReference_key" ON "TrafficPayment"("method", "transactionReference");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficReceipt_number_key" ON "TrafficReceipt"("number");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficReceipt_verificationToken_key" ON "TrafficReceipt"("verificationToken");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficReceipt_paymentId_key" ON "TrafficReceipt"("paymentId");

-- CreateIndex
CREATE INDEX "TrafficReceipt_fineId_idx" ON "TrafficReceipt"("fineId");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficEvidence_documentId_key" ON "TrafficEvidence"("documentId");

-- CreateIndex
CREATE INDEX "TrafficEvidence_controlId_idx" ON "TrafficEvidence"("controlId");

-- AddForeignKey
ALTER TABLE "TrafficViolation" ADD CONSTRAINT "TrafficViolation_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TrafficViolationCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficViolation" ADD CONSTRAINT "TrafficViolation_legalReferenceId_fkey" FOREIGN KEY ("legalReferenceId") REFERENCES "TrafficLegalReference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficDriver" ADD CONSTRAINT "TrafficDriver_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficDriver" ADD CONSTRAINT "TrafficDriver_photoDocumentId_fkey" FOREIGN KEY ("photoDocumentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficDriver" ADD CONSTRAINT "TrafficDriver_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficVehicle" ADD CONSTRAINT "TrafficVehicle_ownerPersonId_fkey" FOREIGN KEY ("ownerPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficVehicle" ADD CONSTRAINT "TrafficVehicle_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficVehicleDocument" ADD CONSTRAINT "TrafficVehicleDocument_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "TrafficVehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficVehicleDocument" ADD CONSTRAINT "TrafficVehicleDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficControl" ADD CONSTRAINT "TrafficControl_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficControl" ADD CONSTRAINT "TrafficControl_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficControl" ADD CONSTRAINT "TrafficControl_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficControl" ADD CONSTRAINT "TrafficControl_driverPersonId_fkey" FOREIGN KEY ("driverPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficControl" ADD CONSTRAINT "TrafficControl_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "TrafficDriver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficControl" ADD CONSTRAINT "TrafficControl_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "TrafficVehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficTicket" ADD CONSTRAINT "TrafficTicket_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "TrafficControl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficTicket" ADD CONSTRAINT "TrafficTicket_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficTicket" ADD CONSTRAINT "TrafficTicket_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficTicket" ADD CONSTRAINT "TrafficTicket_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficTicket" ADD CONSTRAINT "TrafficTicket_driverPersonId_fkey" FOREIGN KEY ("driverPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficTicket" ADD CONSTRAINT "TrafficTicket_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficTicketOffence" ADD CONSTRAINT "TrafficTicketOffence_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "TrafficTicket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficTicketOffence" ADD CONSTRAINT "TrafficTicketOffence_violationId_fkey" FOREIGN KEY ("violationId") REFERENCES "TrafficViolation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficFine" ADD CONSTRAINT "TrafficFine_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "TrafficTicket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficFine" ADD CONSTRAINT "TrafficFine_driverPersonId_fkey" FOREIGN KEY ("driverPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficFine" ADD CONSTRAINT "TrafficFine_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficFine" ADD CONSTRAINT "TrafficFine_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficFine" ADD CONSTRAINT "TrafficFine_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficPayment" ADD CONSTRAINT "TrafficPayment_fineId_fkey" FOREIGN KEY ("fineId") REFERENCES "TrafficFine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficPayment" ADD CONSTRAINT "TrafficPayment_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficPayment" ADD CONSTRAINT "TrafficPayment_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficPayment" ADD CONSTRAINT "TrafficPayment_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficReceipt" ADD CONSTRAINT "TrafficReceipt_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "TrafficPayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficReceipt" ADD CONSTRAINT "TrafficReceipt_fineId_fkey" FOREIGN KEY ("fineId") REFERENCES "TrafficFine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficReceipt" ADD CONSTRAINT "TrafficReceipt_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficEvidence" ADD CONSTRAINT "TrafficEvidence_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "TrafficControl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficEvidence" ADD CONSTRAINT "TrafficEvidence_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficEvidence" ADD CONSTRAINT "TrafficEvidence_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------------------------
-- Integrity protections (SIGPN-T traffic module)
-- PV, fines, payments, receipts, controls, evidence and the frozen offence lines of a PV can never
-- be deleted; receipts and the frozen offence lines can never be modified either. Status changes of
-- tickets / fines / payments remain possible (they are audited) but rows are never removed.
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pms_forbid_delete() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Table % is protected: DELETE is not allowed', TG_TABLE_NAME
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER traffic_control_no_delete BEFORE DELETE ON "TrafficControl" FOR EACH ROW EXECUTE FUNCTION pms_forbid_delete();
CREATE TRIGGER traffic_ticket_no_delete BEFORE DELETE ON "TrafficTicket" FOR EACH ROW EXECUTE FUNCTION pms_forbid_delete();
CREATE TRIGGER traffic_fine_no_delete BEFORE DELETE ON "TrafficFine" FOR EACH ROW EXECUTE FUNCTION pms_forbid_delete();
CREATE TRIGGER traffic_payment_no_delete BEFORE DELETE ON "TrafficPayment" FOR EACH ROW EXECUTE FUNCTION pms_forbid_delete();
CREATE TRIGGER traffic_evidence_no_delete BEFORE DELETE ON "TrafficEvidence" FOR EACH ROW EXECUTE FUNCTION pms_forbid_delete();
CREATE TRIGGER traffic_driver_no_delete BEFORE DELETE ON "TrafficDriver" FOR EACH ROW EXECUTE FUNCTION pms_forbid_delete();
CREATE TRIGGER traffic_vehicle_no_delete BEFORE DELETE ON "TrafficVehicle" FOR EACH ROW EXECUTE FUNCTION pms_forbid_delete();

CREATE TRIGGER traffic_receipt_append_only BEFORE UPDATE OR DELETE ON "TrafficReceipt" FOR EACH ROW EXECUTE FUNCTION pms_forbid_mutation();
CREATE TRIGGER traffic_ticket_offence_append_only BEFORE UPDATE OR DELETE ON "TrafficTicketOffence" FOR EACH ROW EXECUTE FUNCTION pms_forbid_mutation();

-- A fine can never be paid beyond its amount, nor a negative amount recorded.
ALTER TABLE "TrafficFine" ADD CONSTRAINT traffic_fine_amounts_ck CHECK ("amountFcfa" >= 0 AND "amountPaidFcfa" >= 0 AND "amountPaidFcfa" <= "amountFcfa");
ALTER TABLE "TrafficPayment" ADD CONSTRAINT traffic_payment_amount_ck CHECK ("amountFcfa" > 0);
