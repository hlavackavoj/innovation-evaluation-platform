# Email Analyzer Flow – detailní technická mapa

Aktualizováno: 1. 5. 2026
Zdrojové soubory: `lib/email/`, `app/api/email/`, `app/email-analyzer/`

Tento dokument popisuje přesný technický flow. Pro produktový přehled viz [[Email Analyzer]].

---

## 1) OAuth flow: připojení Gmail účtu

```mermaid
sequenceDiagram
  participant User
  participant UI as email-analyzer page
  participant Connect as /api/email/oauth/gmail/connect
  participant Google as Google OAuth
  participant Callback as /api/email/oauth/gmail/callback
  participant DB as PostgreSQL
  participant Sync as runPostConnectInitialSync()

  User->>UI: klik "Připojit Gmail"
  UI->>Connect: GET /api/email/oauth/gmail/connect
  Connect->>Connect: generateOAuthState() – podpisný HMAC userId+provider+returnPath
  Connect->>Google: redirect na authorization URL (scopes: openid, email, gmail.readonly)
  Google->>Callback: redirect s code + state
  Callback->>Callback: parseOAuthState() – ověření HMAC podpisu (CSRF ochrana)
  Callback->>Google: OAuth2Client.getToken(code) – exchange code za tokeny
  Callback->>DB: upsertEmailConnection() – uloží šifrované access/refresh token
  Note over DB: encryptedAccessToken, encryptedRefreshToken (AES, lib/crypto.ts)
  Callback->>Sync: runPostConnectInitialSync() – async, neblokuje redirect
  Callback->>User: redirect na returnPath + ?toast=provider-connected
```

**Klíčové soubory:**
- `app/api/email/oauth/[provider]/connect/route.ts`
- `app/api/email/oauth/[provider]/callback/route.ts`
- `lib/email/oauth-service.ts` – token exchange + refresh
- `lib/email/oauth-state.ts` – HMAC state podpis/verifikace
- `lib/email/token-store.ts` – `upsertEmailConnection()`, `getDecryptedConnection()`
- `lib/crypto.ts` – AES šifrování/dešifrování

---

## 2) Initial sync po připojení Gmailu

Soubor: `lib/email/post-connect-sync.ts`

```mermaid
flowchart TD
  START["runPostConnectInitialSync(userId, connectionId)"] --> FETCH["fetchProviderMessages()\nlib/email/provider-client.ts\nposledních ~50 zpráv"]
  FETCH --> DEDUPE["dedupeProviderMessages()\nlib/email/idempotency.ts\nfiltrace duplicit dle providerMessageId"]
  DEDUPE --> MSG_LOOP["Pro každou zprávu"]
  MSG_LOOP --> UPSERT_MSG["prisma.emailMessage.upsert()\ndle providerMessageId"]
  MSG_LOOP --> RESOLVE_CONTACT["resolveOrCreateContact(fromEmail)\nhledá Contact dle emailu (insensitive)"]
  RESOLVE_CONTACT --> EXIST["Existující Contact → vrátí contactId + projectIds"]
  RESOLVE_CONTACT --> NEW["Nový Contact → create + resolveOrganizationByDomain()"]
  NEW --> ORG["resolveOrganizationByDomain(domain)\nporovnává s Organization.website doménami"]
  ORG --> NEW_ORG["Nová Organization (type: COMPANY)"]
  MSG_LOOP --> ACTIVITY["prisma.activity.upsert()\ntype: EMAIL, emailMessageId, aiAnalysis"]
```

---

## 3) Manuální analýza komunikace

UI: `app/email-analyzer/page.tsx`  
Action: `app/email-analyzer/actions.ts` → `analyzeCommunicationAction()`  
Pipeline: `lib/email/analyzer-pipeline.ts` → `runCommunicationAnalysis()`

```mermaid
flowchart TD
  ACTION["analyzeCommunicationAction(formData)\napp/email-analyzer/actions.ts"] --> AUTH["requireCurrentUser()\nlib/authorization.ts"]
  ACTION --> JOB["prisma.emailSyncJob.create()\nstatus: RUNNING, trigger: MANUAL"]
  ACTION --> CONNECTIONS["prisma.emailAccountConnection.findMany()\nfiltr: userId + ACTIVE"]
  CONNECTIONS --> FOR_CONN["Pro každou EmailAccountConnection"]
  FOR_CONN --> DECRYPT["getDecryptedConnection()\nlib/email/token-store.ts"]
  DECRYPT --> REFRESH["Token refresh (pokud expirace < 60s)\nrefreshAccessToken() lib/email/oauth-service.ts"]
  REFRESH --> FETCH["fetchProviderMessages()\nlib/email/provider-client.ts"]
  FETCH --> DEDUPE["dedupeProviderMessages()\nlib/email/idempotency.ts"]
  DEDUPE --> MSG_LOOP["Pro každou zprávu:\nprocessEmailMessageForEnrichment()"]
  MSG_LOOP --> MATCH["matchEmailToProject()\nlib/email/matching.ts"]
  MATCH --> LINK["ProjectEmailLink.upsert()\nconfidence, reason"]
  MSG_LOOP --> AI["analyzeText(subject, body)\nGoogle Gemini 1.5 Flash"]
  AI --> ACTIVITY["Activity.upsert()\ntype: EMAIL, aiAnalysis JSON"]
  ACTIVITY --> TASKS["Task.create() per nextStep\ncontactId = senderContactId"]
  MSG_LOOP --> RESOLVE_CONTACT["resolveOrCreateContact()"]
  MSG_LOOP --> RESOLVE_ORG["resolveOrganizationByDomain()"]
  ACTION --> JOB_DONE["emailSyncJob.update() → COMPLETED\nauditLog.create()"]
```

---

## 4) Párování e-mailu s projektem

Soubor: `lib/email/matching.ts` → `matchEmailToProject()`

| Reason | Confidence | Podmínka |
|---|---|---|
| `contact_email_exact` | 1.0 | `participants.from[0].email` = email kontaktu projektu |
| `organization_domain` | 0.7 | Doména odesílatele = doména webu organizace kontaktu |
| `keyword_alias` | 0.45 | subject/snippet/body obsahuje název projektu nebo `keywordAliases` |

Výsledek: `{ matched: boolean, confidence: number, reason: string }`

Pokud `matched: true` → `ProjectEmailLink.upsert()` (unique: `projectId_emailMessageId`)

---

## 5) AI analýza textu

Soubor: `lib/email/analyzer-pipeline.ts` → `analyzeText(subject, bodyText)`

```mermaid
flowchart LR
  INPUT["subject + snippet + bodyText"] --> GEMINI["GoogleGenerativeAI\nmodel: gemini-1.5-flash\nresponse: application/json"]
  GEMINI --> PARSE["parseAnalyzerOutput(raw)\nsanitizeJson() → JSON.parse()"]
  PARSE --> OUTPUT["AnalyzerOutput {\n  summary: string\n  themes: string[]\n  risks: string[]\n  nextSteps: {title, dueDays}[]\n}"]
  PARSE -->|"parse error"| FALLBACK["Fallback:\nsummary: 'Analyzer fallback: structured extraction unavailable'\nthemes: [], risks: [], nextSteps: []"]
  OUTPUT --> ACTIVITY["Activity.aiAnalysis (Json)"]
  OUTPUT --> TASKS["Task per nextStep\ndueDate = now + dueDays"]
```

**Fallback bez API key:** pokud `GOOGLE_AI_API_KEY` chybí, vrátí se `"Analyzer skipped: GOOGLE_AI_API_KEY is missing."` — ne error, aplikace pokračuje.

---

## 6) Test endpoint (debug)

Soubor: `app/api/debug/test-email-analysis/route.ts`

```mermaid
flowchart TD
  REQ["POST /api/debug/test-email-analysis"] --> AUTH["requireCurrentUser()"]
  AUTH --> EXISTING["prisma.contact.findFirst(email not null)"]
  EXISTING --> MOCK["buildMockMessage() × 3\n1. existující kontakt\n2. nový lead\n3. nová doména"]
  MOCK --> TEST["runMockEmailEnrichmentTest(userId, messages)\nlib/email/analyzer-pipeline.ts"]
  TEST --> TEMP_CONN["prisma.emailAccountConnection.create()\ndebug-sync@innovation.local"]
  TEMP_CONN --> PIPELINE["processEmailMessageForEnrichment() × 3"]
  PIPELINE --> CLEANUP["prisma.emailAccountConnection.delete()\n→ cascade smaže EmailMessage"]
  CLEANUP --> RESP["JSON response:\nsimulatedEmails, enrichmentResult, createdInDb delta"]
  AUTH -->|"Unauthenticated"| ERR["500: You must be signed in to continue."]
```

**Požadavky:** přihlášený Kinde uživatel, DB s tabulkou `Task.contactId` (migrace `20260430231232_task_contact_link`).

---

## 7) Automatický sync (cron endpoint)

Soubor: `app/api/email/sync/route.ts`  
Ochrana: `lib/security/sync-auth.ts`

```mermaid
flowchart TD
  CRON["POST /api/email/sync\n(Bearer token nebo HMAC)"] --> SEC["lib/security/sync-auth.ts\nHMAC signature + nonce + anti-replay + rate limit"]
  SEC --> SETTINGS["prisma.projectEmailAutomationSetting.findMany()\nfiltr: enabled: true"]
  SETTINGS --> FOR_PROJ["Pro každý projekt s automatikou"]
  FOR_PROJ --> ANALYSIS["runCommunicationAnalysis(userId, projectId)"]
  ANALYSIS --> JOB["EmailSyncJob záznam (audit)"]
```

**Env vars pro cron:** `EMAIL_SYNC_CRON_SECRET` (volitelné Bearer token) nebo HMAC signing.

---

## 8) Side effects a integrity dat

- `resolveOrCreateContact()` může vytvořit nové `Contact` a `Organization` záznamy při každé analýze.
- `prisma.task.create()` s `contactId` → pokud contact byl smazán mezitím, FK je `onDelete: SetNull` → task zůstane, `contactId = null`.
- `runMockEmailEnrichmentTest()` smaže dočasný `EmailAccountConnection` v `finally` bloku → cascade smaže `EmailMessage`, ale ne `Activity` (má `onDelete: SetNull` na `emailMessageId`).
- `EmailSyncJob` zůstane v DB vždy — pro audit log.

---

## 9) Navigace na related poznámky

- [[Email Analyzer]] – produktový přehled + implementační detaily
- [[../06_Data_Model/Data Model]] – datový model Email entit
- [[../09_Security/Security]] – šifrování tokenů, OAuth state, env vars
- [[../11_Implementation/Local Development & DB Reset]] – debug + local setup
- [[../12_System_Memory/System Memory Map]] – celková architektura
