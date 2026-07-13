import { test, expect } from "@playwright/test";
import { resetAppState, uniqueEmail } from "./helpers";

async function addHeadlampToCart(page: import("@playwright/test").Page) {
  await page.goto("/shop");
  await page.getByTestId("add-to-cart-trailbeam-headlamp").click();
  await page.goto("/checkout");
}

test.describe("J3 — Checkout & payment (with retry)", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
  });

  test("guest checkout succeeds on the first attempt with a good card", async ({ page }) => {
    await addHeadlampToCart(page);

    await page.getByTestId("checkout-guest-email").fill(uniqueEmail("guest"));
    await page.getByTestId("checkout-card-number").fill("4242424242424242");
    await page.getByTestId("checkout-submit").click();

    await expect(page.getByTestId("order-success")).toBeVisible();
    // A clean success must never carry the "recovered" note.
    await expect(page.getByTestId("order-recovered-note")).toHaveCount(0);
  });

  test("a declined first attempt recovers cleanly on retry, and is tracked as recovered", async ({
    page,
  }) => {
    await addHeadlampToCart(page);

    await page.getByTestId("checkout-guest-email").fill(uniqueEmail("guest-retry"));
    await page.getByTestId("checkout-card-number").fill("4000000000000002");
    await page.getByTestId("checkout-submit").click();

    await expect(page.getByTestId("payment-error")).toBeVisible();
    await expect(page.getByTestId("checkout-submit")).toHaveText("Retry Payment");

    // Retry with the same card — the second attempt on the same order succeeds.
    await page.getByTestId("checkout-submit").click();

    await expect(page.getByTestId("order-success")).toBeVisible();
    await expect(page.getByTestId("order-recovered-note")).toBeVisible();
  });

  test("a permanently invalid card fails without ever completing the order", async ({ page }) => {
    await addHeadlampToCart(page);

    await page.getByTestId("checkout-guest-email").fill(uniqueEmail("guest-bad-card"));
    await page.getByTestId("checkout-card-number").fill("1111111111111111");
    await page.getByTestId("checkout-submit").click();

    await expect(page.getByTestId("payment-error")).toBeVisible();
    await expect(page.getByTestId("order-success")).toHaveCount(0);
  });

  test("the checkout button reflects the checkout_button_copy experiment deterministically", async ({
    page,
  }) => {
    await addHeadlampToCart(page);
    const firstLabel = await page.getByTestId("checkout-submit").textContent();

    await page.reload();
    const secondLabel = await page.getByTestId("checkout-submit").textContent();

    // Same session -> same bucket -> same button copy every time.
    expect(firstLabel).toBe(secondLabel);
    expect(["Place Order", "Place Order — Secure Checkout, Easy Returns"]).toContain(firstLabel);
  });
});
