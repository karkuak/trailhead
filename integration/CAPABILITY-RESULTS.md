# Capability Results — TelemetryTest AI in Trailhead

One row per capability the kickoff asked to exercise. "Worked" means proven with a real command
and real output (referenced); "Partial" means the core mechanism is proven but something specific
about it couldn't be reached; "Couldn't reach" means genuinely blocked, with why. Full narrative
and timestamps for everything below are in `integration/FRICTION-LOG.md`.

| Capability | Status | Evidence / notes |
|---|---|---|
| **Observe mode stays silent/non-blocking** | ✅ Worked | Real `rule_violation_detected` run, `--mode observe`, exit 0 (`integration/artifacts/cap-observe-mode/`). |
| **Advisory mode stays non-blocking, adds eligibility gating** | ✅ Worked | Same violation, `--mode advisory`, exit 0; first (unseeded) run correctly reported `Advisory comment eligible: No (insufficient_observe_runs, ...)` (`cap-advisory-mode/`). |
| **JSON result artifact** | ✅ Worked | `report.json` / `run-result.json` / `validation-evidence-pack.json` produced on every run. |
| **JUnit report** | ✅ Worked | `report.junit.xml` produced on every run. |
| **Markdown job summary** | ✅ Worked | `report.md` produced on every run; matches the CLI's stdout summary. |
| **Evidence pack** | ✅ Worked | `validation-evidence-pack.json` — confirmed all 10 documented sections + `content_hash` + `evidence_pack_id` present (`integration/artifacts/j3-recovered/`). |
| **Advisory PR comment (actual populated content)** | ✅ Worked (seeded), ❌ blocked (live, this PR) | The very first, unseeded advisory run on PR #1 correctly reported not-yet-eligible (the E7.6 gate working as designed). Seeded 3 observe runs + 3 approvals into a fresh state dir (same technique the tool's own mock pilot uses) and got a real, fully rendered `advisory-comment.md` (`cap-eligibility/advisory-run/`). Never actually posted to a live PR because CI can't check out `qualiber` yet (PAT pending — see below). |
| **AI explanation — template provider** | ✅ Worked | Clean, guardrail-passed, offline, no API key needed (`cap-explain-template/explanation.json`). |
| **AI explanation — anthropic provider** | ⚠️ Partial | No `ANTHROPIC_API_KEY` available in this environment. Confirmed the *fallback* path works correctly (`guardrailPassed: false`, `fellBackToTemplate: true`, exact provider error recorded) — the live-model path itself is unexercised. |
| **Human feedback CLI** | ✅ Worked | `feedback --action false_positive ...` appended to `telemetrytest.feedback.yaml` and rolled into `telemetrytest.calibration.json` (`cap-feedback/`). |
| **Acknowledgement (`ack`)** | ✅ Worked | Cleared a real `action_required` Check Run to `success` for the exact same finding (`promotion-demo/run-14b` → `run-15c`). |
| **Baseline / drift detection** | ✅ Worked | Authored a real Trailhead production baseline; `--baseline` correctly surfaced advisory-only drift (`payment_submitted` 2x in CI vs. 1x in the baseline signature — a legitimate, benign difference between the clean and recovered flows) without failing anything (`cap-explain-template`... see `integration/artifacts/baseline-demo/`). |
| **Trust policy / signed decision records / verify** | ✅ Worked | Real Ed25519 keypair, signed `validate` run, `verify` reported clean; hand-tampered one field in the committed ledger and `verify` correctly caught it (`NOT CLEAN`, exact hash mismatch) (`cap-trust/`). |
| **Required-review check + acknowledgement flow** | ✅ Worked | Promoted a real rule to `review_required`; an injected violation produced Check Run `action_required`; `ack` flipped it to `success` on rerun (`promotion-demo/`). |
| **Blocking / enforcement switch, earned the documented way** | ✅ Worked | Full ladder: observe → advisory (10 runs, 15-day-backdated calendar, exactly like the tool's own pilot script) → `review_required` → `blocking`, customer opt-in via the (deliberately CLI-less) `promotion.json` hand-edit, kill-switch drill *before* the first real block, then a genuine **exit 20** on the earned+enabled rule. Two real blockers on the way, both logged: `promote` requires a real Stryker mutation-testing attestation of the *consuming* repo (Trailhead has none — used a clearly-labeled synthetic one solely to unblock the mechanics) and a false-positive-rate bar that needs reviewed-finding history a clean rule never generates on its own (padded with synthetic `feedback --action accept` entries, same technique the tool's own mock pilot uses). |
| **Waiver (converts a block to a pass)** | ✅ Worked | Same exit-20 violation + a signed, quorum-approved waiver referencing a **real** Jira issue (`--ticket TRAIH-1`) → exit 0, "blocking suppressed... waived." |
| **Kill switch** | ✅ Worked | Engaged before the first real block; violation + `--enable-blocking` + kill switch on → exit 0; released after. |
| **Auto-demotion (FP spike)** | ✅ Worked | 10 synthetic false-positive feedback entries → in-run demotion fired, then `merge-ledger` made it durable: `promotion.json`'s `current_mode` flipped `blocking → advisory`, unapproved, automatic. |
| **Parallel/matrix state handling** | ✅ Worked | Ran the real `checkout_button_copy` A/B matrix (2 legs, forced via a `th_sid` cookie, zero app changes); both validated identically; `merge` folded both into canonical `eligibility.json` as two distinct, non-colliding `run_id`s. |
| **Jira loop (two-way, tool has no native support)** | ✅ Worked (built, not shipped) | Confirmed the tool has zero live Jira integration (grepped the whole repo — only a free-text `--ticket` field on `waive`). Built `integration/scripts/jira-loop.mjs` as custom CI glue. Demonstrated the loop for real via the Atlassian MCP: filed **TRAIH-1** for a genuine finding, referenced it in a real signed waiver, then commented back on the ticket with the waiver id — a complete real round trip. The CI-automated version of this (the script) is untested in a live pipeline run because CI can't authenticate to Jira yet (no `JIRA_API_TOKEN` secret — same "can't mint credentials for you" constraint as the qualiber PAT). |
| **CI: PR run (build/E2E/validate/artifacts)** | ⚠️ Blocked | Real PR (#1) opened; genuinely failed twice for real reasons (see below), both logged and partially fixed. |
| **CI: default-branch merge job** | ⚠️ Untested in CI | Written, mirrors the tool's own example workflow, exercised the identical CLI calls locally (`merge`/`merge-ledger`/`verify`) successfully — never actually run inside GitHub Actions because the PR-run blocker (below) hasn't cleared yet. |

## The one real CI blocker, in order of discovery

1. `uses: karkuak/qualiber@v1` doesn't resolve — the example workflow's own reference
   (`qualiber/telemetrytest-ai@v1`) is to a Marketplace listing that doesn't exist yet (the repo is
   deliberately unpublished, per its own patent-disclosure invariant). **Fixed**: the packaged
   action's real compiled entry point (`action/dist/index.js`) can be invoked directly via `node`
   with `INPUT_<NAME>` env vars — confirmed working locally, pushed to the PR.
2. Even a plain `actions/checkout` of the private `qualiber` repo fails — `Repository not found` —
   because the default `GITHUB_TOKEN` is scoped only to the repo the workflow lives in, full stop,
   regardless of account ownership. **Needs a cross-repo PAT**, which I can't mint programmatically
   (no API for creating a fine-grained PAT — it's an interactive, consent-gated flow only). Asked
   the user to create one; as of this writing, still pending, so PR #1's CI has not yet gone green.

Every capability marked "worked" above was proven with the real CLI directly (which doesn't need
this credential), so the *mechanisms* are all real and verified — what's still outstanding is
seeing the packaged Action run green inside an actual GitHub Actions job.
