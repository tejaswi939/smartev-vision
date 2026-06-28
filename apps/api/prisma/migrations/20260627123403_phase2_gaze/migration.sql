-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InteractionType" ADD VALUE 'ENTER';
ALTER TYPE "InteractionType" ADD VALUE 'EXIT';
ALTER TYPE "InteractionType" ADD VALUE 'SWITCH';

-- AlterTable
ALTER TABLE "GazeData" ADD COLUMN     "camPos" JSONB,
ADD COLUMN     "camRot" JSONB,
ADD COLUMN     "objectId" TEXT,
ADD COLUMN     "provider" TEXT,
ADD COLUMN     "rayDir" JSONB;

-- AlterTable
ALTER TABLE "HeatmapCell" ADD COLUMN     "vehicleId" TEXT,
ADD COLUMN     "weight" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "gazeProvider" TEXT,
ADD COLUMN     "interestScore" DOUBLE PRECISION,
ADD COLUMN     "totalGazeMs" DOUBLE PRECISION,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ComponentView" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "partId" TEXT,
    "meshName" TEXT NOT NULL,
    "totalViewMs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hoverMs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "focusCount" INTEGER NOT NULL DEFAULT 0,
    "entryCount" INTEGER NOT NULL DEFAULT 0,
    "exitCount" INTEGER NOT NULL DEFAULT 0,
    "interactionCount" INTEGER NOT NULL DEFAULT 0,
    "firstSeenMs" DOUBLE PRECISION,
    "lastSeenMs" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComponentView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ComponentView_vehicleId_meshName_idx" ON "ComponentView"("vehicleId", "meshName");

-- CreateIndex
CREATE INDEX "ComponentView_sessionId_idx" ON "ComponentView"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "ComponentView_sessionId_meshName_key" ON "ComponentView"("sessionId", "meshName");

-- CreateIndex
CREATE INDEX "GazeData_sessionId_tMs_idx" ON "GazeData"("sessionId", "tMs");

-- CreateIndex
CREATE INDEX "GazeData_objectId_idx" ON "GazeData"("objectId");

-- CreateIndex
CREATE INDEX "HeatmapCell_vehicleId_idx" ON "HeatmapCell"("vehicleId");

-- AddForeignKey
ALTER TABLE "ComponentView" ADD CONSTRAINT "ComponentView_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
