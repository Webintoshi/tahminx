# TahminX (Frontend + Backend Monorepo)

Bu klasor (`D:\tahminx`) tek kaynak yapidir:

- `./` Next.js frontend (UI)
- `./backend` NestJS backend (API, ingestion, prediction)

## Local Calistirma (Tek Yerden)

1. Altyapiyi kaldir (PostgreSQL + Redis):

```bash
cd D:\tahminx
npm run infra:up
```

2. Frontend ve backend'i ayni anda baslat:

```bash
npm run dev:all
```

## Erisim Linkleri

- UI Dashboard: `http://localhost:3000/dashboard`
- Frontend ana: `http://localhost:3000`
- Backend API root: `http://localhost:3002/api/v1`
- Backend health: `http://localhost:3002/api/v1/health`
- Swagger: `http://localhost:3002/api/docs`

Not: Frontend, `next.config.ts` rewrite ile `/api/v1/*` isteklerini `http://localhost:3002/api/v1/*` adresine yonlendirir.

## Yararlı Komutlar

```bash
# Sadece frontend
npm run dev:frontend

# Sadece backend
npm run dev:backend

# Seed (backend)
npm run backend:seed

# Altyapiyi kapat
npm run infra:down
```

## Onemli

- Bu proje Betlify'den bagimsizdir.
- Frontend ve backend ayni depoda ama ayri servis olarak calisir.
