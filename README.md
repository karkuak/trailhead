# Trailhead

A curated outdoor-gear subscription and shop. This is the v1 implementation of the four core user
journeys described in [`trailhead-product-strategy.md`](./trailhead-product-strategy.md):

- **J1** — Signup & onboarding
- **J2** — Trial → subscription conversion
- **J3** — Checkout & payment (with retry)
- **J4** — Cancellation (with a genuine save offer)

See [`docs/product/overview.md`](./docs/product/overview.md) for the architecture, and
[`docs/product/journeys.md`](./docs/product/journeys.md) for how each journey works end to end.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app seeds its own SQLite database
(`data/trailhead.db`) on first run — no external services required.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` | Production build (also type-checks) |
| `npm start` | Run the production build |
| `npm run lint` | ESLint |
| `npm run test:unit` | Vitest unit tests |
| `npm run test:e2e` | Playwright E2E suite (builds + starts the app on an in-memory DB automatically) |

## Test cards (checkout demo)

Since v1 has no real payment processor, `/api/checkout` uses deterministic test cards:

| Card number | Behavior |
|---|---|
| `4242 4242 4242 4242` | Always succeeds |
| `4000 0000 0000 0002` | Fails once, then succeeds on retry for the same order |
| anything else | Always declines |

## Key docs

- [`docs/analytics/tracking-plan.md`](./docs/analytics/tracking-plan.md) — the event taxonomy, owned
  by product, versioned alongside the code.
- [`docs/product/journeys.md`](./docs/product/journeys.md) — J1–J4 in detail, with success criteria
  and links to their E2E specs.
- [`docs/product/release-process.md`](./docs/product/release-process.md) — the CI gate and manual QA
  checklist.
- [`BACKLOG.md`](./BACKLOG.md) — the seeded product backlog (Now/Next/Later, from the strategy's
  roadmap).

## The lab (experimentation)

`src/lib/experiments.ts` implements deterministic per-session bucketing (no external service). The
first live experiment, `checkout_button_copy`, is wired into `/checkout`
(`src/app/checkout/page.tsx` + `CheckoutForm.tsx`) — control and the "reassuring" variant emit
identical journey events, only the button label differs.

## CI/CD

`.github/workflows/ci.yml` runs build → lint → unit → E2E on every PR, then deploys an isolated
Vercel preview (requires `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` repo secrets — the
deploy step no-ops with a warning if they aren't configured yet, so the required build/lint/unit/E2E
gate still runs and blocks merges either way).
