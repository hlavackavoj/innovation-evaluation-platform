# Implementation Plan

Aktualizováno: duben 2026.

## Fáze 1: CRM MVP ✅ HOTOVO

Funkce:
- přihlášení (Kinde Auth),
- projekty, kontakty, organizace,
- aktivity, úkoly,
- pipeline fáze (5 fází),
- jednoduchý dashboard.

## Fáze 2: Recommendation Engine MVP ✅ HOTOVO

Funkce:
- 10 pravidel (2 per fáze + 5 condition pravidel),
- generování a sync doporučení do DB,
- doporučené role,
- PENDING / COMPLETED / DISMISSED status.

## Fáze 3: Šablony a dokumenty ✅ HOTOVO

Funkce:
- Template model napojený na pipeline fáze,
- upload projektových dokumentů (Supabase Storage),
- podepsané URL pro stažení.

## Fáze 4: Email Analyzer v2 ✅ HOTOVO (merged PR #1)

Funkce:
- OAuth připojení Gmail a Outlook (šifrované tokeny),
- synchronizace e-mailů z providera,
- deduplikace zpráv,
- 3 úrovně párování s projektem (exact email, domain, keyword),
- AI analýza přes Google Gemini 1.5 Flash,
- automatické vytváření aktivit a úkolů,
- email automation nastavení per projekt (schedule, contacts, domains, keywords),
- AuditLog pro import akce.

## Fáze 5: Scoring ❌ NEREALIZOVÁNO

Co je potřeba:
- scoring formulář (5 kritérií × 0–20 bodů),
- uložení dílčích skóre,
- výpočet `potentialLevel`,
- vizualizace na detailu projektu.

## Fáze 6: Expert matching ❌ NEREALIZOVÁNO

Co je potřeba:
- model `Expert` v Prisma schématu,
- databáze expertů,
- matching podle `suggestedRole` a oboru,
- UI pro přiřazení experta z doporučení.

## Fáze 7: Pokročilá analytika ❌ NEREALIZOVÁNO

Co je potřeba:
- agregační dashboard (funnel, konverze, průměrné doby ve fázi),
- metriky o e-mailové komunikaci,
- exporty pro vedení.

## Fáze 8: Enterprise bezpečnost ❌ NEREALIZOVÁNO

Co je potřeba:
- SSO přes univerzitní login,
- detailní audit log (všechny CRM akce),
- multi-tenant architektura,
- anonymizovaný režim evaluace.

---

## Skutečný tech stack (vs. původní plán)

| Plánováno | Skutečnost |
|---|---|
| Auth.js | **Kinde Auth** |
| shadcn/ui | Vlastní komponenty + Tailwind |
| Railway | **Vercel** |
| REST API | **Next.js Server Actions** |
