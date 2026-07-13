import { test, expect } from "@playwright/test";
import { resetAppState, signUp, completeOnboarding, uniqueEmail } from "./helpers";

test.describe("J1 — Signup & onboarding", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
  });

  test("creates an account and previews a personalized plan", async ({ page }) => {
    const email = uniqueEmail("j1");

    await signUp(page, { name: "Jamie Rivers", email, password: "hikeitup123" });

    // Account exists and trial has started.
    const session = await page.request.get("/api/session");
    const { user } = await session.json();
    expect(user).not.toBeNull();
    expect(user.subscriptionStatus).toBe("trialing");
    expect(user.onboardingCompletedAt).toBeNull();

    await completeOnboarding(page, {
      experience: "committed-weekender",
      goals: "Fall backpacking trip and monthly weekend hikes.",
      season: "fall",
    });

    // A committed-weekender is suggested Summit.
    await expect(page.getByTestId("plan-preview-name")).toHaveText("Summit");

    const sessionAfter = await page.request.get("/api/session");
    const { user: userAfter } = await sessionAfter.json();
    expect(userAfter.onboardingCompletedAt).not.toBeNull();
    expect(userAfter.plan).toBe("summit");

    await page.getByTestId("go-to-plan").click();
    await page.waitForURL("**/plan");
    await expect(page.getByTestId("current-plan-name")).toHaveText("Summit");
  });

  test("rejects a duplicate signup email", async ({ page }) => {
    const email = uniqueEmail("j1-dup");
    await signUp(page, { name: "First User", email, password: "hikeitup123" });

    await page.goto("/signup");
    await page.getByTestId("signup-name").fill("Second User");
    await page.getByTestId("signup-email").fill(email);
    await page.getByTestId("signup-password").fill("anotherpassword");
    await page.getByTestId("signup-submit").click();

    await expect(page.getByTestId("signup-error")).toBeVisible();
  });
});
