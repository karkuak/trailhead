import { beforeAll, describe, expect, it } from "vitest";
import type { recordEvent as RecordEvent, getEventsForSession as GetEventsForSession } from "@/lib/analytics-server";

let recordEvent: typeof RecordEvent;
let getEventsForSession: typeof GetEventsForSession;

beforeAll(async () => {
  process.env.TRAILHEAD_DB_PATH = ":memory:";
  const mod = await import("@/lib/analytics-server");
  recordEvent = mod.recordEvent;
  getEventsForSession = mod.getEventsForSession;
});

describe("recordEvent", () => {
  it("persists events retrievable by session, in insertion order", () => {
    const sessionId = "unit-test-session";
    recordEvent({ event: "checkout_started", sessionId, properties: { totalCents: 3400 } });
    recordEvent({ event: "payment_submitted", sessionId, properties: { attemptNumber: 1 } });
    recordEvent({ event: "payment_failed", sessionId, properties: { reason: "card_declined" } });

    const events = getEventsForSession(sessionId);
    expect(events.map((e) => e.event_name)).toEqual([
      "checkout_started",
      "payment_submitted",
      "payment_failed",
    ]);
  });

  it("never merges a failed-then-succeeded sequence into a single ambiguous event", () => {
    const sessionId = "unit-test-recovery";
    recordEvent({ event: "payment_submitted", sessionId, properties: { attemptNumber: 1 } });
    recordEvent({ event: "payment_failed", sessionId, properties: { attemptNumber: 1 } });
    recordEvent({ event: "payment_retried", sessionId, properties: {} });
    recordEvent({ event: "payment_submitted", sessionId, properties: { attemptNumber: 2 } });
    recordEvent({
      event: "order_completed",
      sessionId,
      properties: { recovered: true, attemptNumber: 2 },
    });

    const events = getEventsForSession(sessionId);
    const failedIndex = events.findIndex((e) => e.event_name === "payment_failed");
    const completedIndex = events.findIndex((e) => e.event_name === "order_completed");

    expect(failedIndex).toBeGreaterThanOrEqual(0);
    expect(completedIndex).toBeGreaterThan(failedIndex);
    expect(events.filter((e) => e.event_name === "order_completed")).toHaveLength(1);

    const completedProps = JSON.parse(events[completedIndex].properties);
    expect(completedProps.recovered).toBe(true);
  });
});
