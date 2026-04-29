-- Create enums
CREATE TYPE "EmailProvider" AS ENUM ('GMAIL', 'OUTLOOK');
CREATE TYPE "EmailConnectionStatus" AS ENUM ('ACTIVE', 'REVOKED', 'ERROR');
CREATE TYPE "SyncSchedule" AS ENUM ('DAILY', 'WEEKLY');
CREATE TYPE "EmailSyncJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED');
CREATE TYPE "EmailSyncJobTrigger" AS ENUM ('MANUAL', 'SCHEDULED');

-- Create tables
CREATE TABLE "EmailAccountConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "EmailProvider" NOT NULL,
    "emailAddress" TEXT,
    "externalAccountId" TEXT NOT NULL,
    "encryptedAccessToken" TEXT NOT NULL,
    "encryptedRefreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "EmailConnectionStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastSyncedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EmailAccountConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmailMessage" (
    "id" TEXT NOT NULL,
    "accountConnectionId" TEXT NOT NULL,
    "provider" "EmailProvider" NOT NULL,
    "providerMessageId" TEXT NOT NULL,
    "providerThreadId" TEXT,
    "providerParentMessageId" TEXT,
    "internetMessageId" TEXT,
    "subject" TEXT,
    "direction" TEXT,
    "participants" JSONB NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "snippet" TEXT,
    "bodyText" TEXT,
    "bodyHash" TEXT,
    "hasBody" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EmailMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectEmailLink" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "emailMessageId" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectEmailLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmailSyncCursor" (
    "id" TEXT NOT NULL,
    "accountConnectionId" TEXT NOT NULL,
    "cursorKey" TEXT NOT NULL,
    "cursorValue" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EmailSyncCursor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmailSyncJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "accountConnectionId" TEXT,
    "trigger" "EmailSyncJobTrigger" NOT NULL,
    "status" "EmailSyncJobStatus" NOT NULL DEFAULT 'QUEUED',
    "filterProvider" "EmailProvider",
    "filterDirection" TEXT,
    "filterFrom" TIMESTAMP(3),
    "filterTo" TIMESTAMP(3),
    "filterContactEmail" TEXT,
    "importedEmails" INTEGER NOT NULL DEFAULT 0,
    "matchedContacts" INTEGER NOT NULL DEFAULT 0,
    "suggestedContacts" INTEGER NOT NULL DEFAULT 0,
    "generatedTasks" INTEGER NOT NULL DEFAULT 0,
    "summary" JSONB,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EmailSyncJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectEmailAutomationSetting" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "schedule" "SyncSchedule",
    "keywordAliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProjectEmailAutomationSetting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectEmailAutomationContact" (
    "settingId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectEmailAutomationContact_pkey" PRIMARY KEY ("settingId","contactId")
);

CREATE TABLE "ProjectEmailAutomationDomain" (
    "id" TEXT NOT NULL,
    "settingId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectEmailAutomationDomain_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "_EmailMessagesInJob" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- Indexes
CREATE UNIQUE INDEX "EmailAccountConnection_provider_externalAccountId_key" ON "EmailAccountConnection"("provider", "externalAccountId");
CREATE INDEX "EmailAccountConnection_userId_status_idx" ON "EmailAccountConnection"("userId", "status");

CREATE UNIQUE INDEX "EmailMessage_providerMessageId_key" ON "EmailMessage"("providerMessageId");
CREATE INDEX "EmailMessage_accountConnectionId_sentAt_idx" ON "EmailMessage"("accountConnectionId", "sentAt");
CREATE INDEX "EmailMessage_providerThreadId_idx" ON "EmailMessage"("providerThreadId");

CREATE UNIQUE INDEX "ProjectEmailLink_projectId_emailMessageId_key" ON "ProjectEmailLink"("projectId", "emailMessageId");

CREATE UNIQUE INDEX "EmailSyncCursor_accountConnectionId_cursorKey_key" ON "EmailSyncCursor"("accountConnectionId", "cursorKey");

CREATE INDEX "EmailSyncJob_userId_createdAt_idx" ON "EmailSyncJob"("userId", "createdAt");
CREATE INDEX "EmailSyncJob_projectId_status_idx" ON "EmailSyncJob"("projectId", "status");

CREATE UNIQUE INDEX "ProjectEmailAutomationSetting_projectId_key" ON "ProjectEmailAutomationSetting"("projectId");
CREATE UNIQUE INDEX "ProjectEmailAutomationDomain_settingId_domain_key" ON "ProjectEmailAutomationDomain"("settingId", "domain");

CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

CREATE UNIQUE INDEX "_EmailMessagesInJob_AB_unique" ON "_EmailMessagesInJob"("A", "B");
CREATE INDEX "_EmailMessagesInJob_B_index" ON "_EmailMessagesInJob"("B");

-- Foreign keys
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_emailMessageId_fkey" FOREIGN KEY ("emailMessageId") REFERENCES "EmailMessage"("providerMessageId") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EmailAccountConnection" ADD CONSTRAINT "EmailAccountConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_accountConnectionId_fkey" FOREIGN KEY ("accountConnectionId") REFERENCES "EmailAccountConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectEmailLink" ADD CONSTRAINT "ProjectEmailLink_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectEmailLink" ADD CONSTRAINT "ProjectEmailLink_emailMessageId_fkey" FOREIGN KEY ("emailMessageId") REFERENCES "EmailMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmailSyncCursor" ADD CONSTRAINT "EmailSyncCursor_accountConnectionId_fkey" FOREIGN KEY ("accountConnectionId") REFERENCES "EmailAccountConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmailSyncJob" ADD CONSTRAINT "EmailSyncJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailSyncJob" ADD CONSTRAINT "EmailSyncJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailSyncJob" ADD CONSTRAINT "EmailSyncJob_accountConnectionId_fkey" FOREIGN KEY ("accountConnectionId") REFERENCES "EmailAccountConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProjectEmailAutomationSetting" ADD CONSTRAINT "ProjectEmailAutomationSetting_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectEmailAutomationContact" ADD CONSTRAINT "ProjectEmailAutomationContact_settingId_fkey" FOREIGN KEY ("settingId") REFERENCES "ProjectEmailAutomationSetting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectEmailAutomationContact" ADD CONSTRAINT "ProjectEmailAutomationContact_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectEmailAutomationDomain" ADD CONSTRAINT "ProjectEmailAutomationDomain_settingId_fkey" FOREIGN KEY ("settingId") REFERENCES "ProjectEmailAutomationSetting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "_EmailMessagesInJob" ADD CONSTRAINT "_EmailMessagesInJob_A_fkey" FOREIGN KEY ("A") REFERENCES "EmailMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_EmailMessagesInJob" ADD CONSTRAINT "_EmailMessagesInJob_B_fkey" FOREIGN KEY ("B") REFERENCES "EmailSyncJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
