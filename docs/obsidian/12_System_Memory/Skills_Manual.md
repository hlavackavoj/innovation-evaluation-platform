# Skills Manual — IEP Engineering Reference

Aktualizováno: 2. 5. 2026

---

## create-plan

Pojistka proti zbrklé implementaci. Před zápisem kódu vždy sestavit technický návrh:
- Co přesně se mění a proč
- Které soubory jsou dotčeny
- Jaké jsou závislosti a rizika
- Implementační pořadí (nejnižší riziko → nejvyšší)

Výstup: stručný plán potvrzený uživatelem → pak teprve kód.

---

## stop-slop

Filtr na kvalitu výstupu a terminologii.

Pravidla:
- Žádná generická anglická vata v CZ UI ("Total Projects", "Recent Activity", "Enrichment Results")
- Akademické termíny pro akademické pracovníky (milníky, výzkumný záměr, korespondence)
- Komentáře v kódu jen pokud není WHY zjevné ze samotného kódu
- Žádné backticky v JSX renderu (způsobí zobrazení backtiku místo proměnné)

---

## WarpGrep / Security Audit

Před každou session zkontrolovat:
- `$queryRawUnsafe` → žádný výskyt (projekt je čistý; oba `$queryRaw` používají template literals)
- Race conditions v async DB operacích: findFirst → create pattern = TOCTOU, opravit přes DB unique constraint + P2002 catch

---

## Calendar Bridge Logic

Tok dat pro kalendářní integraci:

```
email body
  → Gemini analyzeText()
  → suggestedActions[type=SCHEDULE_MEETING].proposedDateTime
  → buildCalendarProposals() [analyzer-pipeline.ts]
  → analysisMetadata.calendarProposals (uloženo v DB Activity)
  → parseCalendarProposals() [analysis-metadata.ts]
  → enrichment-panel.tsx: tlačítka ICS + Google Kalendář
```

Utility funkce: `lib/email/calendar-utils.ts`
- `buildIcsContent(title, startIso, durationMinutes)` → RFC 5545 VCALENDAR string
- `buildIcsAllDayContent(title, dateIso)` → celodenní event
- `buildGoogleCalendarUrl(title, startIso, durationMinutes)` → URL bez OAuth
- `buildGoogleCalendarAllDayUrl(title, dateIso)` → celodenní URL

Princip: vše client-side, žádný API route, žádný Calendar OAuth.

---

## Phase Trigger Logic

Keyword-based fallback detekce `UniversityPhase` pro případ, kdy AI nevrátí `suggestedUniversityPhase`.

Soubor: `lib/email/phase-triggers.ts`
Funkce: `detectPhaseFromText(text: string): UniversityPhaseSuggestion | null`

Trigger mapa (priorita shora dolů):
- smlouva/podpis/contract/nda → CONTRACTING
- grant proposal/budget approval/financování schváleno → CONTRACTING  
- realizace zahájena/kick-off/progress report → IMPLEMENTATION
- závěrečná zpráva/deliverable/odevzdání → DELIVERY
- výzkumný záměr/research idea/exploratory → IDEATION

Integrace: `suggestedUniversityPhase: data.suggestedUniversityPhase ?? detectPhaseFromText(joinedText)` v `analyzer-pipeline.ts`.

Záměrně "suggest only" — nikdy automatická změna fáze projektu.

---

## Race Condition Pattern — createSuggestedTaskIfMissing

Anti-pattern (původní):
```typescript
const existing = await prisma.task.findFirst({ where: { ... } });
if (existing) return null;
return prisma.task.create({ ... }); // race window here
```

Správný pattern:
```typescript
// schema.prisma: @@unique([sourceActivityId, projectId, title])
try {
  return await prisma.task.create({ ... });
} catch (e) {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return null;
  throw e;
}
```

DB unique constraint = garantovaná idempotence. P2002 catch = graceful dedup na aplikační vrstvě.

---

## mcp-integration

Claude vidí soubory v Obsidianu (`docs/obsidian/`) jako součást kontextu projektu.
Vault: `docs/obsidian/00_Index.md` — vstupní bod.
Po každé větší změně: aktualizovat `Progress_Log.md` + případně `Skills_Manual.md`.

---

## Codex Security

Každý SQL dotaz musí použít parametrizované query:
- `prisma.$queryRaw\`...\`` s template literals → bezpečné (parameterizované)
- `prisma.$queryRawUnsafe(string)` → zakázáno (SQL injection risk)

Aktuální stav projektu: 0 výskytů `$queryRawUnsafe`. Oba `$queryRaw` v `lib/data.ts` a `app/tasks/[id]/page.tsx` jsou template literals → OK.
