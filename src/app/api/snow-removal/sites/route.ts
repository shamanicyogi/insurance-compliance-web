import { NextRequest, NextResponse } from "next/server";
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
    if (!session?.user?.id) {
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
    const canViewAllSites = ["owner", "admin", "manager", "employee"].includes(
      // TODO - Implement site assignment logic (i.e. remove "employee" from this list)
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

/**
 * POST /api/snow-removal/sites
 * Create a new site (managers and above only)
 */
async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get employee record with company and role info
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("company_id, role")
      .eq("user_id", session.user.id)
      .eq("is_active", true)
      .single();

    if (employeeError || !employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Check if user has permission to create sites (managers and above)
    const canManageSites = ["owner", "admin", "manager"].includes(
      employee.role
    );
    if (!canManageSites) {
      return NextResponse.json(
        { error: "Insufficient permissions to create sites" },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const {
      name,
      address,
      priority = "medium",
      size_sqft,
      typical_salt_usage_kg,
      contact_phone,
      special_instructions,
    } = body;

    // Validate required fields
    if (!name || !address) {
      return NextResponse.json(
        { error: "Name and address are required" },
        { status: 400 }
      );
    }

    // Validate priority
    if (!["high", "medium", "low"].includes(priority)) {
      return NextResponse.json(
        { error: "Priority must be high, medium, or low" },
        { status: 400 }
      );
    }

    // Create the site
    const { data: site, error: createError } = await supabase
      .from("sites")
      .insert({
        company_id: employee.company_id,
        name: name.trim(),
        address: address.trim(),
        priority,
        size_sqft: size_sqft ? parseInt(size_sqft) : null,
        typical_salt_usage_kg: typical_salt_usage_kg
          ? parseFloat(typical_salt_usage_kg)
          : null,
        contact_phone: contact_phone ? contact_phone.trim() : null,
        special_instructions: special_instructions
          ? special_instructions.trim()
          : null,
        is_active: true,
      })
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    return NextResponse.json(
      {
        message: "Site created successfully",
        site,
      },
      { status: 201 }
    );
  } catch (error) {
    secureError("Error creating site:", error);
    return NextResponse.json(
      { error: "Failed to create site" },
      { status: 500 }
    );
  }
}

// Wrap handlers with error handling
const wrappedGET = withErrorHandling(GET);
const wrappedPOST = withErrorHandling(POST);

export { wrappedGET as GET, wrappedPOST as POST };
