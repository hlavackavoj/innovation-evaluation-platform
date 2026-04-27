# Rules

## Rule 1: Projekt je v Evaluation

IF stage = Evaluation

THEN recommended_actions:

- Provést zákaznické rozhovory
- Ověřit problém a cílovou skupinu
- Doplnit základní scoring

recommended_roles:

- Startup mentor
- Evaluator

priority: medium

---

## Rule 2: Chybí IP status

IF ip_status = missing

THEN recommended_actions:

- Ověřit IP status
- Zjistit vlastníka výsledků výzkumu
- Domluvit konzultaci k ochraně IP

recommended_roles:

- IP právník
- Technology transfer officer

priority: high

---

## Rule 3: Slabá business kompetence v týmu

IF team_strength = technical_only

THEN recommended_actions:

- Najít business mentora
- Připravit základní business model
- Ověřit zájem zákazníků

recommended_roles:

- Business mentor
- Startup coach

priority: medium

---

## Rule 4: Projekt nemá další krok

IF next_step is empty

THEN recommended_actions:

- Definovat další krok
- Přiřadit odpovědnou osobu
- Nastavit deadline

recommended_roles:

- Project manager

priority: high

---

## Rule 5: Projekt nebyl dlouho kontaktován

IF last_contact_at > 30 days ago

THEN recommended_actions:

- Kontaktovat řešitelský tým
- Ověřit aktuální stav
- Aktualizovat projektovou kartu

recommended_roles:

- Project manager

priority: medium

---

## Rule 6: Vysoký potenciál a nevyřešený support plan

IF potential_level = high AND stage != Support Plan AND stage != Active Support

THEN recommended_actions:

- Připravit plán podpory
- Určit hlavní rizika
- Naplánovat strategickou schůzku

recommended_roles:

- Innovation manager
- Startup mentor

priority: high
