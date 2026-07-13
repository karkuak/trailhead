import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/SessionProvider";
import { CartProvider } from "@/components/CartProvider";
import { NavBar } from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Trailhead — Always ready for what's next",
  description:
    "A curated outdoor-gear subscription and shop that guides you from your first trip to your hundredth.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <SessionProvider>
          <CartProvider>
            <NavBar />
            <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-8">{children}</main>
          </CartProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
