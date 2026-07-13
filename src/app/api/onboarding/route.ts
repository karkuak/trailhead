import { NextResponse } from "next/server";
import { db } from "@/lib/db";
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

  db.prepare(
    `UPDATE users
     SET experience_level = @experience_level,
         goals = @goals,
         season = @season,
         suggested_plan = @suggested_plan,
         plan = @suggested_plan,
         onboarding_completed_at = @now
     WHERE id = @id`
  ).run({
    id: userId,
    experience_level: experienceLevel,
    goals,
    season,
    suggested_plan: suggestedPlan,
    now,
  });

  return NextResponse.json({ suggestedPlan, onboardingCompletedAt: now });
}
