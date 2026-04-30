# Open Questions & Next Steps

Aktualizováno: 1. 5. 2026
Stav: po opravě DB migrace a test-email-analysis endpointu.

---

## Immediate next steps

Kroky, které dávají smysl ihned:

1. **Přidat `kindeId` na User model** — aktuálně upsert probíhá jen přes `email`; pokud uživatel změní email v Kinde, duplicita nebo ztráta vazeb. Viz komentář v `lib/auth.ts:103`. Low risk pro MVP, ale needs fix před production scale.

2. **Ověřit Email Analyzer end-to-end s reálným Gmail připojením** — po opravě migrace je DB v pořádku, ale reálný OAuth flow (`GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `EMAIL_TOKEN_ENCRYPTION_KEY`) musí být ověřen lokálně.

3. **Nastavit automated email sync (cron)** — endpoint `POST /api/email/sync` existuje, ochrana je přes HMAC/nonce (`lib/security/sync-auth.ts`), ale není nastaven žádný scheduler. Bez cronu je sync jen manuální.

4. **Spustit `npm run dev` a ověřit aplikaci v browseru** — po resetu DB ověřit, že všechny stránky fungují: `/projects`, `/contacts`, `/organizations`, `/tasks`, `/email-analyzer`.

---

## Documentation next steps

1. Ověřit a doplnit `app/email-analyzer/actions.ts` do [[02_CRM/Email Analyzer]] — aktuálně chybí popis Server Actions pro email analyzer page.
2. Doplnit popis `app/api/email/sync/route.ts` — HMAC auth flow není zdokumentován detailně.
3. Zdokumentovat Supabase Storage flow (`lib/supabase-storage.ts`) v kontextu šablon/dokumentů.
4. Přidat flow diagram pro middleware auth gate do [[09_Security/Security]].
5. Přidat diagram pro `lib/email/matching.ts` — tři úrovně párování s confidence skórem.

---

## Architecture next steps

1. **Oddělit `getProjectById` side-effect** — aktuálně `getProjectById()` v `lib/data.ts` spouští `syncProjectRecommendations()` jako side effect při každém read. Read funkce by neměla měnit DB. Doporučení: přesunout sync do dedikovaného lifecycle hooku nebo `revalidatePath` post-action.

2. **Background job queue pro email sync** — aktuálně běží `runCommunicationAnalysis` synchronně v HTTP requestu; pro produkci je potřeba async queue (Vercel background functions nebo external queue).

3. **EmailSyncJob orchestrace** — job se vytvoří ve stavu RUNNING při spuštění, ale pokud server crashne, zůstane v RUNNING navždy. Přidat timeout/recovery logiku.

4. **Deduplikace organizací** — `resolveOrganizationByDomain()` matchuje přes `website` doménu, ale normalizace je fragile (viz `normalizeWebsiteDomain()`). Potenciální duplikáty pokud website má nestandartní formát.

5. **`prisma migrate deploy` vs `migrate reset`** — pro produkci je nutné nikdy nepoužívat `reset`, jen `deploy`. Lokální reset skript je správně oddělený.

---

## Security / reliability next steps

1. **AuditLog** — pokrývá jen `email.analysis.imported`. CRM akce (create/update/delete project, contact, org) nejsou auditovány. Pro enterprise nasazení je potřeba rozšíření.

2. **Middleware typování** — `middleware.ts` používá `req: any`. Mělo by být typováno. Low severity.

3. **Token refresh race condition** — `refreshAccessToken()` v `analyzer-pipeline.ts` je volán bez distributed locking. Pokud by běželo více parallelních syncí pro jeden connection, mohlo by dojít k race condition na token refresh.

4. **Rate limiting pro sync endpoint** — `lib/security/sync-auth.ts` implementuje nonce + anti-replay, ale rate limit je jen v paměti (process-local). V multi-instance produkčním deploymentu by bylo potřeba Redis nebo DB-backed rate limiting.

5. **`EMAIL_TOKEN_ENCRYPTION_KEY` rotation** — není řešen postup pro rotaci šifrovacího klíče. Při rotaci by bylo potřeba re-encrypt všechny tokeny v DB.

6. **BOOTSTRAP_ADMIN_EMAILS** — bootstrap admin mechanismus je vhodný jen pro initial setup; v produkci by měl být zakázán nebo odstraněn po prvotní konfiguraci.

---

## Product next steps

### Outlook support
Model `EmailProvider` enum má `OUTLOOK`. Connect endpoint existuje pro `[provider]` parameter. Chybí `MICROSOFT_OAUTH_CLIENT_ID/SECRET` konfigurace a testování. Provider client v `lib/email/providers/` pravděpodobně obsahuje Outlook implementaci (`needs verification`).

### Scoring UI
`Project.potentialLevel` (LOW/MEDIUM/HIGH) je v DB, ale nastavuje se ručně. Plánovaný scoring formulář (5 kritérií × 0–20 bodů) by automaticky vypočítal `potentialLevel`. Viz [[11_Implementation/Implementation Plan]] Fáze 5.

### Analytics / reporting dashboard
Dashboard existuje (`/` nebo `/dashboard` `needs verification`), ale bez agregovaných metrik. Potřeba: funnel projekty po fázích, konverzní rate, průměrné časy ve fázi, email aktivity.

### Recommendation prioritization
Aktuálně jsou všechna doporučení stejně prioritizována. Přidat `priority` nebo `urgencyScore` na `Recommendation` model pro lepší UX.

### Better onboarding dashboard
První přihlášení → nový uživatel vidí prázdné CRM. Potřeba: onboarding checklist nebo welcome screen s instrukcemi pro připojení Gmailu a vytvoření prvního projektu.

### Email automation controls UI
`ProjectEmailAutomationSetting` (enabled, schedule, contacts, domains, keywords) existuje v DB i UI na detailu projektu, ale není jasné, kde přesně (`needs verification`). Přidat přehledné ovládání per-projekt.

### Sync observability / admin UI
`EmailSyncJob` záznamy ukládají historii syncí, ale není UI pro jejich prohlížení. Admin by měl vidět historii jobů, chyby, statistiky.

### Gmail push webhooks
Aktuálně je sync jen jednorázový po OAuth nebo periodický přes cron. Gmail Watch API (push notifications) by umožnil real-time reakci na nové maily.

---

## Technical debt

| Oblast | Problém | Závažnost |
|---|---|---|
| `lib/data.ts` | `getProjectById()` má read+write side-effect (recommendation sync) | Střední |
| `middleware.ts` | `req: any` — chybí typování | Nízká |
| `lib/auth.ts` | Upsert uživatele jen přes email, bez kindeId | Střední |
| `analyzer-pipeline.ts` | Token refresh bez distributed locking | Střední (produkce) |
| `lib/security/sync-auth.ts` | In-memory rate limit (nefunguje multi-instance) | Střední (produkce) |
| `resolveOrganizationByDomain()` | Fragile domain normalizace → potenciální duplikáty | Nízká |
| AuditLog | Pokrývá jen email import, ne CRM akce | Střední |
| Seed | Neobsahuje EmailAccountConnection (test endpoint vyžaduje přihlášení) | Nízká |
| `npx prisma migrate reset` vs `deploy` | Lokální reset skript je oddělen, ale dokumentace musí varovat | Nízká |

---

## Open questions

1. **Výchozí role pro nové uživatele** — `ensureUserInDb()` přiřadí `VIEWER` pokud Kinde nevrátí roli. Je to správné defaultní chování pro production? Kdo schvaluje upgrade na MANAGER/EVALUATOR?

2. **Multi-tenant izolace** — aktuálně všichni ADMIN/MANAGER uživatelé vidí všechny projekty. V případě více institucí je potřeba přidat `institutionId` nebo tenant scope na `Project` a `User`.

3. **Kdo spravuje crony** — cron job pro `POST /api/email/sync` není nastaven. Vercel cron? Externý scheduler? Frekvence?

4. **Storage pro dokumenty** — `lib/supabase-storage.ts` je v kódu, ale `SUPABASE_*` env vars nejsou v `.env.example` viditelné (`needs verification`). Funguje to lokálně?

5. **Outlook OAuth** — je Outlook provider client implementován nebo jen stub?

6. **Recommendation sync side-effect** — stačí mít sync doporučení jako read side-effect, nebo je potřeba explicitní trigger (po editaci projektu)?

7. **Email Analyzer v produkci** — je `runCommunicationAnalysis` bezpečné pouštět synchronně v API route, nebo je potřeba Vercel background function?

8. **GDPR / datová ochrana** — e-maily jsou ukládány v DB (subject, body, participants). Jaká je retention policy? Kdo může mazat?
