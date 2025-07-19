import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
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
        name,
        display_name,
        created_at,
        age,
        gender,
        diet_type,

        start_weight,
        goal_weight,
        weight_kg,
        weight_lbs,
        target_weight_kg,
        target_weight_lbs,
        target_weekly_rate,

        unit_preference,
        height_unit,
        weight_unit,
        goal,
        activity_level,
        height_cm,
        height_inches,
        
        target_calories,
        target_protein,
        target_carbs,
        target_fat
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
