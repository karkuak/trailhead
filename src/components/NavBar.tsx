"use client";

import Link from "next/link";
import { useSession } from "./SessionProvider";
import { useCart } from "./CartProvider";

export function NavBar() {
  const { user } = useSession();
  const { items } = useCart();
  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <header className="border-b border-brand/10 bg-white/70 backdrop-blur sticky top-0 z-10">
      <nav className="mx-auto max-w-5xl flex items-center justify-between px-4 py-3">
        <Link href="/" className="font-bold text-lg text-brand">
          Trailhead
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/shop" className="hover:text-brand">
            Shop
          </Link>
          <Link href="/guide" className="hover:text-brand">
            Guide
          </Link>
          <Link href="/cart" className="hover:text-brand" data-testid="nav-cart">
            Cart{cartCount > 0 ? ` (${cartCount})` : ""}
          </Link>
          {user ? (
            <>
              <Link href="/plan" className="hover:text-brand" data-testid="nav-plan">
                My Plan
              </Link>
              <Link
                href="/account/subscription"
                className="hover:text-brand"
                data-testid="nav-account"
              >
                Account
              </Link>
            </>
          ) : (
            <Link
              href="/signup"
              className="rounded-md bg-brand px-3 py-1.5 text-white hover:bg-brand/90"
              data-testid="nav-signup"
            >
              Get Started
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
