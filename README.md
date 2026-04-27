# Innovation Evaluation Platform

Current local repository path: `~/Documents/innovation-evaluation-platform`

Obsidian vault pro navrh MVP systemu, ktery funguje jako CRM pro univerzitni a vyzkumne projekty s potencialem startupu nebo spin-offu.

## Development app

Repo ted obsahuje i prvni pracovni Next.js CRM skeleton nad Prisma + PostgreSQL.

### Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL

### Quick start

1. `cp .env.example .env`
2. potvrdit, ze `.env` obsahuje `DATABASE_URL="postgresql://vojtechhlavacka@localhost:5432/innovation_evaluation_platform"`
3. `npm install`
4. spustit PostgreSQL pres Homebrew: `brew services start postgresql`
5. overit aktualniho PostgreSQL uzivatele: `psql -d postgres -c "SELECT current_user;"`
6. vytvorit databazi: `createdb innovation_evaluation_platform`
7. `npm run prisma:generate`
8. `npm run prisma:migrate -- --name init`
9. `npm run seed`
10. `npm run dev`

### macOS / Homebrew PostgreSQL notes

Projekt je nastaveny pro lokalni PostgreSQL uzivatele odpovidajiciho aktualnimu macOS uzivateli, ne pro defaultniho `postgres` uzivatele. To je spolehlivejsi pro Homebrew instalace na macOS.

Ocekavana lokalni connection string hodnota je:

```env
DATABASE_URL="postgresql://vojtechhlavacka@localhost:5432/innovation_evaluation_platform"
```

### Troubleshooting

Zkontrolovat aktualniho PostgreSQL uzivatele:

```bash
psql -d postgres -c "SELECT current_user;"
```

Vypsat existujici databaze:

```bash
psql -d postgres -c "\l"
```

Vytvorit databazi, pokud chybi:

```bash
createdb innovation_evaluation_platform
```

Smazat a znovu vytvorit databazi pri rozbitem lokalnim stavu:

```bash
dropdb innovation_evaluation_platform
createdb innovation_evaluation_platform
```

Pokud `dropdb` hlasi, ze databazi nekdo pouziva, ukoncit aktivni spojeni a zkusit to znovu:

```bash
psql -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'innovation_evaluation_platform' AND pid <> pg_backend_pid();"
```

Pokud Prisma hlasi permission denied nebo `P1010`:

```bash
psql -d postgres -c "ALTER DATABASE innovation_evaluation_platform OWNER TO vojtechhlavacka;"
psql -d innovation_evaluation_platform -c "GRANT ALL PRIVILEGES ON DATABASE innovation_evaluation_platform TO vojtechhlavacka;"
psql -d innovation_evaluation_platform -c "GRANT ALL ON SCHEMA public TO vojtechhlavacka;"
```

Pokud predchozi pokus vytvoril databazi pod jinym uzivatelem, nejcistsi lokalni oprava byva:

```bash
dropdb innovation_evaluation_platform
createdb innovation_evaluation_platform
```

### MVP pages

- `/`
- `/projects`
- `/projects/new`
- `/projects/[id]`
- `/projects/[id]/edit`
- `/contacts`
- `/organizations`
- `/tasks`

## Hlavni cil
Vytvorit system, ktery pomuze univerzitam a inovacnim centrum:

- evidovat projekty,
- sledovat jejich fazi,
- ridit dalsi kroky,
- doporucovat vhodnou podporu,
- vyhodnocovat startup/spin-off potencial,
- ziskavat interni statistiky.

## MVP smer
Prvni verze ma byt CRM s jednoduchym doporucovacim modulem.

## Struktura vaultu

- [[00_Vize/Vize]]
- [[01_Produkt/Produkt]]
- [[02_CRM/CRM Overview]]
- [[03_Pipeline/Pipeline Stages]]
- [[04_Scoring/Scoring Model]]
- [[05_Recommendation_Engine/Recommendation Engine Overview]]
- [[06_Data_Model/Data Model]]
- [[07_API_Design/API Design]]
- [[08_UI_UX/UI UX]]
- [[09_Security/Security]]
- [[10_Analytics/Analytics]]
- [[11_Implementation/Implementation Plan]]
