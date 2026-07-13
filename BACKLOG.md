# Trailhead Product Backlog

Seeded from the [product strategy](./trailhead-product-strategy.md) roadmap (§10). Not exhaustive —
add to this as work is scoped.

## Now — earn the core loop (v1, this repo)

- [x] Ship J1–J4 as reliable, instrumented, end-to-end-tested flows.
- [x] Stand up the tracking plan and the analytics pipeline (local ingestion endpoint).
- [x] Launch the lab with the first checkout experiment (`checkout_button_copy`).
- [ ] Wire CI preview deploys to a real hosting target's PR-preview integration (workflow is ready;
      needs a hosting account connected).

## Next — improve conversion & trust

- [ ] **Smarter onboarding personalization.** Current plan suggestion is a single-field heuristic
      (experience level only). Incorporate goals/season text into the recommendation.
- [ ] **Richer plan preview.** Show sample gear for the recommended plan, not just name/price/blurb.
- [ ] **Payment resilience.** More payment methods beyond card; better retry UX (e.g. suggest a
      different card after two failures rather than repeating the same one).
- [ ] **Save flow expansion in J4.** Currently pause (30 days, fixed) and downgrade (Summit→Trail
      only). Consider a discount-based save offer, and pause-duration choice.
- [ ] **Guest-checkout account linking.** A guest who checks out with an email that later signs up
      should have their order history linked to the new account.

## Later — expand the promise

- [ ] Trip-based bundles and seasonal automation in the guide.
- [ ] Gifting flow (buy a starter experience for someone else — see "The Gifter" persona in the
      strategy §2).
- [ ] Native mobile.
- [ ] Real analytics vendor integration behind `/api/track` (Segment, or a warehouse-direct pipe),
      replacing the local stand-in ingestion endpoint.
- [ ] Real payment processor integration (Stripe or similar) replacing the deterministic test-card
      simulation in `/api/checkout`.

## Engineering follow-ups (not roadmap-driven, discovered while building v1)

- [ ] Rate-limit `/api/auth/signup` and `/api/checkout` before any real traffic.
- [ ] Add a `refund` state to the order state machine once the shop needs returns (strategy names
      "easy returns" as a trust pillar — not modeled in v1's schema yet).
- [ ] Structured logging / error monitoring (Sentry or similar) once this runs somewhere real.
