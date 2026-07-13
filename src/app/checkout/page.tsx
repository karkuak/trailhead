import { getAnalyticsSessionId } from "@/lib/auth";
import { assignVariant, CHECKOUT_BUTTON_COPY } from "@/lib/experiments";
import { CheckoutForm } from "./CheckoutForm";

export default async function CheckoutPage() {
  const sessionId = await getAnalyticsSessionId();
  const variant = assignVariant(sessionId, CHECKOUT_BUTTON_COPY);

  return <CheckoutForm variant={variant} />;
}
