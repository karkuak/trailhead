"use client";

import { useEffect } from "react";
import { PRODUCTS } from "@/lib/products";
import { analytics } from "@/lib/analytics-client";
import { useCart } from "@/components/CartProvider";

export default function ShopPage() {
  const { addItem } = useCart();

  useEffect(() => {
    analytics.page("shop");
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand">The Shop</h1>
        <p className="text-foreground/60 text-sm">
          One-off gear for the thing you need before Saturday. Open to members and guests.
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {PRODUCTS.map((product) => (
          <div
            key={product.id}
            className="rounded-lg border border-brand/15 p-5 flex flex-col justify-between"
            data-testid={`product-${product.slug}`}
          >
            <div>
              <h2 className="font-semibold">{product.name}</h2>
              <p className="text-sm text-foreground/60 mt-1">{product.description}</p>
            </div>
            <div className="flex items-center justify-between mt-4">
              <span className="font-medium">${(product.priceCents / 100).toFixed(2)}</span>
              <button
                onClick={() => {
                  addItem({
                    productId: product.id,
                    name: product.name,
                    priceCents: product.priceCents,
                  });
                  analytics.track("product_added_to_cart", {
                    productId: product.id,
                    priceCents: product.priceCents,
                  });
                }}
                data-testid={`add-to-cart-${product.slug}`}
                className="rounded-md bg-brand px-3 py-1.5 text-white text-sm font-medium hover:bg-brand/90"
              >
                Add to cart
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
