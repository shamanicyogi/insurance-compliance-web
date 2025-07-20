import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { withErrorHandling } from "@/lib/api-error-handler";
import { secureError } from "@/lib/utils/secure-logger";

/**
 * GET /api/snow-removal/sites
 * Fetch all sites that the authenticated employee can access
 */
async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      // TODO - get id
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get employee record with company and role info
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("company_id, site_assignments, role")
      .eq("user_id", session.user.id)
      .eq("is_active", true)
      .single();

    if (employeeError || !employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Build query based on role
    let query = supabase
      .from("sites")
      .select("*")
      .eq("company_id", employee.company_id)
      .eq("is_active", true);

    // If not manager/admin, filter to assigned sites only
    const canViewAllSites = ["owner", "admin", "manager"].includes(
      employee.role
    );
    if (!canViewAllSites) {
      if (
        !employee.site_assignments ||
        employee.site_assignments.length === 0
      ) {
        return NextResponse.json({ sites: [] });
      }
      query = query.in("id", employee.site_assignments);
    }

    const { data: sites, error } = await query
      .order("priority", { ascending: true })
      .order("name", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ sites });
  } catch (error) {
    secureError("Error fetching sites:", error);
    return NextResponse.json(
      { error: "Failed to fetch sites" },
      { status: 500 }
    );
  }
}

// Wrap handler with error handling
const wrappedGET = withErrorHandling(GET);

export { wrappedGET as GET };
