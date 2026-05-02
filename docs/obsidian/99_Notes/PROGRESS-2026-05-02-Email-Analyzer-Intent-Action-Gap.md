# Progress – Email Analyzer Intent/Action/Gap Hardening (2026-05-02)

Navazuje na: [[02_CRM/Email Analyzer]] · [[99_Notes/PROGRESS-2026-05-01-Email-Analyzer-Feed]] · [[99_Notes/Next Steps]]

## Co bylo dokončeno

- V `lib/email/analyzer-pipeline.ts` byla zpřesněna AI analýza e-mailů pro CRM intake.
- Přidána povinná kategorizace záměru:
  - `MEETING`
  - `PROPOSAL`
  - `FEEDBACK`
  - `ADMIN`
- Přidána struktura `actionItems[]`:
  - `task`
  - `deadline` (normalizace na ISO `YYYY-MM-DD`)
  - `assigneeSuggestion`
- Prompt pro model byl rozšířen o jasná pravidla:
  - u `PROPOSAL` vracet 3 gap-analysis otázky (budget / timeline / scope+success criteria),
  - převod relativních deadline výrazů (např. „do pátku“, „by Friday“, „tomorrow“).
- Výstup se ukládá i do `analysisMetadata`:
  - `intentCategory`
  - `actionItems`
  - `gapAnalysisQuestions`

## Stabilizační opravy po review

- Oprava false positives při detekci dnů v týdnu:
  - místo substring `includes()` se používá token matching.
- Oprava risku špatné interpretace slash data:
  - `MM/DD` vs `DD/MM` se parsuje jen pokud je formát neambiguous,
  - ambiguous hodnoty (např. `5/10`) se úmyslně neparsují (`deadline = null`) místo tichého chybného data.
- Vyváženější fallback intentu:
  - snížen bias na `ADMIN`, širší heuristika pro `PROPOSAL` / `FEEDBACK`.

## Ověření

- Testy: `npm test -- tests/analyzer-parser.test.ts` ✅
- Build: `npm run build` ✅
- Commit + push na `main`:
  - commit: `3498e1f`
  - message: `Improve email analyzer intent and deadline parsing`

## Co dál (doporučené pokračování)

1. Přidat cílené parser testy pro deadline normalizaci:
   - `do pátku`
   - `next Friday`
   - `10.5.`
   - ambiguous `5/10`
2. Rozhodnout produktové pravidlo pro ambiguous slash datum:
   - buď striktně `null` (aktuální stav),
   - nebo locale-aware režim podle jazyka/tenantu.
3. V UI enrichment panelu zobrazit nové metadata:
   - `intentCategory`
   - `actionItems`
   - `gapAnalysisQuestions`
4. Přidat 8-12 testovacích e-mailových fixture scénářů (MEETING/PROPOSAL/FEEDBACK/ADMIN) pro regresní kontrolu kvality.

