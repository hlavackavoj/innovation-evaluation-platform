# Vize

## Co řešíme

Univerzity a inovační centra nemají jednoduchý a strukturovaný způsob, jak identifikovat projekty s potenciálem startupu nebo spin-offu.

Projekty se ztrácí v e-mailech, tabulkách, osobních kontaktech a neformální komunikaci.

## Cíl produktu

Innovation Evaluation Platform umožní:

- zachytit projekty v rané fázi,
- sledovat jejich stav v pipeline,
- určit fázi rozvoje,
- doporučit další kroky (rule-based engine),
- navrhnout vhodné role pomoci,
- importovat a analyzovat e-mailovou komunikaci pomocí AI,
- sbírat data pro interní statistiky a strategické rozhodování.

## Pro koho

- univerzity,
- fakulty,
- inovační centra,
- technology transfer offices,
- akcelerátory,
- výzkumné organizace.

## Core value

Nejde jen o evidenci projektů. Hlavní hodnota je v tom, že systém pomáhá odpovědět:

- Které projekty mají potenciál?
- V jaké fázi jsou?
- Co se má stát dál?
- Kdo jim může pomoci?
- Které projekty potřebují pozornost?
- Co říká e-mailová komunikace o stavu projektu?

## Aktuální stav (duben 2026)

**Hotovo:**
- CRM (projekty, kontakty, organizace, aktivity, úkoly)
- Pipeline management (5 fází)
- Recommendation engine (rule-based, plně funkční)
- Autentizace a role přes Kinde Auth
- Šablony dokumentů napojené na fáze pipeline
- Email Analyzer v2: OAuth připojení Gmail, synchronizace, AI analýza, napojení na aktivity a úkoly (Outlook/Microsoft OAuth deferred)

**Plánováno (ještě neimplementováno):**
- Scoring model (UI + výpočet skóre)
- Expert matching (databáze expertů a párování)
- Pokročilá analytika (dashboard metriky)
- Enterprise bezpečnost (SSO, multi-tenant)
