# Rozgar backend setup

Rozgar keeps the existing React/Vite frontend and uses the shared Express API, PostgreSQL database, and Replit-managed Clerk authentication.

## Environment and credentials

In this Replit project, `DATABASE_URL` is provided by the attached Replit PostgreSQL database. Clerk has also been provisioned through Replit-managed auth. The app reads `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, and `VITE_CLERK_PUBLISHABLE_KEY` from the runtime environment; the Clerk proxy URL is supplied by the managed auth setup when needed.

Do not add these values to source files, `.env` examples, or commits. If this project is moved to another Repl, attach a PostgreSQL database and configure Clerk for that Repl using Replit's managed auth and Secrets flows. No third-party database or manually generated session secret is required for this setup.

## Database schema

The Drizzle schema is in `lib/db/src/schema/`:

- `users` stores the Clerk user ID, display name, saved IANA time zone, reminder preference, and timestamps.
- `habits` stores each user's routine, schedule, pause state, and optional reminder time.
- `checkins` stores one completion state per habit and local calendar date. The database unique constraint makes repeated updates for the same date idempotent.

For a development database, apply the schema with:

```sh
pnpm --filter @workspace/db run push
```

This command is for the development database only. Do not point it at production. Apply production schema changes through Replit's publish/database migration flow after reviewing the proposed changes.

## Authentication and dates

The browser uses Clerk's sign-up and sign-in components on `/sign-up` and `/sign-in`; sign-out is handled through Clerk. The API verifies Clerk sessions and uses the verified Clerk user ID for every database operation. The first authenticated `GET /api/me` creates the corresponding Rozgar profile if needed and saves the browser's IANA time zone.

Check-in records use `YYYY-MM-DD` in the profile's saved time zone, not a UTC timestamp. `PUT /api/habits/{habitId}/check-in` creates or updates that date's record. The weekly progress endpoint returns the latest seven local calendar dates and derives completion totals from stored check-ins.

Habit schedule changes are not historically versioned. As a result, the seven-day scheduled counts use each habit's current schedule and active state; saved check-in records remain tied to their actual local dates.

## API and frontend contract

The OpenAPI file at `lib/api-spec/openapi.yaml` is the source of truth. After changing it, regenerate Zod schemas and React Query hooks:

```sh
pnpm --filter @workspace/api-spec run codegen
```

The frontend calls the API through its same-origin `/api` path. The API's Clerk proxy is mounted at `/api/__clerk`, so the browser does not need a separate API host or bearer token.

## Verification

```sh
pnpm --filter @workspace/api-server run test
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/rozgar run typecheck
pnpm --filter @workspace/rozgar run build
```

The API test suite includes date/time-zone unit tests and database-backed service tests. Browser sign-up and sign-in still require completing the Clerk flow in a browser; integration tests do not store credentials or simulate a Clerk account.

Habit reminder preferences and reminder times are persisted, but notification delivery is not implemented.
