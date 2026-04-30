# Next Steps

Aktualizováno: duben 2026.

## Hotovo (duben 2026)

- ✅ CRM (projekty, kontakty, organizace, aktivity, úkoly)
- ✅ Pipeline management (5 fází)
- ✅ Recommendation engine (rule-based, 10 pravidel)
- ✅ Auth a role (Kinde Auth)
- ✅ Šablony dokumentů (Supabase Storage)
- ✅ Email Analyzer v2 (Gmail + Outlook OAuth, AI analýza, aktivity, úkoly)

## Nejbližší možné kroky

### Scoring model
Přidat scoring formulář na detail projektu. Data pro `potentialLevel` jsou v DB, chybí UI a výpočet.

### Expert matching
Přidat model Expert do Prisma schématu + databázi expertů + párování podle role.

### Analytický dashboard
Přidat funkční metriky na dashboard – funnel, konverze, stagnující projekty.

### kindeId na User modelu
Přidat `kindeId` jako unique field na User model – aktuálně upsert probíhá jen přes email.

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
