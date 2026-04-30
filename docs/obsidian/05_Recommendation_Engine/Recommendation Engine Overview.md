# Recommendation Engine Overview

## Stav implementace

**PLNĚ IMPLEMENTOVÁNO** v `lib/recommendations.ts`.

## Princip

Rule-based engine – žádné AI ani machine learning. Pravidla se vyhodnocují při každém načtení nebo aktualizaci projektu.

```
IF projekt splňuje podmínku
THEN vytvoř/aktualizuj Recommendation záznam v DB
```

## Vstupy

- `stage` – aktuální fáze pipeline
- `potentialLevel` – LOW / MEDIUM / HIGH
- `ipStatus` – string nebo null
- `teamStrength` – TECHNICAL_ONLY / BALANCED / STRONG
- `businessReadiness` – WEAK / EMERGING / STRONG
- `nextStep` – string nebo null
- `lastContactAt` – datum nebo null

## Výstupy (Recommendation model)

Každé doporučení má:
- `ruleKey` – unikátní identifikátor pravidla (viz [[Rules]])
- `title` – název doporučení
- `description` – vysvětlení kroku
- `suggestedRole` – doporučená role pomoci
- `status` – PENDING / COMPLETED / DISMISSED

## Sync logika

`syncProjectRecommendations()` se volá při ukládání projektu:
1. Vypočítá expected recommendations pro aktuální stav.
2. Vytvoří chybějící záznamy v DB.
3. Aktualizuje existující PENDING záznamy (pokud text pravidla změněn).
4. Stará PENDING doporučení, která již nesplňují podmínky, se nastaví na DISMISSED.
5. COMPLETED doporučení se nikdy nepřepisují.

## Šablony dokumentů

Ke každé fázi mohou být přiřazeny šablony (`Template` model, Supabase Storage).

Funkce `getStageTemplates(stage)` vrátí šablony pro danou fázi s podepsanými URL.

Funkce `attachTemplatesToRecommendations()` připojí šablony k doporučením pro zobrazení v UI.

## UX princip

Doporučení jsou zobrazena jako karty v `components/recommendation-panel.tsx`. Každé doporučení může být označeno jako COMPLETED nebo DISMISSED.

Viz [[Rules]] pro kompletní seznam pravidel.
