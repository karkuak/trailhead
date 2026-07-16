// Break scenario #2 — out-of-order outcome events, regenerated as a REAL browser run.
//
// The original catalog entry (integration/scripts/run-break-catalog.mjs, scenario 2) only
// respliced the events ARRAY of the recovered-checkout capture, leaving relTs/collectorSeq
// intact — and the validator canonically re-sorts every capture by relTs → collectorSeq → …
// (src/util/ordering.ts), so that capture was event-identical to the clean control after the
// sort. It measured sort-invariance, not out-of-order detection. Same trap #4 hit with
// hand-edited timestamps; same fix: produce the capture from a real run instead.
//
// This spec drives the exact recovered-checkout flow against a planted app-side regression
// (branch break-scenario/2-out-of-order): CheckoutForm defers the payment_retried track call
// until the recovered confirmation renders, so on the real timeline order_completed genuinely
// fires BEFORE payment_retried. The UI assertions still pass — only analytics ordering breaks,
// which is exactly what the tool, not the test, is supposed to catch. Run on a healthy branch
// this spec still passes and simply produces an in-order (clean) capture.
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { test, expect } from "../telemetrytest-fixture";
import { resetAppState, uniqueEmail, forceExperimentSessionFromEnv } from "../helpers";

const CAPTURE_DIR = path.join("telemetrytest-out", "break-scenarios");

test.describe("Break #2 — order_completed fires before payment_retried (real run)", () => {
  test.beforeEach(async ({ page, telemetryTest }) => {
    await forceExperimentSessionFromEnv(page);
    await resetAppState(page);
    await telemetryTest.startJourney("checkout_payment_retry");
  });

  test.afterEach(async ({ telemetryTest }, testInfo) => {
    await telemetryTest.endJourney();
    mkdirSync(CAPTURE_DIR, { recursive: true });
    const safeName = testInfo.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    writeFileSync(
      path.join(CAPTURE_DIR, `${safeName}.capture.json`),
      JSON.stringify(telemetryTest.getCapture(), null, 2)
    );
  });

  test("declined first attempt recovers on retry (regression emits retry tracking late)", async ({
    page,
  }) => {
    await page.goto("/shop");
    await page.getByTestId("add-to-cart-trailbeam-headlamp").click();
    await page.goto("/checkout");

    await page.getByTestId("checkout-guest-email").fill(uniqueEmail("guest-retry"));
    await page.getByTestId("checkout-card-number").fill("4000000000000002");
    await page.getByTestId("checkout-submit").click();

    await expect(page.getByTestId("payment-error")).toBeVisible();
    await expect(page.getByTestId("checkout-submit")).toHaveText("Retry Payment");

    // The retry's payment_retried beacon must have left the page before afterEach ends the
    // journey — on the regressed branch it is deferred to the confirmation render, so wait for
    // the actual /api/track request rather than only the UI. (On a healthy branch it fires on
    // the click itself, so this resolves immediately there too.)
    const retryBeacon = page.waitForRequest(
      (r) => r.url().includes("/api/track") && (r.postData() ?? "").includes('"payment_retried"')
    );
    await page.getByTestId("checkout-submit").click();

    await expect(page.getByTestId("order-success")).toBeVisible();
    await expect(page.getByTestId("order-recovered-note")).toBeVisible();
    await retryBeacon;
  });
});
