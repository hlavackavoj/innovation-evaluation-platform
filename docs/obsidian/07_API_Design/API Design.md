# API Design

## Projects

```http
GET /api/projects
POST /api/projects
GET /api/projects/:id
PUT /api/projects/:id
DELETE /api/projects/:id
```

## Contacts

```http
GET /api/contacts
POST /api/contacts
GET /api/contacts/:id
PUT /api/contacts/:id
DELETE /api/contacts/:id
```

## Organizations

```http
GET /api/organizations
POST /api/organizations
GET /api/organizations/:id
PUT /api/organizations/:id
DELETE /api/organizations/:id
```

## Activities

```http
GET /api/projects/:id/activities
POST /api/projects/:id/activities
```

## Tasks

```http
GET /api/tasks
POST /api/tasks
GET /api/tasks/:id
PUT /api/tasks/:id
DELETE /api/tasks/:id
```

## Recommendations

```http
GET /api/projects/:id/recommendations
POST /api/projects/:id/recommendations/generate
```

## Dashboard

```http
GET /api/dashboard/summary
GET /api/dashboard/pipeline
GET /api/dashboard/tasks
```
