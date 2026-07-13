# Friction Log — Integrating TelemetryTest AI (`karkuak/qualiber`) into Trailhead

Kept live, in chronological order, while doing the integration. Severity: **High** (blocked
progress / required a workaround or guess), **Med** (cost real time, workaround was easy once
found), **Low** (cosmetic / minor doc gap).

**Start time:** 2026-07-13T18:13Z
**Time-to-first-green:** TBD (filled in once the first validated run appears in CI)

---

## Step 0 — Initial recon

**2026-07-13T18:13Z** — `gh repo view karkuak/qualiber` returns a truncated README snippet
describing the tool as "Phase 0 — Internal technical proof," observe-only, CLI-first
(`telemetrytest validate ...`), with no mention of a GitHub Action, Jira, baseline/drift, trust
policy, or blocking modes in that snippet. The kickoff brief describes a much larger surface
(Action inputs, examples/workflows, Jira loop, signed decision records, required-review checks,
blocking switches). Before assuming any of that exists, checking the actual repo tree.

**2026-07-13T18:13Z** — `gh api repos/karkuak/qualiber/contents` shows the tree is in fact larger
than the README snippet implied: `action.yml`, `action/`, `action-composite/`, `docs/`,
`examples/`, `schemas/`, `scenario-lab/`, `ui/`, `packages/` all exist at the root. So the README's
framing ("Phase 0 proof") undersells what's actually in the tree, or the tree contains
work-in-progress scaffolding beyond what's documented as ready. Proceeding to read `action.yml`,
`README.md` in full, and `docs/` before writing anything — will log every capability as it's
confirmed present/documented vs. assumed.

## Step 1 — Full doc pass (README, action.yml, docs/HANDOFF.md, ADR-002, mock-app/, examples/)

**2026-07-13T18:16Z** — [Sev: Low] The root `README.md` really is just the Phase 0 slice. The
*actual* current state (prod-v0.6.0, Phase 1C) lives in `docs/HANDOFF.md`, which is not linked
from the root README at all — only from `docs/README.md`. An engineer who stops at the root
README would materially undersell the tool to themselves. Recommendation to the tool's authors:
link `docs/HANDOFF.md` from the root README.

**2026-07-13T18:17Z** — `action.yml` (root) is the real capability surface for a customer: inputs
`capture`, `contract`, `config`, `mode` (observe|advisory), `out`, `explain` (template|anthropic),
`github-token` (advisory PR comment), `eligibility-mode` (shard|inline), `state-mode`
(commit|artifact), `state-dir`, `baseline` (B4, advisory-only drift), `trust-policy` (B2,
DecisionSnapshot verification), `enable-blocking` (ADR-002, requires a rule to have earned,
ledger-proven, human-approved blocking authority AND the customer's own `customer_blocking_enabled`
opt-in — this input alone never blocks anything). This is a genuinely rich, precisely-scoped
surface — much more capability than the root README suggests, and every input traces to a
real, tested mechanism (confirmed later against `src/`, not assumed).

**2026-07-13T18:18Z** — [Sev: Med] **No native Jira integration anywhere in the shipped
product.** `grep -rli jira` across the repo hits only: (a) Phase 3 planning docs (Jira/Slack
listed as a *future* "external-action + notification backend," not built), and (b)
`scenario-lab/` — a fixture-driven simulation harness for Phase 2Q/3 R&D that *reads* static
`*.provenance.json` fixture files shaped like Jira tickets (`scenario-lab/src/adapters/jiraAdapter.ts`),
not a live Jira API client. The one real, shipped Jira-adjacent surface is a plain string field:
`waive --ticket <id>` lets a waiver cite a ticket ID for audit trails — it does not call Jira.
**Conclusion: the kickoff's "connect Jira" requirement has no supported path in the tool itself.**
I will build the Jira loop myself as custom CI glue (read the tool's JSON output, call the Jira
REST API via the Atlassian MCP / CLI) rather than configure a feature that doesn't exist. Logged
as the single biggest capability gap versus the kickoff brief.

**2026-07-13T18:19Z** — [Sev: High] **The example workflows reference an action/package that
doesn't resolve.** `examples/workflows/customer-example-{pr,default}.yml` both use
`uses: qualiber/telemetrytest-ai@v1` — a *different* org/repo than the one I was given
(`karkuak/qualiber`). `docs/HANDOFF.md` §9 confirms why: "Marketplace publication still needs the
standalone action repo" — `qualiber/telemetrytest-ai` is aspirational template text for a future
public Marketplace listing that does not exist yet. The only thing that actually exists today is
the private `karkuak/qualiber` repo itself, whose own `action.yml` says `uses: <repo>@v1` gets the
committed bundle. I'll reference it as `karkuak/qualiber@v1` (per the kickoff brief) and record in
CI whether a private same-account cross-repo action reference resolves with the default
`GITHUB_TOKEN` or needs a PAT — undocumented either way.

**2026-07-13T18:20Z** — [Sev: High] **The example default-branch workflow calls `npx telemetrytest
merge/merge-ledger/verify` directly**, but `package.json` has `"private": true` and the package is
not published to any registry (confirmed: `npm view` would 404; nothing in the repo publishes it).
There is no documented way for a customer's CI runner to make `npx telemetrytest ...` resolve.
**Workaround (vendoring, as anticipated by the kickoff):** checkout `karkuak/qualiber` as a second
path in the same job and run the CLI from source via `npx tsx src/cli.ts <subcommand>` (confirmed
this works locally: `cd /tmp/qualiber && npm install && npx tsx src/cli.ts validate --help` — after
`npm install`, non-Action CLI invocation runs fine from source). This is the only way I found to
run `merge`, `merge-ledger`, `verify`, `approve`, `promote`, `ack`, `waive`, `kill-switch`,
`feedback`, `readout` — none of which are reachable through the packaged `action.yml` (that only
wraps the single `validate` call). The packaged Action and the product-plane CLI are two separate
consumption paths and only one of them (the Action) is actually distributable to a customer today.

**2026-07-13T18:21Z** — Read `mock-app/run-pilot-1b.sh` and `run-pilot-1c.sh` in full — these are
the tool's own reference implementation of exactly the loop the kickoff wants (sharded observe
runs → merge → approvals → advisory + PR comment → verify → feedback → readout → release pack;
and separately the full blocking-authority lifecycle: promote → review_required → Check Run +
ack → promote to blocking → kill-switch drill → real exit-20 block → waiver → FP-spike
auto-demotion). Two things the 1C script's own header calls out as *simulated* (everything else is
real): (a) it backdates committed run timestamps by 15 days because the blocking ladder requires
≥14 days of real history and a mock pilot can't wait; (b) `customer_blocking_enabled` has **no
CLI on purpose** (`docs/HANDOFF.md` §10) — it's a hand-edit to committed `promotion.json`, which
IS the ADR-002 §4(a) opt-in action. I will follow this exact script as my template for exercising
promotion/blocking, doing the same two (clearly-labeled) simulations myself.

**2026-07-13T18:22Z** — Confirmed via `src/cli.ts` source (not docs, which have no `--help` output
— `validate --help` just errors with a usage line) the full subcommand list: `validate` (default),
`feedback`, `readout`, `merge`, `merge-ledger`, `verify`, `resign`, `release-pack`, `approve`,
`promote`, `promotion-status`, `kill-switch`, `ack`, `waive`, `calibrate`. [Sev: Low] There's no
`--help`/`-h` on any subcommand; the only way to get exact flags was reading `parseArgs`/
`parsePromotionArgs`/etc. in `src/cli.ts` directly.

**2026-07-13T18:23Z** — Checked Jira access for this task: the Atlassian MCP is connected
(`karkuak.atlassian.net`) and a project already exists — **TRAIH** ("traihead") — so requirement
#4 uses this real, existing project rather than standing up a new one.

## Integration plan (before writing code)

1. **Vendor qualiber for CI** — add a second `actions/checkout` (repo `karkuak/qualiber`, a pinned
   SHA) in every workflow that needs the CLI beyond `validate`; `npm ci` it once, then invoke via
   `npx tsx src/cli.ts <subcommand>` (mirrors the mock-app scripts). The packaged `uses:
   karkuak/qualiber@v1` Action covers the single `validate` step.
2. **Collector wiring** — vendor a **thin custom Playwright fixture**
   (`tests/e2e/telemetrytest-fixture.ts`) rather than importing
   `src/collector/playwright/fixture.js` verbatim, because that file hardcodes
   `defaultConfig()` with no override and Trailhead's endpoint is `/api/track` (not the tool's
   default `**/v1/track`/`**/collect` patterns). The fixture re-exports Playwright's own
   `test`/`expect` extended with a `telemetryTest` handle built from the tool's own
   `CaptureAccumulator` + `defaultConfig({ endpoints: [...] })` (both directly importable from the
   vendored source) — same pattern as the shipped fixture, just parameterized for our endpoint.
   J1–J4 specs change only their `import` line plus one `startJourney`/`endJourney` bracket per
   test (unavoidable minimum — the accumulator needs journey boundaries); assertions/logic
   untouched.
3. **Contracts** — one `TrackingRuleContract` JSON per journey under `integration/contracts/`,
   translating `docs/analytics/tracking-plan.md`. J3's is closest to the tool's own
   `checkout_payment_retry` fixture; `optionalEvents` (a *documented* field, not a guess — see
   `src/contract/types.ts`) is exactly the mechanism for "payment_failed/payment_retried only
   appear on the recovered path."
4. **CI** — extend Trailhead's workflow with a PR job and a default-branch job modeled on
   `examples/workflows/customer-example-{pr,default}.yml`, matrixed over the
   `checkout_button_copy` experiment variant (forced via a precomputed `th_sid` cookie value that
   hashes to each bucket — no app code changes).
5. **Capability exercise** — walk the kickoff's capability list against real runs, logging
   worked/partial/blocked in `integration/CAPABILITY-RESULTS.md`.
6. **Break catalog** — 8 small PRs, one regression each, results in `integration/BREAK-RESULTS.md`.
7. **Jira loop** — a CI step (not a tool feature — see finding above) that reads
   `validation-result.json` findings and creates/updates a TRAIH issue via the Atlassian MCP/REST
   API, storing the created issue key back into the waiver `--ticket` field for full traceability.

Starting with J3 (checkout) end-to-end locally, per the kickoff's suggested order.

## Step 2 — First real capture (J3 checkout)

**2026-07-13T18:24Z** — Wrote `tests/e2e/telemetrytest-fixture.ts` (vendored/parameterized fixture,
see plan item 2) and wired it into `j3-checkout.spec.ts` via **only** a changed import line plus a
`beforeEach`/`afterEach` pair at the `describe` level (`startJourney`/`endJourney` + write capture
JSON) — none of the four existing test bodies changed. All 4 existing J3 specs still passed
unmodified.

**2026-07-13T18:28Z** — [Sev: High, confirmed not a guess] **First captures showed
`eventsCaptured: 0`, `health: "degraded"`, `unsupportedBodyTypesObserved: ["non_json_or_beacon"]`
for every test.** Root-caused by reading `src/collector/adapter.ts`
(`toRawEventFromParts`/`onRawRequest`): Trailhead's analytics client
(`src/lib/analytics-client.ts`) sends via `navigator.sendBeacon` first (falling back to `fetch`
only if `sendBeacon` is unavailable or its own enqueue call returns false) — and Playwright/
Chromium does not reliably expose a `sendBeacon` call's body through `request.postData()`, so the
collector's `JSON.parse(input.postData)` never runs and the event is silently uncounted. This is
not a bug I introduced: `docs/HANDOFF.md` §7 GOTCHAS says outright — *"sendBeacon/batched/iframe/
service-worker analytics are only partially handled → `partial` collector health."* My own capture
reproduced exactly that caveat with a concrete number: 0/9 events. Any team whose analytics client
prefers `sendBeacon` (a very common choice — it's the standard "fire on page unload" mechanism)
hits this silently unless they already know to check `collectorHealth`.
**Workaround (not a product change):** added one `NEXT_PUBLIC_TELEMETRYTEST_FORCE_FETCH` env flag
to `analytics-client.ts`, defaulting to the existing `sendBeacon`-first behavior, flipped only in
`playwright.config.ts`'s `webServer.env` for E2E builds. `npm run dev` and any real production
build are byte-for-byte unaffected — verified by grepping that the flag is referenced nowhere else
and defaults false. This is scoped test infrastructure, not a journey/event change.

**2026-07-13T18:29Z** — After the flag: **9/9 events captured, `health: "healthy"`,
`associationConfidence: "high"` on every event**, in the exact real order Trailhead emits them
(`checkout_started → experiment_viewed → payment_submitted(1) → payment_failed(1) →
payment_retried → payment_submitted(2) → order_completed{recovered:true}`), with `cardLast4`
already redacted to `"[redacted]"` by the collector's own PII patterns — confirms the tool's
redaction-before-capture claim without me configuring anything for it. This is the first fully
real, unmodified-by-me artifact in the whole integration; moving on to authoring the contract
against it.

## Step 3 — First contract + validate (checkout journey)

**2026-07-13T18:33Z** — Authored `integration/contracts/checkout_payment_retry.contract.json`
from `docs/analytics/tracking-plan.md`'s J3 event table. [Sev: Low] The on-disk format is
snake_case (`rule_contract_version`, `event_aliases`, ...) while the TS type
(`src/contract/types.ts`) is camelCase — only discoverable by reading `import-json.ts`'s comment
("The BRD contract is snake_case on disk; this maps it into the typed model") since no schema
file or example ships both side by side for cross-reference; got it right on the first attempt
only because I'd already read both files.

**2026-07-13T18:34Z** — First `validate` run failed with `not_run` / `contract_unapproved` — the
contract needs `approved_by` + `approved_at` + `approved_for_version` (matching
`rule_contract_version`) or the tool refuses to run it at all. Not documented in `action.yml`'s
input descriptions; only visible in the actual `not_run` reason string and by re-reading the
fixture contract, which has these fields but doesn't call out that they're what gates
`not_run` vs. actually validating. Added them; second run succeeded.

**2026-07-13T18:36Z** — Validated all three real J3 captures against the one contract:
- Clean first-attempt success → **clean**, 0 findings. ✅ correct.
- Declined-then-recovered → **clean**, 0 findings (the `optional_events` mechanism worked exactly
  as `src/contract/types.ts` documents — `payment_failed`/`payment_retried` were absent from the
  clean-success capture and present+correctly-ordered in the recovered one; both pass the SAME
  contract). ✅ correct — this is the whole point of J3's "never conflate recovered vs. clean"
  rule, proven with a real tool run rather than eyeballing JSON.
- Permanently-declined card (checkout never completes, by design — this test asserts the failure
  path, not a bug) → **rule_violation_detected**: `missing_required_event: order_completed`.

**2026-07-13T18:37Z** — [Sev: Med] **Methodological finding, not a tool bug.** The third result
above is technically correct given my contract (`order_completed` is required, non-optional) but
is a **false positive by design**: that test intentionally exercises the "never completes" path,
which is itself a first-class, tested, correct behavior in Trailhead (see
`docs/product/journeys.md` J3: "a failure that never recovers ... must never be counted as a
completed purchase"). A single `TrackingRuleContract` models one journey as having one canonical
completed shape; it has no way to say "this specific test's capture represents an intentionally
incomplete attempt, don't require the terminal event here." Confirmed this is the intended usage
pattern, not a gap I'm missing: `mock-app/run-pilot-1b.sh`/`1c.sh` only ever validate
`capture-passing.json` in their normal observe/advisory loop, and use `capture-failing.json`
*exclusively* to demonstrate a deliberate violation — they never validate a "this test asserts a
dead-end on purpose" capture against a "the journey completes" contract either. **Practical
consequence for wiring this into CI:** only the specs whose test *is* the happy/expected path
(here: clean success + recovered success) should feed the main contract; a spec that asserts a
permanent failure path is out of scope for that contract (or would need its own inverse contract,
which the schema doesn't have a clean primitive for — `forbidden_events` covers "this must never
appear," not "these terminal events are all optional because this test is allowed to just stop").
Logged as a real integration-design decision, not a workaround: I will run the validator against
J3's clean+recovered specs for `checkout_payment_retry_sequence`, and treat the permanent-decline
spec as out of this contract's scope (same asymmetry the tool's own mock pilot uses).

## Step 4 — J1/J2/J4 contracts

**2026-07-13T18:41Z** — J1 (`signup_onboarding`) and J2 (`trial_conversion`) validated **clean**
on the first try against their real captures — no surprises, both journeys are single-path with
no optional branches.

**2026-07-13T18:42Z** — [Sev: Med, real finding about journey-boundary discipline] All three J4
captures came back `forbidden_event_observed: trial_converted` — a real violation by the letter of
my contract, but the wrong one: J4's shared test helper `becomeActiveMember()` performs a full
J2 upgrade **as test setup** (a member has to be a paying subscriber before they can cancel), and
because I'd put `telemetryTest.startJourney("cancellation")` in the `describe`-level
`beforeEach` — i.e. spanning the *entire* Playwright test lifecycle — the capture window
swallowed that setup's `trial_converted` event too. The contract's `forbidden_events` check (J4
must never emit a conversion event — a real Trailhead rule) fired correctly on telemetry that
doesn't actually belong to the journey under test. **The lesson: journey boundaries must bracket
only the actions under test, not the whole test lifecycle, especially when a shared setup helper
itself drives a different real journey.** Fixed by moving `startJourney("cancellation")` out of
`beforeEach` and into each test body, called right after `becomeActiveMember()` returns and before
the actual cancel/pause/downgrade actions begin — a one-line addition per test, not a rewrite.
Re-ran: all three J4 captures clean afterward (see below).

## Step 5 — Matrix (checkout_button_copy variant) proven locally before wiring CI

**2026-07-13T18:38Z** — Forced the `checkout_button_copy` bucket without touching any app code:
computed two `th_sid` session-id strings that hash (via the app's own `assignVariant` —
`sha256(sessionId:experimentKey) mod 2`) to `control` and `reassuring` respectively
(`ci-session-3` → control, `ci-session-0` → reassuring — confirmed directly against
`src/lib/experiments.ts`, not just my own re-implementation of the hash), then pre-seeded that
cookie via `page.context().addCookies()` in a `beforeEach` **before** the first request (proxy.ts
only sets `th_sid` when absent). Ran the full J3 suite once per forced session id.

**2026-07-13T18:39Z** — Validated the recovered-checkout capture from both variants against the
same contract with `TT_MATRIX_CONTEXT` set (as the tool's `examples/workflows/customer-example-pr.yml`
instructs matrix jobs to do) and `--eligibility-mode shard --state-mode artifact`: both come back
**clean**, proving the experiment doesn't distort the funnel (identical events, identical
validation outcome — only the button label differs, exactly per the product strategy's standing
rule for the lab). Then ran `merge --shards <dir> --state <canonical>` once per variant's shard:
`applied 1, idempotent 0, local-skipped 0, history 1` then `history 2` — both matrix legs landed
in canonical `eligibility.json` as two distinct, non-colliding `run_id`s
(`matrix-demo-1.0.2fdb2bffd184` / `...ee167f33236a`, the hash suffix derived from
`TT_MATRIX_CONTEXT`). This is real, direct evidence the B7 matrix-safe shard/merge contract works
as documented — not inferred from reading the LLD.

Bonus: the eligibility record already carries a computed **VQS** (`vqs_score: 90`,
`vqs_band: "Strong"`) even for a first/only run — confirms the VQS capability is live and
populated without any extra configuration on my part.
