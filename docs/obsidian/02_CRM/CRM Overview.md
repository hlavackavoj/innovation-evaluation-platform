# CRM Overview

## Cíl CRM modulu

CRM modul slouží k evidenci a řízení projektů od prvního kontaktu až po rozhodnutí, zda má projekt startupový nebo spin-off potenciál.

## Hlavní otázky CRM

- Jaké projekty máme v pipeline?
- V jaké fázi jsou?
- Kdo je řeší?
- Kdo je kontaktní osoba?
- Co je další krok?
- Kdy má další krok proběhnout?
- Kdo může projektu pomoci?
- Co říká e-mailová komunikace o stavu projektu?

## Core entity

- [[Projects]] – hlavní entita; obsahuje fázi, potenciál, priority, next step
- [[Contacts]] – osoby spojené s projektem
- [[Organizations]] – instituce, firmy, centra
- [[Activities]] – záznamy práce (schůzka, e-mail, hodnocení, …)
- [[Tasks]] – konkrétní úkoly přiřazené uživatelům; mohou být generovány z AI analýzy
- [[Users]] – uživatelé platformy s rolemi přes Kinde Auth
- [[Email Analyzer]] – připojení e-mailu, synchronizace, AI analýza

## Navigace v aplikaci

| Route | Popis |
|---|---|
| `/` | Dashboard |
| `/projects` | Seznam projektů |
| `/projects/new` | Nový projekt |
| `/projects/[id]` | Detail projektu |
| `/projects/[id]/edit` | Editace projektu |
| `/contacts` | Kontakty |
| `/organizations` | Organizace |
| `/tasks` | Úkoly |
| `/templates` | Šablony dokumentů |
| `/email-analyzer` | Email Analyzer |

## Architektura

Všechny CRM operace jsou implementovány jako **Next.js Server Actions** v `app/*/actions.ts`. Žádné REST API endpointy pro CRM.

Datový model viz [[../06_Data_Model/Data Model]].
