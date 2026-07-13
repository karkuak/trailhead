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