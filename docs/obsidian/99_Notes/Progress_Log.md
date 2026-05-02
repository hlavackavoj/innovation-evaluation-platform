# Progress Log

Aktualizováno: 3. 5. 2026 (session 3)

## 2026-05-03 — Task/Project UI Fusion, Email Analyzer Fix, Security Hardening

### sanitizeJson — Robustní parsování LLM výstupu (`lib/email/analyzer-pipeline.ts`)
- Předchozí verze zachytila markdown code block pouze pokud byl na začátku odpovědi.
- Nová verze: fast-path pro válídní JSON (`startsWith("{")`), regex pro code block kdekoliv v odpovědi (`/```(?:json)?\s*([\s\S]*?)```/`), fallback na extrakci podle prvních/posledních závorek.
- Dopad: Gemini odpovědi s prose preamble nebo inline fencingem se nyní správně parsují namísto selhání.

### createTaskAction — Nová server action (`app/tasks/actions.ts`)
- Přidán `createTaskAction(formData)`: vytvoří `Task` s `suggestionStatus: ACCEPTED`, `status: TODO`.
- Validace: autorizace přes `requireCurrentUser` + `buildAccessibleProjectWhere`, ověření přístupu k projektu.
- `revalidatePath` na `/tasks` i `/projects/{id}`.

### UI: Vytvoření úkolu z projektu (`app/projects/[id]/page.tsx`)
- Sidebar Tasks karta přejmenována na "Milníky & úkoly" (CZ terminologie).
- Přidán inline formulář "Přidat úkol" s `projectId` jako hidden input — auto-binding na kontext projektu.
- Pole: název (required), priorita (LOW/MEDIUM/HIGH/URGENT), termín (date picker), popis.

### UI: Vytvoření úkolu z globálního přehledu (`app/tasks/page.tsx`)
- Stránka přejmenována "Čekající milníky".
- Přidána sekce "Nový úkol" v horní části se selektorem projektu, prioritou, date pickerem a popisem.
- Import `createTaskAction` z `@/app/tasks/actions`.

### Bezpečnost — audit
- Ověřeno: `GOOGLE_AI_API_KEY` není nikde logován — používá se výhradně k inicializaci `GoogleGenerativeAI()`.
- Ověřeno: `addProjectDocumentAction` má `requireProjectAccess(projectId, { write: true })` na prvním řádku.
- Odstraněny verbose debug logy z `processEmailMessageForEnrichment`: `console.log("AI Analysis Result:", data)` a `console.log("[email-enrichment] Persisting analysisMetadata", ...)`.



## 2026-05-02 — University Features: Calendar Bridge, Phase Triggers, Race Fix, Dashboard

### Race Condition Fix — `createSuggestedTaskIfMissing`
- Odstraněn `findFirst → create` TOCTOU pattern.
- Přidán `@@unique([sourceActivityId, projectId, title], map: "task_suggestion_dedup")` do `Task` modelu v `schema.prisma`.
- `create` obaleno try/catch P2002 — duplicitní zápis vrátí `null`, idempotence garantována na DB vrstvě.
- Vyžaduje: `npx prisma db push && npx prisma generate` na cílové DB.

### Auth Debug Hardening — `/api/debug-auth`
- Endpoint nově vyžaduje `dbUser.role === "ADMIN"` → 403 pro ostatní role.
- Exportovány `resolveRoleFromSources` a `resolveBootstrapAdminRole` z `lib/auth.ts`.
- Response nově obsahuje `mappingTrace.resolvedDbRole`, `mappingTrace.mappedFromKinde`, `mappingTrace.bootstrapAdminMatch`.

### Phase Triggers — `lib/email/phase-triggers.ts`
- Nový soubor s keyword-based detekcí fáze: smlouva/podpis → CONTRACTING, grant/budget → CONTRACTING, realizace/kick-off → IMPLEMENTATION, závěrečná zpráva/deliverable → DELIVERY, výzkumný záměr → IDEATION.
- Integrován jako fallback do `analyzer-pipeline.ts`: `suggestedUniversityPhase: data.suggestedUniversityPhase ?? detectPhaseFromText(joinedText)`.

### Calendar Bridge
- Exportován typ `CalendarProposal` z `lib/email/analysis-metadata.ts`.
- Parser `parseCalendarProposals()` přidán do `parseAnalysisMetadata()`.
- Nový `lib/email/calendar-utils.ts`: `buildIcsContent`, `buildIcsAllDayContent`, `buildGoogleCalendarUrl`, `buildGoogleCalendarAllDayUrl`.
- `enrichment-panel.tsx`: sekce "Navržené termíny" s tlačítky ICS a Google Kalendář pro každý `calendarProposal` s platným datem.

### Dashboard — Urgentní milníky
- `getDashboardData()` vrací `urgentTasks` (URGENT/HIGH priority, TODO/IN_PROGRESS, max 6 záznamů).
- `app/page.tsx`: nová karta "Výzkumné milníky — Čekající akce" s amber/rose vizuálním stylem a ikonami.
- Stat labely přejmenováno: "Total Projects" → "Výzkumné projekty", "Pending Tasks" → "Čekající milníky".
- Dashboard description, prázdné stavy a sekce přejmenovány do akademické CZ terminologie.
- `enrichment-panel.tsx`: terminologický rebrand (Analyzovat korespondenci, Výsledky analýzy, Příchozí/Odchozí, opravený backtick leak v subtitle).

## Nedávné úspěchy

- SQL Fix: Oprava kritického bugu s uvozovkami v `$queryRawUnsafe`, který způsoboval pád `42703`.
- Pipeline Robustness: Implementace fallbacků pro Gemini JSON parsování.
- Project Mapping: Zprovoznění prioritního mapování projektů (`projectName -> projectRef -> projectId`).
- Schema Alignment: Potvrzení shody mezi `schema.prisma` a Neon DB (sloupce `bodyContent`, `analysisMetadata`).

## 2026-05-02 — Auth & Role Access Fix (Kinde -> DB -> UI)

- Diagnostika potvrdila, že primární zátas byl v mapování rolí z Kinde claimů: parser neprocházel obecně vnořené struktury role payloadu, takže fallbackoval na `VIEWER`.
- Opraven `lib/auth.ts`: role parser nyní rekurzivně čte i nested claim hodnoty; při každém loginu se DB role synchronizuje přímo z Kinde (source of truth) + emergency email override.
- Opraven `lib/kinde-roles.ts`: middleware role parser nyní také pokrývá nested role claim struktury, takže route gate neodmítá validního admina kvůli formátu claimu.
- Přidán dočasný auth debug log v `ensureUserInDb()` pod `AUTH_DEBUG=1` pro inspekci session payloadu (`getUser`, `getRoles`, `roles` claim, mapped role, resolved DB role).
- Emergency admin fallback: `AUTH_EMERGENCY_ADMIN_EMAILS` (fallback na `BOOTSTRAP_ADMIN_EMAILS`) vynutí `ADMIN` roli bez ohledu na předešlý stav v DB.

## 2026-05-02 — Prisma Audit (P2022 university_phase)

- File Check: `prisma/schema.prisma` fyzicky obsahuje `Project.universityPhase   UniversityPhase? @map("university_phase")`; pole nebylo potřeba doplňovat.
- Usage Check: použití `universityPhase` potvrzeno v aplikačním kódu (`lib/constants.ts`) i v Prisma modelu `Project`.
- Client Regen: spuštěno `npx prisma generate`; v `node_modules/.prisma/client/index.d.ts` je `universityPhase` přítomné ve vstupních i výstupních typech modelu `Project`.
- Git/Ignore Check: `.gitignore` neignoruje `prisma/schema.prisma` (nalezeny jen `prisma/dev.db` a `prisma/dev.db-journal`).
- Auth Sync Check: žádná změna modelu `User` ani enumu `UserRole`; admin role flow zůstává beze změny.
- Závěr: chyba `P2022` na Vercelu je konzistentní s DB schéma driftem v cílové databázi (sloupec `university_phase` v nasazené DB chybí), nikoli s lokálním Prisma klientem.
