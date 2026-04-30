# Organizations

## Popis

Organizace reprezentuje instituci, firmu nebo centrum spojené s projektem.

## Atributy (aktuální schéma)

| Pole | Typ | Popis |
|---|---|---|
| id | String (cuid) | Primární klíč |
| name | String | Název |
| type | OrganizationType | Typ organizace |
| website | String? | Webová adresa (používá se pro domain-matching v Email Analyzeru) |
| notes | String? | Poznámky |
| createdAt | DateTime | Datum vytvoření |
| updatedAt | DateTime | Datum aktualizace |

## Typy organizací (OrganizationType)

- `UNIVERSITY`
- `FACULTY`
- `RESEARCH_CENTER`
- `INNOVATION_CENTER`
- `COMPANY`
- `INVESTOR`
- `PUBLIC_INSTITUTION`

## Vazby

- `contacts` → Contact[]
- `projects` → Project[]

## Email Analyzer – využití organizace

Pole `website` se parsuje pro domain-matching při párování e-mailů s projektem.

Příklad: web `https://www.cvut.cz` → doména `cvut.cz` → e-mail od `@cvut.cz` má shodu.

Viz [[Email Analyzer]].
