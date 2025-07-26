import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { withErrorHandling } from "@/lib/api-error-handler";
import { secureError } from "@/lib/utils/secure-logger";
import {
  WebhookLocationService,
  type WebhookLocationResult,
} from "@/lib/services/webhook-location-service";
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
    const isAdminView = searchParams.get("admin") === "true";

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

    // Check permissions for admin view
    if (isAdminView) {
      const canViewAllReports = ["owner", "admin", "manager"].includes(
        employee.role
      );
      if (!canViewAllReports) {
        return NextResponse.json(
          { error: "Insufficient permissions to view all reports" },
          { status: 403 }
        );
      }
      // Admin view: show all company reports (no employee filter)
    } else {
      // Regular view: filter by employee if not manager/admin
      if (!["owner", "admin", "manager"].includes(employee.role)) {
        query = query.eq("employee_id", employee.id);
      }
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

    // Auto-fill weather data if we have coordinates and no weather data was provided
    let weatherData = null;
    let autoFilledData: Partial<CreateReportRequest> = {};

    // Only fetch weather if form didn't already provide it
    const hasFormWeatherData =
      reportData.air_temperature !== 0 || reportData.weather_data;

    if (site.latitude && site.longitude && !hasFormWeatherData) {
      try {
        // Use our secure weather API endpoint for consistency with date parameter
        const weatherResponse = await fetch(
          `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/snow-removal/weather?lat=${site.latitude}&lon=${site.longitude}&date=${reportData.date}`,
          {
            headers: {
              Cookie: req.headers.get("cookie") || "",
            },
          }
        );

        if (weatherResponse.ok) {
          weatherData = await weatherResponse.json();

          // Auto-fill weather-related fields
          autoFilledData = {
            air_temperature: weatherData.temperature,
            daytime_high: weatherData.daytime_high,
            daytime_low: weatherData.daytime_low,
            snowfall_accumulation_cm: weatherData.snowfall, // Already in cm from our API
            precipitation_type: weatherData.conditions,
            temperature_trend: weatherData.trend,
            conditions_upon_arrival: weatherData.conditions,
            weather_forecast_id: weatherData.forecast_id, // Track which forecast was used
            weather_data: {
              api_source: "openweathermap",
              temperature: weatherData.temperature,
              precipitation: weatherData.precipitation || 0,
              wind_speed: weatherData.wind_speed,
              conditions: weatherData.conditions,
              forecast_confidence: weatherData.forecast_confidence,
            },
          };
        }
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

    // Query webhook events near the site location
    let webhookEvents: WebhookLocationResult[] = [];
    if (site.latitude && site.longitude) {
      try {
        console.log(
          `🔍 Querying webhook events for site ${site.name} at ${site.latitude}, ${site.longitude} on ${reportData.date}`
        );

        webhookEvents = await WebhookLocationService.findEventsByLocationRadius(
          {
            latitude: site.latitude,
            longitude: site.longitude,
            date: reportData.date,
            radiusKm: 0.1, // 100 meters
          }
        );

        console.log(
          `📍 Found ${webhookEvents.length} webhook events within 100m of site ${site.name}`
        );

        if (webhookEvents.length > 0) {
          webhookEvents.forEach((event, index) => {
            console.log(
              `  Event ${index + 1}: ${event.event_type} at ${event.timestamp} (Vehicle: ${event.vehicle_id})`
            );
          });
        }
      } catch (error) {
        secureError("Error querying webhook events:", error);
        // Continue without webhook data - don't fail the report creation
      }
    }

    // Merge provided data with auto-filled data
    const finalReportData = {
      ...reportData,
      ...autoFilledData,
      employee_id: employee.id,
      operator: session.user.name || session.user.email || "Unknown",
      site_name: site.name,
      calculations,
      webhook_events: webhookEvents, // Store the associated webhook events
      webhook_events_count: webhookEvents.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Log weather data storage for debugging
    console.log(`🌤️ Weather data storage for site ${site.name}:`);
    console.log(
      `  - Form provided weather: ${hasFormWeatherData ? "Yes" : "No"}`
    );
    console.log(`  - Auto-fetched weather: ${weatherData ? "Yes" : "No"}`);
    if (finalReportData.weather_data) {
      console.log(
        `  - Weather API source: ${finalReportData.weather_data.api_source}`
      );
      console.log(
        `  - Temperature: ${finalReportData.weather_data.temperature}°C`
      );
      console.log(`  - Conditions: ${finalReportData.weather_data.conditions}`);
      console.log(
        `  - Precipitation: ${finalReportData.weather_data.precipitation}mm`
      );
      console.log(
        `  - Wind speed: ${finalReportData.weather_data.wind_speed}km/h`
      );
      console.log(
        `  - Forecast confidence: ${finalReportData.weather_data.forecast_confidence}%`
      );
    } else {
      console.log(`  - Weather data: Not included`);
    }

    // Create the report
    const { data: report, error } = await supabase
      .from("snow_removal_reports")
      .insert(finalReportData)
      .select()
      .single();

    if (error) throw error;

    // Confirm weather data was stored
    if (report.weather_data) {
      console.log(`✅ Weather data successfully stored in report ${report.id}`);
    } else {
      console.log(`⚠️ No weather data stored in report ${report.id}`);
    }

    return NextResponse.json(
      {
        report,
        webhook_events_found: webhookEvents.length,
      },
      { status: 201 }
    );
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
