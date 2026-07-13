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
- **SQLite** (`better-sqlite3`) as the persistence layer — one file, seeded deterministically on
  first run (`src/lib/db.ts`, `src/lib/products.ts`). `TRAILHEAD_DB_PATH` controls the file location
  so tests and preview environments get isolated, disposable databases.
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

## Why SQLite for v1

Deterministic and seedable: the same schema and seed data run identically in dev, CI, Playwright
tests, and preview deploys. No external service dependency to stand up for a first version. The
`resetDatabase()` helper (test/preview-only, gated in `/api/test/reset`) gives every test a clean,
known starting state.

## Local development

```bash
npm install
npm run dev       # http://localhost:3000
```

See the [README](../../README.md) for the full command reference.
