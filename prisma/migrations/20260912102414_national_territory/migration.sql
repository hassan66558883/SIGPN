-- CreateEnum
CREATE TYPE "CommuneType" AS ENUM ('COMMUNE', 'SOUS_PREFECTURE', 'ARRONDISSEMENT');

-- CreateEnum
CREATE TYPE "LocalityType" AS ENUM ('QUARTIER', 'VILLAGE', 'CANTON', 'LOCALITE');

-- CreateEnum
CREATE TYPE "StationStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'UNDER_CONSTRUCTION', 'PLANNED');

-- AlterEnum
ALTER TYPE "ScopeLevel" ADD VALUE 'DEPARTMENTAL';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "StationType" ADD VALUE 'PROVINCIAL_DIRECTION';
ALTER TYPE "StationType" ADD VALUE 'DEPARTMENTAL_DIRECTION';
ALTER TYPE "StationType" ADD VALUE 'UNIT';

-- AlterTable
ALTER TABLE "Region" ADD COLUMN     "isDemo" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Station" ADD COLUMN     "adminDepartmentId" TEXT,
ADD COLUMN     "communeId" TEXT,
ADD COLUMN     "isDemo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "localityId" TEXT,
ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "status" "StationStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "adminDepartmentId" TEXT;

-- CreateTable
CREATE TABLE "AdminDepartment" (
    "id" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capital" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commune" (
    "id" TEXT NOT NULL,
    "adminDepartmentId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CommuneType" NOT NULL DEFAULT 'COMMUNE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Commune_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Locality" (
    "id" TEXT NOT NULL,
    "communeId" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "type" "LocalityType" NOT NULL DEFAULT 'QUARTIER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Locality_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminDepartment_code_key" ON "AdminDepartment"("code");

-- CreateIndex
CREATE INDEX "AdminDepartment_regionId_idx" ON "AdminDepartment"("regionId");

-- CreateIndex
CREATE UNIQUE INDEX "Commune_code_key" ON "Commune"("code");

-- CreateIndex
CREATE INDEX "Commune_adminDepartmentId_idx" ON "Commune"("adminDepartmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Locality_code_key" ON "Locality"("code");

-- CreateIndex
CREATE INDEX "Locality_communeId_idx" ON "Locality"("communeId");

-- CreateIndex
CREATE INDEX "Station_adminDepartmentId_idx" ON "Station"("adminDepartmentId");

-- CreateIndex
CREATE INDEX "Station_communeId_idx" ON "Station"("communeId");

-- CreateIndex
CREATE INDEX "Station_parentId_idx" ON "Station"("parentId");

-- CreateIndex
CREATE INDEX "Station_status_idx" ON "Station"("status");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_adminDepartmentId_fkey" FOREIGN KEY ("adminDepartmentId") REFERENCES "AdminDepartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminDepartment" ADD CONSTRAINT "AdminDepartment_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commune" ADD CONSTRAINT "Commune_adminDepartmentId_fkey" FOREIGN KEY ("adminDepartmentId") REFERENCES "AdminDepartment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Locality" ADD CONSTRAINT "Locality_communeId_fkey" FOREIGN KEY ("communeId") REFERENCES "Commune"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Station" ADD CONSTRAINT "Station_adminDepartmentId_fkey" FOREIGN KEY ("adminDepartmentId") REFERENCES "AdminDepartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Station" ADD CONSTRAINT "Station_communeId_fkey" FOREIGN KEY ("communeId") REFERENCES "Commune"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Station" ADD CONSTRAINT "Station_localityId_fkey" FOREIGN KEY ("localityId") REFERENCES "Locality"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Station" ADD CONSTRAINT "Station_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;
