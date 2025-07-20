import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { WeatherService } from "@/lib/services/weather-service";
import { withErrorHandling } from "@/lib/api-error-handler";
import { secureError } from "@/lib/utils/secure-logger";
import type { CreateReportRequest } from "@/types/snow-removal";

/**
 * GET /api/snow-removal/reports
 * Fetch all reports for the authenticated employee
 */
async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const siteId = searchParams.get("site_id");
    const isDraft = searchParams.get("is_draft");

    // Get employee record with company info
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id, company_id, role")
      .eq("user_id", session.user.id)
      .eq("is_active", true)
      .single();

    if (employeeError || !employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Build company-aware query
    let query = supabase
      .from("snow_removal_reports")
      .select(
        `
        *,
        sites!inner(name, address, priority, company_id),
        employees!inner(employee_number, role, company_id)
      `
      )
      .eq("sites.company_id", employee.company_id)
      .eq("employees.company_id", employee.company_id);

    // Filter by employee if not manager/admin
    if (!["owner", "admin", "manager"].includes(employee.role)) {
      query = query.eq("employee_id", employee.id);
    }

    query = query
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    // Apply filters
    if (startDate) query = query.gte("date", startDate);
    if (endDate) query = query.lte("date", endDate);
    if (siteId) query = query.eq("site_id", siteId);
    if (isDraft !== null) query = query.eq("is_draft", isDraft === "true");

    const { data: reports, error } = await query;

    if (error) throw error;

    return NextResponse.json({ reports });
  } catch (error) {
    secureError("Error fetching snow removal reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/snow-removal/reports
 * Create a new snow removal report with automated weather data
 */
async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reportData: CreateReportRequest = await req.json();

    // Get employee record with company info
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id, company_id, site_assignments, role")
      .eq("user_id", session.user.id)
      .eq("is_active", true)
      .single();

    if (employeeError || !employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Verify employee has access to this site (either assigned or is manager+)
    const canAccessAnySite = ["owner", "admin", "manager", "employee"].includes(
      // TODO - Implement site assignment logic (i.e. remove "employee" from this list)
      employee.role
    );
    if (
      !canAccessAnySite &&
      !employee.site_assignments.includes(reportData.site_id)
    ) {
      return NextResponse.json(
        { error: "Access denied to this site" },
        { status: 403 }
      );
    }

    // Get site information for weather lookup and calculations
    const { data: site, error: siteError } = await supabase
      .from("sites")
      .select("*")
      .eq("id", reportData.site_id)
      .eq("company_id", employee.company_id)
      .single();

    if (siteError || !site) {
      return NextResponse.json(
        { error: "Site not found or access denied" },
        { status: 404 }
      );
    }

    // Auto-fill weather data if we have coordinates
    let weatherData = null;
    let forecastData = null;
    let autoFilledData: Partial<CreateReportRequest> = {};

    if (site.latitude && site.longitude) {
      try {
        weatherData = await WeatherService.getCurrentWeather(
          site.latitude,
          site.longitude
        );
        forecastData = await WeatherService.getForecast(
          site.latitude,
          site.longitude
        );

        // Auto-fill weather-related fields
        autoFilledData = {
          air_temperature: weatherData.temperature,
          daytime_high: forecastData.high,
          daytime_low: forecastData.low,
          snowfall_accumulation_cm: weatherData.snowfall * 10, // Convert mm to cm
          precipitation_type: weatherData.conditions,
          temperature_trend: weatherData.trend,
          conditions_upon_arrival: weatherData.conditions,
          weather_data: {
            api_source: "openweathermap",
            temperature: weatherData.temperature,
            precipitation: weatherData.precipitation,
            wind_speed: weatherData.wind_speed,
            conditions: weatherData.conditions,
            forecast_confidence: weatherData.forecast_confidence,
          },
        };
      } catch (error) {
        secureError("Weather API error:", error);
        // Continue without weather data
      }
    }

    // Auto-calculate material usage
    let calculations = null;
    try {
      const { data: calculationResult } = await supabase.rpc(
        "calculate_material_usage",
        {
          snowfall_cm: autoFilledData.snowfall_accumulation_cm || 0,
          site_size_sqft: site.size_sqft,
          temperature: autoFilledData.air_temperature || 0,
          conditions: autoFilledData.precipitation_type || "clear",
          company_id_param: employee.company_id,
        }
      );

      calculations = calculationResult;

      // Auto-fill recommended material amounts if not provided
      if (calculations && !reportData.salt_used_kg) {
        autoFilledData.salt_used_kg = calculations.salt_recommendation_kg;
      }
    } catch (error) {
      secureError("Error calculating material usage:", error);
    }

    // Merge provided data with auto-filled data
    const finalReportData = {
      ...reportData,
      ...autoFilledData,
      employee_id: employee.id,
      operator: session.user.name || session.user.email || "Unknown",
      site_name: site.name,
      calculations,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Create the report
    const { data: report, error } = await supabase
      .from("snow_removal_reports")
      .insert(finalReportData)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    secureError("Error creating snow removal report:", error);
    return NextResponse.json(
      { error: "Failed to create report" },
      { status: 500 }
    );
  }
}

// Wrap handlers with error handling
const wrappedGET = withErrorHandling(GET);
const wrappedPOST = withErrorHandling(POST);

export { wrappedGET as GET, wrappedPOST as POST };
