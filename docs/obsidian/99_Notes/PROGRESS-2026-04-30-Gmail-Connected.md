# Progress – Gmail účet připojen (2026-04-30)

Navazuje na: [[02_CRM/Email Analyzer]] · [[99_Notes/DEBUG-OAuth-CORS-Fix]] · [[09_Security/Security]]

## Co se podařilo

- OAuth flow pro Gmail je opravený (už nepoužívá přímý fetch na Google auth endpoint).
- Callback endpoint funguje a účet byl úspěšně připojen.
- Tokeny se ukládají bezpečně do DB v šifrované podobě.
- Po callbacku se spouští initial sync posledních e-mailů (stínově na pozadí).
- Neznámí odesílatelé se zakládají jako nové CRM kontakty (lead generation).
- Kontakty se mapují na organizace podle e-mailové domény.
- E-maily se ukládají jako `Activity` typu `EMAIL`.
- Uživatel je po callbacku přesměrován zpět na `returnPath`.

## Co teď máme funkční jako MVP

- Připojení Gmail účtu z UI (`/email-analyzer`).
- OAuth callback + bezpečné uložení tokenů.
- První import komunikace pro analýzu.
- Základní CRM obohacení z e-mailů (Contact, Organization, Activity).

## Poznámka k provozu

- Pro stabilní provoz je nutné mít nastavené env proměnné:
  - `EMAIL_TOKEN_ENCRYPTION_KEY`
  - `EMAIL_OAUTH_STATE_SECRET`
  - `GOOGLE_OAUTH_CLIENT_ID`
  - `GOOGLE_OAUTH_CLIENT_SECRET`
  - `NEXT_PUBLIC_APP_URL`
  - `KINDE_SITE_URL`

## Další doporučený krok

- Implementovat Gmail Push webhooky (`watch`/`history`), aby synchronizace byla průběžná a ne jen jednorázová po připojení nebo přes cron.
