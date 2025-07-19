import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { secureError } from "@/lib/utils/secure-logger";

/**
 * GET /api/snow-removal/employee/profile
 * Get current user's employee profile with company info
 */
async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get employee profile with company info
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select(
        `
        *,
        companies!inner(
          id,
          name,
          slug,
          subscription_plan,
          subscription_status,
          is_active
        )
      `
      )
      .eq("user_id", session.user.id)
      .eq("is_active", true)
      .single();

    if (employeeError || !employee) {
      return NextResponse.json(
        { error: "Employee profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ employee });
  } catch (error) {
    secureError("Error fetching employee profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch employee profile" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/snow-removal/employee/profile
 * Update current user's employee profile
 */
async function PUT() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Note: For now, we'll allow minimal profile updates
    // More comprehensive employee management should be done by admins

    return NextResponse.json({
      message:
        "Profile updates should be requested through your company administrator",
    });
  } catch (error) {
    secureError("Error updating employee profile:", error);
    return NextResponse.json(
      { error: "Failed to update employee profile" },
      { status: 500 }
    );
  }
}

export { GET, PUT };
