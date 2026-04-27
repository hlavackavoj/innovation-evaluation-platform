# AGENTS.md

## Project
Innovation Evaluation Platform

## Local path
`~/Documents/innovation-evaluation-platform`

## Goal
Build an MVP web application for universities and innovation centers to manage research/startup/spin-off projects as a CRM.

## MVP priority
Build CRM first. Do not build advanced AI, SSO, enterprise security, or complex scoring yet.

## Core modules
1. Projects CRM
2. Contacts
3. Organizations
4. Activities
5. Tasks
6. Pipeline stages
7. Rule-based recommendations

## Tech stack
Use:
- Next.js
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL
- shadcn/ui if useful

## Product source of truth
Read the Obsidian markdown files in this repository before coding.
The markdown documentation defines product scope, entities, workflow, and recommendation logic.

## First implementation target
Create a working MVP with:
- project list
- project detail
- create/edit project
- contacts
- organizations
- activities
- tasks
- pipeline status
- recommendation panel on project detail

## Recommendation engine
Use rule-based logic only.
Do not use AI or machine learning.

Example:
- if IP status is missing, recommend IP lawyer and IP protection task
- if project is in Evaluation, recommend customer interviews and startup mentor
- if business capability is weak, recommend business mentor

## Security baseline
Implement basic authentication and role-ready user model, but do not implement full enterprise SSO yet.

## Coding style
- Keep code simple and readable
- Prefer explicit types
- Keep business logic separated from UI
- Put recommendation logic in a dedicated service/module
- Add seed data for demo