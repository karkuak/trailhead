### TelemetryTest AI — No telemetry rule violations detected

| Field | Value |
| --- | --- |
| Rule | `checkout_payment_retry_sequence` |
| Journey | `checkout_payment_retry` |
| Test | `j3-checkout.spec.ts > J3 — Checkout & payment (with retry) > guest checkout succeeds on the first attempt with a good card` |
| Mode | advisory |
| CI blocking | No |
| Collector health | healthy |

> This result is advisory and is **not** a release signal.

#### Blocking firewall (ADR-002 §4)
**Decision:** suppressed (exit 0)

- `kill_switch_clear`: ✅
- `customer_enabled`: ✅
- `rule_in_blocking_state`: ❌
- `high_confidence_deterministic_violation`: ❌
- `evidence_trustworthy`: ❌
- `no_valid_waiver`: ❌

Reasons:
- auto-demotion triggered this run: rollback trigger: false-positive rate spiked (0.67 > 0.1)
- no high-severity deterministic violation decided by associated/probably_associated evidence
- run status 'clean' is not a violation verdict
- blocked finding waived by waiver:174154084a7d… (expires 2026-07-20T19:28:52.875Z, ticket TRAIH-1)
- blocked finding waived by waiver:7647ac72c995… (expires 2026-07-20T19:27:25.020Z, ticket TRAIH-DEMO)

#### Rollback advisory
- false-positive rate spiked (0.67 > 0.1)
