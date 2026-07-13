# Break Catalog — What TelemetryTest AI Actually Caught

Eight planted regressions, one real capture (or a real live browser run) each, validated with the
real CLI against the real Trailhead contracts. **The assertion is on the tool's output**, not on
the app. Artifacts (mutated captures + full validate output) are under
`integration/artifacts/break-catalog/`; the mutation script is
`integration/scripts/run-break-catalog.mjs`.

Severity key for "did it catch it": ✅ caught correctly · ⚠️ missed / false negative · ❌ false
positive (flagged something that wasn't actually wrong).

## Summary table

| # | Scenario | Contract | Result | Verdict |
|---|---|---|---|---|
| 1 | Dropped required event (`payment_retried` removed) | `checkout_payment_retry_sequence` | `clean` (no findings) | ⚠️ **Missed** |
| 2 | Two outcome events emitted out of order (`order_completed` before `payment_retried`) | same | `clean` (no findings) | ⚠️ **Missed** |
| 3 | Required property, wrong type (`attemptNumber: "2"` instead of `2`) | same | `rule_violation_detected` — `property_type_mismatch` | ✅ **Caught** |
| 4 | Late/orphaned event (fired 2.5s and again 10s after `endJourney()`, real browser run) | same | Still classified `associated`, not `late` | ⚠️ **Missed in practice** (see analysis) |
| 5 | One experiment variant drops an event the other keeps (`experiment_viewed` absent in "reassuring" leg) | same | Both legs `clean` independently | ⚠️ **Structurally unreachable** (see analysis) |
| 6 | Purchase event fired from the cancellation flow (`order_completed` injected) | `cancellation_sequence` | `rule_violation_detected` — `forbidden_event_observed` | ✅ **Caught** |
| 7 | Control: fully correct, unmodified capture | `checkout_payment_retry_sequence` | `clean` (0 findings) | ✅ **Correct — no false positive** |
| 8 | Nondeterministic/flaky duplicate emit (`payment_submitted` fired twice, 5ms apart) | same | `clean` (no findings) | ⚠️ **Missed** |

**5 of 8 scenarios were real regressions the tool should catch; it caught 2 of them (property type,
cross-journey forbidden event) and missed 4 (dropped event, out-of-order, late/orphaned in
practice, flaky duplicate). The control (7) correctly stayed clean — no false positives anywhere
in this catalog.** Scenario 5 isn't a miss so much as a capability the tool doesn't attempt at all
(cross-run/cross-variant comparison).

## Per-scenario detail

### 1 — Dropped required event: ⚠️ Missed

Removed `payment_retried` from the real recovered-checkout capture, keeping `payment_failed` and
`order_completed`. **Root cause, not a bug:** my contract's `optional_events` marks both
`payment_failed` and `payment_retried` optional (correctly, since a *clean* success has neither).
But `optionalEvents` is all-or-nothing per event name — the schema has no way to express
"`payment_retried` is required *if* `payment_failed` occurred." A capture with a failure and no
retry, that still reports a completed order, sails through clean. This is a real gap in contract
expressiveness for exactly the shape J3 cares about (recovered vs. clean vs. broken), surfaced by
actually testing it rather than assumed from reading the schema.

### 2 — Two outcome events out of order: ⚠️ Missed

Moved `order_completed` to fire *before* `payment_retried` in the sequence (order completing
before the retry that supposedly produced it) — about as serious a wrong-order bug as this domain
has. Still `clean`. Best hypothesis after reading `validator/checks/sequence.ts`-adjacent code:
ordering is enforced pairwise starting from *required* anchors, and reordering an *optional* event
(`payment_retried`) relative to a required one doesn't trip the `wrong_order` check the same way
two required events swapping would. Not independently re-verified against the exact check
implementation given time — flagged here as the empirical result, with the likely mechanism named
but not proven line-by-line.

### 3 — Wrong property type: ✅ Caught

`order_completed.attemptNumber` changed from `2` (number) to `"2"` (string). Correctly reported
`rule_violation_detected` / `property_type_mismatch`. This one worked exactly as expected on the
first try.

### 4 — Late/orphaned event: ⚠️ Missed in practice (real browser run, not a hand-edit)

Hand-editing a capture's timestamp field doesn't exercise real late-detection — association
classification is computed by the *collector* at capture time from raw request timing, not
recomputed by the *validator* at validate time (confirmed by testing scenario 4 as a hand-edit
first: still `clean`, because the pre-baked `associated` flag never changed). Redid it properly:
a real Playwright test that calls `endJourney()`, waits, then fires a genuine `/api/track` request
2.5s later, then (a separate run) 10s later. **Both still came back `associated`/
`validation_eligible`, not `late`.**

Root-caused in `src/collector/associator.ts` + `classifier.ts`: association confidence is a
*weighted sum*, not a hard gate on timing. `injectedTestId` (0.6) + `browserContext` (0.2) alone
total 0.8 — already at the "high" confidence threshold — before the timing signals
(`within_window` 0.15, `within_grace_window` 0.05) are even added. In a normal single-page
Playwright test, every event shares the same test id and browser context, so **a same-context
event arriving arbitrarily late still scores "high" purely from context match, and the late/grace
signals can only ever add on top — they can never subtract enough to demote it.** For this to
matter, the association weights would need timing to be closer to a required gate than a bonus. I
did not have time to construct a capture where context/test-id genuinely differ (e.g. a genuinely
orphaned request from a stale page in a different context) to see whether *that* case correctly
excludes — this finding is specifically about same-context lateness, the most common real "slow
beacon" scenario, not a claim that late/orphaned detection never works under any circumstance.

### 5 — Experiment variant drops an event: ⚠️ Structurally unreachable, not a "miss"

Built two capture files — a real "control" leg and a "reassuring" leg with `experiment_viewed`
stripped out — and validated each independently against the checkout contract. Both came back
`clean`. This isn't really a detection failure so much as revealing that **the tool has no
cross-run comparison primitive at all** — `validate` takes one capture and one contract; there is
no "diff these two runs for the same rule" mode. Since `experiment_viewed` sits in
`known_unknowns` (not `expected_path`) for this contract, its presence/absence in a single run
isn't even something the contract *could* flag on its own terms. Checking whether a variant drops
an event the control keeps is exactly the invariant the product strategy's "the lab" section
requires (§8: "a variant must emit the *same* journey events as control") — and this integration
had to build that check itself (comparing the two variants' matrix artifacts by hand, see
FRICTION-LOG.md Step 5) rather than getting it from the tool.

### 6 — Cross-journey purchase event: ✅ Caught

Injected a real `order_completed` event into the full-cancellation capture. Correctly reported
`rule_violation_detected` / `forbidden_event_observed` on `order_completed`, exactly matching the
J4 contract's `forbidden_events` rule. This is the same mechanism validated (for the opposite
direction — `trial_converted` leaking into a J4 capture from shared test setup) as a *real*
methodological bug I hit and fixed in Step 4 of the friction log — so this mechanism has now been
proven both as a real false-positive source (when journey boundaries are drawn wrong) and a real
true-positive catch (when the underlying app genuinely crosses journeys). Worked correctly both
times.

### 7 — Control (fully correct): ✅ Correct, zero false positives

The real, unmodified recovered-checkout capture, run through the same contract as scenarios 1–4 and
8. `clean`, 0 findings, every time this exact capture was validated across the whole integration
(this is also the identical result already recorded in `integration/artifacts/j3-recovered/`). No
false positives anywhere in this catalog, including this baseline.

### 8 — Flaky/nondeterministic duplicate emit: ⚠️ Missed

Duplicated `payment_submitted` (5ms apart, simulating a double-fire from a retried network
request) in the real recovered-checkout capture. Still `clean`. Consistent with an earlier finding
(FRICTION-LOG.md Step 3): the `TrackingRuleContract` schema has no occurrence-count primitive —
`expectedPath` checks presence/order of distinct canonical event names, not how many times each
occurred. A double-fired analytics call for the same real action is invisible to this validator by
design, not by accident.
