"use client";

import Link from "next/link";
import { useCart } from "@/components/CartProvider";

export default function CartPage() {
  const { items, removeItem, totalCents } = useCart();

  if (items.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center space-y-4">
        <p>Your cart is empty.</p>
        <Link href="/shop" className="text-brand underline">
          Browse the shop
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-brand">Your Cart</h1>
      <div className="space-y-3" data-testid="cart-items">
        {items.map((item) => (
          <div
            key={item.productId}
            className="flex items-center justify-between rounded-md border border-brand/15 p-4"
            data-testid={`cart-item-${item.productId}`}
          >
            <div>
              <p className="font-medium">{item.name}</p>
              <p className="text-sm text-foreground/60">
                Qty {item.quantity} · ${((item.priceCents * item.quantity) / 100).toFixed(2)}
              </p>
            </div>
            <button
              onClick={() => removeItem(item.productId)}
              className="text-sm text-accent hover:underline"
              data-testid={`remove-${item.productId}`}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-brand/15 pt-4">
        <span className="font-semibold">Total</span>
        <span className="font-semibold" data-testid="cart-total">
          ${(totalCents / 100).toFixed(2)}
        </span>
      </div>
      <Link
        href="/checkout"
        className="block text-center rounded-md bg-brand px-4 py-2.5 text-white font-medium hover:bg-brand/90"
        data-testid="go-to-checkout"
      >
        Proceed to checkout
      </Link>
    </div>
  );
}
