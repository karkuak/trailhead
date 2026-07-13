import { randomUUID } from "node:crypto";
import { db } from "./db";

export interface TrackedEvent {
  event: string;
  userId?: string | null;
  sessionId: string;
  properties?: Record<string, unknown>;
}

const insertEvent = db.prepare(
  `INSERT INTO events (id, event_name, user_id, session_id, properties, created_at)
   VALUES (@id, @event_name, @user_id, @session_id, @properties, @created_at)`
);

/**
 * Single ingestion point for every analytics event in the app. This stands in
 * for "forward to the warehouse" in v1: it persists the row (so tests and the
 * tracking-plan docs can assert on it) and logs a structured line to stdout.
 */
export function recordEvent(evt: TrackedEvent) {
  const row = {
    id: randomUUID(),
    event_name: evt.event,
    user_id: evt.userId ?? null,
    session_id: evt.sessionId,
    properties: JSON.stringify(evt.properties ?? {}),
    created_at: new Date().toISOString(),
  };
  insertEvent.run(row);
  console.log(
    `[analytics] ${row.event_name}`,
    JSON.stringify({
      userId: row.user_id,
      sessionId: row.session_id,
      properties: evt.properties ?? {},
    })
  );
  return row;
}

export function getEventsForSession(sessionId: string) {
  return db
    .prepare(
      `SELECT event_name, user_id, session_id, properties, created_at
       FROM events WHERE session_id = ? ORDER BY created_at ASC, rowid ASC`
    )
    .all(sessionId) as Array<{
    event_name: string;
    user_id: string | null;
    session_id: string;
    properties: string;
    created_at: string;
  }>;
}
