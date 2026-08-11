# Deployment runbook

This document is provider-neutral. Selecting a hosting or paid database provider remains an operator decision.

## Required environment

Backend requires `DATABASE_URL`, `GOOGLE_CLIENT_ID`, and `JWT_SECRET`. Set `NODE_ENV=production` and a comma-separated `CORS_ORIGIN` allowlist, for example `https://app.example.com`. `JWT_EXPIRES_IN` is optional. Frontend requires `NEXT_PUBLIC_API_BASE_URL` and, when Google login is used, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.

Never put `JWT_SECRET`, `DATABASE_URL`, anonymous receipt tokens, or answer keys in client configuration, URLs, logs, source control, or build output.

## Release sequence

1. Back up PostgreSQL and confirm restore ownership outside this repository.
2. Run `npm ci` in backend/frontend and the commands in [TESTING.md](TESTING.md).
3. Run `npm exec prisma migrate deploy` from backend; never edit an applied migration or use reset against production.
4. Build frontend with the production API URL and start backend with production environment variables.
5. Probe `GET /api/health` for liveness and `GET /api/ready` for PostgreSQL readiness.
6. Smoke public V2 read, signed-in V2 receipt/review, anonymous safe receipt, and legacy routes. Verify `409` containment for legacy access to a V2 exam.
7. Monitor application errors and PostgreSQL capacity. Do not log request bodies for V2 submit because they can contain student responses and anonymous credentials in responses.

## Rollback

Rollback application code only when its schema assumptions are compatible. Database migrations in this project are additive or protective; do not delete versions/attempts to rollback. Investigate and restore from a tested backup for destructive operational incidents.
