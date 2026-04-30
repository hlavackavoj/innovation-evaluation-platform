# Playbooks

## Jak engine funguje

Každý projekt generuje sadu doporučení kombinací:
1. **Stage pravidel** – 2 doporučení pevně daná aktuální fází pipeline
2. **Condition pravidel** – 0–5 dodatečných doporučení podle stavu projektu

Playbook = konkrétní kombinace pro daný stav projektu.

## Příklad: projekt v DISCOVERY, chybí IP, slabý tým

Vygenerovaná doporučení:
- `stage:discovery:market-size` → Perform market size analysis (Industry expert)
- `stage:discovery:target-audience` → Identify primary target audience (Startup mentor)
- `condition:missing-ip-status` → Clarify IP status (IP lawyer)
- `condition:business-capability-gap` → Strengthen business capability (Business mentor)

## Příklad: projekt v SCALING, HIGH potenciál, bez nextStep

Vygenerovaná doporučení:
- `stage:scaling:business-development` → Build partnership pipeline (Business Developer)
- `stage:scaling:investor-readiness` → Prepare investor readiness materials (Investor)
- `condition:missing-next-step` → Define the next milestone (Project manager)

## Životní cyklus doporučení

```
[vytvoření projektu / aktualizace]
    ↓
syncProjectRecommendations()
    ↓
PENDING → doporučení je aktivní, čeká na akci
    ↓ (uživatel označí jako hotové)
COMPLETED → již se nepřepisuje
    ↓ (podmínka přestala platit, ale nebylo dokončeno)
DISMISSED → tiché zavření
```

## Typy doporučení

### Akční doporučení
Konkrétní krok, který má tým nebo inovační centrum udělat (analýza trhu, rozhovory, scoring, …).

### Role doporučení
Typ experta nebo interního pracovníka, který může projektu pomoci.

### Stale alert
Doporučení upozorňující na stagnaci projektu (`condition:stale-contact`, `condition:missing-next-step`).
