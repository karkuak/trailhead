### TelemetryTest AI — Deterministic telemetry rule violation detected

| Field | Value |
| --- | --- |
| Rule | `checkout_payment_retry_sequence` |
| Journey | `checkout_payment_retry` |
| Test | `j3-checkout.spec.ts > J3 — Checkout & payment (with retry) > a declined first attempt recovers cleanly on retry, and is tracked as recovered` |
| Mode | observe |
| CI blocking | No |
| Collector health | healthy |

**Findings**

- `high` **property_type_mismatch** — `order_completed`

> This result is advisory and is **not** a release signal.