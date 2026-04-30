# Local Development & DB Reset

Aktualizováno: 1. 5. 2026
Zdrojová pravda: `.env`, `prisma/schema.prisma`, `prisma/migrations/`, `scripts/reset-db-safe.sh`

## Přehled prostředí

- **DB**: PostgreSQL na `localhost:5432`, databáze `innovation_evaluation_platform`
- **Uživatel**: `vojtechhlavacka` (bez hesla, lokální peer auth)
- **DATABASE_URL**: `postgresql://vojtechhlavacka@localhost:5432/innovation_evaluation_platform`
- **Auth**: Kinde (lokální URL: `http://localhost:3000`)
- **AI**: Google Gemini 1.5 Flash (`GOOGLE_AI_API_KEY` v `.env`)
- **Dev server**: `npm run dev` (Next.js 14 App Router)

## Povinné env proměnné pro lokální vývoj

V `.env` musí být:

```
DATABASE_URL
GOOGLE_AI_API_KEY
KINDE_CLIENT_ID
KINDE_CLIENT_SECRET
KINDE_ISSUER_URL
KINDE_SITE_URL
KINDE_POST_LOGOUT_REDIRECT_URL
KINDE_POST_LOGIN_REDIRECT_URL
```

Pro Email Analyzer (volitelné lokálně):

```
EMAIL_TOKEN_ENCRYPTION_KEY
EMAIL_OAUTH_STATE_SECRET
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
```

## Migrace – aktuální stav

### Tři lokální migrace

| Migrace | Obsah |
|---|---|
| `0_init` | Základní schéma: User, Project, Contact, Org, Activity, Task, Recommendation, Template, ProjectDocument |
| `202604291130_email_analyzer_v2` | Email entity: EmailAccountConnection, EmailMessage, ProjectEmailLink, EmailSyncCursor, EmailSyncJob, EmailAutomation*, AuditLog; FK na Activity |
| `20260430231232_task_contact_link` | Přidán `contactId` na `Task` + FK + index |

### Incident: ghost migrace (opraveno 1. 5. 2026)

**Příčina:** Migrace `20260429085325_init_email_analyzer` byla aplikována do DB, ale poté lokálně smazána a nahrazena `202604291130_email_analyzer_v2`. Záznam zůstal v `_prisma_migrations`, což blokovalo aplikaci migrace `20260430231232_task_contact_link`.

**Příznak:** Sloupec `Task.contactId` chyběl v DB → `test-email-analysis` padal s Prisma chybou při pokusu o `task.create({ contactId: ... })`.

**Oprava:**
```sql
DELETE FROM _prisma_migrations WHERE migration_name = '20260429085325_init_email_analyzer';
```
Poté `npx prisma migrate deploy` úspěšně aplikoval `20260430231232_task_contact_link`.

## Funkční postup resetu (1. 5. 2026)

### Automatický reset (doporučeno)

```bash
./scripts/reset-db-safe.sh
```

Skript:
1. Načte `DATABASE_URL` z `.env`
2. Ověří dostupnost PostgreSQL (`pg_isready`)
3. Udělá timestamped backup do `/tmp/backup_<db>_<timestamp>.sql`
4. Spustí `npx prisma migrate reset --force`
5. Spustí `npx prisma generate`
6. Spustí `npm run seed`

### Ruční postup

```bash
# 1. Ověř PostgreSQL
pg_isready -h localhost -p 5432

# 2. Záloha (pokud DB existuje a obsahuje data)
pg_dump "postgresql://vojtechhlavacka@localhost:5432/innovation_evaluation_platform" > /tmp/backup_$(date +%Y%m%d_%H%M%S).sql

# 3. Reset
npx prisma migrate reset --force

# 4. Seed (pokud se nespustil automaticky)
npm run seed

# 5. Ověření
npx prisma migrate status
npx prisma validate

# 6. Dev server
npm run dev
```

### Pokud migrace padá kvůli nekonzistentní historii

```bash
# Zobraz stav
npx prisma migrate status

# Odstraň ghost migraci (konkrétní název dle situace)
psql "$DATABASE_URL" -c "DELETE FROM _prisma_migrations WHERE migration_name = '...';"

# Aplikuj pending migrace (ne destructive reset)
npx prisma migrate deploy
```

### Pokud seed padá

Nejpravděpodobnější příčiny:
- Cizí klíče nebo enums nesedí — seed smaže data v pořadí závislostí, ale pokud DB obsahuje data z Email Analyzeru (`EmailAccountConnection`, `EmailMessage`), cascade z User delete by to měl pokrýt.
- Spusť seed samostatně a sleduj výstup: `npm run seed`
- Seed je idempotentní — smaže vše a vytvoří znovu (deleteMany před createMany).

## Seed data (aktuální)

Soubor: `prisma/seed.ts`

Vytváří:
- 2 uživatelé: Eva Novak (MANAGER), Martin Svoboda (EVALUATOR)
- 3 organizace: Charles University IC, Faculty of Biomedical Engineering, Prague AI Labs
- 3 kontakty: Dr. Jana Kolarova, Petr Dvorak, Lucie Benesova
- 2 projekty: BioSignal Early Diagnostics (VALIDATION), Autonomous Lab Robotics (SCALING)
- 4 project-contact linky
- 3 aktivity (MEETING, EVALUATION, WORKSHOP)
- 3 tasky
- 5 templates (per fáze pipeline)
- 1 project document

**Seed nepokrývá:**
- `EmailAccountConnection` (OAuth tokeny — lokálně je potřeba ručně připojit Gmail)
- `Recommendation` (generují se automaticky při načtení detail projektu)
- `AuditLog`

## Debugging test-email-analysis endpointu

Endpoint: `POST /api/debug/test-email-analysis`  
Soubor: `app/api/debug/test-email-analysis/route.ts`

### Bez autentizace (unauthenticated curl)

```json
{"error":"Test email analysis failed","message":"You must be signed in to continue."}
```

Toto je správné chování — endpoint vyžaduje přihlášeného Kinde uživatele.

### S autentizací (funkční stav)

Endpoint spouští `runMockEmailEnrichmentTest` z `lib/email/analyzer-pipeline.ts`:
1. Vytvoří dočasný `EmailAccountConnection` (debug provider)
2. Zpracuje 3 mock zprávy (existující kontakt, nový lead, nová doména)
3. Smaže dočasný connection (cascade maže EmailMessage)
4. Vrátí JSON se statistikami enrichmentu

**Dříve padal kvůli:** chybějícímu `Task.contactId` sloupci (chyběla migrace `20260430231232_task_contact_link`).

### Checklist před testem

```bash
npx prisma migrate status    # Database schema is up to date!
npx prisma validate          # valid
npm run seed                 # 2 users, 2 projects, 3 contacts
npm run dev                  # ✓ Ready
# Přihlásit se přes Kinde a volat endpoint z browser UI nebo autentizovaného session
```

## Troubleshooting

| Problém | Řešení |
|---|---|
| `ECONNREFUSED 5432` | PostgreSQL neběží — spusť Postgres |
| `role "postgres" does not exist` | Používej správného uživatele z DATABASE_URL, ne `-U postgres` |
| `Database schema is not up to date` | `npx prisma migrate deploy` nebo `reset --force` |
| Migration history diverged | Zkontroluj `_prisma_migrations`, odstraň ghost záznamy |
| Seed padá na FK constraint | Ujisti se, že seed maže v správném pořadí (child → parent) |
| `Task.contactId unknown field` | Chybí migrace `20260430231232_task_contact_link` — `npx prisma migrate deploy` |
| `GOOGLE_AI_API_KEY` chybí | AI analýza se přeskočí s fallback textem — ne error |
| Port 3000 je obsazený | `npm run dev` zkusí 3001, 3002 atd. automaticky |

## Ověření funkčního stavu

```bash
pg_isready -h localhost -p 5432          # accepting connections
npx prisma migrate status                # Database schema is up to date!
npx prisma validate                      # valid
npm run seed                             # tiché dokončení (2 users, 2 projects, ...)
curl http://localhost:3000/api/health    # {"status":"ok"} nebo similar
```
