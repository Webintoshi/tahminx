# TahminX Backend (NestJS)

Production-grade sports analytics backend.

## Stack
- NestJS + TypeScript (strict)
- Prisma + PostgreSQL
- Redis + BullMQ
- JWT + argon2
- Swagger + class-validator
- pino logging
- Prometheus metrics + Sentry-ready instrumentation

## Run
```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run start:dev
```

## Docker
```bash
docker compose up --build
```

## Core Endpoints
- `GET /api/v1/sports`
- `GET /api/v1/leagues`
- `GET /api/v1/leagues/:id`
- `GET /api/v1/leagues/:id/standings`
- `GET /api/v1/teams`
- `GET /api/v1/teams/:id`
- `GET /api/v1/teams/:id/matches`
- `GET /api/v1/teams/:id/form`
- `GET /api/v1/teams/:id/squad`
- `GET /api/v1/matches`
- `GET /api/v1/matches/today`
- `GET /api/v1/matches/tomorrow`
- `GET /api/v1/matches/live`
- `GET /api/v1/matches/completed`
- `GET /api/v1/matches/:id`
- `GET /api/v1/matches/:id/events`
- `GET /api/v1/matches/:id/stats`
- `GET /api/v1/matches/:id/prediction`
- `GET /api/v1/predictions`
- `GET /api/v1/predictions/high-confidence`
- `GET /api/v1/analytics/dashboard`
- `GET /api/v1/guide/summary`

Admin:
- `POST /api/v1/admin/ingestion/run`
- `GET /api/v1/admin/ingestion/jobs`
- `GET /api/v1/admin/ingestion/jobs/:id`
- `POST /api/v1/admin/ingestion/jobs/:id/retry`
- `GET /api/v1/admin/providers/health`
- `GET /api/v1/admin/providers/logs`
- `GET /api/v1/admin/models`
- `POST /api/v1/admin/models`
- `PATCH /api/v1/admin/models/:id`
- `GET /api/v1/admin/system/settings`
- `PATCH /api/v1/admin/system/settings`
- `GET /api/v1/admin/logs/audit`

Auth:
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

Health:
- `GET /health`
- `GET /api/v1/health`
- `GET /metrics`
