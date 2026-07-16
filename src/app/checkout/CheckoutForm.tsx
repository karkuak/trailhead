"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { useSession } from "@/components/SessionProvider";
import { analytics } from "@/lib/analytics-client";
import { CHECKOUT_BUTTON_COPY_LABEL, type CheckoutButtonCopyVariant } from "@/lib/experiments";

type Variant = CheckoutButtonCopyVariant;

export function CheckoutForm({ variant }: { variant: Variant }) {
  const { items, totalCents, clear } = useCart();
  const { user } = useSession();
  const [cardNumber, setCardNumber] = useState("4242 4242 4242 4242");
  const [guestEmail, setGuestEmail] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<"idle" | "submitting" | "failed" | "paid">("idle");
  const [failureReason, setFailureReason] = useState<string | null>(null);
  const [recovered, setRecovered] = useState(false);
  const startedTracked = useRef(false);
  const retryTracked = useRef(false);

  // Track payment_retried only once the retry has genuinely recovered the order — it used to
  // fire optimistically on every retry click, even when that retry then failed too.
  useEffect(() => {
    if (status === "paid" && recovered && !retryTracked.current) {
      analytics.track("payment_retried", { orderId, previousAttempt: attempt - 1 });
      retryTracked.current = true;
    }
  }, [status, recovered, orderId, attempt]);

  useEffect(() => {
    if (items.length > 0 && !startedTracked.current) {
      analytics.track("checkout_started", {
        itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
        totalCents,
      });
      analytics.track("experiment_viewed", {
        experiment: "checkout_button_copy",
        variant,
      });
      startedTracked.current = true;
    }
  }, [items, totalCents, variant]);

  if (items.length === 0 && status !== "paid") {
    return (
      <div className="max-w-md mx-auto text-center space-y-4">
        <p>Your cart is empty.</p>
        <Link href="/shop" className="text-brand underline">
          Browse the shop
        </Link>
      </div>
    );
  }

  if (status === "paid") {
    return (
      <div className="max-w-md mx-auto text-center space-y-4" data-testid="order-success">
        <h1 className="text-2xl font-bold text-brand">Order confirmed</h1>
        <p className="text-foreground/70">
          Order <span className="font-mono">{orderId}</span> is on its way.
          {recovered && (
            <span className="block mt-1 text-sm text-accent" data-testid="order-recovered-note">
              Your first attempt didn&apos;t go through — good thing the retry did.
            </span>
          )}
        </p>
        <Link href="/shop" className="text-brand underline">
          Keep shopping
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user && !guestEmail) return;

    setStatus("submitting");
    const nextAttempt = attempt + 1;

    analytics.track("payment_submitted", {
      orderId,
      attemptNumber: nextAttempt,
      cardLast4: cardNumber.replace(/\s/g, "").slice(-4),
    });

    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        cardNumber: cardNumber.replace(/\s/g, ""),
        guestEmail: user ? undefined : guestEmail,
      }),
    });
    const data = await res.json();
    setOrderId(data.orderId);
    setAttempt(data.attemptNumber ?? nextAttempt);

    if (!res.ok || data.status === "failed") {
      analytics.track("payment_failed", {
        orderId: data.orderId,
        attemptNumber: data.attemptNumber ?? nextAttempt,
        reason: data.reason ?? data.error,
      });
      setFailureReason(data.reason ?? data.error ?? "Payment failed.");
      setStatus("failed");
      return;
    }

    analytics.track("order_completed", {
      orderId: data.orderId,
      totalCents: data.totalCents,
      recovered: data.recovered,
      attemptNumber: data.attemptNumber,
    });
    setRecovered(Boolean(data.recovered));
    setStatus("paid");
    clear();
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-brand">Checkout</h1>

      <div className="rounded-md border border-brand/15 p-4 space-y-1 text-sm" data-testid="checkout-summary">
        {items.map((i) => (
          <div key={i.productId} className="flex justify-between">
            <span>
              {i.name} × {i.quantity}
            </span>
            <span>${((i.priceCents * i.quantity) / 100).toFixed(2)}</span>
          </div>
        ))}
        <div className="flex justify-between font-semibold pt-2 border-t border-brand/10">
          <span>Total</span>
          <span data-testid="checkout-total">${(totalCents / 100).toFixed(2)}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" data-testid="checkout-form">
        {!user && (
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="guestEmail">
              Email
            </label>
            <input
              id="guestEmail"
              type="email"
              required
              data-testid="checkout-guest-email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              className="w-full rounded-md border border-brand/20 px-3 py-2"
            />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="cardNumber">
            Card number
          </label>
          <input
            id="cardNumber"
            required
            data-testid="checkout-card-number"
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            className="w-full rounded-md border border-brand/20 px-3 py-2 font-mono"
          />
          <p className="text-xs text-foreground/50 mt-1">
            Test cards: 4242 4242 4242 4242 (succeeds) · 4000 0000 0000 0002 (fails once, then
            recovers on retry)
          </p>
        </div>

        {status === "failed" && (
          <p className="text-sm text-red-600" data-testid="payment-error">
            Payment failed: {failureReason}. Try again below.
          </p>
        )}

        <button
          type="submit"
          disabled={status === "submitting"}
          data-testid="checkout-submit"
          className="w-full rounded-md bg-brand px-4 py-2.5 text-white font-medium hover:bg-brand/90 disabled:opacity-60"
        >
          {status === "submitting"
            ? "Processing…"
            : status === "failed"
              ? "Retry Payment"
              : CHECKOUT_BUTTON_COPY_LABEL[variant]}
        </button>
      </form>
    </div>
  );
}
