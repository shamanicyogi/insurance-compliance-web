import { createClient } from "@supabase/supabase-js";

// Replace with your actual Supabase credentials
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Export client-side supabase client (always available)
export const clientSupabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Lazy-load server-side supabase client (only when needed)
let _serverSupabase: ReturnType<typeof createClient> | null = null;
const getServerSupabase = async () => {
  if (!_serverSupabase) {
    const { supabase: serverSupabase } = await import("@/lib/supabase");
    _serverSupabase = serverSupabase as ReturnType<typeof createClient>;
  }
  return _serverSupabase;
};

// For backwards compatibility - but this should only be used server-side
export const supabase = clientSupabase; // Fallback to client for now

interface UserData {
  id: string;
  display_name?: string;
  email?: string;
  avatar_url?: string;
}
// User profile functions
export const getUserProfile = async (userId: string): Promise<UserData> => {
  const serverSupabase = await getServerSupabase();
  if (!serverSupabase) throw new Error("Server Supabase client not available");

  const { data: userData, error } = await serverSupabase
    .from("users")
    .select(
      `
      id,
      display_name,
      email,
      gender,
      age,
      weight_kg,
      weight_lbs,
      target_weight_kg,
      target_weight_lbs,
      height_cm,
      height_inches,
      activity_level,
      goal,
      diet_type,
      unit_preference,
      avatar_url
      `
    )
    .eq("id", userId)
    .single();

  if (error) throw error;
  return userData as UserData;
};
