# Email Analyzer

## Přehled

Email Analyzer v2 umožňuje připojit Gmail nebo Outlook účet, synchronizovat e-mailovou komunikaci, automaticky ji spárovat s projekty a analyzovat pomocí AI (Google Gemini 2.0 Flash Lite).

Stav: **AKTIVNĚ ROZVÍJENO** (v2 hotovo duben 2026; university fáze + Draft-to-Task, květen 2026)

## Architektura

```
OAuth connect → EmailAccountConnection (šifrované tokeny)
    ↓
fetchProviderMessages() → NormalizedEmailMessage[]
    ↓
dedupeProviderMessages() → deduplikace
    ↓
matchEmailToProject() → ProjectEmailLink (confidence, reason)
    ↓
analyzeText() / Gemini → AnalyzerOutput
    ↓
Activity (type: EMAIL, aiAnalysis JSON)
    ↓
Task[] (z nextSteps výstupu AI)
```

## Klíčové soubory

| Soubor | Popis |
|---|---|
| `lib/email/analyzer-pipeline.ts` | Hlavní pipeline: fetch → dedupe → match → analyze → persist |
| `lib/email/matching.ts` | Logika párování e-mailu s projektem |
| `lib/email/oauth-service.ts` | OAuth token refresh |
| `lib/email/oauth-state.ts` | Ochrana OAuth state (CSRF) |
| `lib/email/provider-client.ts` | Gmail a Outlook API volání |
| `lib/email/provider-config.ts` | OAuth konfigurace providerů |
| `lib/email/token-store.ts` | Šifrované čtení/zápis tokenů |
| `lib/email/connections.ts` | Helpers pro EmailAccountConnection |
| `lib/email/idempotency.ts` | Deduplikace zpráv |
| `lib/email/types.ts` | Typy (NormalizedEmailMessage, EmailDirection, …) |
| `lib/crypto.ts` | AES šifrování tokenů |
| `lib/security/sync-auth.ts` | Auth pro sync cron endpoint |
| `app/api/email/oauth/[provider]/connect/route.ts` | Zahájení OAuth flow |
| `app/api/email/oauth/[provider]/callback/route.ts` | OAuth callback |
| `app/api/email/oauth/[provider]/disconnect/route.ts` | Odebrání připojení |
| `app/api/email/sync/route.ts` | Manuální/cron sync endpoint |
| `app/email-analyzer/page.tsx` | UI stránka |
| `app/email-analyzer/actions.ts` | Server Actions |
| `components/EmailImportForm.tsx` | Formulář pro spuštění analýzy |
| `components/ProjectCommunicationTree.tsx` | Strom e-mailové komunikace |

## Párování e-mailů s projektem (lib/email/matching.ts)

Tři úrovně párování:

| Reason | Confidence | Podmínka |
|---|---|---|
| `contact_email_exact` | 1.0 | E-mail účastníka = e-mail kontaktu projektu |
| `organization_domain` | 0.7 | Doména účastníka = doména webu organizace kontaktu |
| `keyword_alias` | 0.45 | Subject/snippet/body obsahuje název projektu nebo keyword alias |

## AI analýza (Gemini 2.0 Flash Lite)

Pro každý spárovaný e-mail se volá `analyzeText()`.

### Technické rozhodnutí / Odchylka
Původní specifikace počítala s Gemini 1.5 Flash. Od května 2026 je model upgradován na **gemini-2.0-flash-lite** (nižší latence, lepší JSON compliance). Odkaz: `lib/email/analyzer-pipeline.ts` funkce `analyzeText()` a `analyzeTaskSuggestionsWithGemini()`, také `app/projects/actions.ts`.

Výstup (AnalyzerOutput) – plná struktura:
```json
{
  "summary": "Krátké shrnutí.",
  "intentCategory": "PROPOSAL",
  "themes": ["IP", "market validation"],
  "risks": ["Missing IP status"],
  "nextSteps": [{ "title": "Book startup mentor call", "dueDays": 5 }],
  "actionItems": [{ "task": "Draft SOW", "deadline": "2026-05-10", "assignee_suggestion": "Alice" }],
  "sentimentScore": 7,
  "isUrgent": false,
  "suggestedProjectStage": "DISCOVERY",
  "suggestedUniversityPhase": "CONTRACTING",
  "meetingDatetimes": ["2026-05-05T13:00:00Z"],
  "suggestedActions": [{ "type": "SCHEDULE_MEETING", "title": "...", "proposedDateTime": "2026-05-05T13:00:00Z", "deadline": null, "dueDays": 2 }],
  "followUpQuestions": ["Jaký je schválený rozpočet?"]
}
```

Výstup se uloží do `Activity.aiAnalysis` (plný) a `Activity.analysisMetadata` (strukturovaná metadata).

### University Phase Detection
AI detekuje fázi projektu v kontextu univerzitního prostředí:
- **IDEATION** – nový nápad, počáteční zájem
- **CONTRACTING** – grantové žádosti, NDA, smlouvy, schválení
- **IMPLEMENTATION** – aktivní práce, milníky, průběžné zprávy
- **DELIVERY** – předání výsledků, závěrečné zprávy, spin-off

Hodnota se uloží do `analysisMetadata.suggestedUniversityPhase` (string v JSON).
Po DB migraci (`npx prisma db push`) se ukládá i do `Project.universityPhase` (enum `UniversityPhase`).

### Meeting Datetime Extraction
Pole `meetingDatetimes: string[]` obsahuje všechna navrhovaná data schůzek ve formátu ISO 8601 (připraveno pro budoucí napojení na Google Calendar API).

### Draft to Task Workflow
AI navrhuje úkoly se stavem `suggestionStatus: SUGGESTED`. Uživatel je přijímá přes UI:
1. V sekci "Detekované úkoly" klikne na **Přijmout** u SUGGESTED úkolu.
2. Zobrazí se inline formulář s editable: title, description, priority, dueDate.
3. Po kliknutí na **Uložit** se volá `acceptSuggestedTaskAction()` → `suggestionStatus: ACCEPTED`.
4. Nepotřebné úkoly lze smazat přes **Smazat**.

Výstup se uloží do `Activity.aiAnalysis` (Json). Z `nextSteps` + Gemini task suggestions se vytvoří `Task` záznamy se stavem `SUGGESTED`.

## EmailSyncJob

Každý běh synchronizace vytvoří `EmailSyncJob` záznam pro audit:
- `trigger` – MANUAL nebo SCHEDULED
- `status` – QUEUED → RUNNING → COMPLETED / FAILED
- `importedEmails`, `matchedContacts`, `suggestedContacts`, `generatedTasks`
- `summary` – JSON přehled témat, rizik, next steps

## Email automation nastavení (per projekt)

Model `ProjectEmailAutomationSetting`:
- `enabled` – automatická synchronizace
- `schedule` – DAILY nebo WEEKLY
- `keywordAliases` – klíčová slova pro keyword matching
- `contacts` – kontakty sledované pro párování
- `domains` – domény sledované pro domain matching

Nastavuje se na detailu projektu.

## Env vars

```
EMAIL_TOKEN_ENCRYPTION_KEY      # AES klíč pro šifrování tokenů
EMAIL_OAUTH_STATE_SECRET        # Podpis OAuth state
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
MICROSOFT_OAUTH_CLIENT_ID
MICROSOFT_OAUTH_CLIENT_SECRET
NEXT_PUBLIC_APP_URL
EMAIL_SYNC_CRON_SECRET          # Bearer token pro cron endpoint (volitelné)
```

## OAuth redirect URIs

Pro nasazení je potřeba nastavit:
- Google: `https://your-domain.com/api/email/oauth/gmail/callback`
- Microsoft: `https://your-domain.com/api/email/oauth/outlook/callback`

Gmail scope: `openid`, `email`, `https://www.googleapis.com/auth/gmail.readonly`
Outlook delegated permissions: `openid`, `email`, `offline_access`, `Mail.Read`, `User.Read`

## Implementace

### Stabilizace po ghost migraci (květen 2026)

- DB schema je potvrzeně v syncu po aplikaci migrace `20260430231232_task_contact_link` (oprava chybějícího `Task.contactId`).
- Přidán bezpečný reset skript `scripts/reset-db-safe.sh`; lokální reset už nepočítá s cache artefakty.
- Endpoint `POST /api/debug/test-email-analysis` vrací správně `401` pro nepřihlášeného uživatele (místo obecného `500`) a strukturovanou chybu.
- Globální "Server configuration error" byl zjemněn: layout už nepadá na chybějících `KINDE_*` env var, místo toho běží v omezeném režimu a auth route vrací kontrolovaný `503` s chybějícími proměnnými.

### UX update: interaktivní enrichment feed (květen 2026)

- Feed na `/email-analyzer` má interaktivní sekce:
  - Nově vytvořené kontakty (jméno + firma + e-mail),
  - Detekované úkoly (priorita + vazba na kontakt),
  - Nové organizace.
- Přidán toggle `Simulovat testovací data`; při zapnutí tlačítko analyzace volá `POST /api/debug/test-email-analysis` místo Gmail sync flow.
- Mazání je dostupné přímo u položek feedu:
  - `deleteContact(contactId)`
  - `deleteTask(taskId)`
- UI mazání běží přes `useTransition`, takže zůstává plynulé a po akci se dělá `router.refresh()`.

### Data Enrichment Flow

Aktuální flow už není jen import, ale aktivní CRM enrichment:

1. E-mail se načte z providera a deduplikuje (`providerMessageId`).
2. Zpráva se uloží/aktualizuje v `EmailMessage`.
3. Z `participants.from[0].email` se vezme doména:
   - pokud doména neexistuje mezi `Organization.website` doménami, vytvoří se nová `Organization` (`type: COMPANY`).
4. Z e-mailu odesílatele se hledá `Contact`:
   - pokud neexistuje, vytvoří se nový kontakt (`role: External Email Contact`) a napojí se na existující/novou organizaci.
5. AI analýza (`analyzeText`) proběhne nad subject/body a výstup se zaloguje (`console.log("AI Analysis Result:", data)`).
6. Každý e-mail se uloží jako `Activity` typu `EMAIL` (včetně `aiAnalysis` JSON).
7. Z `nextSteps` se vytvoří `Task` záznamy a každý task se napojí na kontakt přes `Task.contactId` (i u nového leadu).
8. Souhrn enrichmentu se uloží do `EmailSyncJob.summary` (počty importů, kontaktů, organizací, aktivit, tasků).

### Enrichment Feed + mazání dat

Na stránce `/email-analyzer` je pod Summary interaktivní feed se třemi sekcemi:
- nově vytvořené kontakty,
- detekované úkoly,
- nově vytvořené organizace (domény).

Každý řádek obsahuje deep link do CRM detailu (`/contacts/[id]`, `/tasks/[id]`, `/organizations/[id]`) a akci smazání.

Mazání běží přes Server Actions:
- `deleteContactAction(contactId)`
- `deleteTaskAction(taskId)`
- `deleteOrganizationAction(organizationId)`

UI používá potvrzení (`confirm`) a po úspěšném smazání provede reaktivní refresh feedu (`useTransition` + `router.refresh()`), takže změna je okamžitě vidět bez manuálního reloadu.

### Jak interaktivně pracovat s výsledky analýzy

1. Otevři `/email-analyzer` a spusť analýzu přes **Analyze Communication**.
2. Pro testovací scénář zapni toggle **Simulovat testovací data**:
   - analýza se přesměruje na `POST /api/debug/test-email-analysis`,
   - provider/direction filtry se v UI zamknou (aby bylo jasné, že běží debug flow).
3. Pod Summary sleduj sekci **Enrichment Results**:
   - **Nově vytvořené kontakty**,
   - **Nové organizace**,
   - **Detekované úkoly**.
4. U každé položky můžeš kliknout na **Smazat**:
   - UI zobrazí potvrzení (`confirm`),
   - během akce se zobrazí loading stav (spinner),
   - po úspěchu se zobrazí potvrzení a seznam se okamžitě obnoví.
5. Detail položky otevřeš přes odkaz v kartě (kontakt/organizace/úkol) a můžeš pokračovat v CRM workflow.

### Integrita dat při mazání (Prisma relace)

- `Task.contactId` má `onDelete: SetNull`:
  - při smazání kontaktu se task nemaže, jen se odpojí (`contactId = null`).
- `Contact.organizationId` má `onDelete: SetNull`:
  - při smazání organizace kontakty zůstávají, jen ztratí vazbu na organizaci.
- `ProjectContact` má na obou FK `onDelete: Cascade`:
  - při smazání kontaktu se automaticky smažou junction linky kontakt-projekt.

### OAuth callback a perzistence tokenů

- Callback běží v `app/api/email/oauth/[provider]/callback/route.ts`.
- Pro Gmail se `authorization_code` vyměňuje za tokeny přes `google-auth-library` (`OAuth2Client.getToken(code)`), pro Outlook přes provider token endpoint.
- `access_token` i `refresh_token` se ukládají přes `upsertEmailConnection()` (`lib/email/token-store.ts`).
- Tokeny jsou v DB uloženy šifrovaně (`encryptedAccessToken`, `encryptedRefreshToken`) pomocí `lib/crypto.ts` a klíče `EMAIL_TOKEN_ENCRYPTION_KEY`.
- `state` parametr obsahuje podepsaný `userId`, `provider`, `returnPath`; callback validuje podpis přes `parseOAuthState` (CSRF ochrana).
- Po callbacku je uživatel vrácen na původní `returnPath` a dostane `toast=provider-connected`.

### Initial sync po připojení Gmailu

- Po úspěšném callbacku se spouští stínová synchronizace posledních 50 e-mailů (`runPostConnectInitialSync` v `lib/email/post-connect-sync.ts`).
- Pro každý importovaný e-mail:
  - uloží se / aktualizuje `EmailMessage`,
  - z odesílatele (`participants.from[0]`) se hledá `Contact` podle e-mailu,
  - pokud `Contact` neexistuje, vytvoří se nový lead (`role: External Email Contact`),
  - z domény e-mailu se hledá/vytváří `Organization` (mapování přes `website` doménu),
  - e-mail se zapíše jako `Activity` typu `EMAIL` (vazba přes `emailMessageId`).
- Pokud kontakt není napojen na projekt, systém použije fallback výběr projektu (podle organizace nebo poslední dostupný projekt uživatele), aby Activity měla platný `projectId`.
