# Rozgar

Rozgar is a daily habit tracker that helps people build sustainable routines and restart without guilt after a missed day.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/rozgar run dev` — run the Rozgar frontend
- `pnpm --filter @workspace/api-server run test` — run date and PostgreSQL service integration tests
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — apply the Drizzle schema to the development database only
- `DATABASE_URL` is provided by the Replit-managed PostgreSQL database; do not check credentials into source.
- Clerk is configured through Replit-managed auth. Keep its keys in Replit Secrets, never in code.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React, Vite, Wouter, React Query
- API: Express 5, Clerk session verification
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/rozgar/` — Rozgar responsive React frontend, Clerk auth UI, generated API hooks
- `artifacts/api-server/` — Rozgar API, authentication middleware, routes, and data service
- `lib/db/` — Drizzle schema and database client
- `lib/api-spec/openapi.yaml` — shared API contract
- `docs/backend-setup.md` — local setup, schema, data semantics, and verification

## Architecture decisions

- Clerk user IDs are the application identity; Rozgar user records are provisioned on the first authenticated profile request.
- Users, habits, and date-keyed check-ins are persisted in PostgreSQL. All habit and check-in reads and writes are scoped by the authenticated user ID.
- Check-in dates are local calendar dates in the IANA time zone saved on the user profile.
- The API contract is the source of truth for generated frontend hooks and validation schemas.

## Product

Users can check off today's habits, create and manage routines, and view a gentle weekly progress summary. Missed days are treated as an opportunity to restart, not a failure.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- The Drizzle push command targets development only. Review and apply production schema changes through Replit's publish/database migration flow.
- Habit schedule history is not versioned yet; progress applies the current schedule to the seven-day window, while check-ins themselves remain date-specific.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
