# Next Steps

Aktualizováno: 2. 5. 2026.

## Hotovo (duben 2026)

- ✅ CRM (projekty, kontakty, organizace, aktivity, úkoly)
- ✅ Pipeline management (5 fází)
- ✅ Recommendation engine (rule-based, 10 pravidel)
- ✅ Auth a role (Kinde Auth)
- ✅ Šablony dokumentů (Supabase Storage)
- ✅ Email Analyzer v2 (Gmail + Outlook OAuth, AI analýza, aktivity, úkoly)
- ✅ Ghost migrace fix (`20260430231232_task_contact_link`) + bezpečný DB reset (`reset-db-safe.sh`)
- ✅ Email Analyzer enrichment feed (interaktivní seznamy + mazání kontaktů/úkolů)
- ✅ Test mode toggle: `Simulovat testovací data` přes `/api/debug/test-email-analysis`
- ✅ Server config hard-fail fix: layout/auth route nepadá globálně při chybějících `KINDE_*` proměnných

## Hotovo (2. 5. 2026 – University CRM & AI Email update)

- ✅ **Gemini 2.0 Flash Lite** – upgradován model ve všech AI volání (`analyzeText`, `analyzeTaskSuggestionsWithGemini`, `processCommunicationAction`)
- ✅ **University Phase Detection** – AI detekuje fázi projektu: IDEATION / CONTRACTING / IMPLEMENTATION / DELIVERY; ukládá se do `analysisMetadata.suggestedUniversityPhase`
- ✅ **Meeting Datetime Extraction** – pole `meetingDatetimes: string[]` (ISO 8601) v `analysisMetadata`; připraveno pro Google Calendar napojení
- ✅ **Draft to Task workflow** – SUGGESTED úkoly mají inline Accept/Edit formulář v enrichment panelu; `acceptSuggestedTaskAction` nastavuje `suggestionStatus: ACCEPTED`
- ✅ **UniversityPhase DB schema** – přidán `enum UniversityPhase` a `Project.universityPhase` do `schema.prisma`; **POŽADOVÁNA migrace: `npx prisma db push && npx prisma generate`**
- ✅ **University phase constants** – `universityPhaseLabels`, `universityPhaseDescriptions`, `pipelineStageToUniversityPhase` v `lib/constants.ts`

## Nejbližší možné kroky

### Email Analyzer – navazující kvalita (po změně 2026-05-02)
- Přidat cílené testy parseru deadline normalizace (`do pátku`, `next Friday`, `10.5.`, `5/10`).
- Rozhodnout, jak chceme produktově řešit ambiguous slash datum (`MM/DD` vs `DD/MM`).
- Doplnit do `/email-analyzer` UI zobrazení `intentCategory`, `actionItems`, `gapAnalysisQuestions`.
- Připravit fixture sadu reprezentativních e-mailů pro 4 intent kategorie a pravidelně ji pouštět v testech.
- Detail progressu: `[[99_Notes/PROGRESS-2026-05-02-Email-Analyzer-Intent-Action-Gap]]`.

### Scoring model
Přidat scoring formulář na detail projektu. Data pro `potentialLevel` jsou v DB, chybí UI a výpočet.

### Expert matching
Přidat model Expert do Prisma schématu + databázi expertů + párování podle role.

### Analytický dashboard
Přidat funkční metriky na dashboard – funnel, konverze, stagnující projekty.

### kindeId na User modelu
Přidat `kindeId` jako unique field na User model – aktuálně upsert probíhá jen přes email.

### Ops hygiene pro env na Vercelu
Zkontrolovat, že všechny `KINDE_*` a `DATABASE_URL` proměnné jsou nastavené ve všech prostředích (Preview + Production), aby auth běžel bez omezeného režimu.

### Automated email sync
Nastavit cron job pro `POST /api/email/sync` s `EMAIL_SYNC_CRON_SECRET` – aktuálně jen manuální sync.

### Gmail push webhooky
Implementovat Google Gmail Push Notifications (watch/history webhook flow), aby synchronizace nebyla jen jednorázová po OAuth nebo periodická přes cron.

## Technický dluh

- `middleware.ts` – používá `req: any`, mělo by být typované
- `lib/auth.ts` – poznámka o chybějícím `kindeId` v schématu
- Audit log je jen pro email import; měl by pokrýt i CRM operace

## Klíčová hodnota produktu

Největší hodnota není v evidenci samotné, ale v kombinaci:
- CRM + metodika pipeline
- Rule-based doporučení → akční kroky
- E-mailová analýza → automatické aktivity a úkoly
- Analytika (plánovaná) → strategická rozhodnutí
