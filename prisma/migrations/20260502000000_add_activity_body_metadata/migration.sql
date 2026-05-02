-- DropForeignKey
ALTER TABLE "Activity" DROP CONSTRAINT "Activity_projectId_fkey";

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "analysisMetadata" JSONB,
ADD COLUMN     "bodyContent" TEXT,
ALTER COLUMN "projectId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
