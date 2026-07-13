### TelemetryTest AI — Deterministic telemetry rule violation detected

| Field | Value |
| --- | --- |
| Rule | `checkout_payment_retry_sequence` |
| Journey | `checkout_payment_retry` |
| Test | `j3-checkout.spec.ts > J3 — Checkout & payment (with retry) > a permanently invalid card fails without ever completing the order` |
| Mode | advisory |
| CI blocking | No |
| Collector health | healthy |

**Findings**

- `high` **missing_required_event** — `order_completed`
  - expected: `checkout_started → payment_submitted → payment_failed → payment_retried → order_completed`
  - observed: `checkout_started → payment_submitted → payment_failed`
  - no eligible occurrence observed

> This result is advisory and is **not** a release signal.

#### Eligibility gate: not yet eligible for advisory comments
Failed criteria: insufficient_observe_runs, vqs_below_usable, capture_coverage_low, high_medium_ratio_low, missing_human_approvals
- Consecutive observe runs: 0
- Min VQS band: Insufficient · avg coverage: 0.00 · avg high+medium: 0.00 · FP rate: 0.00
- Human approvals complete: No
