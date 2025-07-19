import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api-error-handler";

// 🔒 SECURITY: Input validation functions
function validateString(
  value: unknown,
  maxLength: number = 255
): string | null {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maxLength
  ) {
    return null;
  }
  return value.trim();
}

function validateNumber(
  value: unknown,
  min: number = 0,
  max: number = Number.MAX_SAFE_INTEGER
): number | null {
  const num = parseFloat(value as string);
  if (isNaN(num) || num < min || num > max) {
    return null;
  }
  return num;
}

// function validateInteger(
//   value: unknown,
//   min: number = 0,
//   max: number = Number.MAX_SAFE_INTEGER
// ): number | null {
//   const num = parseInt(value as string);
//   if (isNaN(num) || num < min || num > max) {
//     return null;
//   }
//   return num;
// }

function validateEnum(value: unknown, allowedValues: string[]): string | null {
  if (typeof value !== "string" || !allowedValues.includes(value)) {
    return null;
  }
  return value;
}

async function POST(request: Request) {
  console.log("🚀 POST /api/user/save-onboarding-data called");

  try {
    console.log("🔍 Getting server session...");
    const session = await getServerSession(authOptions);
    console.log("📋 Session:", session);
    console.log("👤 Session user ID:", session?.user?.id);

    if (!session?.user?.id) {
      console.error("❌ No session or user ID found");
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    console.log("📥 Parsing request body...");
    const body = await request.json();
    console.log("📦 Request body:", body);

    const { userId, onboardingData } = body;
    console.log("🆔 User ID from body:", userId);
    console.log("📊 Onboarding data from body:", onboardingData);

    // 🔒 SECURITY: Validate userId format (should be UUID)
    console.log("🔍 Validating user ID format...");
    if (
      typeof userId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        userId
      )
    ) {
      console.error("❌ Invalid user ID format:", userId);
      return NextResponse.json(
        { error: "Invalid user ID format" },
        { status: 400 }
      );
    }
    console.log("✅ User ID format is valid");

    // Verify that the user is modifying their own data
    console.log("🔍 Verifying user authorization...");
    console.log("Session user ID:", session.user.id);
    console.log("Request user ID:", userId);
    console.log("IDs match:", session.user.id === userId);

    if (session.user.id !== userId) {
      console.error("❌ Unauthorized: user ID mismatch");
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    console.log("✅ User authorization verified");

    // Save user stats if present - using update instead of upsert
    console.log("🔍 Checking if onboarding data exists...");
    if (onboardingData) {
      console.log("✅ Onboarding data found, starting validation...");
      // 🔒 SECURITY: Validate all inputs before database operation
      const validatedData: Record<string, unknown> = {};

      // Validate display name
      console.log("📝 Raw onboardingName:", onboardingData.onboardingName);
      const displayName = validateString(onboardingData.onboardingName, 100);
      console.log("📝 Validated displayName:", displayName);
      if (!displayName) {
        return NextResponse.json(
          { error: "Invalid display name" },
          { status: 400 }
        );
      }
      validatedData.display_name = displayName;

      //  DEBUG: Log all raw values first
      console.log("🔍 Raw onboarding data values:");
      console.log("  weightKg:", {
        value: onboardingData.weightKg,
        type: typeof onboardingData.weightKg,
      });
      console.log("  targetWeightKg:", {
        value: onboardingData.targetWeightKg,
        type: typeof onboardingData.targetWeightKg,
      });
      console.log("  targetRate:", {
        value: onboardingData.targetRate,
        type: typeof onboardingData.targetRate,
      });
      console.log("  heightCm:", {
        value: onboardingData.heightCm,
        type: typeof onboardingData.heightCm,
      });
      console.log("  age:", {
        value: onboardingData.age,
        type: typeof onboardingData.age,
      });

      // Validate numeric fields with realistic ranges - PARSE THEM FIRST!
      const weight = validateNumber(onboardingData.weightKg, 20, 500);
      const startWeight = weight;
      const goalWeight = validateNumber(onboardingData.targetWeightKg, 20, 500);
      const height = validateNumber(onboardingData.heightCm, 50, 350);
      const age = validateNumber(onboardingData.age, 13, 120);
      const targetRate =
        onboardingData.targetRate != null
          ? validateNumber(onboardingData.targetRate, -2, 2)
          : null;

      // 🔍 DEBUG: Log parsed values
      console.log("🔍 Parsed validation results:");
      console.log("  Weight:", {
        raw: onboardingData.weightKg,
        parsed: weight,
        valid: !!weight,
      });
      console.log("  Goal Weight:", {
        raw: onboardingData.targetWeightKg,
        parsed: goalWeight,
        valid: !!goalWeight,
      });
      console.log("  Target Rate:", {
        raw: onboardingData.targetRate,
        parsed: targetRate,
        valid: !!targetRate,
      });
      console.log("  Height:", {
        raw: onboardingData.heightCm,
        parsed: height,
        valid: !!height,
      });
      console.log("  Age:", {
        raw: onboardingData.age,
        parsed: age,
        valid: !!age,
      });

      if (!weight || !goalWeight || !height || !age) {
        console.error("❌ Validation failed - missing required fields:");
        console.error("  Weight valid:", !!weight);
        console.error("  Goal Weight valid:", !!goalWeight);
        console.error(
          "  Target Rate:",
          targetRate,
          "(nullable - not required)"
        );
        console.error("  Height valid:", !!height);
        console.error("  Age valid:", !!age);

        return NextResponse.json(
          {
            error:
              "Invalid numeric values: weight, goal weight, height, or age",
            debug: {
              weight: {
                raw: onboardingData.weightKg,
                parsed: weight,
                valid: !!weight,
              },
              goalWeight: {
                raw: onboardingData.targetWeightKg,
                parsed: goalWeight,
                valid: !!goalWeight,
              },
              targetRate: {
                raw: onboardingData.targetRate,
                parsed: targetRate,
                nullable: true,
              },
              height: {
                raw: onboardingData.heightCm,
                parsed: height,
                valid: !!height,
              },
              age: { raw: onboardingData.age, parsed: age, valid: !!age },
            },
          },
          { status: 400 }
        );
      }

      // Validate enum fields
      const gender = validateEnum(onboardingData.gender, [
        "male",
        "female",
        "other",
      ]);
      const activityLevel = validateEnum(onboardingData.activityLevel, [
        "sedentary",
        "light",
        "moderate",
        "active",
        "very_active",
      ]);
      const goal = validateEnum(onboardingData.goal, [
        "lose",
        "maintain",
        "gain",
      ]);
      const unitPreference = validateEnum(onboardingData.preferredUnit, [
        "metric",
        "imperial",
      ]);

      if (!gender || !activityLevel || !goal || !unitPreference) {
        return NextResponse.json(
          {
            error:
              "Invalid enum values: gender, activity level, goal, or unit preference",
          },
          { status: 400 }
        );
      }

      // Validate macro targets
      const targetCalories = validateNumber(
        onboardingData.targetCalories,
        800,
        5000
      );
      const targetProtein = validateNumber(
        onboardingData.targetProtein,
        20,
        400
      );
      const targetCarbs = validateNumber(onboardingData.targetCarbs, 20, 800);
      const targetFat = validateNumber(onboardingData.targetFat, 20, 300);

      if (!targetCalories || !targetProtein || !targetCarbs || !targetFat) {
        return NextResponse.json(
          {
            error: "Invalid macro targets",
          },
          { status: 400 }
        );
      }

      // Build validated update object
      validatedData.weight = weight;
      validatedData.start_weight = startWeight;
      validatedData.goal_weight = goalWeight;
      validatedData.target_weekly_rate = targetRate;
      validatedData.height = height;
      validatedData.age = age;
      validatedData.gender = gender;
      validatedData.activity_level = activityLevel;
      validatedData.goal = goal;
      validatedData.unit_preference = unitPreference;
      validatedData.height_cm = height;
      validatedData.height_inches = validateNumber(
        onboardingData.heightInches,
        20,
        120
      );
      validatedData.height_unit = validateEnum(onboardingData.heightUnit, [
        "cm",
        "inch",
      ]);
      validatedData.weight_kg = weight;
      validatedData.weight_lbs = validateNumber(
        onboardingData.weightLbs,
        44,
        1100
      );
      validatedData.weight_unit = validateEnum(onboardingData.weightUnit, [
        "kg",
        "lbs",
      ]);
      validatedData.target_weight_kg = goalWeight;
      validatedData.target_weight_lbs = validateNumber(
        onboardingData.targetWeightLbs,
        44,
        1100
      );
      validatedData.diet_type = validateString(onboardingData.dietType, 50);
      validatedData.target_calories = targetCalories;
      validatedData.target_protein = targetProtein;
      validatedData.target_carbs = targetCarbs;
      validatedData.target_fat = targetFat;

      // Optional rest day macros
      validatedData.rest_day_calories = onboardingData.restDayCalories
        ? validateNumber(onboardingData.restDayCalories, 800, 5000)
        : null;
      validatedData.rest_day_protein = onboardingData.restDayProtein
        ? validateNumber(onboardingData.restDayProtein, 20, 400)
        : null;
      validatedData.rest_day_carbs = onboardingData.restDayCarbs
        ? validateNumber(onboardingData.restDayCarbs, 20, 800)
        : null;
      validatedData.rest_day_fat = onboardingData.restDayFat
        ? validateNumber(onboardingData.restDayFat, 20, 300)
        : null;

      validatedData.carb_cycling_enabled = Boolean(
        onboardingData.carbCyclingEnabled
      );
      validatedData.onboarding_completed = true;
      validatedData.updated_at = new Date().toISOString();

      console.log("💾 Saving validated data to database...");
      console.log("📊 Validated data to save:", validatedData);

      const { error: statsError } = await supabase
        .from("users")
        .update(validatedData)
        .eq("id", session.user.id); // 🔒 SECURITY: Use user ID instead of email

      if (statsError) {
        console.error("❌ Error saving user stats:", statsError);
        return NextResponse.json(
          { error: "Failed to save user stats" },
          { status: 500 }
        );
      }

      console.log("✅ User stats saved successfully");
      return NextResponse.json({ success: true });
    }

    console.log("📝 No onboarding data found, marking onboarding as completed");
    // Mark onboarding as completed if we didn't have stats to save
    const { error: userUpdateError } = await supabase
      .from("users")
      .update({
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (userUpdateError) {
      console.error(
        "❌ Error updating user onboarding status:",
        userUpdateError
      );
      return NextResponse.json(
        { error: "Failed to update onboarding status" },
        { status: 500 }
      );
    }

    console.log("✅ Onboarding marked as completed successfully");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error in save-onboarding-data API route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Export with error handling
const POSTHandler = withErrorHandling(POST);

export { POSTHandler as POST };
