-- AlterTable
ALTER TABLE "CreditUsage" ADD COLUMN     "reason" TEXT;

-- CreateIndex
CREATE INDEX "CreditUsage_subscriptionId_idx" ON "CreditUsage"("subscriptionId");

-- CreateIndex
CREATE INDEX "CreditUsage_jobId_idx" ON "CreditUsage"("jobId");
