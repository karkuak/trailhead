# Release & QA Process

## CI gate (every PR)

`.github/workflows/ci.yml` runs on every pull request against `main`:

1. **Install** — `npm ci`
2. **Build** — `npm run build` (Next.js production build; also type-checks)
3. **Lint** — `npm run lint` (ESLint flat config, including React Hooks rules)
4. **Unit tests** — `npm run test:unit` (Vitest — experiment bucketing, analytics helpers)
5. **E2E tests** — `npm run test:e2e` (Playwright — J1–J4 against a freshly built app, isolated
   SQLite DB per run via `TRAILHEAD_DB_PATH`)
6. **Preview deploy** — deploys the PR's branch to an isolated preview environment (see below)

Merging is blocked until all of the above are green. No step is skipped for "small" changes —
correctness of J1–J4 depends on all of them together (a passing build with a broken journey is
exactly the ambiguous-outcome failure mode the strategy calls out in §9).

## Preview environments

Every PR gets its own preview deployment (Vercel, one project per PR via the standard
GitHub-integration flow) so a reviewer — or an experiment variant — can be exercised end-to-end
before it reaches members. Preview environments use their own isolated SQLite file
(`TRAILHEAD_DB_PATH` set per-deployment) and `ALLOW_TEST_RESET` is available so the E2E suite (or a
reviewer) can reset state via `POST /api/test/reset` without touching production data. That endpoint
refuses to run in `production` unless `ALLOW_TEST_RESET` is explicitly set, so it can never be hit
against real member data by accident.

## What "green" means for J1–J4 specifically

Each journey's E2E spec asserts on the actual resulting state, not just that a request returned 200:

- **J1** — the created user's `subscription_status` is `trialing` and `onboarding_completed_at` is set.
- **J2** — `subscription_status` is `active`, not merely that the upgrade button was clicked.
- **J3** — the order is `paid`, and the decline→retry spec explicitly asserts `recovered: true` shows
  up in the confirmation UI (the "your first attempt didn't go through" copy), not just any success.
- **J4** — the resulting `subscription_status` matches the path taken (`paused`, unchanged-but-plan-
  changed, or `canceled`) — a cancellation test that only checks "a confirmation screen appeared"
  would not catch a state-machine bug and is not sufficient.

## Manual QA checklist before a risky release

- [ ] Run through all four journeys once in a real browser against the preview deploy.
- [ ] Confirm the tracking plan's event ordering holds by inspecting `/api/track`'s persisted events
      for the session used above (see `docs/analytics/tracking-plan.md` for expected sequences).
- [ ] If the change touches checkout, verify both test cards (immediate success, decline-then-retry).
- [ ] If the change touches cancellation, verify all three exits (pause, downgrade, full cancel).
