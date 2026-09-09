# Migration workflow

## Overview
The CartIntel database uses **Drizzle** with PostgreSQL. All schema changes are captured as **SQL migration files** under `packages/db/src/migrations/` and are versioned automatically.

## Development workflow
1. **Create a migration**
   ```bash
   pnpm --filter db exec drizzle-kit generate:pg
   ```
   This creates a new file in `src/migrations/` with an incremental timestamp.
2. **Run migrations locally**
   ```bash
   pnpm --filter db run migrate
   ```
   This applies any pending migrations to the locally‑configured PostgreSQL instance (see `DATABASE_URL` in `.env`).

## Production workflow
- **Apply migrations** on a production PostgreSQL instance with the same command:
  ```bash
  pnpm --filter db run migrate
  ```
- The web application **does not** run migrations automatically on startup. Migration execution must be performed as a separate step in your CI/CD pipeline or manually before deploying.

## Why `db:push` is **development‑only**
`drizzle-kit push` syncs the Prisma‑like schema directly to the database, creating or altering tables without a migration file. This is convenient during early development but bypasses the explicit, tracked migration history required for reliable production upgrades. Therefore:
- Use `db:push` **only** on local/dev environments.
- In production, always run the scripted `migrate` command above.

---
*This document lives in `packages/db/docs/migration.md` and is linked from the root README.*
