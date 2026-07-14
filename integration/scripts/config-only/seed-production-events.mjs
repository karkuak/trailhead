// Stand-in for production/CI traffic — NOT part of the config-only capture.
//
// This generator writes checkout-journey analytics rows into the `events` table using the
// EXACT schema and INSERT that the app's own ingestion uses (src/lib/db.ts SCHEMA_SQL +
// src/lib/analytics-server.ts recordEvent). In production these rows are written by real
// users hitting POST /api/track; here we materialize equivalent rows so the config-only
// warehouse read (warehouse-capture.mjs) has something to read. It touches NO app or test
// code — it is a new integration script.
//
// Usage: DATABASE_URL=postgres://postgres@localhost:5432/db node seed-production-events.mjs
import { randomUUID } from "node:crypto";
import pg from "pg";

// Verbatim from src/lib/db.ts (events table) — the app's real schema.
const EVENTS_DDL = `
CREATE TABLE IF NOT EXISTS events (
  seq BIGSERIAL PRIMARY KEY,
  id TEXT UNIQUE NOT NULL,
  event_name TEXT NOT NULL,
  user_id TEXT,
  session_id TEXT NOT NULL,
  properties TEXT NOT NULL,
  created_at TEXT NOT NULL
);`;

// Mirrors src/lib/analytics-server.ts recordEvent() exactly (INSERT columns + JSON props).
async function recordEvent(client, evt, createdAt) {
  await client.query(
    `INSERT INTO events (id, event_name, user_id, session_id, properties, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [randomUUID(), evt.event, evt.userId ?? null, evt.sessionId, JSON.stringify(evt.properties ?? {}), createdAt],
  );
}

/** The three real checkout variants (from the tracking plan / existing captures). */
function sessionEvents(variant) {
  const base = [
    ["page_viewed", { page: "checkout" }],
    ["product_added_to_cart", { itemCount: 1 }],
    ["checkout_started", { itemCount: 1, totalCents: 4999 }],
  ];
  if (variant === "recovered") {
    return [
      ...base,
      ["payment_submitted", { attemptNumber: 1 }],
      ["payment_failed", { attemptNumber: 1, reason: "card_declined" }],
      ["payment_retried", { previousAttempt: 1 }],
      ["payment_submitted", { attemptNumber: 2 }],
      ["order_completed", { totalCents: 4999, recovered: true, attemptNumber: 2 }],
    ];
  }
  if (variant === "permanent_decline") {
    return [
      ...base,
      ["payment_submitted", { attemptNumber: 1 }],
      ["payment_failed", { attemptNumber: 1, reason: "card_declined" }],
      ["payment_retried", { previousAttempt: 1 }],
      ["payment_submitted", { attemptNumber: 2 }],
      ["payment_failed", { attemptNumber: 2, reason: "card_declined" }],
    ];
  }
  // guest_success
  return [
    ...base,
    ["payment_submitted", { attemptNumber: 1 }],
    ["order_completed", { totalCents: 4999, recovered: false, attemptNumber: 1 }],
  ];
}

const PLAN = [
  ["recovered", "sess_recovered_1"],
  ["recovered", "sess_recovered_2"],
  ["permanent_decline", "sess_permdecline_1"],
  ["guest_success", "sess_guest_1"],
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  await client.query(EVENTS_DDL);

  // A deterministic window so the read window is stable for the capture step.
  const windowStart = Date.parse("2026-07-14T12:00:00.000Z");
  let offset = 0;
  for (const [variant, sessionId] of PLAN) {
    for (const [event, properties] of sessionEvents(variant)) {
      const createdAt = new Date(windowStart + offset * 1000).toISOString();
      await recordEvent(client, { event, userId: null, sessionId, properties }, createdAt);
      offset += 1;
    }
    offset += 5; // gap between sessions
  }
  const { rows } = await client.query("SELECT count(*)::int AS n FROM events");
  console.log(`seeded ${rows[0].n} events across ${PLAN.length} checkout sessions`);
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
