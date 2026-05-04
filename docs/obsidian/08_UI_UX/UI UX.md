# UI UX

## Implementované stránky a komponenty

### Pages

| Route | Komponenta | Popis |
|---|---|---|
| `/` | `app/page.tsx` | Dashboard |
| `/login` | `app/login/page.tsx` | Přihlašovací stránka |
| `/projects` | `app/projects/page.tsx` | Seznam projektů |
| `/projects/new` | `app/projects/new/page.tsx` | Nový projekt |
| `/projects/[id]` | `app/projects/[id]/page.tsx` | Detail projektu |
| `/projects/[id]/edit` | `app/projects/[id]/edit/page.tsx` | Editace projektu |
| `/contacts` | `app/contacts/page.tsx` | Kontakty |
| `/organizations` | `app/organizations/page.tsx` | Organizace |
| `/tasks` | `app/tasks/page.tsx` | Úkoly |
| `/templates` | `app/templates/page.tsx` | Šablony dokumentů |
| `/email-analyzer` | `app/email-analyzer/page.tsx` | Email Analyzer |

### Komponenty

| Soubor | Popis |
|---|---|
| `components/shell.tsx` | Layout shell |
| `components/navigation.tsx` | Boční navigace |
| `components/pipeline-stepper.tsx` | Vizualizace pipeline fáze |
| `components/recommendation-panel.tsx` | Karty doporučení |
| `components/status-badge.tsx` | Badge pro stav/fázi |
| `components/feedback-toast.tsx` | Toast notifikace |
| `components/project-form.tsx` | Formulář projektu |
| `components/contact-form.tsx` | Formulář kontaktu |
| `components/organization-form.tsx` | Formulář organizace |
| `components/project-document-upload-form.tsx` | Upload dokumentu |
| `components/EmailImportForm.tsx` | Formulář pro import e-mailů |
| `components/ProjectCanvasView.tsx` | Canvas pohled projektu |
| `components/ProjectCommunicationTree.tsx` | Strom e-mailové komunikace |
| `components/dashboard-card.tsx` | Karta dashboardu |

### UI primitives (`components/ui/`)

badge, button, card, progress, table

## Dashboard

Dashboard zobrazuje přehled projektové pipeline:
- počet aktivních projektů,
- projekty podle fáze,
- projekty bez dalšího kroku,
- úkoly po deadline,
- projekty s vysokým potenciálem,
- projekty bez kontaktu déle než 30 dní.

## Project detail

Detail projektu obsahuje:
- základní informace (stage, priority, potential, IP, team strength, business readiness),
- pipeline stepper,
- next step a deadline,
- doporučení (RecommendationPanel),
- aktivity,
- úkoly,
- kontakty,
- dokumenty,
- email automation nastavení.

## Email Analyzer

Stránka `/email-analyzer` umožňuje:
- připojit Gmail přes OAuth (Outlook zatím disabled/deferred),
- filtrovat e-maily (projekt, provider, směr, datum, kontakt),
- spustit AI analýzu,
- zobrazit výsledky (importované e-maily, aktivity, vygenerované úkoly).

## UX principy

- Detail projektu je hlavní pracovní plocha.
- Doporučení jsou akční – lze je označit jako hotová.
- CRM není jen databáze, ale nástroj pro řízení dalšího kroku.
- E-maily se automaticky propojují s projekty a generují aktivity.
