import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api-error-handler";
import { secureError } from "@/lib/utils/secure-logger";
import { WeatherCacheService } from "@/lib/services/weather-cache-service";

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY; // Server-side only
const OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5";

interface WeatherApiResponse {
  temperature: number;
  conditions: string;
  precipitation: number;
  snowfall: number;
  wind_speed: number;
  trend: string;
  forecast_confidence: number;
  // Enhanced forecast data
  daytime_high: number;
  daytime_low: number;
  forecast_id?: string;
}

function mapOpenWeatherCondition(
  condition: string,
  description: string
): string {
  const conditionLower = condition.toLowerCase();
  const descriptionLower = description.toLowerCase();

  if (descriptionLower.includes("freezing")) return "freezingRain";
  if (descriptionLower.includes("sleet")) return "sleet";
  if (
    descriptionLower.includes("heavy snow") ||
    descriptionLower.includes("blizzard")
  )
    return "heavySnow";
  if (
    descriptionLower.includes("light snow") ||
    descriptionLower.includes("snow shower")
  )
    return "lightSnow";
  if (
    descriptionLower.includes("drifting") ||
    descriptionLower.includes("blowing snow")
  )
    return "driftingSnow";
  if (conditionLower.includes("snow")) return "lightSnow";
  if (conditionLower.includes("rain") || conditionLower.includes("drizzle"))
    return "rain";

  return "clear";
}

function calculateTrend(
  currentTemp: number,
  forecast: { main: { temp: number } }[]
): string {
  if (forecast.length === 0) return "steady";

  const futureTemp = forecast[0]?.main?.temp || currentTemp;
  const difference = futureTemp - currentTemp;

  if (difference > 2) return "up";
  if (difference < -2) return "down";
  return "steady";
}

/**
 * GET /api/snow-removal/weather
 * Fetch weather data for a specific location
 * Query params: lat, lon
 */
async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const latitude = searchParams.get("lat");
    const longitude = searchParams.get("lon");
    const dateParam = searchParams.get("date");
    const forceRefresh = searchParams.get("force") === "true";

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: "Latitude and longitude are required" },
        { status: 400 }
      );
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon)) {
      return NextResponse.json(
        { error: "Invalid latitude or longitude" },
        { status: 400 }
      );
    }

    // Use provided date or default to today
    const date = dateParam || new Date().toISOString().split("T")[0];

    // Initialize cache service
    const cacheService = new WeatherCacheService();

    // Check cache first (unless force refresh is requested)
    if (!forceRefresh) {
      console.log(
        `🔄 [WEATHER API] Checking cache for location ${lat},${lon} on ${date}`
      );
      const cachedData = await cacheService.getCachedDailyWeather(
        lat,
        lon,
        date
      );
      if (cachedData) {
        console.log(
          `🎯 [WEATHER API] ✅ CACHE HIT - returning cached data for ${lat},${lon} on ${date}`
        );
        console.log(
          `🚀 [WEATHER API] Saved OpenWeather API call! (cached data returned)`
        );
        return NextResponse.json(cachedData);
      }
      console.log(
        `🔄 [WEATHER API] ❌ CACHE MISS - will call OpenWeather API for ${lat},${lon} on ${date}`
      );
    } else {
      console.log(
        `🔄 [WEATHER API] 🔄 FORCE REFRESH requested for ${lat},${lon} on ${date} - bypassing cache`
      );
    }

    // If no API key, return error
    if (!OPENWEATHER_API_KEY) {
      return NextResponse.json(
        {
          error: "Weather service not configured. Please contact support.",
          code: "NO_API_KEY",
        },
        { status: 503 }
      );
    }

    // Helper function for retrying API calls
    const fetchWithRetry = async (
      url: string,
      maxRetries = 2
    ): Promise<Response> => {
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const timeout = 15000 + attempt * 5000; // 15s, 20s, 25s
          console.log(
            `Weather API attempt ${attempt + 1}/${maxRetries + 1} with ${timeout}ms timeout`
          );

          const response = await fetch(url, {
            signal: AbortSignal.timeout(timeout),
            headers: {
              "User-Agent": "SnowRemovalApp/1.0",
            },
          });

          return response; // Return successful response
        } catch (error) {
          lastError = error as Error;
          console.warn(
            `Weather API attempt ${attempt + 1} failed:`,
            lastError.message
          );

          // If it's the last attempt, throw the error
          if (attempt === maxRetries) {
            throw lastError;
          }

          // Wait before retrying (exponential backoff)
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      throw lastError || new Error("Unknown error in fetchWithRetry");
    };

    try {
      console.log(
        `🌐 [WEATHER API] 📡 Making OpenWeather API call for ${lat},${lon} on ${date}`
      );

      // Fetch current weather with retry logic
      const currentWeatherUrl = `${OPENWEATHER_BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;

      console.log(
        `🌐 [WEATHER API] Fetching current weather from OpenWeather...`
      );
      const currentResponse = await fetchWithRetry(currentWeatherUrl);

      if (!currentResponse.ok) {
        if (currentResponse.status === 401) {
          throw new Error(
            "Weather service authentication failed. Please contact support."
          );
        } else if (currentResponse.status === 429) {
          throw new Error(
            "Weather service rate limit exceeded. Please try again in a moment."
          );
        } else if (currentResponse.status >= 500) {
          throw new Error(
            "Weather service is temporarily unavailable. Please try again."
          );
        } else {
          throw new Error(
            `Weather service error (${currentResponse.status}). Please try again.`
          );
        }
      }

      const currentData = await currentResponse.json();

      // Fetch forecast for trend analysis (with retry)
      const forecastUrl = `${OPENWEATHER_BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;

      console.log(
        `🌐 [WEATHER API] Fetching 5-day forecast from OpenWeather...`
      );
      let forecastData = { list: [] };
      try {
        const forecastResponse = await fetchWithRetry(forecastUrl);
        forecastData = forecastResponse.ok
          ? await forecastResponse.json()
          : { list: [] };
        console.log(
          `🌐 [WEATHER API] ✅ Forecast data received (${forecastData.list?.length || 0} entries)`
        );
      } catch (error) {
        console.warn(
          "🌐 [WEATHER API] ⚠️ Forecast fetch failed, using empty data:",
          error
        );
        // Continue with empty forecast data instead of failing
      }

      // Extract weather data
      const temperature = currentData.main.temp;
      const conditions = mapOpenWeatherCondition(
        currentData.weather[0].main,
        currentData.weather[0].description
      );

      const precipitation =
        (currentData.rain?.["1h"] || 0) + (currentData.snow?.["1h"] || 0);
      const snowfall = currentData.snow?.["1h"] || 0;
      const windSpeed = currentData.wind?.speed || 0;
      const trend = calculateTrend(temperature, forecastData.list || []);

      let confidence = 0.9;
      if (!currentData.weather[0]) confidence -= 0.2;
      if (!currentData.main) confidence -= 0.3;
      if (forecastData.list?.length === 0) confidence -= 0.1;

      // Extract high/low from forecast data (next 24 hours)
      const now = new Date();
      const today = now.toISOString().split("T")[0];
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      console.log("Date filtering:", { today, tomorrow });

      const next24hForecasts =
        forecastData.list?.filter((item: { dt_txt: string }) => {
          const itemDate = item.dt_txt.split(" ")[0]; // Get YYYY-MM-DD part
          return itemDate === today || itemDate === tomorrow;
        }) || [];

      console.log("Filtered forecasts:", {
        total_forecasts: forecastData.list?.length || 0,
        next_24h_count: next24hForecasts.length,
        sample_dates: next24hForecasts
          .slice(0, 3)
          .map((item: { dt_txt: string }) => item.dt_txt),
      });

      let dayHigh = temperature;
      let dayLow = temperature;

      if (next24hForecasts.length > 0) {
        const temps = next24hForecasts.map(
          (item: { main: { temp: number } }) => item.main.temp
        );
        console.log("Extracted temperatures:", temps);
        dayHigh = Math.max(...temps, temperature); // Include current temp
        dayLow = Math.min(...temps, temperature); // Include current temp
        console.log("Calculated high/low:", { dayHigh, dayLow });
      } else {
        console.log("No forecast data found, using estimation");
        // Fallback: simple estimation based on time of day and seasonal patterns
        const hour = now.getHours();
        const dailyRange = 8; // Typical daily temperature range

        // Peak temperature usually around 2-4 PM, lowest around 6-8 AM
        const timeBasedOffset =
          Math.sin(((hour - 6) / 24) * 2 * Math.PI) * (dailyRange / 2);
        dayHigh = temperature + dailyRange / 2 - timeBasedOffset;
        dayLow = temperature - dailyRange / 2 - timeBasedOffset;
      }

      const weatherData: WeatherApiResponse = {
        temperature,
        conditions,
        precipitation,
        snowfall,
        wind_speed: windSpeed,
        trend,
        forecast_confidence: Math.max(0.1, confidence),
        daytime_high: Math.round(dayHigh * 10) / 10,
        daytime_low: Math.round(dayLow * 10) / 10,
        forecast_id: `owm_${currentData.dt}_${Date.now()}`,
      };

      console.log(
        `🌐 [WEATHER API] ✅ OpenWeather API data processed successfully:`
      );
      console.log(
        `   🌡️  Temperature: ${temperature}°C (${Math.round(dayLow * 10) / 10}° - ${Math.round(dayHigh * 10) / 10}°)`
      );
      console.log(`   🌤️  Conditions: ${conditions}`);
      console.log(`   ❄️  Snowfall: ${snowfall}cm`);
      console.log(
        `   📊 Confidence: ${Math.round(Math.max(0.1, confidence) * 100)}%`
      );

      // Cache the daily forecast for future requests
      const cacheSuccess = await cacheService.cacheDailyWeatherData(
        lat,
        lon,
        date,
        weatherData,
        { current: currentData, forecast: forecastData }
      );

      if (cacheSuccess) {
        console.log(
          `🎯 [WEATHER API] ✅ Weather data cached successfully for future requests`
        );
        console.log(
          `💰 [WEATHER API] Next request for ${lat},${lon} on ${date} will be served from cache!`
        );
      } else {
        console.warn(
          `❌ [WEATHER API] Failed to cache daily weather data for ${lat},${lon} on ${date}`
        );
      }

      console.log(
        `🚀 [WEATHER API] Returning fresh weather data from OpenWeather API`
      );
      return NextResponse.json(weatherData);
    } catch (error) {
      secureError("Error fetching weather data:", error);

      // Provide specific error messages based on error type
      let errorMessage = "Unable to fetch weather data. Please try again.";
      let errorCode = "WEATHER_FETCH_ERROR";

      if (error instanceof Error) {
        if (
          error.message.includes("timeout") ||
          error.name === "TimeoutError"
        ) {
          errorMessage =
            "Weather service is responding slowly. Please try again in a moment.";
          errorCode = "WEATHER_TIMEOUT";
        } else if (
          error.message.includes("network") ||
          error.message.includes("fetch")
        ) {
          errorMessage =
            "Network connection issue. Please check your internet connection.";
          errorCode = "NETWORK_ERROR";
        } else if (error.message.includes("authentication")) {
          errorMessage =
            "Weather service authentication failed. Please contact support.";
          errorCode = "AUTH_ERROR";
        }
      }

      return NextResponse.json(
        {
          error: errorMessage,
          code: errorCode,
          retryable: true,
          details:
            process.env.NODE_ENV === "development" && error instanceof Error
              ? error.message
              : undefined,
        },
        { status: 503 }
      );
    }
  } catch (error) {
    secureError("Error in weather API:", error);
    return NextResponse.json(
      { error: "Failed to fetch weather data" },
      { status: 500 }
    );
  }
}

// Wrap handler with error handling
const wrappedGET = withErrorHandling(GET);

export { wrappedGET as GET };
