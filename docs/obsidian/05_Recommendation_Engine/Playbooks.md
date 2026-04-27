# Playbooks

## Cíl

Playbook definuje, co se má doporučit v konkrétní fázi a situaci projektu.

## Struktura playbooku

- stage
- conditions
- recommended_actions
- recommended_roles
- explanation
- priority

## Příklad playbooku

```yaml
stage: Evaluation
conditions:
  ip_status: missing
recommended_actions:
  - Ověřit IP status projektu
  - Zjistit, kdo vlastní výsledky výzkumu
  - Konzultovat patentovatelnost
recommended_roles:
  - IP právník
  - Technology transfer officer
priority: high
explanation: Bez vyřešeného IP nelze bezpečně pokračovat ke spin-offu.
```

## Typy doporučení

### Akční doporučení

Konkrétní krok, který má tým udělat.

### Role doporučení

Typ člověka nebo experta, který může pomoci.

### Interní doporučení

Doporučení pro pracovníky inovačního centra.
