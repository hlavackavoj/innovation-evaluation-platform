# Google AI Studio / Gemini API Setup pro Email Analyzer

## 1. Přehled
Google AI Studio slouží k vytvoření a správě Gemini API klíče a k rychlému testování promptů.  
V tomto repozitáři je Gemini napojený na modul **Email Analyzer**, který analyzuje e-maily (intent, next steps, návrhy úkolů) a ukládá výstupy do CRM.
Prompt pro Email Analyzer byl validovaný v Google AI Studio s modelem **Gemini 2.5 Flash-Lite**.

Relevantní implementace:
- `lib/email/analyzer-pipeline.ts` (hlavní pipeline pro `/email-analyzer`)
- `app/email-analyzer/actions.ts` (server action spouštějící analýzu)
- `app/projects/actions.ts` (`processCommunicationAction` pro import e-mailového vlákna na detailu projektu)
- `lib/env.ts` (`getGeminiApiKey()` a mapování env proměnných)

## 2. Předpoklady
- Google účet
- Přístup do Google AI Studio
- Lokální prostředí podle repozitáře:
  - Node.js + npm (projekt je **Next.js + TypeScript**)
  - PostgreSQL
- Nainstalované závislosti projektu

## 3. Vytvoření nebo získání Gemini API klíče
1. Otevři [Google AI Studio](https://aistudio.google.com/).
2. V sekci API keys vytvoř nový klíč nebo použij existující.
3. Klíč si zkopíruj a ulož bezpečně.

Nikdy necommituj API klíč do Gitu ani do sdílených screenshotů/logů.

## 4. Konfigurace environment proměnných
V kódu se API klíč čte v pořadí:
1. `GOOGLE_API_KEY`
2. `GEMINI_API_KEY`
3. `GOOGLE_AI_API_KEY`

Viz `lib/env.ts` (`getGeminiApiKey()`).

Poznámka:
- V `.env.example` je aktuálně uvedeno `GOOGLE_AI_API_KEY`.
- Pro nový setup preferuj `GEMINI_API_KEY` (pokud v týmu není domluvené jinak).
- `GOOGLE_API_KEY` může fungovat v některých Google SDK scénářích, ale nenastavuj více variant najednou bez důvodu.

Příklad `.env`:

```env
# Gemini (nastav jen jeden klíč)
GEMINI_API_KEY="your-gemini-api-key"

# Ostatní proměnné z .env.example / README:
DATABASE_URL="postgresql://vojtechhlavacka@localhost:5432/innovation_evaluation_platform"
EMAIL_TOKEN_ENCRYPTION_KEY="replace-with-random-value"
EMAIL_OAUTH_STATE_SECRET="replace-with-random-value"
```

## 5. Instalace závislostí
Použij příkaz z tohoto repozitáře:

```bash
npm install
```

## 6. Spuštění email analyzeru lokálně
1. Připrav `.env` (minimálně DB + Gemini key).
2. Spusť aplikaci:

```bash
npm run dev
```

3. Otevři:
- `http://localhost:3000/email-analyzer`

4. Přihlas se (stránka vyžaduje autentizaci přes Kinde session; viz `requireCurrentUser()` v `lib/authorization.ts`).

Jak ověřit, že Gemini konfigurace funguje:
- V UI spusť **Analyze Communication** na stránce `/email-analyzer`, nebo
- Použij debug endpoint (po přihlášení):

```bash
curl -X POST http://localhost:3000/api/debug/test-email-analysis
```

Při chybě klíče se v kódu objevuje např. hláška typu `Missing Gemini API key...` (např. `app/projects/actions.ts`).

## 7. Test se vzorovým e-mailem
Používej pouze testovací/dummy data bez osobních údajů.

Příklad textu e-mailu:

```text
Předmět: Návrh dalšího postupu k pilotu

Dobrý den,
děkujeme za zaslaný draft. Potřebujeme upřesnit rozpočet a časový plán.
Můžeme si v pátek dát 30min call?
Prosím o návrh 2 termínů.
```

Očekávaný výstup analyzeru:
- shrnutí komunikace (`summary`)
- klasifikace intentu (`intentCategory`)
- akční položky (`actionItems`, `nextSteps`)
- návrhy úkolů (`SUGGESTED` tasky)
- metadata v `Activity.analysisMetadata` (např. sentiment, urgency, follow-up otázky)

## 8. Troubleshooting
### Chybí API klíč
- Zkontroluj, že máš nastavený jeden z: `GOOGLE_API_KEY`, `GEMINI_API_KEY`, `GOOGLE_AI_API_KEY`.
- Restartuj `npm run dev` po změně `.env`.

### Neplatný API klíč
- Vygeneruj nový klíč v AI Studio.
- Ověř, že nemáš navíc mezery/uvozovky navíc.

### Špatný název env proměnné
- Repo podporuje tři názvy (viz výše), ale doporučený je `GEMINI_API_KEY`.

### `.env` se nenačetl
- Ověř umístění souboru v rootu projektu.
- Restartuj dev server.

### Quota / billing limity
- Zkontroluj limity účtu v Google AI Studio/Google Cloud.
- Při rate limitu má pipeline retry logiku (`lib/email/analyzer-pipeline.ts`), ale nemusí pokrýt trvalé limity.

### Network / API chyby
- Ověř internetové připojení a firewall/proxy.
- Zkontroluj server logy Next.js.

### Nesoulad modelu
- Produkční API model string pro Email Analyzer je `gemini-2.5-flash-lite` (UI label v AI Studio: **Gemini 2.5 Flash-Lite**).
- Pokud chceš model změnit, uprav konstantu `GEMINI_EMAIL_ANALYZER_MODEL` v `lib/email/gemini-model.ts` a otestuj změnu na vzorových e-mailech před nasazením.

## 9. Bezpečnostní poznámky
- Nikdy necommituj `.env` ani API klíče.
- Rediguj citlivý obsah e-mailů v logách.
- Pracuj opatrně s osobními údaji a těly e-mailů.
- Do modelu neposílej víc citlivých dat, než je nutné.

## 10. Reference
- Google AI Studio: [https://aistudio.google.com/](https://aistudio.google.com/)
- Gemini API docs: [https://ai.google.dev/gemini-api/docs](https://ai.google.dev/gemini-api/docs)
- README: [README.md](/Users/vojtechhlavacka/Documents/innovation-evaluation-platform/README.md)
- Env helper: [lib/env.ts](/Users/vojtechhlavacka/Documents/innovation-evaluation-platform/lib/env.ts)
- Email analyzer pipeline: [lib/email/analyzer-pipeline.ts](/Users/vojtechhlavacka/Documents/innovation-evaluation-platform/lib/email/analyzer-pipeline.ts)
- Email analyzer page: [app/email-analyzer/page.tsx](/Users/vojtechhlavacka/Documents/innovation-evaluation-platform/app/email-analyzer/page.tsx)
- Debug test endpoint: [app/api/debug/test-email-analysis/route.ts](/Users/vojtechhlavacka/Documents/innovation-evaluation-platform/app/api/debug/test-email-analysis/route.ts)

## TODO
- TODO: Doplnit interní týmový standard, kterou jedinou env proměnnou (`GEMINI_API_KEY` vs `GOOGLE_AI_API_KEY`) chcete dlouhodobě používat napříč prostředími.
