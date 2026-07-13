import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSessionUserId, getUserById } from "@/lib/auth";

const PAUSE_DAYS = 30;

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const user = await getUserById(userId);
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  if (user.subscription_status !== "active" && user.subscription_status !== "trialing") {
    return NextResponse.json({ error: "No active subscription to cancel." }, { status: 409 });
  }

  const body = await request.json().catch(() => null);
  const action = body?.action;
  const now = new Date().toISOString();

  if (action === "accept_pause") {
    const pausedUntil = new Date(Date.now() + PAUSE_DAYS * 24 * 60 * 60 * 1000).toISOString();
    await query(
      `UPDATE users SET subscription_status = 'paused', paused_until = $1 WHERE id = $2`,
      [pausedUntil, userId]
    );
    return NextResponse.json({ subscriptionStatus: "paused", pausedUntil });
  }

  if (action === "accept_downgrade") {
    await query(`UPDATE users SET plan = 'trail' WHERE id = $1`, [userId]);
    return NextResponse.json({ subscriptionStatus: user.subscription_status, plan: "trail" });
  }

  if (action === "confirm_cancel") {
    await query(
      `UPDATE users SET subscription_status = 'canceled', canceled_at = $1 WHERE id = $2`,
      [now, userId]
    );
    return NextResponse.json({ subscriptionStatus: "canceled", canceledAt: now });
  }

  return NextResponse.json({ error: "Unknown cancellation action." }, { status: 400 });
}
