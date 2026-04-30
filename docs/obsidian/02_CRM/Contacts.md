# Contacts

## Popis

Kontakt reprezentuje osobu spojenou s projektem nebo organizací.

## Atributy (aktuální schéma)

| Pole | Typ | Popis |
|---|---|---|
| id | String (cuid) | Primární klíč |
| name | String | Jméno |
| email | String? | E-mail (používá se pro párování e-mailů v Email Analyzeru) |
| phone | String? | Telefon |
| role | String | Role (volný text) |
| organizationId | String? | FK na Organization |
| notes | String? | Poznámky |
| createdAt | DateTime | Datum vytvoření |
| updatedAt | DateTime | Datum aktualizace |

## Vazby

- `organization` → Organization (volitelné)
- `projectLinks` → ProjectContact[] (M:N na projekty)
- `emailAutomationLinks` → ProjectEmailAutomationContact[] (sledování pro email automation)

## Role – příklady

Role je volný text. Typické hodnoty:
- researcher, student, mentor, evaluator, investor
- IP lawyer, business developer, technology transfer officer, project manager

## Email Analyzer – využití kontaktu

E-mailová adresa kontaktu se používá při párování e-mailů s projektem:
- Přesná shoda e-mailu → confidence 1.0
- Shoda domény organizace → confidence 0.7

Viz [[Email Analyzer]].
