# Rozgar

Rozgar is a daily habit tracker that helps people build sustainable routines and restart without guilt after a missed day.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/rozgar run dev` — run the Rozgar frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/rozgar/` — Rozgar responsive React frontend
- `artifacts/api-server/` — shared API service (not currently used by Rozgar)
- `lib/api-spec/openapi.yaml` — shared API contract

## Architecture decisions

- Rozgar's first version is a frontend-only prototype; habit state is temporary and is not synced or permanently saved.
- Sign-in and sign-up screens are previews only; no authentication provider is connected.

## Product

Users can check off today's habits, create and manage routines, and view a gentle weekly progress summary. Missed days are treated as an opportunity to restart, not a failure.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Do not describe sample progress or UI-only authentication as persisted or functional backend behavior.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
