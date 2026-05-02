# Progress Log

Aktualizováno: 2. 5. 2026

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
