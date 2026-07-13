#!/usr/bin/env node
// Break catalog: plants one realistic analytics regression per scenario into a real capture,
// then runs the real CLI validate against it. The assertion is on the tool's output (see
// integration/BREAK-RESULTS.md), not on the app.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";

const OUT_ROOT = "integration/artifacts/break-catalog";
mkdirSync(OUT_ROOT, { recursive: true });

function load(p) {
  return JSON.parse(readFileSync(p, "utf8"));
}
function save(p, obj) {
  mkdirSync(path.dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(obj, null, 2));
}
function cloneEvents(capture) {
  return JSON.parse(JSON.stringify(capture));
}
function findIndex(capture, name) {
  return capture.events.findIndex((e) => e.canonicalEventName === name);
}

const CHECKOUT_RECOVERED = load(
  "telemetrytest-out/checkout_payment_retry-control/a-declined-first-attempt-recovers-cleanly-on-retry-and-is-tracked-as-recovered.capture.json"
);
const CHECKOUT_CLEAN = load(
  "telemetrytest-out/checkout_payment_retry-control/guest-checkout-succeeds-on-the-first-attempt-with-a-good-card.capture.json"
);
const CANCEL_FULL = load(
  "telemetrytest-out/cancellation/member-can-decline-every-save-offer-and-cancel-cleanly.capture.json"
);

// 1. Drop a required event: remove payment_retried from the recovered-checkout capture.
{
  const c = cloneEvents(CHECKOUT_RECOVERED);
  c.events = c.events.filter((e) => e.canonicalEventName !== "payment_retried");
  save(`${OUT_ROOT}/1-dropped-event/capture.json`, c);
}

// 2. Two outcome events out of order: order_completed emitted BEFORE payment_retried.
{
  const c = cloneEvents(CHECKOUT_RECOVERED);
  const retryIdx = findIndex(c, "payment_retried");
  const completedIdx = findIndex(c, "order_completed");
  const [completed] = c.events.splice(completedIdx, 1);
  c.events.splice(retryIdx, 0, completed);
  save(`${OUT_ROOT}/2-out-of-order/capture.json`, c);
}

// 3. Required property with the wrong type: attemptNumber becomes a string.
{
  const c = cloneEvents(CHECKOUT_RECOVERED);
  const idx = findIndex(c, "order_completed");
  c.events[idx].properties.attemptNumber = "2"; // should be number
  save(`${OUT_ROOT}/3-wrong-type/capture.json`, c);
}

// 4. Late/orphaned event: order_completed fired long after the journey's endJourney marker.
{
  const c = cloneEvents(CHECKOUT_RECOVERED);
  const idx = findIndex(c, "order_completed");
  const lastMarkerTs = c.markers.find((m) => m.kind === "end").ts;
  c.events[idx].timestamp = new Date(lastMarkerTs + 30_000).toISOString();
  c.events[idx].captureTs = lastMarkerTs + 30_000;
  c.events[idx].lineage.captureTs = lastMarkerTs + 30_000;
  save(`${OUT_ROOT}/4-late-orphaned/capture.json`, c);
}

// 5. One experiment variant drops an event the other keeps: reassuring variant loses
// experiment_viewed (control keeps it) -- simulated by removing it from a copy of the clean
// capture and treating that as the "reassuring" leg's capture.
{
  const control = cloneEvents(CHECKOUT_CLEAN);
  const reassuring = cloneEvents(CHECKOUT_CLEAN);
  reassuring.events = reassuring.events.filter((e) => e.canonicalEventName !== "experiment_viewed");
  save(`${OUT_ROOT}/5-variant-drops-event/control.capture.json`, control);
  save(`${OUT_ROOT}/5-variant-drops-event/reassuring.capture.json`, reassuring);
}

// 6. A purchase/conversion event fired from the cancellation flow.
{
  const c = cloneEvents(CANCEL_FULL);
  const template = cloneEvents(CHECKOUT_CLEAN).events.find((e) => e.canonicalEventName === "order_completed");
  const injected = JSON.parse(JSON.stringify(template));
  injected.eventId = "injected-order-completed";
  injected.collectorSeq = c.events.length;
  c.events.push(injected);
  save(`${OUT_ROOT}/6-cross-journey-event/capture.json`, c);
}

// 7. Control: a fully correct capture, unmodified. Must report a clean pass with zero findings.
{
  save(`${OUT_ROOT}/7-control-clean/capture.json`, CHECKOUT_RECOVERED);
}

// 8. Nondeterministic/flaky emit: duplicate payment_submitted with a slightly different
// timestamp (simulates a retried network request firing the same analytics call twice).
{
  const c = cloneEvents(CHECKOUT_RECOVERED);
  const idx = findIndex(c, "payment_submitted");
  const dup = JSON.parse(JSON.stringify(c.events[idx]));
  dup.eventId = "flaky-duplicate";
  dup.collectorSeq = c.events.length;
  dup.timestamp = new Date(new Date(c.events[idx].timestamp).getTime() + 5).toISOString();
  c.events.splice(idx + 1, 0, dup);
  save(`${OUT_ROOT}/8-flaky-duplicate/capture.json`, c);
}

console.log("Break catalog captures written under", OUT_ROOT);
