import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId, getUserById } from "@/lib/auth";
import { PLAN_PRICING_CENTS, type PlanId } from "@/lib/types";

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const user = getUserById(userId);
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  if (user.subscription_status !== "trialing") {
    return NextResponse.json(
      { error: "Only trial members can convert through this flow." },
      { status: 409 }
    );
  }

  const body = await request.json().catch(() => null);
  const targetPlan: PlanId = body?.targetPlan === "summit" ? "summit" : "trail";
  const now = new Date().toISOString();

  db.prepare(
    `UPDATE users
     SET plan = @plan, subscription_status = 'active', converted_at = @now
     WHERE id = @id`
  ).run({ id: userId, plan: targetPlan, now });

  return NextResponse.json({
    plan: targetPlan,
    previousPlan: user.plan,
    subscriptionStatus: "active",
    mrrCents: PLAN_PRICING_CENTS[targetPlan],
    convertedAt: now,
  });
}
