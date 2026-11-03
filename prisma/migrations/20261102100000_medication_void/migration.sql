-- AlterTable
ALTER TABLE "medication_periods" ADD COLUMN     "voidReason" TEXT,
ADD COLUMN     "voidedAt" TIMESTAMP(3),
ADD COLUMN     "voidedById" UUID;

-- AddForeignKey
ALTER TABLE "medication_periods" ADD CONSTRAINT "medication_periods_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
