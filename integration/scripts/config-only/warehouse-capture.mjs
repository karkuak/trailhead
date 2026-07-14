// Config-only warehouse telemetry capture for checkout_payment_retry.
//
// THIS is the config-only mechanism (design doc: config-only-telemetry-ingestion.md §9.1):
// a READ-ONLY warehouse read grant (no app/test code edit), reading already-persisted
// analytics rows by journey + time window, grouping by session_id, and validating each
// session's journey shape. It carries only session-grade signals — no test id / browser
// context / worker index — so its attribution is session-correlated, not test-identified.
//
// It emits a config-only EXECUTION section (with the `config_only_telemetry` attestation)
// merged into the existing config-only (jira/github) evidence package. The honest fidelity
// CAP is applied downstream by the TelemetryTest scorer, which reads that attestation.
//
// Usage:
//   DATABASE_URL_READONLY=postgres://configonly_reader@localhost:5432/db \
//   node warehouse-capture.mjs \
//     --contract integration/contracts/checkout_payment_retry.contract.json \
//     --base integration/artifacts/brief-review-rerun/evidence-in/checkout_payment_retry.gt.json \
//     --window-from 2026-07-14T11:59:00.000Z --window-to 2026-07-14T13:00:00.000Z \
//     --out integration/artifacts/config-only/evidence-in/checkout_payment_retry.gt.json
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import pg from "pg";

function flag(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

/** Greedy subsequence match of a session's ordered event names to the expected path. */
function matchJourneyShape(orderedNames, expectedPath, optionalEvents) {
  const optional = new Set(optionalEvents ?? []);
  let ei = 0;
  let matchedCount = 0;
  for (const name of orderedNames) {
    // Skip optional expected events this row doesn't satisfy, so a clean session can still
    // match a later REQUIRED event (e.g. guest success skipping payment_failed/retried).
    while (ei < expectedPath.length && name !== expectedPath[ei] && optional.has(expectedPath[ei])) {
      ei += 1;
    }
    if (ei < expectedPath.length && name === expectedPath[ei]) {
      matchedCount += 1;
      ei += 1;
    }
  }
  let matched = true;
  for (let k = ei; k < expectedPath.length; k += 1) {
    if (!optional.has(expectedPath[k])) {
      matched = false;
      break;
    }
  }
  return { matched, matchedCount };
}

async function main() {
  const contractPath = flag("--contract", "integration/contracts/checkout_payment_retry.contract.json");
  const basePath = flag("--base", "integration/artifacts/brief-review-rerun/evidence-in/checkout_payment_retry.gt.json");
  const windowFrom = flag("--window-from", "2026-07-14T11:59:00.000Z");
  const windowTo = flag("--window-to", "2026-07-14T13:00:00.000Z");
  const outPath = flag("--out", "integration/artifacts/config-only/evidence-in/checkout_payment_retry.gt.json");

  const contract = JSON.parse(readFileSync(contractPath, "utf8"));
  const base = JSON.parse(readFileSync(basePath, "utf8"));
  const expectedPath = contract.expected_path;
  const optionalEvents = contract.optional_events ?? [];

  // Least-privilege, read-only connection (§9.3). Prefer the read-only role if provided.
  const url = process.env.DATABASE_URL_READONLY ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL_READONLY (or DATABASE_URL) is required");
  const client = new pg.Client({ connectionString: url });
  await client.connect();

  // Config-only read: by time window, ordered by store seq. NO session id is supplied
  // (that would be a per-run join / test touch, §9.1) — we group after reading.
  const { rows } = await client.query(
    `SELECT seq, id, event_name, session_id, properties, created_at
       FROM events
      WHERE created_at >= $1 AND created_at <= $2
      ORDER BY seq ASC`,
    [windowFrom, windowTo],
  );
  await client.end();

  // Group by session; keep only sessions that entered the journey (checkout_started).
  const anchor = expectedPath[0];
  const bySession = new Map();
  for (const r of rows) {
    const list = bySession.get(r.session_id) ?? [];
    list.push(r);
    bySession.set(r.session_id, list);
  }

  let observedSessions = 0;
  let matchedSessions = 0;
  const sessionSummaries = [];
  for (const [sessionId, evs] of [...bySession.entries()].sort()) {
    const names = evs.map((e) => e.event_name);
    if (!names.includes(anchor)) continue; // not a checkout-journey session
    observedSessions += 1;
    const { matched, matchedCount } = matchJourneyShape(names, expectedPath, optionalEvents);
    if (matched) matchedSessions += 1;
    sessionSummaries.push({ sessionId, eventCount: evs.length, journeyShapeMatched: matched, matchedPathEvents: matchedCount });
  }

  // Honest config-only EXECUTION section. NO linked_telemetrytest_run (that is test-grade).
  const execution = {
    execution_evidence_version: "1.0",
    execution_id: "trailhead-j3-config-only-warehouse",
    collector_health: { health: "partial" }, // config-only is never `healthy`
    deterministic_findings: [
      {
        finding_id: "trailhead-j3-config-only-observed",
        rule_id: contract.rule_id,
        outcome: "advisory_warning_only",
        severity: "info",
        message: `checkout_payment_retry sequence observed config-only across ${matchedSessions}/${observedSessions} warehouse sessions (session-correlated attribution).`,
        refs: ["warehouse:events (read-only)"],
      },
    ],
    config_only_telemetry: {
      source_type: "warehouse_telemetry",
      attribution: "session_correlated",
      config_only: true,
      max_association_band: "probably_associated",
      temporal_relation: "observed_production_path",
      observed_journey_instances: observedSessions,
      journey_shape_matched_instances: matchedSessions,
      window: { from: windowFrom, to: windowTo },
    },
    refs: ["warehouse:events (read-only)", `sessions:${observedSessions}`],
  };

  const pack = { ...base, execution };
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(pack, null, 2) + "\n");

  console.log(JSON.stringify({ observedSessions, matchedSessions, sessions: sessionSummaries, out: outPath }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
