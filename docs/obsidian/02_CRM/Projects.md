# Projects

## Popis

Projekt je hlavní entita systému.

Reprezentuje univerzitní, výzkumný nebo studentský projekt, který může mít startupový nebo spin-off potenciál.

## Atributy

- id
- title
- description
- field
- institution_id
- owner_user_id
- stage
- priority
- potential_level
- ip_status
- team_strength
- business_readiness
- next_step
- next_step_due_date
- last_contact_at
- created_at
- updated_at

## Stage

Odkazuje na [[../03_Pipeline/Pipeline Stages]].

## Potential level

- unknown
- low
- medium
- high

## Priority

- low
- medium
- high
- urgent

## Vazby

Project má vazby na:

- Contacts
- Organization
- Activities
- Tasks
- Recommendations
- Owner User

## UI karta projektu

Na detailu projektu zobrazit:

- název,
- popis,
- fázi,
- potenciál,
- prioritu,
- odpovědnou osobu,
- další krok,
- deadline dalšího kroku,
- doporučené kroky,
- doporučené role,
- historii aktivit,
- úkoly.
