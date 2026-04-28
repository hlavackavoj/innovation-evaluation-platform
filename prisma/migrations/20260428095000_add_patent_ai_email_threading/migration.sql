-- Add email threading and AI analysis fields for patent communication processing.
ALTER TABLE "Activity"
  ADD COLUMN "emailMessageId" TEXT,
  ADD COLUMN "emailParentId" TEXT,
  ADD COLUMN "aiAnalysis" JSONB;

ALTER TABLE "Task"
  ADD COLUMN "sourceActivityId" TEXT;

CREATE UNIQUE INDEX "Activity_emailMessageId_key" ON "Activity"("emailMessageId");

ALTER TABLE "Task"
  ADD CONSTRAINT "Task_sourceActivityId_fkey"
  FOREIGN KEY ("sourceActivityId") REFERENCES "Activity"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Task_sourceActivityId_idx" ON "Task"("sourceActivityId");
