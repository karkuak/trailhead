# Core Journeys (J1–J4)

These four journeys are the spine of Trailhead v1. Each is release-critical, covered by a Playwright
E2E test, and instrumented per the [tracking plan](../analytics/tracking-plan.md).

## J1 — Signup & onboarding

**Routes:** `/signup` → `/onboarding` (form → preview, same page, no route change)

**Flow:** Prospect creates an account (name/email/password) → 14-day trial starts immediately →
short preferences form (experience level, goals, season) → personalized plan preview (Trail or
Summit, chosen by a simple experience-level heuristic).

**Success:** account created **and** onboarding finished (preferences captured, plan previewed).
**State:** `users.subscription_status = 'trialing'`, `onboarding_completed_at` set, `plan` set to the
suggested plan.

**E2E:** [`tests/e2e/j1-signup.spec.ts`](../../tests/e2e/j1-signup.spec.ts)

## J2 — Trial → subscription conversion

**Routes:** `/plan`

**Flow:** Trial member views their current (trial) plan → opens the upgrade picker → chooses Trail
or Summit → confirms.

**Success:** `subscription_status` moves `trialing → active`, `converted_at` set, `trial_converted`
fired with the resulting plan and MRR.

**Note:** stepping between plans (e.g. Trail → Summit) uses the same flow — the target plan is
whatever the member picks in the upgrade UI, not necessarily their trial's suggested plan.

**E2E:** [`tests/e2e/j2-conversion.spec.ts`](../../tests/e2e/j2-conversion.spec.ts)

## J3 — Checkout & payment (with retry)

**Routes:** `/shop` → `/cart` → `/checkout`

**Flow:** Guest or member adds items to cart → checkout with a card number → payment either succeeds
immediately, or (with the demo decline card) fails once and succeeds on retry.

**Deterministic test cards** (no real payment processor in v1):
- `4242 4242 4242 4242` — always succeeds.
- `4000 0000 0000 0002` — fails on the first attempt for a given order, succeeds on every attempt
  after that (models "cards decline, networks hiccup, retry recovers the sale").
- Anything else — always declines (`card_declined`), demonstrating a permanent failure path.

**Success:** order reaches `status = 'paid'`. A first-attempt failure followed by a successful retry
still counts as a completed purchase (`order_completed` fires once, `recovered: true`) — this is
never confused with a clean first-attempt success (`recovered: false`) or with a failure that never
recovers (no `order_completed` at all, order stays `pending`/retryable).

**E2E:** [`tests/e2e/j3-checkout.spec.ts`](../../tests/e2e/j3-checkout.spec.ts) covers both the clean
success path and the decline → retry → recovery path.

## J4 — Cancellation

**Routes:** `/account/subscription`

**Flow:** Active member clicks "Cancel subscription" → sees two genuine save offers (pause 30 days,
or downgrade Summit → Trail) with an equally visible "No thanks, cancel anyway" link → either accepts
a save or confirms cancellation.

**Success:** the account lands in exactly one clean state — `paused` (with `paused_until` set),
unchanged-but-downgraded `active` (with `plan = 'trail'`), or `canceled` (with `canceled_at` set).
**No dark patterns:** the decline path is a plain text link, not a smaller/greyed-out button, and
never requires more than one extra screen. Cancellation never emits `order_completed` or
`trial_converted` — it is neither a purchase nor a conversion.

**E2E:** [`tests/e2e/j4-cancellation.spec.ts`](../../tests/e2e/j4-cancellation.spec.ts) covers both
the save-accepted path and the full-cancellation path.

## Correctness bar (from the strategy, §9)

Payment retries, trial conversions, and cancellations must leave the account in an unambiguous,
correct state. Ambiguous outcomes — e.g. an order that's neither `pending` nor `paid`, or a
subscription that's simultaneously `active` and `canceled` — are bugs, not edge cases to document
around.
