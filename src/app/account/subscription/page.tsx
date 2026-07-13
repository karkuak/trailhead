"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { analytics } from "@/lib/analytics-client";
import { useSession } from "@/components/SessionProvider";

type Stage = "overview" | "save_offer" | "canceled" | "saved";

export default function SubscriptionPage() {
  const { user, loading, refresh } = useSession();
  const [stage, setStage] = useState<Stage>("overview");
  const [saveResult, setSaveResult] = useState<{ type: "pause" | "downgrade"; detail: string } | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);
  const offerShownTracked = useRef(false);

  useEffect(() => {
    if (stage === "save_offer" && !offerShownTracked.current) {
      analytics.track("save_offer_shown", { plan: user?.plan });
      offerShownTracked.current = true;
    }
  }, [stage, user]);

  if (loading) return <p className="text-center text-foreground/60">Loading your account…</p>;

  if (!user) {
    return (
      <div className="max-w-md mx-auto text-center space-y-4">
        <p>You need an account to manage a subscription.</p>
        <Link href="/signup" className="text-brand underline">
          Start your trial
        </Link>
      </div>
    );
  }

  if (user.subscriptionStatus === "none") {
    return <p className="text-center text-foreground/60">No subscription on this account yet.</p>;
  }

  function startCancellation() {
    analytics.track("cancellation_started", {
      plan: user!.plan,
      subscriptionStatus: user!.subscriptionStatus,
    });
    setStage("save_offer");
  }

  async function acceptPause() {
    setSubmitting(true);
    const res = await fetch("/api/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accept_pause" }),
    });
    const data = await res.json();
    analytics.track("save_accepted", { saveType: "pause", pausedUntil: data.pausedUntil });
    await refresh();
    setSaveResult({ type: "pause", detail: `Paused until ${new Date(data.pausedUntil).toLocaleDateString()}` });
    setStage("saved");
    setSubmitting(false);
  }

  async function acceptDowngrade() {
    setSubmitting(true);
    const res = await fetch("/api/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accept_downgrade" }),
    });
    const data = await res.json();
    analytics.track("save_accepted", { saveType: "downgrade", plan: data.plan });
    await refresh();
    setSaveResult({ type: "downgrade", detail: "Switched to the Trail plan" });
    setStage("saved");
    setSubmitting(false);
  }

  async function confirmCancel() {
    setSubmitting(true);
    const res = await fetch("/api/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirm_cancel" }),
    });
    const data = await res.json();
    analytics.track("cancellation_completed", {
      plan: user!.plan,
      canceledAt: data.canceledAt,
    });
    await refresh();
    setStage("canceled");
    setSubmitting(false);
  }

  if (stage === "canceled" || user.subscriptionStatus === "canceled") {
    return (
      <div className="max-w-md mx-auto text-center space-y-4" data-testid="cancellation-complete">
        <h1 className="text-2xl font-bold text-brand">Your subscription is canceled</h1>
        <p className="text-foreground/70">
          No further charges. You&apos;re welcome back anytime — your account stays open.
        </p>
        <Link href="/" className="text-brand underline">
          Back home
        </Link>
      </div>
    );
  }

  if (stage === "saved" && saveResult) {
    return (
      <div className="max-w-md mx-auto text-center space-y-4" data-testid="save-accepted">
        <h1 className="text-2xl font-bold text-brand">You&apos;re all set</h1>
        <p className="text-foreground/70">{saveResult.detail}</p>
        <Link href="/plan" className="text-brand underline">
          View my plan
        </Link>
      </div>
    );
  }

  if (stage === "save_offer") {
    return (
      <div className="max-w-lg mx-auto space-y-6" data-testid="save-offer">
        <h1 className="text-2xl font-bold text-brand">Before you go — a couple of options</h1>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-brand/20 p-5 space-y-2">
            <h2 className="font-semibold">Pause for 30 days</h2>
            <p className="text-sm text-foreground/60">
              Keep your account and preferences. No shipments or charges for a month.
            </p>
            <button
              onClick={acceptPause}
              disabled={submitting}
              data-testid="accept-pause"
              className="w-full rounded-md bg-brand px-3 py-2 text-white text-sm font-medium hover:bg-brand/90 disabled:opacity-60"
            >
              Pause my plan
            </button>
          </div>
          <div className="rounded-lg border border-brand/20 p-5 space-y-2">
            <h2 className="font-semibold">Switch to Trail</h2>
            <p className="text-sm text-foreground/60">
              Drop to seasonal shipments at $39/mo instead of canceling outright.
            </p>
            <button
              onClick={acceptDowngrade}
              disabled={submitting}
              data-testid="accept-downgrade"
              className="w-full rounded-md bg-brand px-3 py-2 text-white text-sm font-medium hover:bg-brand/90 disabled:opacity-60"
            >
              Switch to Trail
            </button>
          </div>
        </div>
        <div className="text-center">
          <button
            onClick={confirmCancel}
            disabled={submitting}
            data-testid="confirm-cancel"
            className="text-sm text-foreground/60 underline hover:text-accent"
          >
            No thanks, cancel my subscription
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6 text-center" data-testid="subscription-overview">
      <h1 className="text-2xl font-bold text-brand">Your subscription</h1>
      <p className="text-foreground/70">
        Plan: <span className="font-medium">{user.plan}</span> · Status:{" "}
        <span className="font-medium">{user.subscriptionStatus}</span>
      </p>
      <button
        onClick={startCancellation}
        data-testid="start-cancellation"
        className="rounded-md border border-accent px-4 py-2.5 text-accent font-medium hover:bg-accent/10"
      >
        Cancel subscription
      </button>
    </div>
  );
}
