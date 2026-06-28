-- CreateTable
CREATE TABLE "Prediction" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "archetype" TEXT NOT NULL,
    "archetypeConfidence" DOUBLE PRECISION NOT NULL,
    "interestTier" TEXT NOT NULL,
    "interestConfidence" DOUBLE PRECISION NOT NULL,
    "recommendedVehicleId" TEXT,
    "scores" JSONB NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Prediction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Prediction_sessionId_key" ON "Prediction"("sessionId");

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_recommendedVehicleId_fkey" FOREIGN KEY ("recommendedVehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
