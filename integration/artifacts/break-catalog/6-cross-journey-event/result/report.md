### TelemetryTest AI — Deterministic telemetry rule violation detected

| Field | Value |
| --- | --- |
| Rule | `cancellation_sequence` |
| Journey | `cancellation` |
| Test | `j4-cancellation.spec.ts > J4 — Cancellation > member can decline every save offer and cancel cleanly` |
| Mode | observe |
| CI blocking | No |
| Collector health | healthy |

**Findings**

- `high` **forbidden_event_observed** — `order_completed`
  - occurrences: 1 (first injected-order-completed, last injected-order-completed)
  - forbidden event observed

**Excluded candidates** (not counted toward rules)

- late: onboarding_completed, plan_preview_viewed, plan_viewed, upgrade_started, trial_converted

> This result is advisory and is **not** a release signal.