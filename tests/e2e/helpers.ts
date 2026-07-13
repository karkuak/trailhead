import type { Page } from "@playwright/test";

export async function resetAppState(page: Page) {
  await page.request.post("/api/test/reset");
}

/**
 * Forces the checkout_button_copy experiment bucket for CI's matrix run by pre-seeding the
 * th_sid cookie with a session id known to hash to the requested variant (proxy.ts only sets
 * th_sid when absent, so pre-setting it here sticks). Set via E2E_FORCE_SESSION_ID so the same
 * spec produces a capture per matrix leg without any app code changes.
 */
export async function forceExperimentSessionFromEnv(page: Page) {
  const sessionId = process.env.E2E_FORCE_SESSION_ID;
  if (!sessionId) return;
  await page.context().addCookies([
    { name: "th_sid", value: sessionId, url: "http://localhost:3100" },
  ]);
}

export function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
}

export async function signUp(
  page: Page,
  { name, email, password }: { name: string; email: string; password: string }
) {
  await page.goto("/signup");
  await page.getByTestId("signup-name").fill(name);
  await page.getByTestId("signup-email").fill(email);
  await page.getByTestId("signup-password").fill(password);
  await page.getByTestId("signup-submit").click();
  await page.waitForURL("**/onboarding");
}

export async function completeOnboarding(
  page: Page,
  {
    experience = "aspiring-regular",
    goals = "A few weekend trips this year.",
    season = "fall",
  }: { experience?: "first-timer" | "aspiring-regular" | "committed-weekender"; goals?: string; season?: string } = {}
) {
  await page.getByTestId(`experience-${experience}`).check();
  await page.getByTestId("onboarding-goals").fill(goals);
  await page.getByTestId(`season-${season}`).click();
  await page.getByTestId("onboarding-submit").click();
  await page.getByTestId("plan-preview").waitFor();
}
