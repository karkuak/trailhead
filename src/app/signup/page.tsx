"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { analytics } from "@/lib/analytics-client";
import { useSession } from "@/components/SessionProvider";

export default function SignupPage() {
  const router = useRouter();
  const { refresh } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    analytics.track("signup_started", { method: "email" });

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      setSubmitting(false);
      return;
    }

    analytics.identify(data.userId, { email: data.email, name: data.name });
    analytics.track("signup_completed", {
      userId: data.userId,
      trialEndsAt: data.trialEndsAt,
    });

    await refresh();
    router.push("/onboarding");
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold text-brand">Start your 14-day trial</h1>
        <p className="text-sm text-foreground/60">
          No commitment. Cancel anytime. We&apos;ll build your plan next.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4" data-testid="signup-form">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            data-testid="signup-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-brand/20 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            data-testid="signup-email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-brand/20 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            data-testid="signup-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-brand/20 px-3 py-2"
          />
        </div>
        {error && (
          <p className="text-sm text-red-600" data-testid="signup-error">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          data-testid="signup-submit"
          className="w-full rounded-md bg-brand px-4 py-2.5 text-white font-medium hover:bg-brand/90 disabled:opacity-60"
        >
          {submitting ? "Creating account…" : "Create my account"}
        </button>
      </form>
    </div>
  );
}
