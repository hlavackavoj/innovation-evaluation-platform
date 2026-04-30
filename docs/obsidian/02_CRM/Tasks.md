# Tasks

## Popis

Úkol reprezentuje konkrétní další krok, který má někdo provést. Může být vytvořen ručně nebo automaticky z AI analýzy e-mailu.

## Atributy (aktuální schéma)

| Pole | Typ | Popis |
|---|---|---|
| id | String (cuid) | Primární klíč |
| projectId | String | FK na Project |
| assignedToUserId | String? | FK na User |
| sourceActivityId | String? | FK na Activity (zdroj AI-generovaného úkolu) |
| title | String | Název úkolu |
| description | String? | Popis |
| status | TaskStatus | TODO / IN_PROGRESS / DONE / CANCELLED |
| priority | ProjectPriority | LOW / MEDIUM / HIGH / URGENT |
| dueDate | DateTime? | Deadline |
| createdAt | DateTime | Datum vytvoření |
| updatedAt | DateTime | Datum aktualizace |

## Automaticky generované úkoly

Email Analyzer generuje úkoly z `aiAnalysis.nextSteps` při importu e-mailu:
- `priority` → HIGH pokud `dueDays <= 3`, jinak MEDIUM
- `sourceActivityId` → ID aktivity vytvořené z daného e-mailu
- `assignedToUserId` → `project.ownerUserId`

## Indexy

- `@@index([sourceActivityId])` – efektivní dotaz na úkoly podle zdrojové aktivity
