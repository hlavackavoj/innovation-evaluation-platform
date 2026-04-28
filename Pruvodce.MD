# Průvodce – Innovation Evaluation Platform

Stručný referenční dokument. Co kde najdeš, jak co funguje.

---

## Co to je

Webová aplikace pro správu inovačního portfolia. Sleduje projekty od prvního nápadu až po spin-off, navrhuje konkrétní kroky a hlídá, aby nic nezapadlo.

Navigace vlevo: **Dashboard → Projects → Tasks → Contacts → Organizations**

---

## Dashboard (`/`)

Úvodní přehled celého portfolia.

- **Total Projects** – celkový počet projektů v databázi
- **Pending Tasks** – úkoly, které ještě nejsou hotové
- **Projects by Stage** – kolik projektů je v každé fázi pipeline + procentuální podíl (sloupcový graf)
- **Recent Activity** – posledních N aktivit (meetingy, hovory, poznámky) napříč všemi projekty

---

## Projekty (`/projects`)

Tabulka všech projektů. Sloupce:

| Sloupec | Co říká |
|---------|---------|
| Project | Název + zkrácený popis; kliknutím jdeš na detail |
| Stage | Aktuální fáze pipeline |
| Priority | Low / Medium / High / Urgent |
| Potential | Low / Medium / High |
| Owner | Kdo projekt vede |
| Next step due | Deadline nejbližšího kroku |

Tlačítko **New project** vpravo nahoře → formulář pro nový projekt.

---

## Pipeline – 5 fází

Každý projekt prochází těmito fázemi v tomto pořadí:

```
Discovery → Validation → MVP → Scaling → Spin-off
```

| Fáze | Kdy se používá |
|------|---------------|
| **Discovery** | Prvotní nápad, ještě není ověřen |
| **Validation** | Testování trhu, rozhovory s uživateli |
| **MVP** | Běží první testovatelná verze produktu |
| **Scaling** | Ověřený produkt, hledají se partneři a investoři |
| **Spin-off** | Projekt se odděluje jako samostatná firma |

Fázi měníš přímo v detailu projektu – sidebar, sekce **Advance Stage**. Klikneš na tlačítko s názvem fáze, kam chceš projekt přesunout. Při změně fáze se automaticky přepočítají doporučení.

---

## Detail projektu (`/projects/[id]`)

Hlavní pracovní plocha projektu. Obsahuje:

### Horní pruh – PipelineStepper
Vizuální ukazatel toho, kde se projekt v pipeline nachází.

### Hlavní sloupec (vlevo)

**Overview**
- Fáze, potential, priorita (barevné odznaky)
- Obor (`field`), postup v pipeline v %
- Owner + datum posledního kontaktu
- Nejbližší krok + deadline

**Recommendations** – viz samostatná sekce níže

**Scoring**
- Progress bar pro **Potential** (Low = 34 %, Medium = 68 %, High = 100 %)
- Progress bar pro **Business Readiness** (Weak = 30 %, Emerging = 65 %, Strong = 100 %)
- Team Strength (Technical only / Balanced / Strong)
- IP Status (volný text)

**Activity Log**
- Záznamy o meetingách, hovorech, evaluacích a poznámkách linked na tento projekt
- Každý záznam má: typ aktivity, datum, poznámku, jméno toho, kdo to zalogoval

### Postranní panel (vpravo)

**Advance Stage** – tlačítka pro přesun do jiné fáze

**Tasks** – úkoly přiřazené tomuto projektu (název, priorita, status, deadline, assignee)

**Contacts** – lidé napojení na projekt; první kontakt je zvýrazněn jako primární

**Organization** – firma / fakulta / centrum napojené na projekt

---

## Doporučení (Recommendations)

Doporučení jsou generována **automaticky** na základě dat projektu. Každé doporučení má:
- Název a popis (konkrétní akce)
- **Suggested role** – kdo by ji měl splnit (např. IP lawyer, Startup mentor, Product lead)
- Status: **Pending** / **Completed** / **Dismissed**

### Kdy se co vygeneruje

Doporučení jsou dvou typů:

**1. Podle fáze** – vždy platná pro danou fázi:

| Fáze | Doporučení |
|------|-----------|
| Discovery | Perform market size analysis · Identify primary target audience |
| Validation | Conduct 10 stakeholder interviews · Draft MVP feature list |
| MVP | Set up analytics tracking · Define success metrics for pilot |
| Scaling | Build partnership pipeline · Prepare investor readiness materials |
| Spin-off | Formalize spin-off roadmap · Confirm legal and IP transfer plan |

**2. Podmíněná** – triggerují se, pokud platí určitá podmínka:

| Podmínka | Doporučení |
|----------|-----------|
| IP Status je prázdný | → Clarify IP status (IP lawyer) |
| Team Strength = Technical only NEBO Business Readiness = Weak | → Strengthen business capability (Business mentor) |
| Next Step je prázdný | → Define the next milestone (Project manager) |
| Last contact je starší 30 dní | → Reconnect with the project team (Project manager) |
| Potential = High A fáze je před Scaling | → Prepare a support plan (Innovation manager) |

### Co se děje při změně fáze nebo editaci

Systém porovná očekávaná doporučení se stávajícími a:
- Přidá nová, která ještě neexistují
- Aktualizuje existující pending doporučení (pokud se text změnil)
- Doporučení označená jako Completed nechá být
- Stará pending doporučení, která už neplatí, přesune do Dismissed

### Tlačítko Convert

Každé pending doporučení má tlačítko **Convert**. Kliknutím z doporučení vytvoříš úkol (Task) přiřazený tomuto projektu – název se přebere z doporučení.

---

## Úkoly (`/tasks`)

Globální přehled všech úkolů napříč projekty.

Každý úkol zobrazuje:
- Název + popis
- Odkaz na projekt, ke kterému patří
- Prioritu a status (barevné odznaky)
- Deadline + assignee

Úkoly momentálně nelze vytvářet ručně – vznikají přes **Convert** z doporučení na stránce projektu.

Status hodnoty: `TODO` · `IN_PROGRESS` · `DONE` · `CANCELLED`

---

## Kontakty (`/contacts`)

Kartičky všech lidí v systému. Každá karta obsahuje:
- Jméno + role + organizace
- Email, telefon
- Výpis projektů, ke kterým je kontakt napojen
- Volné poznámky

Kontakty se do systému přidávají přes formulář projektu (při vytvoření nebo editaci projektu).

---

## Organizace (`/organizations`)

Kartičky všech organizací (univerzity, fakulty, firmy, inovační centra...).

Každá karta zobrazuje:
- Název + typ organizace
- Počet projektů a kontaktů
- Web (pokud je vyplněn)
- Poznámky

Typy organizací: University · Faculty · Research Center · Innovation Center · Company · Investor · Public Institution

---

## Formulář projektu – přehled polí

Při vytváření nebo editaci projektu (`/projects/new`, `/projects/[id]/edit`):

| Pole | Typ | Poznámka |
|------|-----|---------|
| Title | Text | Povinné |
| Description | Text | Povinné |
| Field | Text | Obor / oblast |
| Stage | Výběr | 5 fází pipeline |
| Priority | Výběr | Low / Medium / High / Urgent |
| Potential Level | Výběr | Low / Medium / High |
| IP Status | Text | Stav ochrany duševního vlastnictví |
| Team Strength | Výběr | Technical only / Balanced / Strong |
| Business Readiness | Výběr | Weak / Emerging / Strong |
| Next Step | Text | Nejbližší krok |
| Next Step Due Date | Datum | Deadline kroku |
| Last Contact At | Datum | Datum posledního kontaktu |
| Organization | Výběr | Z existujících organizací |
| Owner | Výběr | Z existujících uživatelů |
| Contacts | Výběr | Napojení lidé |

---

## Uživatelé a role

Systém rozeznává 4 role (zatím bez přihlašování – vybírá se z databáze):

| Role | Kdo |
|------|-----|
| Admin | Správce systému |
| Manager | Vedoucí inovačního centra |
| Evaluator | Hodnotitel projektů |
| Viewer | Jen čtení |

---

## Klávesové zkratky / tipy

- Klik na název projektu v tabulce → detail projektu
- Klik na název projektu v kartičce úkolu → detail projektu
- Progress bary jsou živé – mění se podle hodnot Potential a Business Readiness
- Pokud projekt nemá doporučení, zobrazí se „All caught up" – zelená fajfka
