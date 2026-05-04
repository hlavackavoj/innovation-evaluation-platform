# ENVIRONMENT_STATE

## Purpose
This file is the source of truth for the current infrastructure setup of the Innovation Evaluation Platform.
Use this document to avoid cloud/provider confusion during development, deployment, and operations.

## Architecture Mode
- Multi-cloud (intentional)

## Cloud Providers and Responsibilities

### 1. Vercel
- Role: Application hosting and deployment platform
- Hosts: Next.js web app and server actions
- Environments: Production, Preview, Development

### 2. Neon PostgreSQL
- Role: Primary relational database
- Accessed through: Prisma ORM
- Connection variable: `DATABASE_URL`
- Note: Use pooled Neon connection for serverless workloads

### 3. Supabase Storage
- Role: Binary file storage for project documents
- Bucket: `project-documents`
- Stores: Uploaded project files (PDF, DOCX, XLSX)
- Bucket visibility: private
- Storage object paths are stored in database records
- Download access is issued through short-lived Signed URLs after app-level authorization
- Required variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXTAUTH_SECRET`
  - `NEXTAUTH_URL`

## Application Stack
- Framework: Next.js (App Router)
- Language: TypeScript
- ORM: Prisma
- Database: PostgreSQL (Neon)
- UI: Tailwind CSS + internal UI components

## Current Document Upload Flow
1. User uploads file from project detail page (`Documents & Templates` tab).
2. Server Action uploads file to Supabase Storage bucket `project-documents`.
3. Storage object path is stored in Neon PostgreSQL.
4. Authorized server rendering generates a short-lived Signed URL for download/open.

## Patent Communication AI Flow
1. Patent email content can be processed through a server action.
2. Google Gemini (`gemini-1.5-flash`) analyzes the email and returns strict JSON metadata.
3. Analysis is stored in Neon PostgreSQL on `Activity.aiAnalysis` with threading fields (`emailMessageId`, `emailParentId`).
4. Follow-up tasks can be auto-created and linked back to the source activity (`Task.sourceActivityId`).
5. Project pipeline stage can be synchronized from AI-detected phase mapping.

## Non-Goals (Current MVP)
- No AI-based recommendation generation (rule-based only)
- No machine-learning recommendation engine (patent email analysis uses deterministic task/stage mapping after AI extraction)
- No enterprise SSO
- No advanced document lifecycle automation

## Operational Rule
If infrastructure changes, update this file in the same PR before merge.
