# Innovation Evaluation Platform – Vault Index

Aktualizováno: duben 2026.

## Rychlý přehled

**Co je hotovo:** CRM, Pipeline, Recommendation engine, Auth/Role, Šablony, Email Analyzer v2
**Co chybí:** Scoring UI, Expert matching, Analytika, Enterprise security

---

## Navigace

### Vize a produkt
- [[00_Vize/Vize]] – Co řešíme, pro koho, aktuální stav
- [[01_Produkt/Produkt]] – Tech stack, moduly, architektura

### CRM
- [[02_CRM/CRM Overview]] – Přehled CRM, routes, architektura
- [[02_CRM/Projects]] – Hlavní entita systému
- [[02_CRM/Contacts]] – Osoby spojené s projekty
- [[02_CRM/Organizations]] – Instituce a firmy
- [[02_CRM/Activities]] – Záznamy práce, e-mailové aktivity
- [[02_CRM/Tasks]] – Úkoly, automatické generování z AI
- [[02_CRM/Users]] – Role, Kinde Auth, oprávnění
- [[02_CRM/Email Analyzer]] – ⭐ Gmail/Outlook sync + AI analýza (produktový přehled)
- [[02_CRM/Email Analyzer Flow]] – ⭐ Detailní technický flow s Mermaid diagramy

### Pipeline
- [[03_Pipeline/Pipeline Stages]] – 5 fází: DISCOVERY → SPIN_OFF

### Scoring
- [[04_Scoring/Scoring Model]] – ❌ NEREALIZOVÁNO (plán)

### Recommendation Engine
- [[05_Recommendation_Engine/Recommendation Engine Overview]] – Jak engine funguje
- [[05_Recommendation_Engine/Recommendation Engine Map]] – ⭐ Detailní technická mapa: pravidla, sync flow, konverze na task, Mermaid diagramy
- [[05_Recommendation_Engine/Rules]] – Kompletní seznam pravidel s ruleKey
- [[05_Recommendation_Engine/Playbooks]] – Životní cyklus doporučení
- [[05_Recommendation_Engine/Recommended Roles]] – Role doporučované enginem

### Data Model
- [[06_Data_Model/Data Model]] – Kompletní schéma z Prisma (všechny modely, enumy, ER diagram)

### API Design
- [[07_API_Design/API Design]] – Server Actions vs. API Routes

### UI/UX
- [[08_UI_UX/UI UX]] – Stránky, komponenty, UX principy

### Bezpečnost
- [[09_Security/Security]] – Auth, role, šifrování, env vars

### Analytika
- [[10_Analytics/Analytics]] – ❌ NEREALIZOVÁNO (plán)

### Implementace
- [[11_Implementation/Implementation Plan]] – Fáze, co je hotovo vs. co chybí
- [[11_Implementation/Local Development & DB Reset]] – ⭐ Lokální dev setup, DB reset postup, troubleshooting migrace
- [[11_Implementation/Open Questions & Next Steps]] – ⭐ Prioritizovaný seznam next steps, tech debt, open questions
- [[99_Notes/Next Steps]] – Technický dluh a prioritizace

### System Memory
- [[12_System_Memory/System Memory Map]] – Centrální technická mapa: architektura, flow, datové vazby a coupling body (s Mermaid diagramy)
