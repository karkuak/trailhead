import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { queryOne, query } from "@/lib/db";
import { hashPassword, setSessionUser } from "@/lib/auth";

const TRIAL_DAYS = 14;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !name || password.length < 8) {
    return NextResponse.json(
      { error: "Email, name, and an 8+ character password are required." },
      { status: 400 }
    );
  }

  const existing = await queryOne(`SELECT id FROM users WHERE email = $1`, [email]);
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  const now = new Date();
  const trialEnds = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const userId = `user_${randomUUID()}`;
  const passwordHash = await hashPassword(password);

  await query(
    `INSERT INTO users (
      id, email, name, password_hash, subscription_status,
      trial_started_at, trial_ends_at, created_at
    ) VALUES ($1, $2, $3, $4, 'trialing', $5, $6, $7)`,
    [userId, email, name, passwordHash, now.toISOString(), trialEnds.toISOString(), now.toISOString()]
  );

  await setSessionUser(userId);

  return NextResponse.json({
    userId,
    email,
    name,
    trialEndsAt: trialEnds.toISOString(),
  });
}
