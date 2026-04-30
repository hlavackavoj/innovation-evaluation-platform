# Recommended Roles

Role jsou referencovány v pravidlech doporučovacího enginu jako `suggestedRole` (volný string).

## Role v aktuálních pravidlech

| Role | Pravidla kde se vyskytuje |
|---|---|
| Industry expert | `stage:discovery:market-size` |
| Startup mentor | `stage:discovery:target-audience`, `stage:validation:interviews` |
| Evaluator | `stage:validation:mvp-scope` |
| Technical lead | `stage:mvp:analytics` |
| Product lead | `stage:mvp:success-metrics` |
| Business Developer | `stage:scaling:business-development` |
| Investor | `stage:scaling:investor-readiness` |
| Technology transfer officer | `stage:spin-off:company-roadmap` |
| IP lawyer | `stage:spin-off:ip-transfer`, `condition:missing-ip-status` |
| Business mentor | `condition:business-capability-gap` |
| Project manager | `condition:missing-next-step`, `condition:stale-contact` |
| Innovation manager | `condition:high-potential-support-plan` |

## Popis rolí

### Startup mentor
Pomáhá s validací problému, business modelem a prvními kroky směrem ke startupu.

### Business mentor
Pomáhá s obchodním modelem, zákazníky, cenotvorbou a go-to-market strategií.

### IP lawyer
Pomáhá s ochranou duševního vlastnictví, patentovatelností a licencováním.

### Technology transfer officer
Pomáhá s převodem technologie z univerzity do praxe, spin-off procesem.

### Project manager
Pomáhá řídit úkoly, termíny a další kroky.

### Investor
Pomáhá s financováním – relevantní pro fáze SCALING a SPIN_OFF.

### Industry expert
Pomáhá validovat oborové předpoklady a propojit projekt s praxí.

### Innovation manager
Interní role inovačního centra – koordinuje podporu pro high-potential projekty.

### Technical lead
Pomáhá nastavit technické procesy (analytika, měření, infrastruktura).

### Product lead
Pomáhá definovat produktové metriky a pilot scope.

### Business Developer
Buduje partnerský pipeline a obchodní příležitosti.

## Poznámka

`suggestedRole` je v DB uložen jako volný string. Role neexistují jako samostatný model – expert matching není implementován.
