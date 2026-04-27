# Recommendation Engine Overview

## Cíl

Doporučovací engine navrhuje další možné kroky a vhodné role podpory podle aktuálního stavu projektu.

## Princip MVP

V první verzi nejde o AI ani machine learning.

Použije se rule-based engine:

```text
IF projekt splňuje podmínku
THEN doporuč akce a role
```

## Vstupy

- stage
- potential_level
- ip_status
- team_strength
- business_readiness
- field
- last_contact_at
- next_step

## Výstupy

- recommended_actions
- recommended_roles
- priority
- explanation

## Proč rule-based

- snadné vysvětlení,
- důvěryhodnost,
- rychlá implementace,
- možnost úprav metodiky bez AI,
- vhodné pro první pilot.

## Důležitý UX princip

Doporučení musí jít převést na úkol.

Každé doporučení by mělo mít akce:

- vytvořit úkol,
- přiřadit odpovědnou osobu,
- naplánovat meeting,
- přidat experta.
