# Email Analyzer v2 - Deployment Checklist

## 1. Vercel env vars
Nastav v `Project Settings -> Environment Variables`:

- `DATABASE_URL`
- `GOOGLE_AI_API_KEY`
- `EMAIL_TOKEN_ENCRYPTION_KEY` (silný náhodný secret)
- `EMAIL_OAUTH_STATE_SECRET` (silný náhodný secret)
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `NEXT_PUBLIC_APP_URL` (např. `https://your-domain.com`)
- `EMAIL_SYNC_CRON_SECRET` (pokud použiješ background sync endpoint)

## 2. Google OAuth (Gmail)
V Google Cloud Console:

1. Zapni Gmail API.
2. OAuth consent screen nastav alespoň pro test users.
3. Do OAuth klienta přidej redirect URI:
   - `https://your-domain.com/api/email/oauth/gmail/callback`
4. Scope musí obsahovat:
   - `openid`
   - `email`
   - `https://www.googleapis.com/auth/gmail.readonly`

## 3. Microsoft OAuth (Outlook / M365) — deferred
Aktuálně není součást MVP release.

- Outlook OAuth je dočasně disabled (`provider_disabled`).
- Neověřuje se v release checklistu.
- Plánováno jako future enhancement po stabilizaci Gmail flow.

## 4. DB migrace
Po deployi nebo před release spusť:

```bash
npx prisma migrate deploy
```

## 5. Ověření funkčnosti
Po nasazení otestuj:

1. Přihlášení do appky funguje.
2. `Email Analyzer` stránka je dostupná.
3. `Connect Gmail` dokončí OAuth flow.
4. `Analyze Communication` vrátí summary a uloží výsledek.
5. Na detailu projektu funguje `Email Automation` toggle + uložení.
6. Importované emaily se zobrazí v project timeline/activity.

## 6. Security minimum

1. Reálné secrets nikdy necommitovat (jen `.env.example` placeholders).
2. Po jakémkoli podezření na leak rotovat:
   - Google client secret
   - `EMAIL_TOKEN_ENCRYPTION_KEY`
   - `EMAIL_OAUTH_STATE_SECRET`
3. Omezit přístup k produkčním env vars ve Vercelu jen na potřebné členy týmu.

## 7. Volitelné (doporučené)

1. Přidej secret scanning do CI (např. gitleaks).
2. Zapni branch protection a required checks.
3. Nastav cron trigger pro `POST /api/email/sync` s hlavičkou:
   - `Authorization: Bearer <EMAIL_SYNC_CRON_SECRET>`
