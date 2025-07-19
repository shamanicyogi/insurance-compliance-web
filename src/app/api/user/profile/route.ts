import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getUserProfile } from "@/lib/services/supabase-service";
import { supabase } from "@/lib/supabase";
import { withErrorHandling } from "@/lib/api-error-handler";
import { secureError } from "@/lib/utils/secure-logger";

async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userData = await getUserProfile(session.user.id);
    return NextResponse.json(userData);
  } catch (error) {
    secureError("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch user profile" },
      { status: 500 }
    );
  }
}

async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // 🔒 SECURITY: Validate and sanitize the update data
    const allowedFields = [
      "display_name",
      "unit_preference",
      "gender",
      "age",
      "weight_kg",
      "weight_lbs",
      "height_cm",
      "height_inches",
      "activity_level",
      "goal",
      "diet_type",
      "target_weight_kg",
      "target_weight_lbs",
    ];

    const updateData: Record<string, unknown> = {};

    // Validate each field individually
    for (const [key, value] of Object.entries(body)) {
      if (!allowedFields.includes(key) || value === undefined) continue;

      switch (key) {
        case "display_name":
          if (
            typeof value === "string" &&
            value.trim().length > 0 &&
            value.length <= 100
          ) {
            updateData[key] = value.trim();
          }
          break;
        case "unit_preference":
          if (["metric", "imperial"].includes(value as string)) {
            updateData[key] = value;
          }
          break;
        case "gender":
          if (["male", "female", "other"].includes(value as string)) {
            updateData[key] = value;
          }
          break;
        case "age":
          if (typeof value === "number" && value >= 13 && value <= 120) {
            updateData[key] = value;
          }
          break;
        case "weight_kg":
        case "target_weight_kg":
          if (typeof value === "number" && value >= 20 && value <= 500) {
            updateData[key] = value;
          }
          break;
        case "weight_lbs":
        case "target_weight_lbs":
          if (typeof value === "number" && value >= 44 && value <= 1100) {
            updateData[key] = value;
          }
          break;
        case "height_cm":
          if (typeof value === "number" && value >= 50 && value <= 300) {
            updateData[key] = value;
          }
          break;
        case "height_inches":
          if (typeof value === "number" && value >= 20 && value <= 120) {
            updateData[key] = value;
          }
          break;
        case "activity_level":
          if (
            [
              "sedentary",
              "light",
              "moderate",
              "active",
              "very_active",
            ].includes(value as string)
          ) {
            updateData[key] = value;
          }
          break;
        case "goal":
          if (["lose", "maintain", "gain"].includes(value as string)) {
            updateData[key] = value;
          }
          break;
        case "diet_type":
          if (typeof value === "string" && value.length <= 50) {
            updateData[key] = value.trim();
          }
          break;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", session.user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, user: data });
  } catch (error) {
    secureError("Error updating user profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}

// Export with error handling
const GETHandler = withErrorHandling(GET);
const PATCHHandler = withErrorHandling(PATCH);

export { GETHandler as GET, PATCHHandler as PATCH };
