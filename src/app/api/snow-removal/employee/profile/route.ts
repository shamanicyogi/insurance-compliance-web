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
    console.log("Session:", {
      userId: session?.user?.id,
      email: session?.user?.email,
    });

    if (!session?.user?.id) {
      console.log("No session or user ID found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // First, check if employee exists at all
    const { data: employeeCheck, error: employeeCheckError } = await supabase
      .from("employees")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("is_active", true);

    console.log("Employee check result:", {
      count: employeeCheck?.length,
      error: employeeCheckError,
      userId: session.user.id,
    });

    if (employeeCheckError) {
      console.error("Employee check error:", employeeCheckError);
      return NextResponse.json(
        { error: "Database error checking employee" },
        { status: 500 }
      );
    }

    if (!employeeCheck || employeeCheck.length === 0) {
      console.log("No employee found for user");
      return NextResponse.json(
        { error: "Employee profile not found" },
        { status: 404 }
      );
    }

    // Now get employee with company info using left join instead of inner
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select(
        `
        *,
        companies(
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

    console.log("Employee with company result:", {
      employee: employee ? "found" : "not found",
      hasCompany: employee?.companies ? "yes" : "no",
      error: employeeError,
    });

    if (employeeError) {
      console.error("Employee with company error:", employeeError);
      return NextResponse.json(
        { error: "Failed to fetch employee profile" },
        { status: 500 }
      );
    }

    if (!employee) {
      console.log("Employee not found in second query");
      return NextResponse.json(
        { error: "Employee profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ employee });
  } catch (error) {
    console.error("API route error:", error);
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
