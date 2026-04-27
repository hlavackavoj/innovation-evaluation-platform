# Implementation Plan

## Fáze 1: CRM MVP

Cíl: vytvořit první funkční verzi CRM pro evidenci a řízení projektů.

### Funkce

- přihlášení,
- projekty,
- kontakty,
- organizace,
- aktivity,
- úkoly,
- pipeline fáze,
- jednoduchý dashboard.

## Fáze 2: Recommendation Engine MVP

Cíl: přidat rule-based doporučení dalších kroků a rolí.

### Funkce

- pravidla doporučení,
- generování doporučení podle projektu,
- doporučené role,
- vytvoření úkolu z doporučení.

## Fáze 3: Scoring

Cíl: přidat základní scoring potenciálu projektu.

### Funkce

- scoring formulář,
- výpočet skóre,
- potential_level,
- vizualizace skóre na detailu projektu.

## Fáze 4: Experti a matching

Cíl: navrhovat konkrétní experty podle role a oboru.

### Funkce

- databáze expertů,
- specializace,
- dostupnost,
- matching podle oboru a potřeby.

## Fáze 5: Enterprise bezpečnost

Cíl: připravit systém pro reálné nasazení ve větších institucích.

### Funkce

- SSO,
- audit log,
- detailní práva,
- multi-tenant architektura,
- exporty,
- anonymizace.

## Doporučený tech stack

- Next.js
- TypeScript
- PostgreSQL
- Prisma
- Auth.js
- Tailwind CSS
- shadcn/ui
- Vercel nebo Railway
