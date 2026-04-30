# Email Analyzer

## Přehled

Email Analyzer v2 umožňuje připojit Gmail nebo Outlook účet, synchronizovat e-mailovou komunikaci, automaticky ji spárovat s projekty a analyzovat pomocí AI (Google Gemini 1.5 Flash).

Stav: **HOTOVO** (merged v PR #1, duben 2026)

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

## AI analýza (Gemini 1.5 Flash)

Pro každý spárovaný e-mail se volá `analyzeText()`.

Výstup (AnalyzerOutput):
```json
{
  "summary": "Krátké shrnutí.",
  "themes": ["IP", "market validation"],
  "risks": ["Missing IP status"],
  "nextSteps": [{ "title": "Book startup mentor call", "dueDays": 5 }]
}
```

Výstup se uloží do `Activity.aiAnalysis` (Json). Z `nextSteps` se automaticky vytvoří `Task` záznamy.

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
