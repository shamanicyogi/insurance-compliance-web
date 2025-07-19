import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { secureError } from "@/lib/utils/secure-logger";

/**
 * GET /api/snow-removal/companies/[id]/employees
 * Get all employees for a company (admin/owner only)
 */
async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is admin/owner of this company
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("company_id", params.id)
      .eq("is_active", true)
      .single();

    if (
      employeeError ||
      !employee ||
      !["owner", "admin"].includes(employee.role)
    ) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get all employees for the company
    const { data: employees, error } = await supabase
      .from("employees")
      .select("*")
      .eq("company_id", params.id)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ employees });
  } catch (error) {
    secureError("Error fetching company employees:", error);
    return NextResponse.json(
      { error: "Failed to fetch employees" },
      { status: 500 }
    );
  }
}

export { GET };
