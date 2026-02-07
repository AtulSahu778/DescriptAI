import { SupabaseClient } from "@supabase/supabase-js";

export type UserProfile = {
  id: string;
  credits_remaining: number;
  plan_type: "free" | "pro";
  created_at: string;
  updated_at: string;
};

const PLAN_LIMITS = {
  free: 50,
  pro: 500,
};

export function getPlanLimit(plan: "free" | "pro") {
  return PLAN_LIMITS[plan];
}

export async function getOrCreateProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<UserProfile> {
  const { data } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (data) return data as UserProfile;

  // Auto-create profile if it doesn't exist (e.g., existing users before this feature)
  const { data: newProfile, error } = await supabase
    .from("user_profiles")
    .insert({ id: userId, credits_remaining: 50, plan_type: "free" })
    .select()
    .single();

  if (error) throw new Error("Failed to create user profile");
  return newProfile as UserProfile;
}

export async function decrementCredits(
  supabase: SupabaseClient,
  userId: string,
  amount: number = 1
): Promise<number> {
  // Use a conditional update to prevent going below 0
  const { data, error } = await supabase
    .from("user_profiles")
    .update({
      credits_remaining: await getCurrentCredits(supabase, userId) - amount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .gte("credits_remaining", amount)
    .select("credits_remaining")
    .single();

  if (error || !data) return -1;
  return data.credits_remaining;
}

async function getCurrentCredits(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { data } = await supabase
    .from("user_profiles")
    .select("credits_remaining")
    .eq("id", userId)
    .single();
  return data?.credits_remaining ?? 0;
}

export async function logUsage(
  supabase: SupabaseClient,
  userId: string,
  actionType: string,
  productCount: number = 1,
  metadata: Record<string, unknown> = {}
) {
  await supabase.from("usage_logs").insert({
    user_id: userId,
    action_type: actionType,
    product_count: productCount,
    metadata,
  });
}
