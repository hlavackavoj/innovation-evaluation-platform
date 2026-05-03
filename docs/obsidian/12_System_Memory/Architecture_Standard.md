# Architecture Standard — IEP CRM

> Tento dokument zachycuje ověřené vzory a anti-patterny pro tento projekt.
> Každý standard byl odvozen z konkrétní refaktorace nebo incidentu.

---

## 1. Idempotence First (Zápis do DB)

**Pravidlo:** Při každém zápisu Activity nebo Task nejdříve ověř existenci záznamu.

**Pattern A — upsert přes přirozený klíč:**
```typescript
// Activity — klíč je providerMessageId z Gmailu
await prisma.activity.upsert({
  where: { emailMessageId: persistedMessage.providerMessageId },
  create: { ... },
  update: { ... }
});
```

**Pattern B — direct create s P2002 catch (race-safe):**
```typescript
// Task — klíč je @@unique([sourceActivityId, projectId, title])
async function createSuggestedTaskIfMissing(params) {
  try {
    return await prisma.task.create({ data: { ... } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return null; // duplikát — tiché přeskočení
    }
    throw error;
  }
}
```

**Proč:** Gmail `providerMessageId` je zdrojem pravdy pro deduplikaci e-mailů. Bez upsert by každý rerun syncu vytvořil duplicitní Activity.

---

## 2. SQL Bezpečnost — Parameterické dotazy

**Pravidlo:** NIKDY nepoužívej `$queryRawUnsafe`. Pro raw SQL vždy `prisma.$queryRaw` s Prisma.sql template literals.

```typescript
// SPRÁVNĚ — parametry jsou bezpečně escapovány
const ownerFilter = canAccessAllProjects(user)
  ? Prisma.empty
  : Prisma.sql`WHERE p."ownerUserId" = ${user.id}`;

const rows = await prisma.$queryRaw`
  SELECT t."id", t."title" FROM "Task" t
  JOIN "Project" p ON p."id" = t."projectId"
  ${ownerFilter}
`;

// ŠPATNĚ — nikdy toto
await prisma.$queryRawUnsafe(`SELECT * FROM "Task" WHERE id = '${userId}'`);
```

**Proč:** `$queryRawUnsafe` s dynamickými hodnotami vytváří SQL injection. PostgreSQL by mohl interpretovat hodnoty jako názvy sloupců nebo příkazy.

---

## 3. P2022 Guard Pattern — Ochrana před chybějícím sloupcem

**Pravidlo:** Kdykoli dotaz zahrnuje sloupec přidaný migrací (ne core schema), obal ho try/catch s P2022 detektorem.

```typescript
// Generická guard funkce — JEDEN vzor pro celý projekt
function isMissingColumn(error: unknown, column: string): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: unknown; meta?: { column?: unknown } };
  return e.code === "P2022" && e.meta?.column === column;
}

// Použití
try {
  return await prisma.activity.findMany({ select: { analysisMetadata: true, ... } });
} catch (error) {
  if (!isMissingColumn(error, "Activity.analysisMetadata")) throw error;
  console.error("SQL Fallback — spusť: npx prisma db push && npx prisma generate");
  return fallbackQuery(); // dotaz bez nového sloupce
}
```

### Známá P2022 riziková místa (vyžadují migraci při deploymentu)

| Sloupec | Guard existuje | Funkce |
|---|---|---|
| `Activity.analysisMetadata` | ✅ `isMissingColumn(e, "Activity.analysisMetadata")` | `getRecentActivitiesForDashboard` |
| `Task.contactId` | ✅ `isMissingColumn(e, "Task.contactId")` | `getTasks` |
| `Task.contactId` v `getProjects()` | ⚠️ CHYBÍ — `include: { tasks: true }` selektuje všechny sloupce | `getProjects` |
| `Task.contactId` v `getProjectById()` | ⚠️ CHYBÍ — `tasks: { include: { assignedTo: true } }` | `getProjectById` |
| `Task.sourceActivityId`, `suggestionStatus` | ⚠️ Nové sloupce, bez guardu | Všude kde `tasks: true` |

**Akce při nové migraci:** Přidej P2022 guard do všech funkcí, které zahrnují nový sloupec v Prisma `include` nebo `select`.

**Rychlofix při P2022 v produkci:**
```bash
npx prisma db push && npx prisma generate
```

---

## 4. Robust Metadata Parsing (AI výstup)

**Pravidlo:** Nikdy neparsuj JSON z AI bez guardu. Pokud JSON selže, vrať bezpečný fallback objekt — nikdy nevyvolávej výjimku, která shodí celou pipeline.

```typescript
// Vzor z parseAnalyzerOutput / parseGeminiTaskSuggestionOutput
function sanitizeJson(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return trimmed; // fast-path
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch?.[1]?.trim().startsWith("{")) return codeBlockMatch[1].trim();
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) return trimmed.slice(firstBrace, lastBrace + 1);
  return trimmed;
}

export function parseGeminiOutput(raw: string): OutputType {
  try {
    const parsed = JSON.parse(sanitizeJson(raw));
    if (!parsed || typeof parsed !== "object") return SAFE_FALLBACK;
    // ...normalizace polí
  } catch {
    console.error("[pipeline] JSON parse failed", { raw: raw.slice(0, 500) });
    return SAFE_FALLBACK;
  }
}
```

**Proč:** Gemini může vrátit markdown code blocky, prose + JSON, nebo nevalidní JSON. Hard error shodí celý sync job pro všechny e-maily.

---

## 5. RBAC Sync (Kinde ↔ DB)

**Pravidlo:** Role uživatele se synchronizuje z Kinde tokenu při každém `requireCurrentUser()`. Autorizace nesmí spoléhat na session cache.

```typescript
// lib/auth.ts — upsert uživatele vždy refreshuje roli
await prisma.user.upsert({
  where: { kindeId: kindeUser.id },
  create: { ..., role: resolvedRole },
  update: { role: resolvedRole }  // ← vždy přepsat z tokenu
});
```

**Role hierarchie (sestupně):** `ADMIN > MANAGER > EVALUATOR > USER > VIEWER`

**Bootstrap admin:** Určen přes `BOOTSTRAP_ADMIN_EMAILS` env var — tento mechanismus musí být v `resolveBootstrapAdminRole()` a nesmí se duplikovat.

---

## 6. Kanonizace Typů — Jediný zdroj pravdy

**Pravidlo:** Sdílené typy definuj na jednom místě. Nikdy nedefi nuj lokální kopii existujícího exportovaného typu.

| Typ | Kanonický zdroj |
|---|---|
| `UniversityPhaseSuggestion` | `lib/constants.ts` — `export type UniversityPhaseSuggestion` |
| `CalendarProposal` | `lib/email/analysis-metadata.ts` — `export type CalendarProposal` |
| `SuggestedAction`, `SuggestedActionType` | `lib/email/analysis-metadata.ts` |
| `ParsedAnalysisMetadata` | `lib/email/analysis-metadata.ts` |

**Proč:** Lokální kopie typu se postupně liší od originálu (např. `timezone: "UTC"` vs `timezone: string`). TypeScript nekřičí, ale runtime chování se odliší při přidání nového pole.

---

## 7. Anti-pattern: Double Fetch po Side-Effectu

**Problém:** Fetch celého záznamu → side-effect (sync) → fetch stejného záznamu znovu jen kvůli změně v jednom vztahu.

**Špatně:**
```typescript
const project = await prisma.project.findFirst({ include: { recommendations: true, ...all } });
await syncProjectRecommendations(project); // side-effect změní recommendations
const hydratedProject = await prisma.project.findFirst({ include: { recommendations: { where: { status: PENDING } }, ...all } });
```

**Správně — cílený re-fetch pouze změněného vztahu:**
```typescript
const project = await prisma.project.findFirst({ include: { recommendations: true, ...all } });
await syncProjectRecommendations(project);
const pendingRecommendations = await prisma.recommendation.findMany({
  where: { projectId: project.id, status: RecommendationStatus.PENDING }
});
return { ...project, recommendations: attachTemplates(pendingRecommendations, stageTemplates) };
```

**Proč:** Druhý full fetch je N JOIN dotazů zbytečně. `project` data se nemohla změnit (jen `recommendations` tabulka). Cílený fetch je O(1) vs O(N JOIN).

---

## 8. Task musí mít sourceActivityId

**Pravidlo:** Každý Task vytvořený automaticky z e-mailu MUSÍ mít `sourceActivityId`. Bez něj nelze:
- Deduplikovat přes `@@unique([sourceActivityId, projectId, title])`
- Sledovat původ tasku v UI (panel enrichment)

```typescript
// createSuggestedTaskIfMissing — sourceActivityId je povinný parametr
await prisma.task.create({
  data: {
    sourceActivityId: params.activityId, // ← nikdy null pro AI-generated tasks
    projectId: params.projectId,
    title: params.suggestion.title,
    ...
  }
});
```

---

## 9. Cleanup — Mrtvý kód

**Pravidlo:** Pokud je funkce definována ale nikde nevolána, okamžitě ji smaž. Nepiš `// unused` komentáře.

**Příklad z auditu (2026-05-03):**
- `normalizeTaskTitle()` v `analyzer-pipeline.ts` — definována, nikdy nevolána → smazána
- Lokální `CalendarProposal` typ v `analyzer-pipeline.ts` — stínoval exportovaný typ z `analysis-metadata.ts` → smazán, přidán import

---

*Naposledy aktualizováno: 2026-05-03 (audit refaktorace analyzer-pipeline.ts + lib/data.ts)*
