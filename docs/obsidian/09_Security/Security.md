# Security

## Proč je bezpečnost klíčová

Systém může obsahovat citlivé informace o výzkumu, IP, patentech, know-how a budoucích komercializačních záměrech.

## MVP bezpečnost

V první verzi musí být minimálně:

- přihlášení uživatele,
- role-based access control,
- omezení přístupu k projektům,
- bezpečné ukládání dat,
- HTTPS,
- základní logování změn.

## Role

- admin
- manager
- evaluator
- viewer

## Doporučené principy

### Least privilege

Uživatel vidí pouze to, co potřebuje.

### Auditability

U důležitých změn musí být jasné:

- kdo změnu provedl,
- kdy ji provedl,
- co bylo změněno.

### IP protection

Citlivé projekty musí mít omezený přístup.

## Budoucí bezpečnostní prvky

- SSO přes univerzitní login,
- detailní audit log,
- šifrování citlivých polí,
- anonymizovaný režim evaluace,
- multi-tenant izolace institucí,
- exportní oprávnění.
