# Next Steps

Aktualizováno: 2. 5. 2026

## 1) Plná automatizace přes Webhooky (Pub/Sub)

- Zavést Gmail `watch` registraci na aktivní mailbox po OAuth connectu (obnova watch před expirací).
- Přidat endpoint pro příjem Pub/Sub notifikací a validaci zdroje + replay ochranu.
- Udržovat `historyId` per connection a stahovat pouze delta změny (nové e-maily) místo full fetch.
- Spouštět `runCommunicationAnalysis` jen pro nové `providerMessageId`, se zachováním idempotence tasků.
- Přidat observabilitu: počet eventů, latence pipeline, chybovost parsování, počet přeskočených duplicit.

## 2) Napojení na kalendář

- Využít `analysisMetadata.calendarProposals` jako vstupní bridge vrstvu pro Google Calendar.
- Implementovat mapování:
- `proposedDateTimeIso` -> časovaný event
- `allDayDateIso` -> all-day event
- Přidat režim "suggest only" (bez auto-create) a následně "auto-create for approved projects".
- Ukládat `calendarEventId` do metadata activity/task pro audit a idempotentní update/cancel.
- Přidat UI krok v `/email-analyzer`: potvrdit/odmítnout návrh termínu před vytvořením události.

## 3) Systém fázování projektů pro akademické pracovníky

- Formalizovat mapu `PipelineStage <-> UniversityPhase` na jednom místě (service vrstva + dokumentace).
- Přidat pravidla přechodů:
- IDEATION -> CONTRACTING (grant/partner intent)
- CONTRACTING -> IMPLEMENTATION (podpis/budget approval)
- IMPLEMENTATION -> DELIVERY (milestones achieved/reporting)
- Na detail projektu zobrazit doporučený i potvrzený `UniversityPhase` + historii změn.
- Rozšířit recommendation rules o phase-specific checklist pro akademiky (grant governance, reporting, IP transfer).
