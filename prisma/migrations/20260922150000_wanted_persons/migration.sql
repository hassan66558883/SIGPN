-- AlterEnum
ALTER TYPE "DocumentEntity" ADD VALUE 'WANTED_PERSON';

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "wantedPersonId" TEXT;

-- AlterTable
ALTER TABLE "WantedPerson" ADD COLUMN     "mainPhotoDocumentId" TEXT,
ADD COLUMN     "warrantId" TEXT;

-- CreateTable
CREATE TABLE "WantedSighting" (
    "id" TEXT NOT NULL,
    "wantedPersonId" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "source" TEXT,
    "officerId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WantedSighting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WantedVehicle" (
    "id" TEXT NOT NULL,
    "wantedPersonId" TEXT NOT NULL,
    "plateNumber" TEXT,
    "make" TEXT,
    "model" TEXT,
    "color" TEXT,
    "year" INTEGER,
    "notes" TEXT,
    "addedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WantedVehicle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WantedSighting_wantedPersonId_occurredAt_idx" ON "WantedSighting"("wantedPersonId", "occurredAt");

-- CreateIndex
CREATE INDEX "WantedVehicle_wantedPersonId_idx" ON "WantedVehicle"("wantedPersonId");

-- CreateIndex
CREATE UNIQUE INDEX "WantedPerson_mainPhotoDocumentId_key" ON "WantedPerson"("mainPhotoDocumentId");

-- CreateIndex
CREATE INDEX "WantedPerson_caseId_idx" ON "WantedPerson"("caseId");

-- CreateIndex
CREATE INDEX "WantedPerson_warrantId_idx" ON "WantedPerson"("warrantId");

-- AddForeignKey
ALTER TABLE "WantedPerson" ADD CONSTRAINT "WantedPerson_warrantId_fkey" FOREIGN KEY ("warrantId") REFERENCES "Warrant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WantedPerson" ADD CONSTRAINT "WantedPerson_mainPhotoDocumentId_fkey" FOREIGN KEY ("mainPhotoDocumentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WantedSighting" ADD CONSTRAINT "WantedSighting_wantedPersonId_fkey" FOREIGN KEY ("wantedPersonId") REFERENCES "WantedPerson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WantedSighting" ADD CONSTRAINT "WantedSighting_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WantedVehicle" ADD CONSTRAINT "WantedVehicle_wantedPersonId_fkey" FOREIGN KEY ("wantedPersonId") REFERENCES "WantedPerson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WantedVehicle" ADD CONSTRAINT "WantedVehicle_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_wantedPersonId_fkey" FOREIGN KEY ("wantedPersonId") REFERENCES "WantedPerson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
