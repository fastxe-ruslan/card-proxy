# Card Proxy Backend

NestJS microservice-proxy for integration with Wasabi Card.

## Tech stack

- NestJS 11
- TypeORM + PostgreSQL (`card-proxy` DB, `card_proxy` schema)
- Scalar API docs (`/docs`)
- JWT auth with email/password and social login (Google/Apple)
- Webhook-first synchronization + reconciliation jobs
- Audit logging for card/account operations

## Setup

```bash
pnpm install
cp .env.example .env
```

## Run service

```bash
pnpm run start:dev
```

API is available at `http://localhost:3000/api/v1` and Scalar docs at `http://localhost:3000/docs`.

## Database migrations

```bash
pnpm run migration:run
```

## Main modules

- `src/modules/auth`: registration/login/refresh/social auth.
- `src/modules/wasabi`: Wasabi API client, proxy endpoints, webhook ingestion, sync jobs.
- `src/modules/cards`: local card store and manual synchronization endpoint.
- `src/modules/transactions`: local transaction history and manual synchronization endpoint.
- `src/modules/subscriptions`: user subscription state.
- `src/modules/audit`: persistent audit logs and webhook idempotency records.

## Security baseline

- JWT access/refresh flow.
- Request correlation (`x-request-id`).
- Global exception envelope.
- Helmet, CORS, DTO validation, throttling.
