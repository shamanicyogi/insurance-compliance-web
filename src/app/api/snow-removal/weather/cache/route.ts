import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api-error-handler";
import { WeatherCacheService } from "@/lib/services/weather-cache-service";

/**
 * GET /api/snow-removal/weather/cache
 * Get weather cache statistics and optionally clean up expired entries
 * Query params:
 *   - cleanup=true: Clean up expired entries
 *   - stats=true: Return cache statistics (default)
 */
async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Note: Cache management is available to authenticated users
    // Consider adding role-based access control if needed

    const { searchParams } = new URL(req.url);
    const shouldCleanup = searchParams.get("cleanup") === "true";
    const getStats = searchParams.get("stats") !== "false"; // Default to true

    const cacheService = new WeatherCacheService();

    let cleanupResult = null;
    if (shouldCleanup) {
      const deletedCount = await cacheService.cleanupOldForecasts();
      cleanupResult = {
        deleted_forecasts: deletedCount,
        cleaned_at: new Date().toISOString(),
      };
    }

    let stats = null;
    if (getStats) {
      stats = await cacheService.getCacheStats();
    }

    return NextResponse.json({
      success: true,
      stats,
      cleanup: cleanupResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in weather cache management:", error);
    return NextResponse.json(
      { error: "Failed to manage weather cache" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/snow-removal/weather/cache
 * Clean up expired cache entries
 */
async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Note: Cache cleanup is available to authenticated users
    // Consider adding role-based access control if needed

    const cacheService = new WeatherCacheService();
    const deletedCount = await cacheService.cleanupOldForecasts();

    return NextResponse.json({
      success: true,
      deleted_forecasts: deletedCount,
      cleaned_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error cleaning weather cache:", error);
    return NextResponse.json(
      { error: "Failed to clean weather cache" },
      { status: 500 }
    );
  }
}

// Wrap handlers with error handling
const wrappedGET = withErrorHandling(GET);
const wrappedDELETE = withErrorHandling(DELETE);

export { wrappedGET as GET, wrappedDELETE as DELETE };
