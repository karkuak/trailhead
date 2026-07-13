export type SubscriptionStatus =
  | "none"
  | "trialing"
  | "active"
  | "paused"
  | "canceled";

export type PlanId = "trail" | "summit";

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  experience_level: string | null;
  goals: string | null;
  season: string | null;
  suggested_plan: PlanId | null;
  plan: PlanId | null;
  subscription_status: SubscriptionStatus;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  onboarding_completed_at: string | null;
  converted_at: string | null;
  canceled_at: string | null;
  paused_until: string | null;
  created_at: string;
}

export interface ProductRecord {
  id: string;
  slug: string;
  name: string;
  description: string;
  price_cents: number;
  category: string;
}

export interface OrderRecord {
  id: string;
  user_id: string | null;
  guest_email: string | null;
  status: "pending" | "paid" | "failed";
  total_cents: number;
  had_failed_attempt: number;
  created_at: string;
  completed_at: string | null;
}

export const PLAN_PRICING_CENTS: Record<PlanId, number> = {
  trail: 3900,
  summit: 6900,
};
