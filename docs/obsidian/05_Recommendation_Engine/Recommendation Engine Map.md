# Recommendation Engine Map

Aktualizováno: 1. 5. 2026
Zdrojový soubor: `lib/recommendations.ts`

Tento dokument popisuje přesnou implementaci. Pro přehled pravidel viz [[Rules]].

---

## Účel

Rule-based engine, který pro každý projekt vyhodnocuje sadu pravidel a generuje `Recommendation` záznamy do DB. UI zobrazuje jen `PENDING` záznamy — ostatní jsou skryté.

---

## Klíčové soubory

| Soubor | Obsah |
|---|---|
| `lib/recommendations.ts` | Celý engine: pravidla, sync, templates |
| `lib/data.ts` | `getProjectById()` — volá `syncProjectRecommendations()` jako side-effect |
| `app/projects/[id]/page.tsx` | Detail projektu — zobrazuje recommendation panel |
| `app/projects/actions.ts` | `convertRecommendationToTaskAction()` — konverze doporučení na task |
| `prisma/schema.prisma` | Model `Recommendation`, `@@unique([projectId, ruleKey])` |

---

## Runtime flow

```mermaid
flowchart TD
  VISIT["User otevře /projects/[id]"] --> GBY["getProjectById(id, userId)\nlib/data.ts"]
  GBY --> SYNC["syncProjectRecommendations(project)\nlib/recommendations.ts"]
  SYNC --> BUILD["buildProjectRecommendations(project)\nStage rules + Condition rules"]
  BUILD --> EXPECTED["RecommendationDefinition[]\n(ruleKey, title, description, suggestedRole)"]
  
  EXPECTED --> UPSERT["Pro každé očekávané pravidlo:"]
  UPSERT --> NEW_REC["Neexistuje → prisma.recommendation.create()"]
  UPSERT --> EXIST_PEND["Existuje PENDING → prisma.recommendation.update()\n(aktualizace textu)"]
  UPSERT --> EXIST_COMP["Existuje COMPLETED → skip (nepřepisuje se)"]

  SYNC --> STALE["Stará PENDING bez aktivního pravidla\n→ status: DISMISSED"]

  GBY --> TEMPLATES["getStageTemplates(stage)\nprisma.template.findMany() + createSignedFileUrl()"]
  TEMPLATES --> UI["Recommendation panel\napp/projects/[id]/page.tsx"]
  EXPECTED --> UI
```

---

## Pravidla (10 celkem)

### Stage pravidla (2 per fáze = 10 celkem pro 5 fází)

| ruleKey | Stage | Suggested role |
|---|---|---|
| `stage:discovery:market-size` | DISCOVERY | Industry expert |
| `stage:discovery:target-audience` | DISCOVERY | Startup mentor |
| `stage:validation:interviews` | VALIDATION | Startup mentor |
| `stage:validation:mvp-scope` | VALIDATION | Evaluator |
| `stage:mvp:analytics` | MVP | Technical lead |
| `stage:mvp:success-metrics` | MVP | Product lead |
| `stage:scaling:business-development` | SCALING | Business Developer |
| `stage:scaling:investor-readiness` | SCALING | Investor |
| `stage:spin-off:company-roadmap` | SPIN_OFF | Technology transfer officer |
| `stage:spin-off:ip-transfer` | SPIN_OFF | IP lawyer |

### Condition pravidla (přidávají se na základě stavu projektu)

| ruleKey | Trigger |
|---|---|
| `condition:missing-ip-status` | `ipStatus` je null nebo prázdný string |
| `condition:business-capability-gap` | `teamStrength == TECHNICAL_ONLY` nebo `businessReadiness == WEAK` |
| `condition:missing-next-step` | `nextStep` je null nebo prázdný string |
| `condition:stale-contact` | `lastContactAt` je starší než 30 dní |
| `condition:high-potential-support-plan` | `potentialLevel == HIGH` a `stage != SCALING, SPIN_OFF` |

---

## Deduplikace

`@@unique([projectId, ruleKey])` na modelu `Recommendation` — pro každý projekt existuje maximálně jeden záznam per pravidlo.

`syncProjectRecommendations()` nikdy nepřepisuje `COMPLETED` záznamy — uživatelovo potvrzení (převedení na task) je trvalé.

---

## Konverze na Task

```mermaid
flowchart LR
  USER["User klikne 'Convert to Task'\napp/projects/[id]/page.tsx"] --> ACTION["convertRecommendationToTaskAction(recId)\napp/projects/actions.ts"]
  ACTION --> CREATE_TASK["prisma.task.create()"]
  ACTION --> MARK_COMP["prisma.recommendation.update()\nstatus: COMPLETED"]
  CREATE_TASK --> TASKS_LIST["Zobrazí se v Tasks sekci projektu"]
```

---

## Templates napojené na stage

`getStageTemplates(stage)` vrací šablony pro aktuální fázi projektu. Každá šablona dostane podepsanou Supabase URL (`createSignedFileUrl()`). Šablony jsou zobrazeny v recommendation panelu.

Seed vytváří 5 templates (Discovery Brief, Validation Interview Guide, Pilot Success Metrics, Investor Readiness Pack, Spin-off Formation Checklist).

---

## Side effects a coupling

- `getProjectById()` v `lib/data.ts` spouští `syncProjectRecommendations()` jako side-effect při každém načtení detailu. **Architektonické riziko:** read funkce mění DB. Doporučení: přesunout sync do post-action lifecycle.
- Pokud se změní pipeline fáze projektu, stará stage pravidla se automaticky označí jako `DISMISSED` a nová se vytvoří jako `PENDING`.

---

## Open questions

- Je `syncProjectRecommendations()` jako read side-effect akceptovatelné chování v produkci?
- Přidat `priority` nebo `urgencyScore` na `Recommendation` pro lepší UX prioritizace?
- Expert matching: Jak propojit `suggestedRole` s databází expertů?

---

## Navigace

- [[Recommendation Engine Overview]] – přehledový popis
- [[Rules]] – seznam všech pravidel
- [[Recommended Roles]] – role doporučované enginem
- [[Playbooks]] – životní cyklus doporučení
- [[../12_System_Memory/System Memory Map]] – celková architektura
