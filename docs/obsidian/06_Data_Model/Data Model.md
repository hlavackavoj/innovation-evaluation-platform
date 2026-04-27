# Data Model

## Entity

- User
- Organization
- Contact
- Project
- Activity
- Task
- Recommendation
- Expert

## Project

```text
Project
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
```

## Contact

```text
Contact
- id
- name
- email
- phone
- role
- organization_id
- notes
- created_at
- updated_at
```

## Organization

```text
Organization
- id
- name
- type
- website
- notes
- created_at
- updated_at
```

## Activity

```text
Activity
- id
- project_id
- user_id
- type
- note
- activity_date
- created_at
```

## Task

```text
Task
- id
- project_id
- assigned_to_user_id
- title
- description
- status
- priority
- due_date
- created_at
- updated_at
```

## Recommendation

```text
Recommendation
- id
- project_id
- type
- title
- description
- priority
- source_rule
- created_at
```

## Expert

```text
Expert
- id
- name
- role
- specialization
- organization_id
- email
- availability_status
- notes
```

## Vazby

- Project belongs to Organization
- Project belongs to User as owner
- Project has many Activities
- Project has many Tasks
- Project has many Recommendations
- Contact belongs to Organization
- Expert can belong to Organization
