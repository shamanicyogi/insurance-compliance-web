import { createClient } from "@supabase/supabase-js";

// Validate client-side environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_URL");
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

// ✅ CLIENT-SAFE INSTANCE - Uses anon key with RLS protection
// This instance respects Row Level Security policies and is safe for client-side use
export const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);

// For backwards compatibility - but prefer using supabaseClient directly
export const supabase = supabaseClient;
