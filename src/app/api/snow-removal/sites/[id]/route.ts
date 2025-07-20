import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { secureError } from "@/lib/utils/secure-logger";

/**
 * PUT /api/snow-removal/sites/[id]
 * Update a site (managers and above only)
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

    const { id: siteId } = await params;

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

    // Verify site belongs to user's company
    const { data: existingSite, error: siteCheckError } = await supabase
      .from("sites")
      .select("company_id")
      .eq("id", siteId)
      .single();

    if (siteCheckError || !existingSite) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    if (existingSite.company_id !== employee.company_id) {
      return NextResponse.json(
        { error: "Access denied to this site" },
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

    // Prepare update data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {
      name: name.trim(),
      address: address.trim(),
      priority,
      updated_at: new Date().toISOString(),
    };

    // Add optional fields if provided
    if (size_sqft !== undefined) updateData.size_sqft = size_sqft;
    if (typical_salt_usage_kg !== undefined)
      updateData.typical_salt_usage_kg = typical_salt_usage_kg;
    if (latitude !== undefined) updateData.latitude = latitude;
    if (longitude !== undefined) updateData.longitude = longitude;
    if (contact_phone !== undefined)
      updateData.contact_phone = contact_phone?.trim() || null;
    if (special_instructions !== undefined)
      updateData.special_instructions = special_instructions?.trim() || null;

    // Update the site
    const { data: site, error } = await supabase
      .from("sites")
      .update(updateData)
      .eq("id", siteId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ site });
  } catch (error) {
    secureError("Error updating site:", error);
    return NextResponse.json(
      { error: "Failed to update site" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/snow-removal/sites/[id]
 * Delete a site (owners and admins only)
 */
async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: siteId } = await params;

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

    // Check if user has permission to delete sites (owners and admins only)
    const canDeleteSites = ["owner", "admin"].includes(employee.role);
    if (!canDeleteSites) {
      return NextResponse.json(
        { error: "Insufficient permissions to delete sites" },
        { status: 403 }
      );
    }

    // Verify site belongs to user's company
    const { data: existingSite, error: siteCheckError } = await supabase
      .from("sites")
      .select("company_id, name")
      .eq("id", siteId)
      .single();

    if (siteCheckError || !existingSite) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    if (existingSite.company_id !== employee.company_id) {
      return NextResponse.json(
        { error: "Access denied to this site" },
        { status: 403 }
      );
    }

    // Check if site has any reports associated with it
    const { data: reportsCount, error: reportsError } = await supabase
      .from("snow_removal_reports")
      .select("id", { count: "exact", head: true })
      .eq("site_id", siteId);

    if (reportsError) {
      secureError("Error checking site reports:", reportsError);
      return NextResponse.json(
        { error: "Failed to check site reports" },
        { status: 500 }
      );
    }

    // If site has reports, soft delete by marking as inactive
    // If no reports, hard delete the site
    if (reportsCount && reportsCount.length > 0) {
      // Soft delete - mark as inactive
      const { data: site, error: updateError } = await supabase
        .from("sites")
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", siteId)
        .select()
        .single();

      if (updateError) throw updateError;

      return NextResponse.json({
        message: "Site deactivated successfully (has existing reports)",
        site,
        soft_delete: true,
      });
    } else {
      // Hard delete - remove completely
      const { error: deleteError } = await supabase
        .from("sites")
        .delete()
        .eq("id", siteId);

      if (deleteError) throw deleteError;

      return NextResponse.json({
        message: "Site deleted successfully",
        soft_delete: false,
      });
    }
  } catch (error) {
    secureError("Error deleting site:", error);
    return NextResponse.json(
      { error: "Failed to delete site" },
      { status: 500 }
    );
  }
}

export { PUT, DELETE };
