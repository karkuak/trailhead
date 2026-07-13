import { describe, expect, it } from "vitest";
import { recordEvent, getEventsForSession } from "@/lib/analytics-server";

describe("recordEvent", () => {
  it("persists events retrievable by session, in insertion order", async () => {
    const sessionId = `unit-test-session-${crypto.randomUUID()}`;
    await recordEvent({ event: "checkout_started", sessionId, properties: { totalCents: 3400 } });
    await recordEvent({ event: "payment_submitted", sessionId, properties: { attemptNumber: 1 } });
    await recordEvent({ event: "payment_failed", sessionId, properties: { reason: "card_declined" } });

    const events = await getEventsForSession(sessionId);
    expect(events.map((e) => e.event_name)).toEqual([
      "checkout_started",
      "payment_submitted",
      "payment_failed",
    ]);
  });

  it("never merges a failed-then-succeeded sequence into a single ambiguous event", async () => {
    const sessionId = `unit-test-recovery-${crypto.randomUUID()}`;
    await recordEvent({ event: "payment_submitted", sessionId, properties: { attemptNumber: 1 } });
    await recordEvent({ event: "payment_failed", sessionId, properties: { attemptNumber: 1 } });
    await recordEvent({ event: "payment_retried", sessionId, properties: {} });
    await recordEvent({ event: "payment_submitted", sessionId, properties: { attemptNumber: 2 } });
    await recordEvent({
      event: "order_completed",
      sessionId,
      properties: { recovered: true, attemptNumber: 2 },
    });

    const events = await getEventsForSession(sessionId);
    const failedIndex = events.findIndex((e) => e.event_name === "payment_failed");
    const completedIndex = events.findIndex((e) => e.event_name === "order_completed");

    expect(failedIndex).toBeGreaterThanOrEqual(0);
    expect(completedIndex).toBeGreaterThan(failedIndex);
    expect(events.filter((e) => e.event_name === "order_completed")).toHaveLength(1);

    const completedProps = JSON.parse(events[completedIndex].properties);
    expect(completedProps.recovered).toBe(true);
  });
});
