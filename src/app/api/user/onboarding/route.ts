import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { withErrorHandling } from "@/lib/api-error-handler";
import { secureError } from "@/lib/utils/secure-logger";

async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData, error } = await supabase
      .from("users")
      .select(
        `
        id,
        start_weight,
        weight,
        goal_weight,
        target_weekly_rate,
        unit_preference,
        goal,
        gender,
        age,
        activity_level,
        onboarding_completed
      `
      )
      .eq("id", session.user.id)
      .single();

    if (error) throw error;

    return NextResponse.json(userData);
  } catch (error) {
    secureError("Error fetching user stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch user stats" },
      { status: 500 }
    );
  }
}

// Export with error handling
const GETHandler = withErrorHandling(GET);

export { GETHandler as GET };
