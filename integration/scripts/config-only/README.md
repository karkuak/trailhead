# Config-only warehouse telemetry capture — `checkout_payment_retry`

Obtains the checkout journey's execution/telemetry evidence **config-only** — no edits to
Trailhead's application or test code — so the Phase 3 anchor's telemetry `evidence_source`
can honestly be `config_only: true` with `source_type: warehouse_telemetry`.

See the TelemetryTest design record:
`docs/phases/phase-3/design/config-only-telemetry-ingestion.md` (branch
`feat/config-only-telemetry`).

## Why warehouse-first (and not a network proxy)

Every analytics event already persists **server-side** to the Postgres `events` table
(`src/lib/analytics-server.ts` — *"stands in for 'forward to the warehouse'"*). So a
**read-only grant on that table** captures the journey config-only and **sidesteps the RF-5
`sendBeacon` gap entirely**: transport (`sendBeacon` vs `fetch`) is irrelevant once events
are read from the store instead of intercepted on the wire.

The webhook mode was rejected (the analytics URL `"/api/track"` is hardcoded — repointing
needs an app edit) and the network-proxy mode was rejected (strictly dominated; only sees
CI traffic; fights RF-5).

## Honest fidelity (not test-grade)

A warehouse row carries only `session_id`, `event_name`, `created_at`/`seq`, `properties` —
**no** test id / browser context / worker index. Attribution is therefore
**session-correlated, not test-identified**: the ingesting adapter is structurally capped at
`probably_associated` (medium), and the TelemetryTest sufficiency scorer caps
`execution_validation` / `telemetry_control_claim` at `usable`. The brief carries the
known-unknown *"observed production-path telemetry, temporally decoupled from the change
under review."* Per §9.1 the read is **by journey + time window, grouped by `session_id`** —
it never requires a specific run's session id (that would be a test touch).

## Least-privilege grant (§9.3)

This partner's "warehouse" is the app's own Postgres. The grant is **read-only, `events`
table only** — recorded in the anchor's `data_approval_ref`:

```sql
CREATE ROLE configonly_reader LOGIN;
GRANT CONNECT ON DATABASE <db> TO configonly_reader;
GRANT USAGE ON SCHEMA public TO configonly_reader;
GRANT SELECT ON TABLE events TO configonly_reader;   -- INSERT/UPDATE/DELETE NOT granted
```

## Files

- `warehouse-capture.mjs` — **the config-only capture.** Read-only `SELECT` from `events`
  by time window, group by `session_id`, journey-shape match against the tracking-rule
  contract, emit a config-only execution evidence package. Touches no app/test code.
- `seed-production-events.mjs` — a stand-in for real production/CI traffic (NOT part of the
  capture). Writes checkout events via the app's exact schema + `recordEvent` INSERT, so the
  warehouse has rows to read. In production these rows come from real users hitting
  `POST /api/track`.

## Run

```bash
# 1. (demo only) materialize production-equivalent rows
DATABASE_URL=postgres://…/db node integration/scripts/config-only/seed-production-events.mjs

# 2. config-only capture (read-only role)
DATABASE_URL_READONLY=postgres://configonly_reader@…/db \
  node integration/scripts/config-only/warehouse-capture.mjs \
  --window-from 2026-07-14T11:59:00.000Z --window-to 2026-07-14T13:00:00.000Z \
  --out integration/artifacts/config-only/evidence-in/checkout_payment_retry.gt.json

# 3. run the brief (TelemetryTest CLI) — brief is honestly fidelity-capped
telemetrytest phase2 run \
  --evidence-dir integration/artifacts/config-only/evidence-in \
  --artifact-dir <out> --journey checkout_payment_retry
```

**Proof of config-only:** `git status` shows only new `integration/` files — **no `src/`
and no `tests/*.spec.ts` changes.**
