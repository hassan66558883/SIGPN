-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'LATE', 'ABSENT', 'ON_LEAVE', 'PERMISSION', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('ANNUAL', 'EXCEPTIONAL', 'PERMISSION', 'ABSENCE_AUTHORIZATION', 'UNAVAILABILITY');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TrainingKind" AS ENUM ('INITIAL', 'CONTINUING', 'INTERNSHIP', 'SPECIALIZED');

-- AlterTable
ALTER TABLE "Training" ADD COLUMN     "certificateIssuedAt" TIMESTAMP(3),
ADD COLUMN     "evaluatedAt" TIMESTAMP(3),
ADD COLUMN     "kind" "TrainingKind" NOT NULL DEFAULT 'CONTINUING',
ADD COLUMN     "passed" BOOLEAN,
ADD COLUMN     "score" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "officerId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "lateMinutes" INTEGER,
    "note" TEXT,
    "leaveId" TEXT,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "officerId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "type" "LeaveType" NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "days" INTEGER NOT NULL,
    "reason" TEXT,
    "status" "LeaveStatus" NOT NULL DEFAULT 'REQUESTED',
    "requestedById" TEXT,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfficerSkill" (
    "id" TEXT NOT NULL,
    "officerId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "acquiredAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "trainingId" TEXT,

    CONSTRAINT "OfficerSkill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttendanceRecord_stationId_date_idx" ON "AttendanceRecord"("stationId", "date");

-- CreateIndex
CREATE INDEX "AttendanceRecord_date_status_idx" ON "AttendanceRecord"("date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_officerId_date_key" ON "AttendanceRecord"("officerId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveRequest_number_key" ON "LeaveRequest"("number");

-- CreateIndex
CREATE INDEX "LeaveRequest_officerId_startDate_idx" ON "LeaveRequest"("officerId", "startDate");

-- CreateIndex
CREATE INDEX "LeaveRequest_status_createdAt_idx" ON "LeaveRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "LeaveRequest_stationId_status_idx" ON "LeaveRequest"("stationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_code_key" ON "Skill"("code");

-- CreateIndex
CREATE UNIQUE INDEX "OfficerSkill_officerId_skillId_key" ON "OfficerSkill"("officerId", "skillId");

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "Officer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "Officer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficerSkill" ADD CONSTRAINT "OfficerSkill_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "Officer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficerSkill" ADD CONSTRAINT "OfficerSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficerSkill" ADD CONSTRAINT "OfficerSkill_trainingId_fkey" FOREIGN KEY ("trainingId") REFERENCES "Training"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Plausibility guards.
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_dates_ok" CHECK ("endDate" >= "startDate" AND "days" >= 1);
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_late_minutes" CHECK (("status" = 'LATE' AND "lateMinutes" BETWEEN 1 AND 720) OR ("status" <> 'LATE' AND "lateMinutes" IS NULL));
ALTER TABLE "OfficerSkill" ADD CONSTRAINT "OfficerSkill_level_range" CHECK ("level" BETWEEN 1 AND 5);
ALTER TABLE "Training" ADD CONSTRAINT "Training_score_range" CHECK ("score" IS NULL OR ("score" >= 0 AND "score" <= 20));
-- Leave requests are never deleted (history).
CREATE TRIGGER leave_request_no_delete BEFORE DELETE ON "LeaveRequest" FOR EACH ROW EXECUTE FUNCTION pms_forbid_mutation();

-- Default competence referential (editable by HR).
INSERT INTO "Skill" ("id", "code", "name") VALUES
  ('skill_pj', 'PJ', 'Police judiciaire'),
  ('skill_mo', 'MO', 'Maintien de l''ordre'),
  ('skill_circ', 'CIRC', 'Circulation routière'),
  ('skill_ps', 'PS', 'Premiers secours'),
  ('skill_tir', 'TIR', 'Tir et sécurité des armes'),
  ('skill_rens', 'RENS', 'Renseignement'),
  ('skill_info', 'INFO', 'Informatique de base')
ON CONFLICT ("code") DO NOTHING;
