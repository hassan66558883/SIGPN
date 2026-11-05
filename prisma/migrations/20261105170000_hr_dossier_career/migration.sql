-- CreateEnum
CREATE TYPE "AdministrativeStatus" AS ENUM ('ACTIVE', 'SECONDED', 'AT_DISPOSAL', 'SUSPENDED', 'RETIRED', 'CEASED', 'DECEASED');

-- CreateEnum
CREATE TYPE "CareerEventType" AS ENUM ('RECRUITMENT', 'APPOINTMENT', 'PROMOTION', 'ADVANCEMENT', 'FUNCTION_CHANGE', 'TRANSFER', 'SECONDMENT', 'AT_DISPOSAL', 'REINSTATEMENT', 'RETIREMENT', 'CESSATION');

-- AlterEnum
ALTER TYPE "StationType" ADD VALUE 'DELEGATION';

-- AlterTable
ALTER TABLE "Officer" ADD COLUMN     "administrativeStatus" "AdministrativeStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "birthPlace" TEXT,
ADD COLUMN     "corpsId" TEXT,
ADD COLUMN     "currentPostSince" TIMESTAMP(3),
ADD COLUMN     "maritalStatus" "MaritalStatus",
ADD COLUMN     "photoPath" TEXT,
ADD COLUMN     "serviceStartDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Corps" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Corps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareerEvent" (
    "id" TEXT NOT NULL,
    "officerId" TEXT NOT NULL,
    "type" "CareerEventType" NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "reference" TEXT NOT NULL,
    "reason" TEXT,
    "fromRankId" TEXT,
    "toRankId" TEXT,
    "fromPositionId" TEXT,
    "toPositionId" TEXT,
    "fromStationId" TEXT,
    "toStationId" TEXT,
    "fromStatus" "AdministrativeStatus",
    "toStatus" "AdministrativeStatus",
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CareerEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Corps_code_key" ON "Corps"("code");

-- CreateIndex
CREATE INDEX "CareerEvent_officerId_effectiveDate_idx" ON "CareerEvent"("officerId", "effectiveDate");

-- CreateIndex
CREATE INDEX "CareerEvent_type_effectiveDate_idx" ON "CareerEvent"("type", "effectiveDate");

-- AddForeignKey
ALTER TABLE "Officer" ADD CONSTRAINT "Officer_corpsId_fkey" FOREIGN KEY ("corpsId") REFERENCES "Corps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerEvent" ADD CONSTRAINT "CareerEvent_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "Officer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerEvent" ADD CONSTRAINT "CareerEvent_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Career history is append-only (corrections are new events).
CREATE TRIGGER career_event_append_only
  BEFORE UPDATE OR DELETE ON "CareerEvent"
  FOR EACH ROW EXECUTE FUNCTION pms_forbid_mutation();

-- Default corps referential (editable by HR administrators; not an official legal list).
INSERT INTO "Corps" ("id", "code", "name") VALUES
  ('corps_commissaires', 'COMMISSAIRES', 'Corps des commissaires de police'),
  ('corps_officiers', 'OFFICIERS', 'Corps des officiers de police'),
  ('corps_inspecteurs', 'INSPECTEURS', 'Corps des inspecteurs de police'),
  ('corps_grades', 'GRADES', 'Corps des sous-officiers et gradés'),
  ('corps_agents', 'AGENTS', 'Corps des agents et gardiens de la paix'),
  ('corps_civils', 'CIVILS', 'Personnel civil')
ON CONFLICT ("code") DO NOTHING;

-- Backfill from existing data: corps by rank category, service start from the hiring date,
-- date of taking up the current post from the latest open assignment.
UPDATE "Officer" o SET "corpsId" = CASE r."category"
    WHEN 'COMMISSIONER' THEN 'corps_commissaires'
    WHEN 'OFFICER' THEN 'corps_officiers'
    WHEN 'INSPECTOR' THEN 'corps_inspecteurs'
    WHEN 'NON_COMMISSIONED' THEN 'corps_grades'
    WHEN 'CONSTABLE' THEN 'corps_agents'
    ELSE 'corps_civils' END
  FROM "Rank" r WHERE r."id" = o."rankId" AND o."corpsId" IS NULL;

UPDATE "Officer" SET "serviceStartDate" = "hiredAt" WHERE "serviceStartDate" IS NULL AND "hiredAt" IS NOT NULL;

UPDATE "Officer" o SET "currentPostSince" = COALESCE(
    (SELECT max(a."startDate") FROM "OfficerAssignment" a WHERE a."officerId" = o."id" AND a."endDate" IS NULL),
    o."hiredAt");

UPDATE "Officer" SET "administrativeStatus" = CASE "dutyStatus"
    WHEN 'SUSPENDED' THEN 'SUSPENDED'::"AdministrativeStatus"
    WHEN 'RETIRED' THEN 'RETIRED'::"AdministrativeStatus"
    WHEN 'DECEASED' THEN 'DECEASED'::"AdministrativeStatus"
    ELSE 'ACTIVE'::"AdministrativeStatus" END;

-- One RECRUITMENT event per existing officer that has a hiring date.
INSERT INTO "CareerEvent" ("id", "officerId", "type", "effectiveDate", "reference", "reason", "toRankId", "toStationId", "toStatus")
SELECT 'ce_' || md5(o."id" || 'recruitment'), o."id", 'RECRUITMENT', o."hiredAt", 'HISTORIQUE', 'Imported from the hiring date on record', o."rankId", o."stationId", 'ACTIVE'
  FROM "Officer" o WHERE o."hiredAt" IS NOT NULL;
