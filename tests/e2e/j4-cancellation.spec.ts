import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { test, expect } from "./telemetrytest-fixture";
import { resetAppState, signUp, completeOnboarding, uniqueEmail } from "./helpers";

const CAPTURE_DIR = path.join("telemetrytest-out", "cancellation");

async function becomeActiveMember(
  page: import("@playwright/test").Page,
  plan: "trail" | "summit" = "summit"
) {
  const email = uniqueEmail("j4");
  await signUp(page, { name: "Casey Camper", email, password: "hikeitup123" });
  await completeOnboarding(page);
  await page.goto("/plan");
  await page.getByTestId("upgrade-cta").click();
  await page.getByTestId(`confirm-upgrade-${plan}`).click();
  await expect(page.getByTestId("conversion-success")).toBeVisible();
}

test.describe("J4 — Cancellation", () => {
  // startJourney is called inside each test body (after becomeActiveMember setup), not here --
  // that setup performs a real J2 upgrade, and a describe-level beforeEach would sweep its
  // trial_converted event into the cancellation capture, tripping the contract's forbidden_events
  // check on telemetry that isn't actually part of this journey (see FRICTION-LOG.md Step 4).
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
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

  test("member can pause instead of cancelling, and account stays active", async ({
    page,
    telemetryTest,
  }) => {
    await becomeActiveMember(page, "summit");
    await telemetryTest.startJourney("cancellation");

    await page.goto("/account/subscription");
    await page.getByTestId("start-cancellation").click();
    await expect(page.getByTestId("save-offer")).toBeVisible();

    await page.getByTestId("accept-pause").click();
    await expect(page.getByTestId("save-accepted")).toBeVisible();

    const session = await page.request.get("/api/session");
    const { user } = await session.json();
    expect(user.subscriptionStatus).toBe("paused");
    expect(user.canceledAt).toBeNull();
  });

  test("member can downgrade instead of cancelling", async ({ page, telemetryTest }) => {
    await becomeActiveMember(page, "summit");
    await telemetryTest.startJourney("cancellation");

    await page.goto("/account/subscription");
    await page.getByTestId("start-cancellation").click();
    await page.getByTestId("accept-downgrade").click();
    await expect(page.getByTestId("save-accepted")).toBeVisible();

    const session = await page.request.get("/api/session");
    const { user } = await session.json();
    expect(user.plan).toBe("trail");
    expect(user.subscriptionStatus).toBe("active");
    expect(user.canceledAt).toBeNull();
  });

  test("member can decline every save offer and cancel cleanly", async ({ page, telemetryTest }) => {
    await becomeActiveMember(page, "trail");
    await telemetryTest.startJourney("cancellation");

    await page.goto("/account/subscription");
    await page.getByTestId("start-cancellation").click();
    await expect(page.getByTestId("save-offer")).toBeVisible();

    // The decline path must be a plain, equally visible option -- no dark patterns.
    await expect(page.getByTestId("confirm-cancel")).toBeVisible();
    await page.getByTestId("confirm-cancel").click();

    await expect(page.getByTestId("cancellation-complete")).toBeVisible();

    const session = await page.request.get("/api/session");
    const { user } = await session.json();
    expect(user.subscriptionStatus).toBe("canceled");
    expect(user.canceledAt).not.toBeNull();
  });
});
