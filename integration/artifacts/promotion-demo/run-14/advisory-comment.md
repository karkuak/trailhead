<!-- telemetrytest-ai-advisory-checkout_payment_retry -->
## TelemetryTest AI — Advisory (Journey: checkout_payment_retry)

Found possible tracking issues for the checkout_payment_retry journey — review below before merging (does not block this build).

<details>
<summary>Technical Statistics</summary>

- **Run status:** rule_violation_detected · **VQS:** Strong (cold start — insufficient observation history) · **Mode:** advisory (CI not affected)
- **Collector health:** healthy · Coverage: 100%
- **Association:** Confidence: 6 high, 0 medium, 0 low, 0 unknown
</details>

### Findings (1 finding)

| Event | Finding | Severity | Association |
|-------|---------|----------|-------------|
| order_completed | missing_required_event | high | high |

### Known unknowns
- experiment_viewed
- page_viewed
- product_added_to_cart

---
*Advisory only — deterministic rules, human approved. Exit code: 0. No CI impact.*
*Run: `local` · Pack: `evp_51722475fec8` · [Feedback guide](docs/process/validation.md)*
