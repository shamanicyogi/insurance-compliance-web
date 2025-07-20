import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { secureError } from "@/lib/utils/secure-logger";
import { format } from "date-fns";

/**
 * GET /api/snow-removal/reports/[id]/pdf
 * Generate PDF for a specific report (managers and above only)
 */
async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: reportId } = await params;

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

    // Get the report with all related data
    const { data: report, error: reportError } = await supabase
      .from("snow_removal_reports")
      .select(
        `
        *,
        sites!inner(name, address, priority, company_id),
        employees!inner(employee_number)
      `
      )
      .eq("id", reportId)
      .single();

    if (reportError) {
      secureError("Error fetching report for PDF:", reportError);
      return NextResponse.json(
        { error: `Report query failed: ${reportError.message}` },
        { status: 500 }
      );
    }

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Verify report belongs to user's company
    if (report.sites?.company_id !== employee.company_id) {
      return NextResponse.json(
        { error: "Access denied to this report" },
        { status: 403 }
      );
    }

    // Get company information for the report
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("name, address, phone, email")
      .eq("id", employee.company_id)
      .single();

    if (companyError) {
      secureError("Error fetching company data for PDF:", companyError);
      // Continue without company data rather than failing
    }

    // Generate PDF content as HTML
    const htmlContent = generateReportHTML(report, company);

    // Return HTML content that can be opened in browser or saved
    const fileName = `snow-report-${(report.sites?.name || "unknown").replace(/[^a-zA-Z0-9]/g, "-")}-${format(new Date(report.date), "yyyy-MM-dd")}`;

    return new NextResponse(htmlContent, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="${fileName}.html"`,
        "Cache-Control": "no-cache",
      },
    });

    // TODO: Implement actual PDF generation
    // const pdfBuffer = await generatePDF(htmlContent);
    // return new NextResponse(pdfBuffer, {
    //   headers: {
    //     "Content-Type": "application/pdf",
    //     "Content-Disposition": `attachment; filename="snow-report-${report.sites?.name || 'unknown'}-${format(new Date(report.date), 'yyyy-MM-dd')}.pdf"`,
    //   },
    // });
  } catch (error) {
    secureError("Error generating PDF:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to generate PDF",
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

function generateReportHTML(
  report: any,
  company?: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
  } | null
): string {
  const formatTime = (timeString: string) => timeString || "Not set";
  const formatTemp = (temp: number) => `${temp}°C`;
  const formatCapitalized = (str: string) =>
    str?.replace(/([A-Z])/g, " $1").trim() || "";

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Snow Removal Report - ${report.sites?.name}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
            color: #333;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .company-info {
            font-size: 14px;
            color: #666;
            margin-bottom: 10px;
        }
        .report-title {
            font-size: 24px;
            font-weight: bold;
            color: #1e40af;
            margin: 10px 0;
        }
        .section {
            margin-bottom: 25px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 15px;
        }
        .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #374151;
            margin-bottom: 15px;
            border-bottom: 1px solid #d1d5db;
            padding-bottom: 5px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
        }
        .info-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px dotted #d1d5db;
        }
        .info-label {
            font-weight: bold;
            color: #4b5563;
        }
        .info-value {
            color: #111827;
        }
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .status-draft {
            background-color: #fef3c7;
            color: #92400e;
        }
        .status-submitted {
            background-color: #d1fae5;
            color: #065f46;
        }
        .comments {
            background-color: #f9fafb;
            padding: 15px;
            border-radius: 6px;
            border-left: 4px solid #6b7280;
            margin-top: 10px;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #9ca3af;
            border-top: 1px solid #e5e7eb;
            padding-top: 20px;
        }
        @media print {
            body { margin: 0; padding: 15px; }
            .section { break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-info">
            ${company?.name || "Snow Removal Company"}<br>
            ${company?.address || ""}<br>
            ${company?.phone || ""} | ${company?.email || ""}
        </div>
        <div class="report-title">Snow Removal Report</div>
        <div style="font-size: 16px; color: #6b7280;">
            ${report.sites?.name || report.site_name} - ${format(new Date(report.date), "EEEE, MMMM d, yyyy")}
        </div>
        <div style="margin-top: 10px;">
            <span class="status-badge ${report.is_draft ? "status-draft" : "status-submitted"}">
                ${report.is_draft ? "Draft" : "Submitted"}
            </span>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Basic Information</div>
        <div class="info-grid">
            <div class="info-item">
                <span class="info-label">Date:</span>
                <span class="info-value">${format(new Date(report.date), "MMMM d, yyyy")}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Operator:</span>
                <span class="info-value">${report.operator}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Employee #:</span>
                <span class="info-value">${report.employees?.employee_number || "N/A"}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Dispatched For:</span>
                <span class="info-value">${formatTime(report.dispatched_for)}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Start Time:</span>
                <span class="info-value">${formatTime(report.start_time)}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Finish Time:</span>
                <span class="info-value">${formatTime(report.finish_time)}</span>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Site Information</div>
        <div class="info-grid">
            <div class="info-item">
                <span class="info-label">Site Name:</span>
                <span class="info-value">${report.sites?.name || report.site_name}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Site Address:</span>
                <span class="info-value">${report.sites?.address || "Not specified"}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Priority:</span>
                <span class="info-value">${report.sites?.priority?.toUpperCase() || "Not specified"}</span>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Weather Conditions</div>
        <div class="info-grid">
            <div class="info-item">
                <span class="info-label">Air Temperature:</span>
                <span class="info-value">${formatTemp(report.air_temperature)}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Daytime High:</span>
                <span class="info-value">${formatTemp(report.daytime_high)}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Daytime Low:</span>
                <span class="info-value">${formatTemp(report.daytime_low)}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Temperature Trend:</span>
                <span class="info-value">${formatCapitalized(report.temperature_trend)}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Precipitation Type:</span>
                <span class="info-value">${formatCapitalized(report.precipitation_type)}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Conditions on Arrival:</span>
                <span class="info-value">${formatCapitalized(report.conditions_upon_arrival)}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Snowfall Accumulation:</span>
                <span class="info-value">${report.snowfall_accumulation_cm} cm</span>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Work Details</div>
        <div class="info-grid">
            <div class="info-item">
                <span class="info-label">Snow Removal Method:</span>
                <span class="info-value">${formatCapitalized(report.snow_removal_method)}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Follow Up Plans:</span>
                <span class="info-value">${formatCapitalized(report.follow_up_plans)}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Truck:</span>
                <span class="info-value">${report.truck || "Not specified"}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Tractor:</span>
                <span class="info-value">${report.tractor || "Not specified"}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Handwork:</span>
                <span class="info-value">${report.handwork || "Not specified"}</span>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Material Usage</div>
        <div class="info-grid">
            <div class="info-item">
                <span class="info-label">Salt Used:</span>
                <span class="info-value">${report.salt_used_kg || 0} kg</span>
            </div>
            <div class="info-item">
                <span class="info-label">Deicing Material:</span>
                <span class="info-value">${report.deicing_material_kg || 0} kg</span>
            </div>
            <div class="info-item">
                <span class="info-label">Salt Alternative:</span>
                <span class="info-value">${report.salt_alternative_kg || 0} kg</span>
            </div>
        </div>
    </div>

    ${
      report.gps_latitude && report.gps_longitude
        ? `
    <div class="section">
        <div class="section-title">GPS Location</div>
        <div class="info-grid">
            <div class="info-item">
                <span class="info-label">Coordinates:</span>
                <span class="info-value">${report.gps_latitude.toFixed(6)}, ${report.gps_longitude.toFixed(6)}</span>
            </div>
            ${
              report.gps_accuracy
                ? `
            <div class="info-item">
                <span class="info-label">Accuracy:</span>
                <span class="info-value">±${report.gps_accuracy}m</span>
            </div>
            `
                : ""
            }
        </div>
    </div>
    `
        : ""
    }

    ${
      report.comments
        ? `
    <div class="section">
        <div class="section-title">Comments</div>
        <div class="comments">
            ${report.comments}
        </div>
    </div>
    `
        : ""
    }

    <div class="section">
        <div class="section-title">Report Metadata</div>
        <div class="info-grid">
            <div class="info-item">
                <span class="info-label">Created:</span>
                <span class="info-value">${format(new Date(report.created_at), "PPpp")}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Updated:</span>
                <span class="info-value">${format(new Date(report.updated_at), "PPpp")}</span>
            </div>
            ${
              report.submitted_at
                ? `
            <div class="info-item">
                <span class="info-label">Submitted:</span>
                <span class="info-value">${format(new Date(report.submitted_at), "PPpp")}</span>
            </div>
            `
                : ""
            }
        </div>
    </div>

    <div class="footer">
        Generated on ${format(new Date(), "PPpp")} | ${company?.name || "Snow Removal System"}
    </div>
</body>
</html>`;
}

export { GET };
