import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import type { PlanId } from "@/lib/types";

const VALID_EXPERIENCE = ["first-timer", "aspiring-regular", "committed-weekender"] as const;
const VALID_SEASONS = ["spring", "summer", "fall", "winter"] as const;

function suggestPlan(experienceLevel: string): PlanId {
  return experienceLevel === "committed-weekender" ? "summit" : "trail";
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const experienceLevel = body?.experienceLevel;
  const goals = typeof body?.goals === "string" ? body.goals.trim() : "";
  const season = body?.season;

  if (
    !VALID_EXPERIENCE.includes(experienceLevel) ||
    !VALID_SEASONS.includes(season) ||
    !goals
  ) {
    return NextResponse.json({ error: "Invalid onboarding preferences." }, { status: 400 });
  }

  const suggestedPlan = suggestPlan(experienceLevel);
  const now = new Date().toISOString();

  await query(
    `UPDATE users
     SET experience_level = $1,
         goals = $2,
         season = $3,
         suggested_plan = $4,
         plan = $4,
         onboarding_completed_at = $5
     WHERE id = $6`,
    [experienceLevel, goals, season, suggestedPlan, now, userId]
  );

  return NextResponse.json({ suggestedPlan, onboardingCompletedAt: now });
}
