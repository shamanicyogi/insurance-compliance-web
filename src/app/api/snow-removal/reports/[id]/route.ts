import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

import { secureError } from "@/lib/utils/secure-logger";
import type { UpdateReportRequest } from "@/types/snow-removal";

/**
 * GET /api/snow-removal/reports/[id]
 * Fetch a specific report by ID
 */
async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get employee record
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("is_active", true)
      .single();

    if (employeeError || !employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Fetch the report with site information
    const { data: report, error } = await supabase
      .from("snow_removal_reports")
      .select(
        `
        *,
        sites!inner(name, address, priority, latitude, longitude),
        employees!inner(employee_number)
      `
      )
      .eq("id", params.id)
      .eq("employee_id", employee.id)
      .single();

    if (error || !report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json({ report });
  } catch (error) {
    secureError("Error fetching snow removal report:", error);
    return NextResponse.json(
      { error: "Failed to fetch report" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/snow-removal/reports/[id]
 * Update a specific report (only if it's a draft)
 */
async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updateData: UpdateReportRequest = await req.json();

    // Get employee record
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("is_active", true)
      .single();

    if (employeeError || !employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Verify the report exists and belongs to the employee
    const { data: existingReport, error: fetchError } = await supabase
      .from("snow_removal_reports")
      .select("is_draft, submitted_at")
      .eq("id", params.id)
      .eq("employee_id", employee.id)
      .single();

    if (fetchError || !existingReport) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Only allow updates to draft reports
    if (!existingReport.is_draft || existingReport.submitted_at) {
      return NextResponse.json(
        { error: "Can only update draft reports" },
        { status: 403 }
      );
    }

    // Prepare update data (remove id from update fields)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...updateFields } = updateData;
    const finalUpdateData = {
      ...updateFields,
      updated_at: new Date().toISOString(),
    };

    // If submitting the report, add submission timestamp
    if (updateFields.is_draft === false) {
      finalUpdateData.submitted_at = new Date().toISOString();
    }

    // Update the report
    const { data: report, error } = await supabase
      .from("snow_removal_reports")
      .update(finalUpdateData)
      .eq("id", params.id)
      .eq("employee_id", employee.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ report });
  } catch (error) {
    secureError("Error updating snow removal report:", error);
    return NextResponse.json(
      { error: "Failed to update report" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/snow-removal/reports/[id]
 * Delete a specific report (only if it's a draft)
 */
async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get employee record
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("is_active", true)
      .single();

    if (employeeError || !employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Verify the report exists and belongs to the employee
    const { data: existingReport, error: fetchError } = await supabase
      .from("snow_removal_reports")
      .select("is_draft, submitted_at")
      .eq("id", params.id)
      .eq("employee_id", employee.id)
      .single();

    if (fetchError || !existingReport) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Only allow deletion of draft reports
    if (!existingReport.is_draft || existingReport.submitted_at) {
      return NextResponse.json(
        { error: "Can only delete draft reports" },
        { status: 403 }
      );
    }

    // Delete the report
    const { error } = await supabase
      .from("snow_removal_reports")
      .delete()
      .eq("id", params.id)
      .eq("employee_id", employee.id);

    if (error) throw error;

    return NextResponse.json({ message: "Report deleted successfully" });
  } catch (error) {
    secureError("Error deleting snow removal report:", error);
    return NextResponse.json(
      { error: "Failed to delete report" },
      { status: 500 }
    );
  }
}

export { GET, PUT, DELETE };
