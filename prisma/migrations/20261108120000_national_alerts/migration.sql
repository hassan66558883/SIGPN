-- National alert network (SIGPN-T v2.0, section 5). Additive only.
-- Rollback: DROP TABLE "AlertDelivery", "StationPresence", "NationalAlert"; ALTER TABLE "WantedPerson" DROP COLUMN "diffusionLevel"; DROP TYPE "AlertDeliveryStatus", "AlertKind", "WantedDiffusion".

CREATE TYPE "WantedDiffusion" AS ENUM ('NATIONAL', 'REGIONAL', 'LOCAL');
CREATE TYPE "AlertKind" AS ENUM ('PUBLISHED', 'UPDATED', 'SUSPENDED', 'REACTIVATED', 'WITHDRAWN', 'EXPIRED', 'CLOSED');
CREATE TYPE "AlertDeliveryStatus" AS ENUM ('PENDING', 'DELIVERED', 'READ', 'ACKNOWLEDGED', 'FAILED');

ALTER TABLE "WantedPerson" ADD COLUMN "diffusionLevel" "WantedDiffusion" NOT NULL DEFAULT 'NATIONAL';

CREATE TABLE "NationalAlert" (
  "id" TEXT NOT NULL,
  "seq" SERIAL NOT NULL,
  "number" TEXT NOT NULL,
  "kind" "AlertKind" NOT NULL,
  "wantedPersonId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "diffusion" "WantedDiffusion" NOT NULL,
  "sourceStationId" TEXT NOT NULL,
  "sourceRegionId" TEXT NOT NULL,
  "priority" "DangerLevel" NOT NULL DEFAULT 'MEDIUM',
  "title" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "requiresAck" BOOLEAN NOT NULL DEFAULT true,
  "isSimulation" BOOLEAN NOT NULL DEFAULT false,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NationalAlert_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NationalAlert_seq_key" ON "NationalAlert"("seq");
CREATE UNIQUE INDEX "NationalAlert_number_key" ON "NationalAlert"("number");
CREATE UNIQUE INDEX "NationalAlert_idempotencyKey_key" ON "NationalAlert"("idempotencyKey");
CREATE INDEX "NationalAlert_wantedPersonId_seq_idx" ON "NationalAlert"("wantedPersonId", "seq");
CREATE INDEX "NationalAlert_createdAt_idx" ON "NationalAlert"("createdAt");
ALTER TABLE "NationalAlert" ADD CONSTRAINT "NationalAlert_wantedPersonId_fkey" FOREIGN KEY ("wantedPersonId") REFERENCES "WantedPerson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TRIGGER national_alert_immutable
  BEFORE UPDATE OR DELETE ON "NationalAlert"
  FOR EACH ROW EXECUTE FUNCTION pms_forbid_mutation();

CREATE TABLE "AlertDelivery" (
  "id" TEXT NOT NULL,
  "alertId" TEXT NOT NULL,
  "stationId" TEXT NOT NULL,
  "status" "AlertDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "deliveredById" TEXT,
  "readAt" TIMESTAMP(3),
  "readById" TEXT,
  "ackAt" TIMESTAMP(3),
  "ackById" TEXT,
  "escalatedAt" TIMESTAMP(3),
  "escalationLevel" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AlertDelivery_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AlertDelivery_alertId_stationId_key" ON "AlertDelivery"("alertId", "stationId");
CREATE INDEX "AlertDelivery_stationId_status_idx" ON "AlertDelivery"("stationId", "status");
CREATE INDEX "AlertDelivery_status_nextAttemptAt_idx" ON "AlertDelivery"("status", "nextAttemptAt");
ALTER TABLE "AlertDelivery" ADD CONSTRAINT "AlertDelivery_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "NationalAlert"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AlertDelivery" ADD CONSTRAINT "AlertDelivery_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "StationPresence" (
  "stationId" TEXT NOT NULL,
  "lastSeenAt" TIMESTAMP(3) NOT NULL,
  "lastSyncAt" TIMESTAMP(3),
  "lastUserId" TEXT,
  "simulatedOffline" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "StationPresence_pkey" PRIMARY KEY ("stationId")
);
ALTER TABLE "StationPresence" ADD CONSTRAINT "StationPresence_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
