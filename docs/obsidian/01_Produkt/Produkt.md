# Produkt

## Název

Innovation Evaluation Platform

## Produktový koncept

Platforma pro řízení inovační pipeline univerzitních a výzkumných projektů.

Funguje jako CRM pro projekty s rule-based recommendation enginem a automatizovanou analýzou e-mailové komunikace pomocí AI.

## Tech stack

| Vrstva | Technologie |
|---|---|
| Framework | Next.js 14 (App Router) |
| Jazyk | TypeScript |
| Databáze | PostgreSQL + Prisma 5 |
| Auth | Kinde Auth |
| AI | Google Gemini 1.5 Flash |
| Storage | Supabase Storage |
| Deployment | Vercel |
| UI | Tailwind CSS + Lucide React + Framer Motion |

## Implementované moduly

### 1. CRM
Projekty, kontakty, organizace, aktivity, úkoly.
- Stav: **HOTOVO**
- Viz: [[02_CRM/CRM Overview]]

### 2. Pipeline management
5 fází: DISCOVERY → VALIDATION → MVP → SCALING → SPIN_OFF
- Stav: **HOTOVO**
- Viz: [[03_Pipeline/Pipeline Stages]]

### 3. Recommendation engine
Rule-based engine doporučující další kroky a role na základě stavu projektu.
- Stav: **HOTOVO**
- Viz: [[05_Recommendation_Engine/Recommendation Engine Overview]]

### 4. Autentizace a role
Kinde Auth, 5 rolí (ADMIN, MANAGER, EVALUATOR, USER, VIEWER), bootstrap admin.
- Stav: **HOTOVO**
- Viz: [[09_Security/Security]]

### 5. Šablony dokumentů
Upload a přiřazení šablon k pipeline fázím, Supabase Storage.
- Stav: **HOTOVO**

### 6. Email Analyzer v2
OAuth připojení Gmail/Outlook, synchronizace e-mailů, AI analýza, napojení aktivit a automatické generování úkolů.
- Stav: **HOTOVO** (merged v PR #1)
- Viz: [[02_CRM/Email Analyzer]]

## Nerealizované moduly (roadmap)

### Scoring model
Formulář a výpočet skóre potenciálu projektu (0–100).
- Stav: **NEREALIZOVÁNO** – datový model podporuje `potentialLevel` (LOW/MEDIUM/HIGH), ale scoring formulář neexistuje.
- Viz: [[04_Scoring/Scoring Model]]

### Expert matching
Databáze expertů a párování podle oboru a potřeby.
- Stav: **NEREALIZOVÁNO** – model `Expert` nebyl do databáze přidán.

### Pokročilá analytika
Dashboard s konverzními metrikami, bottlenecky, průměrnou dobou ve fázi.
- Stav: **NEREALIZOVÁNO**
- Viz: [[10_Analytics/Analytics]]

### Enterprise bezpečnost
SSO, multi-tenant izolace, detailní audit log.
- Stav: **NEREALIZOVÁNO**

## Architektura aplikace

Aplikace používá Next.js App Router se **Server Actions** (ne REST API).

Server Actions jsou v souborech `app/*/actions.ts`. API routes existují pouze pro Kinde OAuth callbacky a e-mailový sync endpoint.
