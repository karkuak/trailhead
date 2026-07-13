# Trailhead — Product Overview (v1)

Trailhead is a curated outdoor-gear subscription and shop. v1 ships three connected surfaces and
four release-critical journeys, per the [product strategy](../../trailhead-product-strategy.md).

## Surfaces

- **The subscription** (`/plan`, `/onboarding`, `/account/subscription`) — Trail ($39/mo, seasonal)
  and Summit ($69/mo, monthly) plans, with a 14-day free trial.
- **The shop** (`/shop`, `/cart`, `/checkout`) — one-off gear, open to members and guests.
- **The guide** (`/guide`) — lightweight, static recommendations in v1 (roadmap: personalized,
  trip-based bundles — see [BACKLOG.md](../../BACKLOG.md)).

## Architecture at a glance

- **Next.js (App Router) + TypeScript**, single deployable app.
- **Postgres** (Neon, provisioned via the Vercel/Neon marketplace integration) as the persistence
  layer, accessed with `pg` (`src/lib/db.ts`). Schema and product seed data
  (`src/lib/products.ts`) are created idempotently on first connection via `ensureReady()` — no
  manual migration step. Every environment (dev/preview/prod) gets its own Neon branch through the
  integration, so state never leaks between them.
- **Auth** is a minimal session-cookie model (`src/lib/auth.ts`): bcrypt-hashed passwords, an
  httpOnly `th_uid` cookie for the logged-in user, and an anonymous `th_sid` cookie (set by
  `src/proxy.ts` on every request) used for analytics correlation and experiment bucketing before and
  after login.
- **Analytics**: a Segment-style client (`track`/`identify`/`page`) forwarding to a single ingestion
  endpoint, `/api/track`. See [tracking-plan.md](../analytics/tracking-plan.md) for the full event
  taxonomy.
- **Experiments ("the lab")**: `src/lib/experiments.ts` — deterministic per-session bucketing via
  `sha256(sessionId:experimentKey) mod variants.length`. First experiment: `checkout_button_copy`.
- **State machines** for the correctness-critical entities:
  - `orders.status`: `pending → paid` (or stays `pending` after a `failed` payment attempt, retryable).
  - `users.subscription_status`: `none → trialing → active → paused/canceled`.

## Why Postgres (Neon) for v1

Serverless hosts like Vercel have a read-only filesystem outside `/tmp`, and `/tmp` isn't shared or
persisted across function instances — a file-based database (the original v1 prototype used SQLite)
can't give reliable persistence there. Neon's Vercel integration provisions a real Postgres database
per environment with no separate account-creation step, and its branch-per-environment model gives
previews and tests the same "isolated, disposable database" property SQLite files used to provide
locally. The `resetDatabase()` helper (test/preview-only, gated in `/api/test/reset`) truncates and
reseeds tables for a clean starting state before each E2E test.

## Local development

```bash
npm install
vercel env pull .env.local   # fetches DATABASE_URL
npm run dev                  # http://localhost:3000
```

See the [README](../../README.md) for the full command reference.
