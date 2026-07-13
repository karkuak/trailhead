# Trailhead Tracking Plan

**Version 1.0 · Owner: Product · Source of truth for the funnel**

This is the authored event taxonomy for Trailhead v1, covering the four core journeys (J1–J4).
It is versioned alongside the product — any change to an event name, property, or ordering is a
change to this file in the same PR as the code.

## How events are emitted

All events are emitted client-side through a Segment-style analytics client
(`src/lib/analytics-client.ts`: `track` / `identify` / `page`) which POSTs to a single ingestion
endpoint, `POST /api/track`. The endpoint (`src/app/api/track/route.ts`) persists every event to the
`events` table and logs a structured line to stdout — this stands in for "forward to the warehouse"
in v1. No third-party analytics vendor is wired up.

Every event carries:
- `sessionId` — anonymous per-browser session id, set by `src/proxy.ts` on first request. Used for
  event correlation and experiment bucketing before and after login.
- `userId` — set once `identify()` has been called (post-signup). `null` for anonymous/guest events.
- `properties` — event-specific payload (see tables below). Amounts are always numbers in cents
  (`priceCents`, `totalCents`, `mrrCents`), never formatted strings.

## Standing rules (from the product strategy, §7)

1. **Outcome-defining events must be distinguishable in order.** A failure followed by a recovery is
   never the same event sequence as a clean success. J3 encodes this directly: `payment_failed` before
   `order_completed` in the event log (with `order_completed.recovered = true`) is how a recovered sale
   is told apart from a clean one — never collapsed into a single ambiguous "success" event.
2. **A journey must not emit another journey's events.** J4 (cancellation) never emits `order_completed`
   or `trial_converted` — cancelling is not a purchase or a conversion, even though it mutates the same
   `subscription_status` field those events do.

## J1 — Signup & onboarding

| Order | Event | Fired when | Required properties |
|---|---|---|---|
| 1 | `signup_started` | User submits the signup form | `method` (`"email"`) |
| 2 | `identify` | Immediately after a successful signup response | `userId`, `email`, `name` |
| 3 | `signup_completed` | Signup API call succeeds | `userId`, `trialEndsAt` (ISO string) |
| 4 | `onboarding_started` | Onboarding page mounts | — |
| 5 | `onboarding_completed` | Onboarding preferences submitted successfully | `experienceLevel`, `season`, `suggestedPlan` |
| 6 | `plan_preview_viewed` | Plan preview renders after onboarding | `plan` |

**Success definition:** account created (`signup_completed`) **and** onboarding finished
(`onboarding_completed` + `plan_preview_viewed`). A signup with no onboarding completion is an
activation gap, not a failure — track it as an incomplete funnel, not a distinct "failed" event.

## J2 — Trial → subscription conversion

| Order | Event | Fired when | Required properties |
|---|---|---|---|
| 1 | `plan_viewed` | Member views `/plan` | `plan`, `subscriptionStatus` |
| 2 | `upgrade_started` | Member opens the upgrade plan picker | `fromPlan` |
| 3 | `trial_converted` | Upgrade API call succeeds | `plan` (new), `previousPlan`, `mrrCents` |

**Success definition:** `trial_converted` fired with `subscriptionStatus` having moved from
`trialing` to `active`. `trial_converted` is exclusive to this journey — it is never emitted by
checkout (J3) or reused to describe a save-flow downgrade in J4 (that uses `save_accepted` instead).

## J3 — Checkout & payment (with retry)

| Order | Event | Fired when | Required properties |
|---|---|---|---|
| 1 | `checkout_started` | Checkout page mounts with a non-empty cart | `itemCount`, `totalCents` |
| 1b | `experiment_viewed` | Same mount, once per session | `experiment` (`"checkout_button_copy"`), `variant` |
| 2 | `payment_submitted` | Each time the payment form is submitted | `orderId` (null on first attempt), `attemptNumber`, `cardLast4` |
| 3a | `payment_failed` | Payment attempt is declined | `orderId`, `attemptNumber`, `reason` |
| 3b | `payment_retried` | Member clicks "Retry Payment" after a failure, before resubmitting | `orderId`, `previousAttempt` |
| 4 | `order_completed` | Payment attempt succeeds | `orderId`, `totalCents`, `attemptNumber`, `recovered` (boolean) |

**Success definition:** exactly one `order_completed` per order. `recovered: true` means at least one
`payment_failed` preceded it on the same `orderId` — a recovered sale is still counted as a completed
purchase (per the strategy: "recovered payments are pure margin"), but it is **never** the same shape
as a clean success: the presence of `payment_failed` + `payment_retried` earlier in the same order's
event sequence is what makes a recovered sale reconstructable and distinct in the warehouse. A failed
attempt with no subsequent success emits `payment_failed` and no `order_completed` at all — it must
never be counted as a completed purchase.

## J4 — Cancellation

| Order | Event | Fired when | Required properties |
|---|---|---|---|
| 1 | `cancellation_started` | Member clicks "Cancel subscription" | `plan`, `subscriptionStatus` |
| 2 | `save_offer_shown` | Save-offer screen renders | `plan` |
| 3a | `save_accepted` | Member accepts pause or downgrade | `saveType` (`"pause"` \| `"downgrade"`), plus `pausedUntil` or `plan` |
| 3b | `cancellation_completed` | Member declines the save and confirms cancellation | `plan`, `canceledAt` |

**Success definition:** either `save_accepted` (member retained, account left `active`/`paused`) or
`cancellation_completed` (account left `canceled`) — exactly one of the two per cancellation attempt,
never both. J4 never emits `order_completed` or `trial_converted`; a downgrade accepted as a save is
`save_accepted` with `saveType: "downgrade"`, not a purchase or a conversion event.

## Cross-cutting events

| Event | Fired when | Required properties |
|---|---|---|
| `page_viewed` | Generic page navigation (shop, guide, etc.) not covered by a journey-specific event | `page` |
| `product_added_to_cart` | Item added to cart from the shop | `productId`, `priceCents` |
| `experiment_viewed` | An experiment-bucketed session views the experience | `experiment`, `variant` |

These are not part of any journey's ordered sequence and must not be confused with journey events —
they exist for general product usage visibility (guide/shop browsing) and for experiment exposure
logging.

## Experimentation and event parity

Per the product strategy (§8), a variant must emit the **same** journey events as control — only the
experience differs. `checkout_button_copy` (control: "Place Order" / reassuring: "Place Order — Secure
Checkout, Easy Returns") changes only the button label; both variants go through the identical
`checkout_started` → `payment_submitted` → (`payment_failed`/`payment_retried`)* →
`order_completed` sequence. The only addition is the `experiment_viewed` exposure event, which is
cross-cutting (not journey-specific) and identical in shape for every variant.

## Changelog

- **1.0** (v1 launch) — initial taxonomy covering J1–J4, defined alongside the first implementation.
