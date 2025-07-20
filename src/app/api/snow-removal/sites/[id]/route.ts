import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { withErrorHandling } from "@/lib/api-error-handler";
import { secureError } from "@/lib/utils/secure-logger";

/**
 * PUT /api/snow-removal/sites/[id]
 * Update an existing site (managers and above only)
 */
async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

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

    // Check if user has permission to manage sites (managers and above)
    const canManageSites = ["owner", "admin", "manager"].includes(
      employee.role
    );
    if (!canManageSites) {
      return NextResponse.json(
        { error: "Insufficient permissions to update sites" },
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
      latitude,
      longitude,
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

    // Validate coordinates if provided
    if (
      latitude !== undefined &&
      (typeof latitude !== "number" || latitude < -90 || latitude > 90)
    ) {
      return NextResponse.json(
        { error: "Latitude must be a number between -90 and 90" },
        { status: 400 }
      );
    }

    if (
      longitude !== undefined &&
      (typeof longitude !== "number" || longitude < -180 || longitude > 180)
    ) {
      return NextResponse.json(
        { error: "Longitude must be a number between -180 and 180" },
        { status: 400 }
      );
    }

    // Verify the site belongs to the user's company
    const { data: existingSite, error: siteCheckError } = await supabase
      .from("sites")
      .select("id, company_id")
      .eq("id", id)
      .single();

    if (
      siteCheckError ||
      !existingSite ||
      existingSite.company_id !== employee.company_id
    ) {
      return NextResponse.json(
        { error: "Site not found or access denied" },
        { status: 404 }
      );
    }

    // Update the site
    const { data: site, error: updateError } = await supabase
      .from("sites")
      .update({
        name: name.trim(),
        address: address.trim(),
        priority,
        size_sqft: size_sqft ? parseInt(size_sqft) : null,
        typical_salt_usage_kg: typical_salt_usage_kg
          ? parseFloat(typical_salt_usage_kg)
          : null,
        latitude: latitude !== undefined ? latitude : null,
        longitude: longitude !== undefined ? longitude : null,
        contact_phone: contact_phone ? contact_phone.trim() : null,
        special_instructions: special_instructions
          ? special_instructions.trim()
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json(
      {
        message: "Site updated successfully",
        site,
      },
      { status: 200 }
    );
  } catch (error) {
    secureError("Error updating site:", error);
    return NextResponse.json(
      { error: "Failed to update site" },
      { status: 500 }
    );
  }
}

// Wrap handler with error handling
const wrappedPUT = withErrorHandling(PUT);

export { wrappedPUT as PUT };
