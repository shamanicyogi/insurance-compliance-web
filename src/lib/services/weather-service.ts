import { supabaseClient } from "../supabase-client";
import type {
  WeatherApiResponse,
  WeatherCondition,
  WeatherTrend,
} from "@/types/snow-removal";
import { secureError } from "../utils/secure-logger";

// Note: This service is now primarily for server-side use only
// Client-side weather requests should use /api/snow-removal/weather endpoint
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY; // Server-side only
const OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5";

// Cache weather data for 1 hour to avoid excessive API calls
const CACHE_DURATION_HOURS = 1;

export class WeatherService {
  private static async getCachedWeather(
    latitude: number,
    longitude: number,
    date: Date
  ): Promise<WeatherApiResponse | null> {
    try {
      // Skip caching on client side if not authenticated or if we don't have proper access
      if (typeof window !== "undefined") {
        // Client-side: skip caching to avoid permission issues
        return null;
      }

      const hour = date.getHours();
      const dateStr = date.toISOString().split("T")[0];

      const { data, error } = await supabaseClient
        .from("weather_cache")
        .select("weather_data")
        .eq("latitude", latitude)
        .eq("longitude", longitude)
        .eq("date", dateStr)
        .eq("hour", hour)
        .eq("api_source", "openweathermap")
        .gte("expires_at", new Date().toISOString())
        .single();

      if (error || !data) return null;

      return data.weather_data as WeatherApiResponse;
    } catch (error) {
      secureError("Error retrieving cached weather:", error);
      return null;
    }
  }

  private static async cacheWeather(
    latitude: number,
    longitude: number,
    date: Date,
    weatherData: WeatherApiResponse
  ): Promise<void> {
    try {
      // Skip caching on client side to avoid permission issues
      if (typeof window !== "undefined") {
        return;
      }

      const hour = date.getHours();
      const dateStr = date.toISOString().split("T")[0];
      const expiresAt = new Date(
        Date.now() + CACHE_DURATION_HOURS * 60 * 60 * 1000
      );

      await supabaseClient.from("weather_cache").upsert(
        {
          latitude,
          longitude,
          date: dateStr,
          hour,
          api_source: "openweathermap",
          weather_data: weatherData,
          expires_at: expiresAt.toISOString(),
        },
        {
          onConflict: "latitude,longitude,date,hour,api_source",
        }
      );
    } catch (error) {
      secureError("Error caching weather data:", error);
      // Don't throw - caching failure shouldn't break the weather lookup
    }
  }

  private static mapOpenWeatherCondition(
    condition: string,
    description: string
  ): WeatherCondition {
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

  private static calculateTrend(
    currentTemp: number,
    forecast: { main: { temp: number } }[]
  ): WeatherTrend {
    if (forecast.length === 0) return "steady";

    const futureTemp = forecast[0]?.main?.temp || currentTemp;
    const difference = futureTemp - currentTemp;

    if (difference > 2) return "up";
    if (difference < -2) return "down";
    return "steady";
  }

  public static async getCurrentWeather(
    latitude: number,
    longitude: number,
    date: Date = new Date()
  ): Promise<WeatherApiResponse> {
    // If no API key is available, return reasonable fallback data
    if (!OPENWEATHER_API_KEY) {
      console.warn(
        "OpenWeatherMap API key not configured, using fallback weather data"
      );

      // Generate more realistic winter weather data based on location and time
      const hour = date.getHours();
      const day = date.getDate();

      // Use location and time to create semi-realistic conditions
      const tempBase =
        -5 + Math.sin(latitude / 100 + (hour / 24) * Math.PI) * 8;
      const isSnowy = (day + Math.floor(latitude)) % 3 === 0;
      const isHeavySnow = (day + Math.floor(longitude)) % 7 === 0;

      return {
        temperature: Math.round(tempBase * 10) / 10,
        conditions: isHeavySnow ? "heavySnow" : isSnowy ? "lightSnow" : "clear",
        precipitation: isSnowy ? (isHeavySnow ? 8 : 3) : 0,
        snowfall: isSnowy ? (isHeavySnow ? 5 : 2) : 0,
        wind_speed: 5 + Math.sin((hour / 24) * Math.PI) * 10,
        trend: hour < 12 ? "up" : "down",
        forecast_confidence: 0.3, // Lower confidence for fallback data
      };
    }

    // Check cache first
    const cachedWeather = await this.getCachedWeather(
      latitude,
      longitude,
      date
    );
    if (cachedWeather) {
      return cachedWeather;
    }

    try {
      // Fetch current weather
      const currentWeatherUrl = `${OPENWEATHER_BASE_URL}/weather?lat=${latitude}&lon=${longitude}&appid=${OPENWEATHER_API_KEY}&units=metric`;
      const currentResponse = await fetch(currentWeatherUrl);

      if (!currentResponse.ok) {
        throw new Error(`OpenWeatherMap API error: ${currentResponse.status}`);
      }

      const currentData = await currentResponse.json();

      // Fetch 5-day forecast for trend analysis
      const forecastUrl = `${OPENWEATHER_BASE_URL}/forecast?lat=${latitude}&lon=${longitude}&appid=${OPENWEATHER_API_KEY}&units=metric`;
      const forecastResponse = await fetch(forecastUrl);
      const forecastData = forecastResponse.ok
        ? await forecastResponse.json()
        : { list: [] };

      // Extract weather data
      const temperature = currentData.main.temp;
      const conditions = this.mapOpenWeatherCondition(
        currentData.weather[0].main,
        currentData.weather[0].description
      );

      // Calculate precipitation (rain + snow)
      const precipitation =
        (currentData.rain?.["1h"] || 0) + (currentData.snow?.["1h"] || 0);
      const snowfall = currentData.snow?.["1h"] || 0;
      const windSpeed = currentData.wind?.speed || 0;

      // Calculate trend from forecast
      const trend = this.calculateTrend(temperature, forecastData.list || []);

      // Confidence score based on data availability and API response
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

      // Cache the result
      await this.cacheWeather(latitude, longitude, date, weatherData);

      return weatherData;
    } catch (error) {
      secureError("Error fetching weather data:", error);

      // Return fallback data with low confidence - use realistic winter conditions
      const now = new Date();
      const tempBase = -3 + Math.sin((now.getHours() / 24) * Math.PI) * 5;

      return {
        temperature: Math.round(tempBase * 10) / 10,
        conditions: "lightSnow", // Default to light snow for snow removal context
        precipitation: 2,
        snowfall: 1.5,
        wind_speed: 8,
        trend: "steady",
        forecast_confidence: 0.1,
      };
    }
  }

  public static async getLocationFromAddress(
    address: string
  ): Promise<{ latitude: number; longitude: number } | null> {
    if (!OPENWEATHER_API_KEY) {
      console.warn(
        "OpenWeatherMap API key not configured, cannot geocode address"
      );
      return null;
    }

    try {
      const geocodeUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(
        address
      )}&limit=1&appid=${OPENWEATHER_API_KEY}`;
      const response = await fetch(geocodeUrl);

      if (!response.ok) {
        throw new Error(`Geocoding API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.length === 0) {
        return null;
      }

      return {
        latitude: data[0].lat,
        longitude: data[0].lon,
      };
    } catch (error) {
      secureError("Error geocoding address:", error);
      return null;
    }
  }

  public static async getForecast(
    latitude: number,
    longitude: number
  ): Promise<{ high: number; low: number }> {
    if (!OPENWEATHER_API_KEY) {
      console.warn(
        "OpenWeatherMap API key not configured, using fallback forecast"
      );
      return { high: 5, low: -5 }; // Reasonable winter defaults
    }

    try {
      const forecastUrl = `${OPENWEATHER_BASE_URL}/forecast?lat=${latitude}&lon=${longitude}&appid=${OPENWEATHER_API_KEY}&units=metric`;
      const response = await fetch(forecastUrl);

      if (!response.ok) {
        throw new Error(`Forecast API error: ${response.status}`);
      }

      const data = await response.json();

      // Get temperatures for the next 24 hours (8 3-hour periods)
      const temps = data.list
        .slice(0, 8)
        .map((item: { main: { temp: number } }) => item.main.temp);

      return {
        high: Math.max(...temps),
        low: Math.min(...temps),
      };
    } catch (error) {
      secureError("Error fetching forecast:", error);
      return { high: 5, low: -5 }; // Fallback values
    }
  }

  // Clean up expired cache entries (call this periodically)
  public static async cleanExpiredCache(): Promise<void> {
    try {
      // Skip on client side since we don't cache there anyway
      if (typeof window !== "undefined") {
        return;
      }

      await supabaseClient
        .from("weather_cache")
        .delete()
        .lt("expires_at", new Date().toISOString());
    } catch (error) {
      secureError("Error cleaning weather cache:", error);
    }
  }
}
