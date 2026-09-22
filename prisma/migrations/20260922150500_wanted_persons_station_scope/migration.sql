-- AlterTable
ALTER TABLE "WantedPerson" ADD COLUMN     "regionId" TEXT NOT NULL,
ADD COLUMN     "stationId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "WantedPerson_stationId_status_idx" ON "WantedPerson"("stationId", "status");

-- CreateIndex
CREATE INDEX "WantedPerson_regionId_idx" ON "WantedPerson"("regionId");

-- AddForeignKey
ALTER TABLE "WantedPerson" ADD CONSTRAINT "WantedPerson_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WantedPerson" ADD CONSTRAINT "WantedPerson_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

