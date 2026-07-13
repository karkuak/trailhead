"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { analytics } from "@/lib/analytics-client";
import { useSession } from "@/components/SessionProvider";

const EXPERIENCE_OPTIONS = [
  { value: "first-timer", label: "First-timer — I want a gentle start" },
  { value: "aspiring-regular", label: "Aspiring regular — a few trips a season" },
  { value: "committed-weekender", label: "Committed weekender — I go out often" },
] as const;

const SEASON_OPTIONS = ["spring", "summer", "fall", "winter"] as const;

const PLAN_COPY: Record<string, { name: string; price: string; blurb: string }> = {
  trail: {
    name: "Trail",
    price: "$39/mo",
    blurb: "Seasonal shipments built for the aspiring regular — four curated drops a year.",
  },
  summit: {
    name: "Summit",
    price: "$69/mo",
    blurb: "Monthly shipments for the committed weekender who wants gear handled every month.",
  },
};

export default function OnboardingPage() {
  const { refresh } = useSession();
  const [experienceLevel, setExperienceLevel] =
    useState<(typeof EXPERIENCE_OPTIONS)[number]["value"]>("aspiring-regular");
  const [goals, setGoals] = useState("");
  const [season, setSeason] = useState<(typeof SEASON_OPTIONS)[number]>("summer");
  const [suggestedPlan, setSuggestedPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const startedTracked = useRef(false);

  useEffect(() => {
    if (!startedTracked.current) {
      analytics.track("onboarding_started");
      startedTracked.current = true;
    }
  }, []);

  useEffect(() => {
    if (suggestedPlan) {
      analytics.track("plan_preview_viewed", { plan: suggestedPlan });
    }
  }, [suggestedPlan]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ experienceLevel, goals, season }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      setSubmitting(false);
      return;
    }

    analytics.track("onboarding_completed", {
      experienceLevel,
      season,
      suggestedPlan: data.suggestedPlan,
    });
    await refresh();
    setSuggestedPlan(data.suggestedPlan);
    setSubmitting(false);
  }

  if (suggestedPlan) {
    const plan = PLAN_COPY[suggestedPlan];
    return (
      <div className="max-w-md mx-auto text-center space-y-6" data-testid="plan-preview">
        <h1 className="text-2xl font-bold text-brand">Your plan preview is ready</h1>
        <div className="rounded-lg border border-brand/20 bg-brand-light p-6 space-y-2">
          <p className="text-sm uppercase tracking-wide text-brand/70">Recommended for you</p>
          <p className="text-2xl font-bold" data-testid="plan-preview-name">
            {plan.name}
          </p>
          <p className="text-lg">{plan.price}</p>
          <p className="text-sm text-foreground/70">{plan.blurb}</p>
        </div>
        <p className="text-sm text-foreground/60">
          Your 14-day trial has started — explore your plan before it converts to paid.
        </p>
        <Link
          href="/plan"
          className="inline-block rounded-md bg-brand px-5 py-2.5 text-white font-medium hover:bg-brand/90"
          data-testid="go-to-plan"
        >
          View my plan
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold text-brand">Tell us about your trips</h1>
        <p className="text-sm text-foreground/60">
          A minute of preferences gets you a personalized plan preview.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5" data-testid="onboarding-form">
        <fieldset>
          <legend className="text-sm font-medium mb-2">Experience level</legend>
          <div className="space-y-2">
            {EXPERIENCE_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="experienceLevel"
                  value={opt.value}
                  checked={experienceLevel === opt.value}
                  onChange={() => setExperienceLevel(opt.value)}
                  data-testid={`experience-${opt.value}`}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="goals">
            What are you hoping to do outside this year?
          </label>
          <textarea
            id="goals"
            data-testid="onboarding-goals"
            required
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
            className="w-full rounded-md border border-brand/20 px-3 py-2"
            rows={3}
          />
        </div>

        <fieldset>
          <legend className="text-sm font-medium mb-2">Which season are you gearing up for?</legend>
          <div className="flex flex-wrap gap-2">
            {SEASON_OPTIONS.map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => setSeason(s)}
                data-testid={`season-${s}`}
                className={`rounded-md border px-3 py-1.5 text-sm capitalize ${
                  season === s
                    ? "border-brand bg-brand text-white"
                    : "border-brand/20 hover:bg-brand-light"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </fieldset>

        {error && (
          <p className="text-sm text-red-600" data-testid="onboarding-error">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          data-testid="onboarding-submit"
          className="w-full rounded-md bg-brand px-4 py-2.5 text-white font-medium hover:bg-brand/90 disabled:opacity-60"
        >
          {submitting ? "Building your plan…" : "See my plan preview"}
        </button>
      </form>
    </div>
  );
}
