-- CreateEnum
CREATE TYPE "RotationAlertKind" AS ENUM ('UPCOMING', 'DUE');

-- CreateTable
CREATE TABLE "RotationException" (
    "id" TEXT NOT NULL,
    "officerId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "createdById" TEXT,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RotationException_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RotationAlert" (
    "id" TEXT NOT NULL,
    "officerId" TEXT NOT NULL,
    "kind" "RotationAlertKind" NOT NULL,
    "postSince" TIMESTAMP(3) NOT NULL,
    "transferId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RotationAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RotationException_officerId_idx" ON "RotationException"("officerId");

-- CreateIndex
CREATE INDEX "RotationAlert_kind_createdAt_idx" ON "RotationAlert"("kind", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RotationAlert_officerId_postSince_kind_key" ON "RotationAlert"("officerId", "postSince", "kind");

-- CreateIndex
CREATE INDEX "Officer_currentPostSince_idx" ON "Officer"("currentPostSince");

-- AddForeignKey
ALTER TABLE "RotationException" ADD CONSTRAINT "RotationException_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "Officer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RotationException" ADD CONSTRAINT "RotationException_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RotationAlert" ADD CONSTRAINT "RotationAlert_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "Officer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

