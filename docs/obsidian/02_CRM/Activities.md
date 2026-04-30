# Activities

## Popis

Aktivita reprezentuje historický záznam práce s projektem. Může být vytvořena ručně nebo automaticky z importovaného e-mailu.

## Typy aktivit (ActivityType)

- `MEETING`
- `CALL`
- `EMAIL`
- `NOTE`
- `WORKSHOP`
- `EVALUATION`

## Atributy (aktuální schéma)

| Pole | Typ | Popis |
|---|---|---|
| id | String (cuid) | Primární klíč |
| projectId | String | FK na Project |
| userId | String? | FK na User (autor záznamu) |
| type | ActivityType | Typ aktivity |
| note | String | Popis / poznámka (u AI aktivit: AI summary) |
| emailMessageId | String? @unique | FK na EmailMessage (providerMessageId) |
| emailParentId | String? | providerMessageId nadřazeného e-mailu (pro vlákno) |
| aiAnalysis | Json? | Výstup AI analýzy: `{ summary, themes, risks, nextSteps }` |
| activityDate | DateTime | Datum aktivity |
| createdAt | DateTime | Datum záznamu |

## E-mailové aktivity (typ EMAIL)

Aktivity typu `EMAIL` jsou automaticky vytvářeny Email Analyzerem při importu e-mailu:

- `note` = AI summary e-mailu
- `aiAnalysis` = `{ summary, themes[], risks[], nextSteps[{title, dueDays}] }`
- `emailMessageId` = propojení na EmailMessage
- Z `aiAnalysis.nextSteps` jsou automaticky generovány Tasks

## Vazby

- `project` → Project
- `user` → User (volitelné)
- `emailMessage` → EmailMessage (volitelné, unikátní)
- `sourceTasks` → Task[] (úkoly vygenerované z této aktivity)
