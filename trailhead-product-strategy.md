# Trailhead — Product Strategy

**Version 1.0 · Company-confidential · Owner: Product**

> Trailhead makes it effortless to stay equipped for the outdoors — curated gear delivered on a
> schedule you control, plus a shop for the one-off things you need before the next trip.

---

## 1. Vision & mission

**Vision.** Everyone who wants to be outside is well-equipped for it — without the research,
the guesswork, or the last-minute scramble.

**Mission.** Turn "I should get outside more" into a running habit by pairing a personalized gear
subscription with a fast, trustworthy shop, so members always have the right kit for the season and
the trip ahead.

**Why now.** Outdoor participation has broadened well beyond the enthusiast core, but the buying
experience is still built for experts: overwhelming catalogs, jargon, and no sense of what a normal
person actually needs. Subscription commerce has trained consumers to expect curation and
convenience. Trailhead sits at that intersection.

---

## 2. Market & problem

**The problem.** New and intermediate outdoor people don't lack motivation — they lack a system.
They over-buy the wrong things, under-buy the essentials, and abandon carts full of gear they
weren't sure about. Expert retailers optimize for breadth and margin, not for guiding someone from
"interested" to "ready."

**Who we serve.**
- **The Aspiring Regular** — wants to hike/camp a few times a season, intimidated by choice, will
  happily pay for curation and confidence.
- **The Committed Weekender** — already goes out often, wants to offload the logistics of staying
  equipped and replacing consumables.
- **The Gifter** — buying a starter experience for someone else.

**Market shape.** A large, fragmented outdoor-gear market where the winners on the consumer end
compete on *trust and convenience*, not SKU count. Our wedge is the guided, subscription-first
onboarding — a lane incumbents are structurally poor at.

---

## 3. Value proposition & positioning

**For** people who want to get outside more **but** are overwhelmed by gear decisions, **Trailhead
is** a curated outdoor-gear subscription and shop **that** delivers the right kit for your goals and
season — **unlike** sprawling expert retailers, **we** guide you from your first trip to your
hundredth.

**Positioning pillars.**
1. **Curation over catalog** — a short, confident recommendation beats a thousand options.
2. **Momentum over transactions** — we optimize for the member's next trip, not a single sale.
3. **Trust by default** — honest sizing, easy returns, transparent pricing, cancel anytime.

**Brand promise.** *"You'll always be ready for what's next."*

---

## 4. The product

Trailhead is a web-first product with three connected surfaces:

### 4.1 The subscription
Tiered, seasonal gear plans. A member sets goals and preferences, we curate a plan, and gear ships
on a cadence they control.

| Plan | For | Cadence | Price (intro) |
|---|---|---|---|
| **Trail** | The Aspiring Regular | Seasonal (4/yr) | $39/mo |
| **Summit** | The Committed Weekender | Monthly | $69/mo |

Every new member starts with a **14-day free trial** that includes a personalized plan preview and
one welcome shipment credit.

### 4.2 The shop
A curated storefront for one-off purchases — the thing you need *before Saturday*. Available to
members and guests. This is where much of the near-term revenue and urgency lives, so the checkout
experience is a first-class product, not an afterthought.

### 4.3 The guide
Lightweight recommendation and content that reduces decision anxiety: "what you need for your first
overnight," seasonal refresh nudges, and trip-based bundles. The guide is what makes curation feel
personal rather than generic.

---

## 5. Core user journeys

These four journeys are the spine of the product. Each has an explicit success definition and is
instrumented end-to-end (see §7). Getting these right — reliable, fast, measurable — matters more
than adding surface area.

### J1 — Signup & onboarding
Prospect creates an account and completes a short preferences flow that yields their first
personalized plan preview.
- **Success:** account created **and** onboarding finished (preferences captured, plan previewed).
- **Why it matters:** activation. A member who never sees a personalized plan rarely converts.

### J2 — Trial → subscription conversion (upsell)
During the 14-day trial the member explores their plan, sees value, and upgrades to a paid plan
(often stepping Trail → Summit).
- **Success:** trial member views a plan, engages the upgrade path, and converts to paid.
- **Why it matters:** this is the primary revenue conversion and the metric the business lives on.

### J3 — Checkout & payment (with retry)
A member or guest buys from the shop. Payments fail more than teams like to admit — cards decline,
networks hiccup — so the flow must handle a failure, offer a clean retry, and recover the sale.
- **Success:** an order is placed; a **first-attempt failure followed by a successful retry still
  counts as a win**, and we must never lose track of which happened.
- **Why it matters:** recovered payments are pure margin, and a clumsy failure state is the fastest
  way to lose trust.

### J4 — Cancellation
A member cancels a subscription. We make it honest and frictionless — no dark patterns — while
offering a genuine save (pause, downgrade).
- **Success:** the member cancels (or accepts a save) cleanly, with the account left in a correct
  state.
- **Why it matters:** trust and word-of-mouth. A respectful cancel flow is a retention asset, and a
  cancellation must **never** be mistaken for a purchase or a conversion.

---

## 6. Business model & key metrics

**Model.** Recurring subscription revenue (Trail/Summit) plus transactional shop revenue, with the
subscription as the retention and LTV engine and the shop as the acquisition and urgency engine.

**North Star metric:** **Active equipped members** — members with an active plan who received or
purchased gear in the last 90 days. It captures both sides of the promise (subscribed *and*
actually served).

**Primary funnel metrics.**
| Stage | Metric |
|---|---|
| Acquisition | Signup start → signup completed rate |
| Activation | Onboarding completion rate; time-to-first-plan-preview |
| Conversion | Trial → paid conversion rate |
| Revenue | Checkout completion rate; **payment-retry recovery rate** |
| Retention | 3-month subscription retention; voluntary churn rate |

**Guardrail metrics.** Refund rate, support contact rate, involuntary churn (failed renewals),
cancellation-flow satisfaction.

---

## 7. Measurement & analytics philosophy

We are a data-informed product team. Decisions about the funnel are made on evidence, which means
**the funnel must be instrumented deliberately and consistently.**

**Principles.**
- **One tracking plan, owned by product.** Event names, required properties, and expected ordering
  are defined up front in a shared **tracking plan** — not invented ad hoc in feature code. The
  tracking plan is a first-class artifact, versioned alongside the product.
- **Journeys, not just clicks.** We instrument each core journey (J1–J4) as an ordered sequence of
  events with the properties needed to reason about it — enough to reconstruct what happened, in
  what order, with what outcome.
- **Analytics is a contract, not a nicety.** Dashboards, activation reports, conversion funnels, and
  experiment readouts all depend on these events being correct. A broken or renamed event silently
  corrupts every downstream number, so we treat the event schema with the same seriousness as an
  API.
- **Client emits, warehouse decides.** The app emits events through a standard analytics client
  (Segment-style `track`/`identify`/`page`); a single ingestion endpoint forwards to our warehouse
  and product-analytics tools.

**Defining the taxonomy.** The team owns and defines the event taxonomy from scratch as part of
building each journey — the tracking plan is the source of truth, not this strategy doc. For every
core journey, define the ordered set of events that lets us reconstruct what happened and its
outcome, and document each event's required properties (identifiers, amounts as numbers, plan and
variant context, and so on). Two standing rules constrain the naming, not the names themselves:
outcome-defining events must be distinguishable in order (a failure followed by a recovery is not
the same as a clean success), and journeys must not emit events that belong to a different journey
(a cancellation is never a purchase or a conversion).

---

## 8. Experimentation strategy ("the lab")

Growth comes from disciplined iteration on the funnel, so we run a lightweight in-house
experimentation system ("the lab").

- **Flag-driven variants.** Features and copy ship behind flags; experiments assign a member to a
  variant deterministically per session so their experience is stable.
- **Everything measurable is testable.** Onboarding steps, plan presentation, upgrade prompts, and
  checkout copy are all fair game for A/B tests. First live experiment: **`checkout_button_copy`**
  (control vs. a more reassuring label) measured on checkout completion.
- **Experiments must not distort the funnel.** Because analytics drives the readout, an experiment
  variant has to emit the *same* journey events as control (only the experience differs, not the
  measurement) — otherwise the experiment corrupts the very funnel it's trying to improve. This is a
  standing rule for anyone shipping a variant.
- **Preview environments.** Every change deploys to an isolated preview environment so a variant can
  be exercised end-to-end before it reaches members.

---

## 9. Engineering & quality principles

Trailhead's credibility rests on flows that *work*, especially payments and onboarding.

- **End-to-end tested journeys.** J1–J4 are covered by browser end-to-end tests (Playwright) that
  drive the real UI and assert real outcomes. These journeys are considered release-critical.
- **CI/CD by default.** Every change runs build, lint, unit, and end-to-end tests in CI, deploys a
  preview, and only ships on green. Fast, boring, repeatable releases.
- **Web-first, standard stack.** A modern web app (Next.js/React) with API routes, a standard
  analytics client, and a simple persistence layer. Favor conventional, well-understood tools over
  novelty.
- **Correctness of state.** Payment retries, trial conversions, and cancellations must leave the
  account in an unambiguous, correct state. Ambiguous outcomes are treated as bugs.

---

## 10. Roadmap (Now / Next / Later)

**Now — earn the core loop.**
- Ship J1–J4 as reliable, instrumented, end-to-end-tested flows.
- Stand up the tracking plan and the analytics pipeline.
- Launch the lab with the first checkout experiment.

**Next — improve conversion & trust.**
- Smarter onboarding personalization; richer plan preview.
- Payment resilience (better retry UX, more methods).
- Save flows in cancellation (pause, downgrade).

**Later — expand the promise.**
- Trip-based bundles and seasonal automation in the guide.
- Gifting flow.
- Native mobile.

---

## 11. Risks & assumptions

| Risk | Mitigation |
|---|---|
| Trial-to-paid conversion below plan | Instrument J2 tightly; experiment on plan presentation and upgrade timing |
| Payment failures erode trust and revenue | First-class retry UX in J3; monitor recovery rate as a headline metric |
| Analytics drift silently corrupts decisions | Tracking plan as an owned contract; treat event schema like an API |
| Curation feels generic | Invest in the guide; personalize from onboarding preferences |
| Cancellation dark-pattern temptation | Keep J4 honest by principle; measure satisfaction, not just save rate |

**Core assumptions.** People will pay for curation and convenience in outdoor gear; a strong
onboarding preview drives conversion; a respectful cancel flow protects long-term brand more than a
coercive one.

---

## 12. What "good" looks like in 6 months

- J1–J4 live, reliable, and fully instrumented against the tracking plan.
- Trial → paid conversion trending toward plan, with experiment-driven improvements.
- Checkout completion and payment-retry recovery both measured and improving.
- A running experimentation cadence via the lab, with clean, trustworthy readouts.
- A product the team can change quickly and confidently, because the funnel is measured and the
  critical journeys are tested.
