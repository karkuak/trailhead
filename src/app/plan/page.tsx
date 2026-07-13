"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { analytics } from "@/lib/analytics-client";
import { useSession } from "@/components/SessionProvider";
import type { PlanId } from "@/lib/types";

const PLAN_INFO: Record<PlanId, { name: string; price: string; blurb: string }> = {
  trail: {
    name: "Trail",
    price: "$39/mo",
    blurb: "Seasonal shipments (4/yr) curated for the aspiring regular.",
  },
  summit: {
    name: "Summit",
    price: "$69/mo",
    blurb: "Monthly shipments for the committed weekender.",
  },
};

export default function PlanPage() {
  const { user, loading, refresh } = useSession();
  const [choosingPlan, setChoosingPlan] = useState(false);
  const [converted, setConverted] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const viewedTracked = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const key = `${user.plan}:${user.subscriptionStatus}`;
    if (viewedTracked.current !== key) {
      analytics.track("plan_viewed", {
        plan: user.plan,
        subscriptionStatus: user.subscriptionStatus,
      });
      viewedTracked.current = key;
    }
  }, [user]);

  if (loading) return <p className="text-center text-foreground/60">Loading your plan…</p>;

  if (!user) {
    return (
      <div className="max-w-md mx-auto text-center space-y-4">
        <p>You need an account to view your plan.</p>
        <Link href="/signup" className="text-brand underline">
          Start your trial
        </Link>
      </div>
    );
  }

  if (!user.plan) {
    return (
      <div className="max-w-md mx-auto text-center space-y-4">
        <p>Let&apos;s finish your onboarding to build your plan.</p>
        <Link href="/onboarding" className="text-brand underline">
          Continue onboarding
        </Link>
      </div>
    );
  }

  const currentPlan = PLAN_INFO[user.plan];
  const isTrialing = user.subscriptionStatus === "trialing";

  function openUpgrade() {
    analytics.track("upgrade_started", { fromPlan: user!.plan });
    setChoosingPlan(true);
  }

  async function confirmUpgrade(targetPlan: PlanId) {
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/upgrade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetPlan }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      setSubmitting(false);
      return;
    }
    analytics.track("trial_converted", {
      plan: data.plan,
      previousPlan: data.previousPlan,
      mrrCents: data.mrrCents,
    });
    await refresh();
    setConverted(targetPlan);
    setSubmitting(false);
  }

  if (converted) {
    return (
      <div className="max-w-md mx-auto text-center space-y-4" data-testid="conversion-success">
        <h1 className="text-2xl font-bold text-brand">Welcome to {PLAN_INFO[converted].name}!</h1>
        <p className="text-foreground/70">
          You&apos;re now a paid member at {PLAN_INFO[converted].price}. Your next shipment is on
          its way.
        </p>
        <Link href="/shop" className="text-brand underline">
          Browse the shop
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="rounded-lg border border-brand/20 bg-brand-light p-6 space-y-2" data-testid="current-plan-card">
        <p className="text-sm uppercase tracking-wide text-brand/70">
          {isTrialing ? "Trial plan" : "Your plan"}
        </p>
        <p className="text-2xl font-bold" data-testid="current-plan-name">
          {currentPlan.name}
        </p>
        <p className="text-lg">{currentPlan.price}</p>
        <p className="text-sm text-foreground/70">{currentPlan.blurb}</p>
        {isTrialing && user.trialEndsAt && (
          <p className="text-xs text-foreground/50">
            Trial ends {new Date(user.trialEndsAt).toLocaleDateString()}
          </p>
        )}
      </div>

      {isTrialing && !choosingPlan && (
        <button
          onClick={openUpgrade}
          data-testid="upgrade-cta"
          className="w-full rounded-md bg-brand px-4 py-2.5 text-white font-medium hover:bg-brand/90"
        >
          Upgrade to a paid plan
        </button>
      )}

      {isTrialing && choosingPlan && (
        <div className="space-y-3" data-testid="upgrade-options">
          {(Object.keys(PLAN_INFO) as PlanId[]).map((planId) => (
            <div
              key={planId}
              className="flex items-center justify-between rounded-md border border-brand/20 p-4"
            >
              <div>
                <p className="font-semibold">{PLAN_INFO[planId].name}</p>
                <p className="text-sm text-foreground/60">{PLAN_INFO[planId].price}</p>
              </div>
              <button
                onClick={() => confirmUpgrade(planId)}
                disabled={submitting}
                data-testid={`confirm-upgrade-${planId}`}
                className="rounded-md bg-brand px-4 py-2 text-white text-sm font-medium hover:bg-brand/90 disabled:opacity-60"
              >
                Choose {PLAN_INFO[planId].name}
              </button>
            </div>
          ))}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}

      {!isTrialing && (
        <p className="text-sm text-foreground/60">
          You&apos;re a {user.subscriptionStatus} member on the {currentPlan.name} plan.
        </p>
      )}
    </div>
  );
}
