import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { secureError } from "@/lib/utils/secure-logger";
import { format } from "date-fns";

/**
 * GET /api/snow-removal/reports/export
 * Export filtered reports to Excel (managers and above only)
 */
async function GET(req: NextRequest) {
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

    // Check permissions - only managers and above can export
    const canExport = ["owner", "admin", "manager"].includes(employee.role);
    if (!canExport) {
      return NextResponse.json(
        { error: "Insufficient permissions to export reports" },
        { status: 403 }
      );
    }

    // Parse query parameters for filtering
    const { searchParams } = new URL(req.url);
    const filters = {
      search: searchParams.get("search") || "",
      site: searchParams.get("site") || "",
      employee: searchParams.get("employee") || "",
      status: searchParams.get("status") || "",
      method: searchParams.get("method") || "",
      dateFrom: searchParams.get("dateFrom") || "",
      dateTo: searchParams.get("dateTo") || "",
    };

    // Build query for reports with all related data
    let query = supabase
      .from("snow_removal_reports")
      .select(
        `
        *,
        sites (
          name,
          address, 
          priority,
          size_sqft,
          typical_salt_usage_kg,
          companies (name, address, phone, email)
        ),
        employees (
          employee_number,
          users (display_name, email)
        )
      `
      )
      .eq("sites.company_id", employee.company_id)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    // Apply filters
    if (filters.site) {
      query = query.eq("site_id", filters.site);
    }

    if (filters.employee) {
      query = query.eq("employee_id", filters.employee);
    }

    if (filters.status === "draft") {
      query = query.eq("is_draft", true);
    } else if (filters.status === "submitted") {
      query = query.eq("is_draft", false);
    }

    if (filters.method) {
      query = query.eq("snow_removal_method", filters.method);
    }

    if (filters.dateFrom) {
      query = query.gte("date", filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lte("date", filters.dateTo);
    }

    // Execute query
    const { data: reports, error } = await query;

    if (error) throw error;

    // Apply text search filter (after DB query for simplicity)
    let filteredReports = reports || [];
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredReports = filteredReports.filter((report) => {
        const searchFields = [
          report.sites?.name,
          report.operator,
          report.employees?.employee_number,
          report.site_name,
          report.employees?.users?.display_name,
        ].filter(Boolean);

        return searchFields.some((field) =>
          field?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Validate we have data to export
    if (!filteredReports || filteredReports.length === 0) {
      return NextResponse.json(
        { error: "No reports found to export" },
        { status: 404 }
      );
    }

    // Generate Excel-style CSV content
    const csvContent = generateCSV(filteredReports);

    // Validate CSV content was generated
    if (!csvContent || csvContent.trim().length === 0) {
      return NextResponse.json(
        { error: "Failed to generate CSV content" },
        { status: 500 }
      );
    }

    // Add BOM for better Excel compatibility
    const csvWithBOM = "\uFEFF" + csvContent;

    // Return as CSV (which Excel can open)
    return new NextResponse(csvWithBOM, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="snow-removal-reports-${format(new Date(), "yyyy-MM-dd-HHmm")}.csv"`,
        "Cache-Control": "no-cache",
      },
    });

    // TODO: For production, use a proper Excel library like xlsx
    // const workbook = await generateExcel(filteredReports);
    // return new NextResponse(workbook, {
    //   headers: {
    //     "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    //     "Content-Disposition": `attachment; filename="snow-removal-reports-${format(new Date(), 'yyyy-MM-dd-HHmm')}.xlsx"`,
    //   },
    // });
  } catch (error) {
    secureError("Error exporting reports:", error);
    return NextResponse.json(
      { error: "Failed to export reports" },
      { status: 500 }
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateCSV(reports: any[]): string {
  // CSV headers
  const headers = [
    "Date",
    "Site Name",
    "Site Address",
    "Site Priority",
    "Site Size (sqft)",
    "Employee Number",
    "Employee Name",
    "Employee Email",
    "Operator",
    "Status",
    "Dispatched For",
    "Start Time",
    "Finish Time",
    "Air Temperature (°C)",
    "Daytime High (°C)",
    "Daytime Low (°C)",
    "Temperature Trend",
    "Snowfall (cm)",
    "Precipitation Type",
    "Conditions on Arrival",
    "Snow Removal Method",
    "Follow Up Plans",
    "Truck",
    "Tractor",
    "Handwork",
    "Salt Used (kg)",
    "Deicing Material (kg)",
    "Salt Alternative (kg)",
    "GPS Latitude",
    "GPS Longitude",
    "GPS Accuracy (m)",
    "Comments",
    "Created At",
    "Updated At",
    "Submitted At",
    "Company Name",
    "Company Address",
    "Company Phone",
    "Company Email",
  ];

  // Escape CSV values
  const escapeCSV = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    const str = String(value).trim();
    if (
      str.includes('"') ||
      str.includes(",") ||
      str.includes("\n") ||
      str.includes("\r")
    ) {
      return `"${str.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
    }
    return str;
  };

  const formatTime = (timeString: string) => timeString || "";
  const formatCapitalized = (str: string) =>
    str?.replace(/([A-Z])/g, " $1").trim() || "";

  // Generate rows
  const rows = reports.map((report) => {
    try {
      return [
        format(new Date(report.date), "yyyy-MM-dd"),
        report.sites?.name || report.site_name || "",
        report.sites?.address || "",
        report.sites?.priority || "",
        report.sites?.size_sqft || "",
        report.employees?.employee_number || "",
        report.employees?.users?.display_name || "",
        report.employees?.users?.email || "",
        report.operator || "",
        report.is_draft ? "Draft" : "Submitted",
        formatTime(report.dispatched_for),
        formatTime(report.start_time),
        formatTime(report.finish_time),
        report.air_temperature || "",
        report.daytime_high || "",
        report.daytime_low || "",
        formatCapitalized(report.temperature_trend),
        report.snowfall_accumulation_cm || "",
        formatCapitalized(report.precipitation_type),
        formatCapitalized(report.conditions_upon_arrival),
        formatCapitalized(report.snow_removal_method),
        formatCapitalized(report.follow_up_plans),
        report.truck || "",
        report.tractor || "",
        report.handwork || "",
        report.salt_used_kg || "",
        report.deicing_material_kg || "",
        report.salt_alternative_kg || "",
        report.gps_latitude || "",
        report.gps_longitude || "",
        report.gps_accuracy || "",
        report.comments || "",
        format(new Date(report.created_at), "yyyy-MM-dd HH:mm:ss"),
        format(new Date(report.updated_at), "yyyy-MM-dd HH:mm:ss"),
        report.submitted_at
          ? format(new Date(report.submitted_at), "yyyy-MM-dd HH:mm:ss")
          : "",
        report.sites?.companies?.name || "",
        report.sites?.companies?.address || "",
        report.sites?.companies?.phone || "",
        report.sites?.companies?.email || "",
      ].map(escapeCSV);
    } catch (error) {
      console.error("Error processing report row:", error);
      // Return a row with basic info if processing fails
      return [
        "Error",
        report.sites?.name || report.site_name || "Unknown",
        "Processing Error",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ].map(escapeCSV);
    }
  });

  // Combine headers and rows
  const csvLines = [
    headers.map(escapeCSV).join(","),
    ...rows.map((row) => row.join(",")),
  ];

  return csvLines.join("\n");
}

export { GET };
