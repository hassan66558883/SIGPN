-- CreateEnum
CREATE TYPE "TrafficOnlinePaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'EXPIRED');

-- CreateTable
CREATE TABLE "TrafficOnlinePayment" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "fineId" TEXT NOT NULL,
    "amountFcfa" INTEGER NOT NULL,
    "method" "TrafficPaymentMethod" NOT NULL,
    "provider" TEXT NOT NULL,
    "providerReference" TEXT,
    "accessHash" TEXT NOT NULL,
    "payerPhoneMasked" TEXT,
    "status" "TrafficOnlinePaymentStatus" NOT NULL DEFAULT 'PENDING',
    "failureReason" TEXT,
    "paymentId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrafficOnlinePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrafficPaymentEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "onlineId" TEXT,
    "outcome" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrafficPaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrafficOnlinePayment_number_key" ON "TrafficOnlinePayment"("number");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficOnlinePayment_paymentId_key" ON "TrafficOnlinePayment"("paymentId");

-- CreateIndex
CREATE INDEX "TrafficOnlinePayment_fineId_idx" ON "TrafficOnlinePayment"("fineId");

-- CreateIndex
CREATE INDEX "TrafficOnlinePayment_status_createdAt_idx" ON "TrafficOnlinePayment"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficOnlinePayment_provider_providerReference_key" ON "TrafficOnlinePayment"("provider", "providerReference");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficPaymentEvent_provider_eventId_key" ON "TrafficPaymentEvent"("provider", "eventId");

-- AddForeignKey
ALTER TABLE "TrafficOnlinePayment" ADD CONSTRAINT "TrafficOnlinePayment_fineId_fkey" FOREIGN KEY ("fineId") REFERENCES "TrafficFine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficOnlinePayment" ADD CONSTRAINT "TrafficOnlinePayment_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "TrafficPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficPaymentEvent" ADD CONSTRAINT "TrafficPaymentEvent_onlineId_fkey" FOREIGN KEY ("onlineId") REFERENCES "TrafficOnlinePayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- An online payment is always for a positive amount.
ALTER TABLE "TrafficOnlinePayment" ADD CONSTRAINT "TrafficOnlinePayment_amount_positive" CHECK ("amountFcfa" > 0);
