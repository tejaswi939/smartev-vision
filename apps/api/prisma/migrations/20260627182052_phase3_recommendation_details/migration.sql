-- AlterTable
ALTER TABLE "Prediction" ADD COLUMN     "highlightComponents" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "rationale" TEXT;
