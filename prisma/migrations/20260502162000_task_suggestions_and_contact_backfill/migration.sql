-- Safe backfill for environments where contactId migration was skipped
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "contactId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Task_contactId_fkey'
  ) THEN
    ALTER TABLE "Task"
    ADD CONSTRAINT "Task_contactId_fkey"
    FOREIGN KEY ("contactId") REFERENCES "Contact"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Task_contactId_idx" ON "Task"("contactId");

-- Suggested task workflow and metadata
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TaskSuggestionStatus') THEN
    CREATE TYPE "TaskSuggestionStatus" AS ENUM ('SUGGESTED', 'ACCEPTED', 'REJECTED');
  END IF;
END $$;

ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "sourceSyncJobId" TEXT;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "suggestionStatus" "TaskSuggestionStatus" NOT NULL DEFAULT 'ACCEPTED';
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "suggestionConfidence" DOUBLE PRECISION;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "suggestionReason" TEXT;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "suggestionMetadata" JSONB;

CREATE INDEX IF NOT EXISTS "Task_sourceSyncJobId_idx" ON "Task"("sourceSyncJobId");
CREATE INDEX IF NOT EXISTS "Task_suggestionStatus_idx" ON "Task"("suggestionStatus");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Task_sourceSyncJobId_fkey'
  ) THEN
    ALTER TABLE "Task"
    ADD CONSTRAINT "Task_sourceSyncJobId_fkey"
    FOREIGN KEY ("sourceSyncJobId") REFERENCES "EmailSyncJob"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
