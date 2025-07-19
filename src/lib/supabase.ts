import { createClient } from "@supabase/supabase-js";

// Validate environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_URL");
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing env.SUPABASE_SERVICE_ROLE_KEY");
}

// ⚠️ SERVER-ONLY INSTANCE - Never import this in client components
// This instance has full database privileges and should only be used server-side
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// For backwards compatibility - but this should be replaced with supabaseAdmin
// TODO: Replace all usage of 'supabase' export with 'supabaseAdmin' for clarity
export const supabase = supabaseAdmin;
