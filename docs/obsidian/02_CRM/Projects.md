# Projects

## Popis

Projekt je hlavní entita systému. Reprezentuje univerzitní, výzkumný nebo studentský projekt, který může mít startupový nebo spin-off potenciál.

## Atributy (aktuální schéma)

| Pole | Typ | Popis |
|---|---|---|
| id | String (cuid) | Primární klíč |
| title | String | Název projektu |
| description | String | Popis |
| field | String? | Obor / oblast |
| stage | PipelineStage | Aktuální fáze pipeline |
| priority | ProjectPriority | Priorita (LOW/MEDIUM/HIGH/URGENT) |
| potentialLevel | ProjectPotentialLevel | Potenciál (LOW/MEDIUM/HIGH) |
| ipStatus | String? | Stav IP ochrany (volný text) |
| teamStrength | TeamStrength? | TECHNICAL_ONLY / BALANCED / STRONG |
| businessReadiness | BusinessReadiness? | WEAK / EMERGING / STRONG |
| nextStep | String? | Popis dalšího kroku |
| nextStepDueDate | DateTime? | Deadline dalšího kroku |
| lastContactAt | DateTime? | Datum posledního kontaktu |
| organizationId | String? | FK na Organization |
| ownerUserId | String? | FK na User (vlastník) |
| createdAt | DateTime | Datum vytvoření |
| updatedAt | DateTime | Datum aktualizace |

## Pipeline stages

Viz [[../03_Pipeline/Pipeline Stages]].

Hodnoty: `DISCOVERY`, `VALIDATION`, `MVP`, `SCALING`, `SPIN_OFF`

## Vazby

- `organization` → Organization (volitelné)
- `owner` → User (volitelné)
- `contacts` → ProjectContact[] (M:N junction tabulka)
- `activities` → Activity[]
- `tasks` → Task[]
- `recommendations` → Recommendation[]
- `documents` → ProjectDocument[]
- `emailAutomationSetting` → ProjectEmailAutomationSetting (1:1)
- `emailLinks` → ProjectEmailLink[]
- `syncJobs` → EmailSyncJob[]

## Recommendation engine

Doporučení se syncují při každé aktualizaci projektu přes `syncProjectRecommendations()` v `lib/recommendations.ts`. Viz [[../05_Recommendation_Engine/Recommendation Engine Overview]].

## Email automation

Každý projekt může mít nastavení e-mailové automatizace (`ProjectEmailAutomationSetting`):
- `enabled` – zapnutí automatické synchronizace
- `schedule` – DAILY / WEEKLY
- `keywordAliases` – klíčová slova pro párování e-mailů
- `contacts` – kontakty sledované pro párování
- `domains` – domény sledované pro párování

Viz [[Email Analyzer]].
