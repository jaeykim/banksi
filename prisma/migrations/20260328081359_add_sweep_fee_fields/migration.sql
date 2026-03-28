-- AlterTable
ALTER TABLE "SweepJob" ADD COLUMN "feeAddress" TEXT;
ALTER TABLE "SweepJob" ADD COLUMN "feeAmount" TEXT;
ALTER TABLE "SweepJob" ADD COLUMN "feePercent" REAL;
ALTER TABLE "SweepJob" ADD COLUMN "feeTxHash" TEXT;
ALTER TABLE "SweepJob" ADD COLUMN "merchantAmount" TEXT;
