-- Add optional contact link to tasks for email enrichment flow
ALTER TABLE "Task"
ADD COLUMN "contactId" TEXT;

ALTER TABLE "Task"
ADD CONSTRAINT "Task_contactId_fkey"
FOREIGN KEY ("contactId") REFERENCES "Contact"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Task_contactId_idx" ON "Task"("contactId");
