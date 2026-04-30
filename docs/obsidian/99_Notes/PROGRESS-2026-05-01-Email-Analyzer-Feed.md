# Progress – Email Analyzer Feed + Delete Actions (2026-05-01)

Navazuje na: [[02_CRM/Email Analyzer]] · [[06_Data_Model/Data Model]] · [[99_Notes/PROGRESS-2026-04-30-Gmail-Connected]]

## Co bylo dokončeno

- Přidán interaktivní **Enrichment Feed** na `/email-analyzer` pod Summary.
- Feed má 3 sekce:
  - nově vytvořené kontakty,
  - detekované úkoly,
  - nové organizace (domény).
- Každá položka má deep link na CRM detail:
  - `/contacts/[id]`
  - `/tasks/[id]`
  - `/organizations/[id]`
- Přidány Delete akce přímo ve feedu (ikona koše + confirm dialog).
- Mazání běží přes Server Actions:
  - `deleteContactAction`
  - `deleteTaskAction`
  - `deleteOrganizationAction`
- UI je po smazání reaktivní (`useTransition` + `router.refresh()`).
- Přidán přepínač **Testovací data**:
  - místo standardního běhu volá `POST /api/debug/test-email-analysis`,
  - výsledné entity se vykreslí rovnou do feedu.

## Backend / pipeline změny

- `runCommunicationAnalysis()` nově vrací nejen summary počty, ale i `createdEntities`:
  - `contacts[]`
  - `tasks[]`
  - `organizations[]`
- Stejné chování má i `runMockEmailEnrichmentTest()`.
- `EmailSyncJob.summary` ukládá rozšířený JSON včetně `createdEntities`.

## Integrita dat při mazání

- `Task.contactId` má `onDelete: SetNull`:
  - při smazání kontaktu task zůstává, jen se odpojí vazba na kontakt.
- `Contact.organizationId` má `onDelete: SetNull`:
  - při smazání organizace kontakty zůstávají, jen se odpojí od organizace.
- `ProjectContact` používá `onDelete: Cascade`:
  - při smazání kontaktu se automaticky smažou vazby kontakt-projekt.

## Build / infra problém k opravě

Při `npm run build` je aplikace aktuálně blokovaná prostředím (nejde o TS chybu):

- Chybí `DATABASE_URL` (Prisma warning během build fáze).
- Chybí `KINDE_ISSUER_URL` (fatal error při collect page data pro `/api/auth/[kindeAuth]`).

### Stav ověření

- `npx tsc --noEmit` prochází bez chyb.
- `npm run build` padá na chybějících ENV proměnných, ne na implementaci feedu.

## Doporučený další krok

- Doplnit missing env hodnoty do prostředí pro build/deploy:
  - `DATABASE_URL`
  - `KINDE_ISSUER_URL`
- Poté znovu spustit `npm run build` a ověřit end-to-end build pipeline.
