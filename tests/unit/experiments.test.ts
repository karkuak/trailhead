import { describe, expect, it } from "vitest";
import { assignVariant, CHECKOUT_BUTTON_COPY } from "@/lib/experiments";

describe("assignVariant", () => {
  it("is deterministic for the same session and experiment", () => {
    const sessionId = "session-abc-123";
    const first = assignVariant(sessionId, CHECKOUT_BUTTON_COPY);
    const second = assignVariant(sessionId, CHECKOUT_BUTTON_COPY);
    expect(first).toBe(second);
  });

  it("only ever returns a defined variant", () => {
    for (let i = 0; i < 50; i++) {
      const variant = assignVariant(`session-${i}`, CHECKOUT_BUTTON_COPY);
      expect(CHECKOUT_BUTTON_COPY.variants).toContain(variant);
    }
  });

  it("distributes across both variants over many sessions", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      seen.add(assignVariant(`session-${i}`, CHECKOUT_BUTTON_COPY));
    }
    expect(seen.size).toBe(CHECKOUT_BUTTON_COPY.variants.length);
  });

  it("gives different experiments independent bucketing for the same session", () => {
    const sessionId = "session-xyz";
    const otherExperiment = { key: "unrelated_experiment", variants: ["a", "b", "c"] as const };
    const variant1 = assignVariant(sessionId, CHECKOUT_BUTTON_COPY);
    const variant2 = assignVariant(sessionId, otherExperiment);
    // Not asserting inequality (could coincidentally collide), just that both resolve validly.
    expect(CHECKOUT_BUTTON_COPY.variants).toContain(variant1);
    expect(otherExperiment.variants).toContain(variant2);
  });
});
