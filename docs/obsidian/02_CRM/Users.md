# Users

## Popis

Uživatel je osoba, která má přístup do systému. Uživatelé jsou spravováni přes **Kinde Auth** a synchronizováni do lokální PostgreSQL databáze.

## Atributy (aktuální schéma)

| Pole | Typ | Popis |
|---|---|---|
| id | String (cuid) | Primární klíč (lokální, ne Kinde ID) |
| name | String | Jméno |
| email | String @unique | E-mail (klíč pro upsert z Kinde) |
| role | UserRole | Výchozí: USER |
| createdAt | DateTime | Datum registrace |
| updatedAt | DateTime | Datum aktualizace |

**Poznámka:** Schéma zatím neobsahuje pole `kindeId`. Upsert je keyován přes `email`.

## Role (UserRole)

| Role | Popis |
|---|---|
| ADMIN | Plný přístup, správa systému |
| MANAGER | Správa projektů a pipeline, přístup ke všem projektům |
| EVALUATOR | Hodnocení projektů, tvorba doporučení |
| USER | Přístup pouze k vlastním projektům |
| VIEWER | Pouze čtení |

## Logika přiřazení role

Role se mapuje z Kinde claimu při každém přihlášení (`ensureUserInDb()` v `lib/auth.ts`):
1. Čtou se `roles` z Kinde JWT (klíč i název).
2. Obsahuje-li klíč `"admin"` → ADMIN, `"manager"` → MANAGER, `"evaluator"` → EVALUATOR, jinak → VIEWER.
3. Pokud je e-mail v `BOOTSTRAP_ADMIN_EMAILS` (env var, CSV), přepíše se na ADMIN.

## Oprávnění (lib/authorization.ts)

| Funkce | Role |
|---|---|
| `canManageRecords` | ADMIN, MANAGER, EVALUATOR |
| `canManageAdministrativeRecords` | ADMIN, MANAGER |
| `canAccessAllProjects` | ADMIN, MANAGER |
| Ostatní | vlastní projekty přes `ownerUserId` |

## Middleware

`middleware.ts` chrání `/projects/:path*` – přesměruje na `/?pending_approval=1` pokud uživatel nemá Kinde roli s přístupem.
