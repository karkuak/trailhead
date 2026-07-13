import { test, expect } from "@playwright/test";
import { resetAppState, signUp, completeOnboarding, uniqueEmail } from "./helpers";

test.describe("J2 — Trial to subscription conversion", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
  });

  test("trial member views their plan and converts to paid", async ({ page }) => {
    const email = uniqueEmail("j2");
    await signUp(page, { name: "Alex Trail", email, password: "hikeitup123" });
    await completeOnboarding(page, { experience: "aspiring-regular", season: "summer" });

    await page.goto("/plan");
    await expect(page.getByTestId("current-plan-card")).toBeVisible();
    await expect(page.getByTestId("current-plan-name")).toHaveText("Trail");

    await page.getByTestId("upgrade-cta").click();
    await expect(page.getByTestId("upgrade-options")).toBeVisible();

    await page.getByTestId("confirm-upgrade-summit").click();
    await expect(page.getByTestId("conversion-success")).toBeVisible();

    const session = await page.request.get("/api/session");
    const { user } = await session.json();
    expect(user.subscriptionStatus).toBe("active");
    expect(user.plan).toBe("summit");
  });

  test("a converted member is no longer offered the trial upgrade path", async ({ page }) => {
    const email = uniqueEmail("j2-converted");
    await signUp(page, { name: "Sam Summit", email, password: "hikeitup123" });
    await completeOnboarding(page);

    await page.goto("/plan");
    await page.getByTestId("upgrade-cta").click();
    await page.getByTestId("confirm-upgrade-trail").click();
    await expect(page.getByTestId("conversion-success")).toBeVisible();

    await page.goto("/plan");
    await expect(page.getByTestId("upgrade-cta")).toHaveCount(0);
  });
});
