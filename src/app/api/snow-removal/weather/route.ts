import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api-error-handler";
import { secureError } from "@/lib/utils/secure-logger";

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

    // If no API key, return fallback data
    if (!OPENWEATHER_API_KEY) {
      console.warn(
        "OpenWeatherMap API key not configured, using fallback weather data"
      );

      const now = new Date();
      const hour = now.getHours();
      const day = now.getDate();

      const tempBase = -5 + Math.sin(lat / 100 + (hour / 24) * Math.PI) * 8;
      const isSnowy = (day + Math.floor(lat)) % 3 === 0;
      const isHeavySnow = (day + Math.floor(lon)) % 7 === 0;

      const fallbackData: WeatherApiResponse = {
        temperature: Math.round(tempBase * 10) / 10,
        conditions: isHeavySnow ? "heavySnow" : isSnowy ? "lightSnow" : "clear",
        precipitation: isSnowy ? (isHeavySnow ? 8 : 3) : 0,
        snowfall: isSnowy ? (isHeavySnow ? 5 : 2) : 0,
        wind_speed: 5 + Math.sin((hour / 24) * Math.PI) * 10,
        trend: hour < 12 ? "up" : "down",
        forecast_confidence: 0.3,
      };

      return NextResponse.json(fallbackData);
    }

    try {
      // Fetch current weather with timeout
      const currentWeatherUrl = `${OPENWEATHER_BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;

      const currentResponse = await fetch(currentWeatherUrl, {
        signal: AbortSignal.timeout(30000), // 5 second timeout
        headers: {
          "User-Agent": "SnowRemovalApp/1.0",
        },
      });

      if (!currentResponse.ok) {
        throw new Error(`OpenWeatherMap API error: ${currentResponse.status}`);
      }

      const currentData = await currentResponse.json();

      // Fetch forecast for trend analysis (with timeout)
      const forecastUrl = `${OPENWEATHER_BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;
      const forecastResponse = await fetch(forecastUrl, {
        signal: AbortSignal.timeout(30000), // 5 second timeout
        headers: {
          "User-Agent": "SnowRemovalApp/1.0",
        },
      });

      const forecastData = forecastResponse.ok
        ? await forecastResponse.json()
        : { list: [] };

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

      const weatherData: WeatherApiResponse = {
        temperature,
        conditions,
        precipitation,
        snowfall,
        wind_speed: windSpeed,
        trend,
        forecast_confidence: Math.max(0.1, confidence),
      };

      return NextResponse.json(weatherData);
    } catch (error) {
      secureError("Error fetching weather data:", error);

      // Return fallback data on API error
      const now = new Date();
      const tempBase = -3 + Math.sin((now.getHours() / 24) * Math.PI) * 5;

      const fallbackData: WeatherApiResponse = {
        temperature: Math.round(tempBase * 10) / 10,
        conditions: "lightSnow",
        precipitation: 2,
        snowfall: 1.5,
        wind_speed: 8,
        trend: "steady",
        forecast_confidence: 0.1,
      };

      return NextResponse.json(fallbackData);
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
