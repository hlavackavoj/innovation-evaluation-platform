# Security

## Přehled implementované bezpečnosti

Systém obsahuje citlivé informace o výzkumu, IP, patentech a komercializačních záměrech.

## Auth: Kinde Auth

Autentizace běží přes **Kinde Auth** (ne Auth.js jak byl původní plán).

Kinde spravuje uživatele externě. Při každém přihlášení se volá `ensureUserInDb()` (`lib/auth.ts`), která:
1. Přečte Kinde JWT claimy (user, roles).
2. Mapuje Kinde role na interní UserRole.
3. Upsertuje uživatele do lokální DB (klíčováno přes `email`).

### Bootstrap admin

Env var `BOOTSTRAP_ADMIN_EMAILS` (CSV) – e-maily, které dostanou roli ADMIN bez ohledu na Kinde roli. Slouží k prvotnímu nastavení systému.

## Role-based access control

Viz [[../02_CRM/Users]].

Implementováno v `lib/authorization.ts`:
- `canManageRecords` – ADMIN, MANAGER, EVALUATOR
- `canManageAdministrativeRecords` – ADMIN, MANAGER
- `canAccessAllProjects` – ADMIN, MANAGER
- Ostatní uživatelé vidí jen vlastní projekty (`ownerUserId`)

### Middleware

`middleware.ts` chrání `/projects/:path*` – neautorizovaný uživatel je přesměrován na `/?pending_approval=1`.

## Šifrování e-mailových tokenů

OAuth tokeny (Gmail, Outlook) jsou v DB uloženy **šifrovaně** pomocí `lib/crypto.ts`.

Klíč: env var `EMAIL_TOKEN_ENCRYPTION_KEY`.

## OAuth state protection

Env var `EMAIL_OAUTH_STATE_SECRET` – podpis OAuth state parametru pro prevenci CSRF.

## AuditLog

Model `AuditLog` v DB zaznamenává klíčové akce:
- `action` – např. `"email.analysis.imported"`
- `entityType` – typ entity
- `entityId` – ID záznamu
- `metadata` – JSON s detaily
- `userId` – kdo akci provedl

## Povinné env vars

```
DATABASE_URL
KINDE_ISSUER_URL
KINDE_CLIENT_ID
KINDE_CLIENT_SECRET
KINDE_SITE_URL
KINDE_POST_LOGIN_REDIRECT_URL
KINDE_POST_LOGOUT_REDIRECT_URL
GOOGLE_AI_API_KEY
EMAIL_TOKEN_ENCRYPTION_KEY
EMAIL_OAUTH_STATE_SECRET
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
MICROSOFT_OAUTH_CLIENT_ID
MICROSOFT_OAUTH_CLIENT_SECRET
NEXT_PUBLIC_APP_URL
```

### Volitelné

```
BOOTSTRAP_ADMIN_EMAILS     # CSV e-mailů pro bootstrap admin
EMAIL_SYNC_CRON_SECRET     # Bearer token pro cron endpoint /api/email/sync
```

## Co ještě není implementováno

- SSO přes univerzitní login
- Detailní audit log (aktuálně pouze email import)
- Šifrování dalších citlivých polí
- Anonymizovaný režim evaluace
- Multi-tenant izolace institucí
- Exportní oprávnění
