# Data Model

Zdrojová pravda: `prisma/schema.prisma`. Tento dokument je aktuální k dubnu 2026.

## CRM entity

### User
- `id`, `name`, `email` (unique), `role` (UserRole), `createdAt`, `updatedAt`
- Vztahy: `ownedProjects`, `activities`, `assignedTasks`, `emailConnections`, `syncJobs`, `auditLogs`

### Organization
- `id`, `name`, `type` (OrganizationType), `website?`, `notes?`, `createdAt`, `updatedAt`
- Vztahy: `contacts[]`, `projects[]`

### Contact
- `id`, `name`, `email?`, `phone?`, `role`, `organizationId?`, `notes?`, `createdAt`, `updatedAt`
- Vztahy: `organization?`, `projectLinks[]` (M:N), `emailAutomationLinks[]`, `tasks[]`

### Project
- `id`, `title`, `description`, `field?`, `stage`, `priority`, `potentialLevel`, `ipStatus?`
- `teamStrength?`, `businessReadiness?`, `nextStep?`, `nextStepDueDate?`, `lastContactAt?`
- `organizationId?`, `ownerUserId?`, `createdAt`, `updatedAt`
- Vztahy: `organization?`, `owner?`, `contacts[]`, `activities[]`, `tasks[]`, `recommendations[]`, `documents[]`, `emailAutomationSetting?`, `emailLinks[]`, `syncJobs[]`

### ProjectContact (junction)
- `@@id([projectId, contactId])`

### Activity
- `id`, `projectId`, `userId?`, `type` (ActivityType), `note`, `emailMessageId?` (unique), `emailParentId?`, `aiAnalysis?` (Json), `activityDate`, `createdAt`
- Vztahy: `project`, `user?`, `emailMessage?`, `sourceTasks[]`

### Task
- `id`, `projectId`, `contactId?`, `assignedToUserId?`, `sourceActivityId?`, `title`, `description?`
- `status` (TaskStatus), `priority` (ProjectPriority), `dueDate?`, `createdAt`, `updatedAt`
- `contactId?` je volitelná vazba na `Contact` pro Email Analyzer enrichment (tasky z e-mailu jsou navázané na odesílatele).
- `@@index([contactId])`
- `@@index([sourceActivityId])`

### Recommendation
- `id`, `title`, `description`, `ruleKey`, `projectId`, `status` (RecommendationStatus), `suggestedRole`, `createdAt`, `updatedAt`
- `@@unique([projectId, ruleKey])` – jeden záznam per pravidlo per projekt

### Template
- `id`, `name`, `description`, `storagePath` (mapped: `fileUrl`), `targetStage` (PipelineStage), `createdAt`
- Vztahy: `documents[]`

### ProjectDocument
- `id`, `projectId`, `templateId?`, `name`, `storagePath` (mapped: `fileUrl`), `createdAt`
- `@@index([projectId, createdAt])`, `@@index([templateId])`

---

## Email Analyzer entity

### EmailAccountConnection
- `id`, `userId`, `provider` (EmailProvider: GMAIL/OUTLOOK), `emailAddress?`, `externalAccountId`
- `encryptedAccessToken`, `encryptedRefreshToken?`, `tokenExpiresAt?`, `scopes[]`, `status` (EmailConnectionStatus)
- `lastSyncedAt?`, `lastError?`, `createdAt`, `updatedAt`
- `@@unique([provider, externalAccountId])`, `@@index([userId, status])`

### EmailMessage
- `id`, `accountConnectionId`, `provider`, `providerMessageId` (unique), `providerThreadId?`, `providerParentMessageId?`
- `internetMessageId?`, `subject?`, `direction?`, `participants` (Json), `sentAt`
- `snippet?`, `bodyText?`, `bodyHash?`, `hasBody`, `createdAt`, `updatedAt`
- `@@index([accountConnectionId, sentAt])`, `@@index([providerThreadId])`

### ProjectEmailLink
- `id`, `projectId`, `emailMessageId`, `confidence` (Float), `reason`, `createdAt`
- `@@unique([projectId, emailMessageId])`

### EmailSyncCursor
- `id`, `accountConnectionId`, `cursorKey`, `cursorValue`, `updatedAt`
- `@@unique([accountConnectionId, cursorKey])`

### EmailSyncJob
- `id`, `userId`, `projectId?`, `accountConnectionId?`, `trigger` (MANUAL/SCHEDULED)
- `status` (QUEUED/RUNNING/COMPLETED/FAILED), `filterProvider?`, `filterDirection?`, `filterFrom?`, `filterTo?`, `filterContactEmail?`
- `importedEmails`, `matchedContacts`, `suggestedContacts`, `generatedTasks`, `summary?` (Json)
- `startedAt?`, `finishedAt?`, `error?`, `createdAt`, `updatedAt`
- `@@index([userId, createdAt])`, `@@index([projectId, status])`

### ProjectEmailAutomationSetting
- `id`, `projectId` (unique), `enabled`, `schedule?` (DAILY/WEEKLY), `keywordAliases[]`, `createdAt`, `updatedAt`

### ProjectEmailAutomationContact (junction)
- `@@id([settingId, contactId])`

### ProjectEmailAutomationDomain
- `id`, `settingId`, `domain`, `createdAt`
- `@@unique([settingId, domain])`

---

## AuditLog

- `id`, `userId?`, `action`, `entityType`, `entityId?`, `metadata?` (Json), `createdAt`
- `@@index([action, createdAt])`

---

## Enums

| Enum | Hodnoty |
|---|---|
| UserRole | ADMIN, MANAGER, EVALUATOR, USER, VIEWER |
| PipelineStage | DISCOVERY, VALIDATION, MVP, SCALING, SPIN_OFF |
| ProjectPriority | LOW, MEDIUM, HIGH, URGENT |
| ProjectPotentialLevel | LOW, MEDIUM, HIGH |
| ActivityType | MEETING, CALL, EMAIL, NOTE, WORKSHOP, EVALUATION |
| TaskStatus | TODO, IN_PROGRESS, DONE, CANCELLED |
| OrganizationType | UNIVERSITY, FACULTY, RESEARCH_CENTER, INNOVATION_CENTER, COMPANY, INVESTOR, PUBLIC_INSTITUTION |
| TeamStrength | TECHNICAL_ONLY, BALANCED, STRONG |
| BusinessReadiness | WEAK, EMERGING, STRONG |
| RecommendationStatus | PENDING, COMPLETED, DISMISSED |
| EmailProvider | GMAIL, OUTLOOK |
| EmailConnectionStatus | ACTIVE, REVOKED, ERROR |
| SyncSchedule | DAILY, WEEKLY |
| EmailSyncJobStatus | QUEUED, RUNNING, COMPLETED, FAILED |
| EmailSyncJobTrigger | MANUAL, SCHEDULED |

---

## Neimplementováno

Model `Expert` z původního plánu **neexistuje** v schématu.

---

## ER diagram (hlavní entity)

```mermaid
erDiagram
  User {
    string id PK
    string name
    string email UK
    UserRole role
  }
  Organization {
    string id PK
    string name
    OrganizationType type
    string website
  }
  Contact {
    string id PK
    string name
    string email
    string role
    string organizationId FK
  }
  Project {
    string id PK
    string title
    PipelineStage stage
    ProjectPriority priority
    ProjectPotentialLevel potentialLevel
    string ownerUserId FK
    string organizationId FK
  }
  ProjectContact {
    string projectId FK
    string contactId FK
  }
  Activity {
    string id PK
    string projectId FK
    string userId FK
    ActivityType type
    string note
    string emailMessageId FK
    json aiAnalysis
    datetime activityDate
  }
  Task {
    string id PK
    string projectId FK
    string contactId FK
    string assignedToUserId FK
    string sourceActivityId FK
    TaskStatus status
    ProjectPriority priority
  }
  Recommendation {
    string id PK
    string projectId FK
    string ruleKey
    RecommendationStatus status
    string suggestedRole
  }
  Template {
    string id PK
    PipelineStage targetStage
    string storagePath
  }
  ProjectDocument {
    string id PK
    string projectId FK
    string templateId FK
    string storagePath
  }
  EmailAccountConnection {
    string id PK
    string userId FK
    EmailProvider provider
    string externalAccountId UK
    string encryptedAccessToken
    EmailConnectionStatus status
  }
  EmailMessage {
    string id PK
    string accountConnectionId FK
    string providerMessageId UK
    json participants
    datetime sentAt
  }
  ProjectEmailLink {
    string id PK
    string projectId FK
    string emailMessageId FK
    float confidence
    string reason
  }
  EmailSyncJob {
    string id PK
    string userId FK
    string projectId FK
    string accountConnectionId FK
    EmailSyncJobStatus status
    EmailSyncJobTrigger trigger
  }
  AuditLog {
    string id PK
    string userId FK
    string action
    string entityType
    string entityId
    json metadata
  }

  User ||--o{ Project : owns
  User ||--o{ Activity : records
  User ||--o{ Task : "assigned to"
  User ||--o{ EmailAccountConnection : has
  User ||--o{ EmailSyncJob : runs
  User ||--o{ AuditLog : creates
  Organization ||--o{ Project : "linked to"
  Organization ||--o{ Contact : has
  Contact ||--o{ ProjectContact : "linked via"
  Project ||--o{ ProjectContact : "linked via"
  Project ||--o{ Activity : has
  Project ||--o{ Task : has
  Project ||--o{ Recommendation : has
  Project ||--o{ ProjectDocument : has
  Project ||--o{ ProjectEmailLink : has
  Project ||--o{ EmailSyncJob : "triggered for"
  Task }o--|| Activity : "source activity"
  Activity }o--|| EmailMessage : "from email"
  EmailAccountConnection ||--o{ EmailMessage : contains
  EmailMessage ||--o{ ProjectEmailLink : "linked to project"
  Template ||--o{ ProjectDocument : "used in"
```
