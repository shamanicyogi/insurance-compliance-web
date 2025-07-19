import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { withErrorHandling } from "@/lib/api-error-handler";
import { secureError } from "@/lib/utils/secure-logger";

/**
 * POST /api/db/create-insights-table
 *
 * Creates the ai_insights table in the database if it doesn't exist
 * Only accessible to admin users (for security)
 */
async function POST() {
  try {
    // Verify the user is authenticated and is an admin
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin (you should implement this check based on your user roles)
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (userError || userData?.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    // Create the ai_insights table using SQL
    const { error } = await supabase.rpc("create_ai_insights_table");

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: "AI insights table created successfully",
    });
  } catch (error) {
    secureError("Error creating ai_insights table:", error);
    return NextResponse.json(
      { error: "Failed to create table", details: (error as Error).message },
      { status: 500 }
    );
  }
}

// Export with error handling
const POSTHandler = withErrorHandling(POST);

export { POSTHandler as POST };

// SQL function to create in Supabase:
/*
CREATE OR REPLACE FUNCTION create_ai_insights_table()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if the table already exists
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ai_insights'
    ) THEN
        -- Create the ai_insights table
        CREATE TABLE public.ai_insights (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            insights JSONB NOT NULL,
            period_start DATE NOT NULL,
            period_end DATE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
        );

        -- Set up RLS (Row Level Security)
        ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
        
        -- Create policy to allow users to read only their own insights
        CREATE POLICY "Users can read their own insights" 
            ON public.ai_insights
            FOR SELECT 
            USING (auth.uid() = user_id);
            
        -- Create policy to allow the service role to insert insights
        CREATE POLICY "Service role can insert insights" 
            ON public.ai_insights
            FOR INSERT 
            TO authenticated
            WITH CHECK (true);
    END IF;
END;
$$;
*/
