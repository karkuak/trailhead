import { createHash } from "node:crypto";

export interface ExperimentDef<V extends string> {
  key: string;
  variants: readonly V[];
}

export const CHECKOUT_BUTTON_COPY = {
  key: "checkout_button_copy",
  variants: ["control", "reassuring"] as const,
} satisfies ExperimentDef<"control" | "reassuring">;

/**
 * Deterministic per-session bucketing: hash(sessionId + experimentKey) mod
 * variants.length. Same session always lands in the same variant, and
 * distribution is stable without needing a stored assignment table.
 */
export function assignVariant<V extends string>(
  sessionId: string,
  experiment: ExperimentDef<V>
): V {
  const hash = createHash("sha256").update(`${sessionId}:${experiment.key}`).digest();
  const bucket = hash.readUInt32BE(0) % experiment.variants.length;
  return experiment.variants[bucket];
}

export type CheckoutButtonCopyVariant = (typeof CHECKOUT_BUTTON_COPY.variants)[number];

export const CHECKOUT_BUTTON_COPY_LABEL: Record<CheckoutButtonCopyVariant, string> = {
  control: "Place Order",
  reassuring: "Place Order — Secure Checkout, Easy Returns",
};
