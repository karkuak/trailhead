import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSessionUserId, getUserById } from "@/lib/auth";
import { PLAN_PRICING_CENTS, type PlanId } from "@/lib/types";

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const user = await getUserById(userId);
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

  await query(
    `UPDATE users
     SET plan = $1, subscription_status = 'active', converted_at = $2
     WHERE id = $3`,
    [targetPlan, now, userId]
  );

  return NextResponse.json({
    plan: targetPlan,
    previousPlan: user.plan,
    subscriptionStatus: "active",
    mrrCents: PLAN_PRICING_CENTS[targetPlan],
    convertedAt: now,
  });
}
