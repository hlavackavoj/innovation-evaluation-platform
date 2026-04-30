# Pipeline Stages

## Aktuální implementace

V databázi jsou implementovány **5 fází** (enum `PipelineStage`). Původní plán 8 fází byl zjednodušen.

| Enum hodnota | Popis (z `lib/constants.ts`) |
|---|---|
| `DISCOVERY` | Early discovery work to clarify the opportunity, team readiness, and first institutional fit. |
| `VALIDATION` | Evidence gathering is underway to test demand, problem urgency, and solution fit. |
| `MVP` | The team is shaping an MVP plan, pilot scope, and support package for the next milestone. |
| `SCALING` | The project has traction and is preparing for broader rollout, partnerships, or investment readiness. |
| `SPIN_OFF` | The opportunity is ready for formal spin-off planning, governance, and launch decisions. |

## Výchozí fáze

Nový projekt se vytvoří ve fázi `DISCOVERY`.

## Doporučení podle fáze

Každá fáze má 2 stage-based pravidla doporučovacího enginu. Viz [[../05_Recommendation_Engine/Rules]].

## UI komponenta

Fáze je zobrazena v `components/pipeline-stepper.tsx`.

## Mapování na původní plán

| Původní fáze | Aktuální fáze |
|---|---|
| New Lead | DISCOVERY |
| Initial Screening | DISCOVERY |
| Need More Info | DISCOVERY |
| Evaluation | VALIDATION |
| Support Plan | MVP |
| Active Support | SCALING |
| Spin-off Candidate | SPIN_OFF |
| Archived | (není enum, projekt lze označit jinak) |
