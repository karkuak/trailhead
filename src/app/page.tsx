import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-10">
      <section className="text-center space-y-4 py-10">
        <h1 className="text-4xl font-bold text-brand">You&apos;ll always be ready for what&apos;s next.</h1>
        <p className="text-lg text-foreground/70 max-w-2xl mx-auto">
          Trailhead pairs a curated outdoor-gear subscription with a fast, trustworthy shop — so
          you always have the right kit for the season and the trip ahead.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/signup"
            className="rounded-md bg-brand px-5 py-2.5 text-white font-medium hover:bg-brand/90"
            data-testid="home-start-trial"
          >
            Start your 14-day trial
          </Link>
          <Link
            href="/shop"
            className="rounded-md border border-brand/30 px-5 py-2.5 font-medium hover:bg-brand-light"
          >
            Browse the shop
          </Link>
        </div>
      </section>

      <section className="grid gap-6 sm:grid-cols-3">
        <div className="rounded-lg bg-brand-light p-5">
          <h2 className="font-semibold text-brand mb-1">The subscription</h2>
          <p className="text-sm text-foreground/70">
            Tiered seasonal plans, curated to your goals. Trail for the occasional trip, Summit for
            the committed weekender.
          </p>
        </div>
        <div className="rounded-lg bg-brand-light p-5">
          <h2 className="font-semibold text-brand mb-1">The shop</h2>
          <p className="text-sm text-foreground/70">
            One-off gear for the thing you need before Saturday — open to members and guests.
          </p>
        </div>
        <div className="rounded-lg bg-brand-light p-5">
          <h2 className="font-semibold text-brand mb-1">The guide</h2>
          <p className="text-sm text-foreground/70">
            Trip-based recommendations that make curation feel personal, not generic.
          </p>
        </div>
      </section>
    </div>
  );
}
