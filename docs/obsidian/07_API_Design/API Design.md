# API Design

## Architektura

**Aplikace nepoužívá REST API pro CRM operace.**

Všechny CRM akce jsou implementovány jako **Next.js Server Actions** v `app/*/actions.ts`.

---

## Server Actions (aktuální implementace)

### `app/projects/actions.ts`
- Vytvoření, editace, smazání projektu
- Sync doporučení při každé aktualizaci projektu (`syncProjectRecommendations`)
- Přidávání/odebírání kontaktů z projektu
- Upload projektových dokumentů (Supabase Storage)
- Email automation nastavení (enable/disable, schedule, keyword aliases)

### `app/contacts/actions.ts`
- Vytvoření, editace, smazání kontaktu
- Propojení s organizací

### `app/organizations/actions.ts`
- Vytvoření, editace, smazání organizace

### `app/email-analyzer/actions.ts`
- Spuštění email analýzy (`runCommunicationAnalysis`)
- Správa OAuth připojení

---

## API Routes (skutečné HTTP endpointy)

### Auth (Kinde)
```
GET/POST /api/auth/[kindeAuth]
```
Kinde Auth handler – login, callback, logout.

### Email OAuth
```
GET /api/email/oauth/[provider]/connect
```
Zahájení OAuth flow. Aktuálně podporuje pouze Gmail. Pro Outlook route vrací redirect na `/email-analyzer?error=provider_disabled&provider=outlook`.

```
GET /api/email/oauth/[provider]/callback
```
OAuth callback – pro Gmail dělá exchange code za token a uložení do DB (šifrovaně). Outlook je aktuálně deferred/disabled.

```
POST /api/email/oauth/[provider]/disconnect
```
Odebrání OAuth připojení pro daného uživatele a providera.

### Email Sync
```
POST /api/email/sync
```
Spuštění synchronizace e-mailů. Může být voláno manuálně nebo cron joby.
Autorizace přes `Authorization: Bearer <EMAIL_SYNC_CRON_SECRET>`.

### Ostatní
```
GET /api/health
GET /api/debug-auth  (development only)
```

---

## Env vars pro API

Viz [[../09_Security/Security]].
