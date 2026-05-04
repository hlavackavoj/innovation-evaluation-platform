# Progress Log

Aktualizováno: 3. 5. 2026 (session 5)

## 2026-05-03 — Email Analysis Debug

### Investigace 6 e-mailů od `hlavackavojtech@gmail.com`

#### Data Search — Posledních 6 záznamů v EmailMessage
| providerMessageId | Subject | Direction | SentAt |
|---|---|---|---|
| 19de8e9021d6b015 | Update k projektu a dotaz na další fázi | inbound | 2026-05-02 13:37 |
| 19de8e8c70ed40e7 | Faktura za duben - Innovation Platform | inbound | 2026-05-02 13:37 |
| 19de8e874598c53a | URGENTNÍ: Nefunguje přihlašování na produkci! | inbound | 2026-05-02 13:37 |
| 19de8e79268be472 | Poptávka: Redesign webu pro e-shop s kávou | inbound | 2026-05-02 13:36 |
| 19de8e75646e186b | Re: Schůzka k integraci platební brány | inbound | 2026-05-02 13:35 |
| 19de8e64bb53c4ec | Schůzka k integraci platební brány | inbound | 2026-05-02 13:34 |

#### Metadata Audit — analysisMetadata v Activity
**Výsledek:** Žádné Activity záznamy pro těchto 6 e-mailů neexistují — `analysisMetadata` je prázdné. Pipeline se zasekla před fází analýzy, takže `actionItems` ani `calendarProposals` nebyly detekovány.

#### Pipeline Trace — Root Cause

**Příčina selhání:** `resolveProjectIdForActivity` vrátilo `null` → pipeline silently bailovala na řádku 1281 (`if (!projectIdForActivity) return`).

**Proč `null`:**
1. Žádný explicitní `projectId` v jobu (sync bez výběru projektu).
2. Kontakt `hlavackavojtech@gmail.com` nemá žádné `ProjectContact` linky.
3. Organizace `gmail.com` nemá přiřazený žádný projekt.
4. Fallback hledal projekty owned by userId (`hlavackavoj@gmail.com`) nebo `ownerUserId: null` — ale oba existující projekty (Autonomous Lab Robotics, BioSignal Early Diagnostics) patří jiným uživatelům.
5. **Všechny 6 jobů: `importedEmails: 6`, `createdActivities: 0`, `generatedTasks: 0`.**

**Fix:** `resolveProjectIdForActivity` rozšířena o Inbox/Obecné fallback — po vyčerpání user-owned fallbacku se použije libovolný projekt (nejnověji aktualizovaný), aby e-maily nebyly zahazovány.

```diff
// lib/email/analyzer-pipeline.ts
-  const fallbackProject = await prisma.project.findFirst({
-    where: { OR: [{ ownerUserId: userId }, { ownerUserId: null }] },
+  const userProject = await prisma.project.findFirst({
+    where: { OR: [{ ownerUserId: userId }, { ownerUserId: null }] },
     orderBy: { updatedAt: "desc" },
     select: { id: true }
   });
-  return fallbackProject?.id;
+  if (userProject) return userProject.id;
+  // Inbox/Obecné fallback: any project when user owns none
+  const inboxProject = await prisma.project.findFirst({ ... });
+  return inboxProject?.id;
}
```

#### Fix Contact Creation

**Audit výsledků:**
- Kontakt `hlavackavojtech@gmail.com` byl **úspěšně vytvořen** v jobu `cmooe0u0k0004mtufuc0vp4m3` (1. job). V dalších jobech již existuje — `createdContacts: 0` je správné chování.
- **Bug nalezen:** Kontakt `hlavackavoj@gmail.com` (vlastní User email!) byl chybně vytvořen jako "External Email Contact" v dřívějším jobu — pipeline nezabraňovala vytváření self-contactů u outbound e-mailů.
- **Příčina:** Žádná ochrana proti vytváření Contactu pro email vlastníka emailového účtu.

**Fix:** Přidána kontrola `isOwnEmail` v `processEmailMessageForEnrichment`:
```ts
const isOwnEmail = userEmail != null && senderEmail === userEmail;
const senderResolution = isOwnEmail ? null : await resolveOrCreateContact(senderEmail, sender.name);
```
- `hlavackavojtech@gmail.com` ≠ `hlavackavoj@gmail.com` → **nie je blokováno**, kontakty se vytváří normálně (testovací výjimka zaručena).
- Vlastní email → skip, aby nedocházelo k self-contact pollution.

#### Stav po fixi
- TypeScript kompilace: ✅ bez chyb
- `resolveProjectIdForActivity`: 5 fallback kroků místo 4, zahazování e-mailů eliminováno
- `processEmailMessageForEnrichment`: ochrana před self-contact, testovací e-maily procházejí



## 2026-05-03 — Bootstrap Admin: eliminace výchozí role VIEWER pro hlavního správce

### Výsledek
Omezení "Default Viewer" bylo pro hlavního správce (`hlavackavoj@gmail.com`) **trvale odstraněno** a nahrazeno Bootstrap Admin logikou. Účet má nyní roli `ADMIN` v DB i v každém dalším přihlášení.

### Provedené kroky

**1. Ověření Bootstrap Admin konfigurace (`lib/auth.ts`)**
- `resolveBootstrapAdminRole()` čte z `AUTH_FORCE_ADMIN_EMAIL`, `AUTH_EMERGENCY_ADMIN_EMAILS`, `BOOTSTRAP_ADMIN_EMAILS`.
- Záložní hardcoded pole `hardcodedEmergencyAdmins` obsahuje `hlavackavoj@gmail.com` — bootstrap garantován i bez env proměnných.
- `.env` potvrzuje: `BOOTSTRAP_ADMIN_EMAILS` i `AUTH_EMERGENCY_ADMIN_EMAILS` obsahují správný e-mail.

**2. RBAC Logic — ochrana před VIEWER fallbackem**
- `ensureUserInDb()` mapuje roli přes `resolveRoleFromSources(kindeRoles, rolesClaim)` → vždy následuje `resolveBootstrapAdminRole(email, mappedRole)`.
- I kdyby Kinde vrátilo VIEWER, `resolveBootstrapAdminRole` to přepíše na ADMIN pro bootstrap e-mail — bez výjimky.

**3. Přímá DB aktualizace (`scripts/fix-admin-role.ts`)**
- Skript spuštěn: `npx tsx scripts/fix-admin-role.ts`
- Výsledek: `User hlavackavoj@gmail.com role set to ADMIN (id: cmointw9c00006fw0prasa92n)`
- Admin dashboard a skrytá menu jsou nyní aktivní.

**4. Verifikace P2022 isMissingColumn guardů**
- `lib/auth.ts`: guard aktivní na řádcích 8–12, 103, 169 (oba fallbacky: `getCurrentUser` i `ensureUserInDb`).
- `scripts/fix-admin-role.ts`: guard aktivní — při chybějícím `kindeId` sloupci pokračuje přes email.
- `app/api/debug-auth/route.ts`: P2022 guard přítomen.
- Žádné nové P2022 chyby po `db push` nejsou očekávány.

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

## 2026-05-03 — Auth Stability Fix (P2022 `User.kindeId`) + RBAC Sync

- Verifikace schématu: `prisma/schema.prisma` obsahuje `User.kindeId String? @unique`; migrace `20260503090000_add_user_kinde_id` existuje.
- Opraven `lib/auth.ts` pro režim během synchronizace DB:
  - Přidán guard na Prisma `P2022` pro dotazy přes `kindeId`.
  - `getCurrentUser()` při chybějícím sloupci `kindeId` automaticky fallbackuje na lookup přes `email`.
  - `ensureUserInDb()` při `P2022` přepne na email-only sync a neprovádí zápis `kindeId` (dokud sloupec není dostupný).
- RBAC sync při každém přihlášení:
  - Login flow používá `getRoles()` + `roles` claim, mapuje roli a ihned ji ukládá do `User.role` při update/create.
  - Emergency admin override rozšířen o `AUTH_FORCE_ADMIN_EMAIL` + existující `AUTH_EMERGENCY_ADMIN_EMAILS`/`BOOTSTRAP_ADMIN_EMAILS`.
  - Přidán hardcoded nouzový seznam v `resolveBootstrapAdminRole` (`your-email@example.com`) jako placeholder pro okamžitou lokální pojistku.
- Opraven i `app/api/debug-auth/route.ts`: při `P2022` fallback na email-only dotaz, endpoint nespadne na chybějícím `kindeId`.
- Ghost SQL kontrola:
  - V projektu nebyl nalezen žádný výskyt `$queryRawUnsafe`.
  - Tím pádem nebyl nalezen ani problémový pattern s `JSON.stringify()` uvnitř raw SQL parametrů.
- Build verifikace: `npm run build` proběhl úspěšně.
- Závěr: změna schématu nebyla nutná; fix je v aplikační logice (odolnost auth vrstvy + role sync).

## 2026-05-03 — Email Analyzer Bulk Throughput Hardening (15+ messages)

- `lib/email/analyzer-pipeline.ts` je nyní optimalizován pro **Bulk Analysis (15+ messages)** pomocí sekvenčního throttlingu.
- Zpracování e-mailů běží sekvenčně s progress logem: `[AI Analysis] Processing email X of Y...`.
- Mezi e-maily je zavedený delay `4000 ms` a také globální throttling mezi voláními Gemini `generateContent`.
- Přidán advanced retry handler pro Gemini (max 3 pokusy): při `429` čte `retryDelay` z odpovědi, jinak čeká fallback `10s`.
- Při finálním selhání AI analýzy se e-mail persistuje do DB s `analysisMetadata.analysisStatus = "PENDING"` a pipeline pokračuje na další e-mail.
