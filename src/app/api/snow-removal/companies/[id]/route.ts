import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { secureError } from "@/lib/utils/secure-logger";
import type { UpdateCompanyRequest } from "@/types/snow-removal";

/**
 * GET /api/snow-removal/companies/[id]
 * Get company details
 */
async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user belongs to this company
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("company_id, role")
      .eq("user_id", session.user.id)
      .eq("company_id", params.id)
      .eq("is_active", true)
      .single();

    if (employeeError || !employee) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get company details
    const { data: company, error } = await supabase
      .from("companies")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error || !company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json({ company });
  } catch (error) {
    secureError("Error fetching company:", error);
    return NextResponse.json(
      { error: "Failed to fetch company" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/snow-removal/companies/[id]
 * Update company details (admin only)
 */
async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updateData: UpdateCompanyRequest = await req.json();

    // Verify user is admin of this company
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("company_id, role")
      .eq("user_id", session.user.id)
      .eq("company_id", params.id)
      .eq("is_active", true)
      .single();

    if (employeeError || !employee) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (!["owner", "admin"].includes(employee.role)) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Update company
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...updateFields } = updateData;
    const { data: company, error } = await supabase
      .from("companies")
      .update({
        ...updateFields,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ company });
  } catch (error) {
    secureError("Error updating company:", error);
    return NextResponse.json(
      { error: "Failed to update company" },
      { status: 500 }
    );
  }
}

export { GET, PUT };
