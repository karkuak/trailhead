import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null });

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      suggestedPlan: user.suggested_plan,
      subscriptionStatus: user.subscription_status,
      trialEndsAt: user.trial_ends_at,
      onboardingCompletedAt: user.onboarding_completed_at,
      pausedUntil: user.paused_until,
      canceledAt: user.canceled_at,
    },
  });
}
