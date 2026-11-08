-- Public portal (SIGPN-T v2.0, sections 2.2 and 4). Additive only.
-- Rollback: DROP TABLE "PublicSubmission","PublicNews"; DROP TYPE "NewsStatus","PublicSubmissionStatus","PublicSubmissionKind";
--           ALTER TABLE "Station" DROP COLUMN "publicVisible", ... ; ALTER TABLE "WantedPerson" DROP COLUMN "publicPublishedAt", ...

CREATE TYPE "PublicSubmissionKind" AS ENUM ('COMPLAINT', 'REPORT', 'CONTACT');
CREATE TYPE "PublicSubmissionStatus" AS ENUM ('RECEIVED', 'IN_REVIEW', 'FORWARDED', 'CLOSED', 'REJECTED');
CREATE TYPE "NewsStatus" AS ENUM ('DRAFT', 'PUBLISHED');

ALTER TABLE "Station"
  ADD COLUMN "publicVisible" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "publicAddress" TEXT,
  ADD COLUMN "publicPhone" TEXT,
  ADD COLUMN "publicHours" TEXT,
  ADD COLUMN "publicVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "publicVerifiedById" TEXT;
-- A unit is only listed publicly once its coordinates were verified by a person.
ALTER TABLE "Station" ADD CONSTRAINT "Station_public_requires_verification" CHECK ("publicVisible" = false OR "publicVerifiedAt" IS NOT NULL) NOT VALID;

ALTER TABLE "WantedPerson"
  ADD COLUMN "publicPublishedAt" TIMESTAMP(3),
  ADD COLUMN "publicPublishedById" TEXT,
  ADD COLUMN "publicNotice" TEXT;
-- Only an ACTIVE notice can be public, and never one that is a hearing summons or a draft.
ALTER TABLE "WantedPerson" ADD CONSTRAINT "WantedPerson_public_only_active" CHECK ("publicPublishedAt" IS NULL OR "status" = 'ACTIVE') NOT VALID;
ALTER TABLE "WantedPerson" ADD CONSTRAINT "WantedPerson_public_publisher_not_issuer" CHECK ("publicPublishedById" IS NULL OR "publicPublishedById" <> "issuedById") NOT VALID;

CREATE TABLE "PublicSubmission" (
  "id" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "kind" "PublicSubmissionKind" NOT NULL,
  "category" "OffenseCategory" NOT NULL DEFAULT 'OTHER',
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "locationText" TEXT,
  "occurredOn" TIMESTAMP(3),
  "contactName" TEXT,
  "contactPhone" TEXT,
  "contactEmail" TEXT,
  "anonymous" BOOLEAN NOT NULL DEFAULT false,
  "stationId" TEXT,
  "status" "PublicSubmissionStatus" NOT NULL DEFAULT 'RECEIVED',
  "publicReply" TEXT,
  "repliedAt" TIMESTAMP(3),
  "handledById" TEXT,
  "complaintId" TEXT,
  "ipHash" TEXT,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PublicSubmission_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PublicSubmission_number_key" ON "PublicSubmission"("number");
CREATE UNIQUE INDEX "PublicSubmission_complaintId_key" ON "PublicSubmission"("complaintId");
CREATE INDEX "PublicSubmission_status_receivedAt_idx" ON "PublicSubmission"("status", "receivedAt");
CREATE INDEX "PublicSubmission_stationId_status_idx" ON "PublicSubmission"("stationId", "status");

CREATE TABLE "PublicNews" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "status" "NewsStatus" NOT NULL DEFAULT 'DRAFT',
  "publishedAt" TIMESTAMP(3),
  "authorId" TEXT NOT NULL,
  "isDemo" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PublicNews_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PublicNews_status_publishedAt_idx" ON "PublicNews"("status", "publishedAt");
