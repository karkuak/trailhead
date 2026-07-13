import type { Page } from "@playwright/test";

export async function resetAppState(page: Page) {
  await page.request.post("/api/test/reset");
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
