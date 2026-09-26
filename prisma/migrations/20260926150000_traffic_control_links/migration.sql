-- AlterTable
ALTER TABLE "TrafficControl" ADD COLUMN     "caseId" TEXT,
ADD COLUMN     "incidentId" TEXT;

-- AddForeignKey
ALTER TABLE "TrafficControl" ADD CONSTRAINT "TrafficControl_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficControl" ADD CONSTRAINT "TrafficControl_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

