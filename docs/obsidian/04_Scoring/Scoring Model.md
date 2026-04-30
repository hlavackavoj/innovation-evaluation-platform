# Scoring Model

## Stav implementace

**NEREALIZOVÁNO** – scoring formulář a výpočet skóre zatím neexistují.

Datový model ukládá výsledek scoringu jako `potentialLevel` (LOW / MEDIUM / HIGH), ale scoring formulář nebyl vytvořen.

## Plán scoringu

### Kritéria a váhy

| Kritérium | Rozsah | Hodnotí se |
|---|---|---|
| Technologie | 0–20 | Unikátnost, proveditelnost, stav vývoje, odlišitelnost |
| Trh | 0–20 | Velikost problému, jasnost zákazníka, velikost trhu, ochota platit |
| Tým | 0–20 | Motivace, business kompetence, tech kompetence, realizovatelnost |
| IP | 0–20 | Ochrana know-how, patentovatelnost, vlastnictví, právní rizika |
| Komercializace | 0–20 | Připravenost na pilot, validace, value proposition, partneři |

### Výpočet

```
total_score = technology + market + team + ip + commercialization
```

### Výstupy → potentialLevel

- 0–40 → `LOW`
- 41–70 → `MEDIUM`
- 71–100 → `HIGH`

## Co je potřeba k implementaci

1. Scoring formulář na detailu projektu nebo jako samostatná stránka.
2. Uložení dílčích skóre (nová tabulka nebo JSON pole na Project).
3. Výpočet a aktualizace `potentialLevel`.
4. Vizualizace skóre (progress bar nebo radar chart).

## Poznámka

Scoring nesmí být jediný rozhodovací mechanismus. Má sloužit jako opora pro diskuzi a prioritizaci, ne jako automatické rozhodnutí.
