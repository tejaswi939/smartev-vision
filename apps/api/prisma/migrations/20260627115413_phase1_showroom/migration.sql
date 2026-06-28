-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PartCategory" ADD VALUE 'CHARGING';
ALTER TYPE "PartCategory" ADD VALUE 'GLASS';
ALTER TYPE "PartCategory" ADD VALUE 'SEATING';

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "category" TEXT,
ADD COLUMN     "metadata" JSONB,
ALTER COLUMN "modelUrl" DROP NOT NULL;

-- AlterTable
ALTER TABLE "VehiclePart" ADD COLUMN     "animation" TEXT,
ADD COLUMN     "hotspotPosition" JSONB,
ADD COLUMN     "interactive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "specs" JSONB;
