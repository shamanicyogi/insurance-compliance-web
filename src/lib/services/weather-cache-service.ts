import { supabaseAdmin } from "@/lib/supabase";

interface DailyWeatherData {
  temperature_high: number;
  temperature_low: number;
  temperature_avg: number;
  conditions: string; // Dominant condition for the day
  precipitation_total: number; // mm
  snowfall_total: number; // cm
  wind_speed_max: number;
  wind_speed_avg: number;
  temperature_trend: string;
  conditions_morning?: string;
  conditions_afternoon?: string;
  conditions_evening?: string;
  forecast_confidence: number;
  forecast_id?: string;
}

interface WeatherApiResponse {
  temperature: number;
  conditions: string;
  precipitation: number;
  snowfall: number;
  wind_speed: number;
  trend: string;
  forecast_confidence: number;
  daytime_high: number;
  daytime_low: number;
  forecast_id?: string;
}

export class WeatherCacheService {
  private supabase = supabaseAdmin;

  /**
   * Generate a cache key from coordinates and date
   * Rounds coordinates to 2 decimal places (~1km precision) for efficient caching
   */
  private generateCacheKey(lat: number, lon: number, date: string): string {
    const roundedLat = Math.round(lat * 100) / 100;
    const roundedLon = Math.round(lon * 100) / 100;
    return `weather_${roundedLat}_${roundedLon}_${date}`;
  }

  /**
   * Get rounded coordinates for cache storage
   */
  private getRoundedCoordinates(lat: number, lon: number) {
    return {
      latitude: Math.round(lat * 100) / 100,
      longitude: Math.round(lon * 100) / 100,
    };
  }

  /**
   * Get cached daily weather data for a specific date
   */
  async getCachedDailyWeather(
    lat: number,
    lon: number,
    date: string
  ): Promise<WeatherApiResponse | null> {
    try {
      const cacheKey = this.generateCacheKey(lat, lon, date);
      console.log(`🔍 [WEATHER CACHE] Looking up cache for key: ${cacheKey}`);

      const { data, error } = await this.supabase
        .from("weather_forecast_cache")
        .select(
          `
          temperature_high,
          temperature_low,
          temperature_avg,
          conditions,
          precipitation_total,
          snowfall_total,
          wind_speed_max,
          wind_speed_avg,
          temperature_trend,
          conditions_morning,
          conditions_afternoon,
          conditions_evening,
          forecast_confidence,
          forecast_id,
          cached_at,
          forecast_date
        `
        )
        .eq("cache_key", cacheKey)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No matching row found
          console.log(
            `❌ [WEATHER CACHE] Cache MISS - no data found for ${cacheKey}`
          );
          return null;
        }
        console.warn(
          "❌ [WEATHER CACHE] Database error fetching cached daily weather:",
          error
        );
        return null;
      }

      const cacheAge = Math.round(
        (Date.now() - new Date(data.cached_at).getTime()) / (1000 * 60)
      );
      console.log(`✅ [WEATHER CACHE] Cache HIT for ${cacheKey}:`);
      console.log(`   📅 Forecast Date: ${data.forecast_date}`);
      console.log(`   ⏰ Cached: ${cacheAge} minutes ago (${data.cached_at})`);
      console.log(
        `   🌡️  Temp: ${data.temperature_avg}°C (${data.temperature_low}°-${data.temperature_high}°)`
      );
      console.log(`   🌤️  Conditions: ${data.conditions}`);
      console.log(`   ❄️  Snowfall: ${data.snowfall_total}cm`);

      // Convert daily data back to the expected API format
      return {
        temperature: data.temperature_avg,
        conditions: data.conditions,
        precipitation: data.precipitation_total,
        snowfall: data.snowfall_total,
        wind_speed: data.wind_speed_avg,
        trend: data.temperature_trend || "steady",
        forecast_confidence: data.forecast_confidence || 0.9,
        daytime_high: data.temperature_high,
        daytime_low: data.temperature_low,
        forecast_id: data.forecast_id,
      };
    } catch (error) {
      console.warn(
        "❌ [WEATHER CACHE] Error accessing daily weather cache:",
        error
      );
      return null;
    }
  }

  /**
   * Store daily weather forecast data in cache
   */
  async cacheDailyWeatherData(
    lat: number,
    lon: number,
    date: string,
    weatherData: WeatherApiResponse,
    rawForecastData?: Record<string, unknown>
  ): Promise<boolean> {
    try {
      const cacheKey = this.generateCacheKey(lat, lon, date);
      const { latitude, longitude } = this.getRoundedCoordinates(lat, lon);

      console.log(`💾 [WEATHER CACHE] Storing weather data for ${cacheKey}:`);
      console.log(`   📅 Date: ${date}`);
      console.log(`   📍 Location: ${latitude}, ${longitude}`);
      console.log(
        `   🌡️  Temperature: ${weatherData.temperature}°C (${weatherData.daytime_low}°-${weatherData.daytime_high}°)`
      );
      console.log(`   🌤️  Conditions: ${weatherData.conditions}`);
      console.log(`   ❄️  Snowfall: ${weatherData.snowfall}cm`);

      // Convert API response to daily format
      const dailyData: DailyWeatherData = {
        temperature_high: weatherData.daytime_high,
        temperature_low: weatherData.daytime_low,
        temperature_avg: weatherData.temperature,
        conditions: weatherData.conditions,
        precipitation_total: weatherData.precipitation,
        snowfall_total: weatherData.snowfall,
        wind_speed_max: weatherData.wind_speed,
        wind_speed_avg: weatherData.wind_speed,
        temperature_trend: weatherData.trend,
        forecast_confidence: weatherData.forecast_confidence,
        forecast_id: weatherData.forecast_id,
      };

      const { error } = await this.supabase
        .from("weather_forecast_cache")
        .upsert(
          {
            cache_key: cacheKey,
            latitude,
            longitude,
            forecast_date: date,
            ...dailyData,
            raw_forecast_data: rawForecastData,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "cache_key",
          }
        );

      if (error) {
        console.error(
          "❌ [WEATHER CACHE] Error caching daily weather data:",
          error
        );
        return false;
      }

      console.log(
        `✅ [WEATHER CACHE] Successfully cached weather data for ${cacheKey}`
      );
      return true;
    } catch (error) {
      console.error(
        "❌ [WEATHER CACHE] Error storing daily weather cache:",
        error
      );
      return false;
    }
  }

  /**
   * Clean up old forecast entries (older than 7 days)
   */
  async cleanupOldForecasts(): Promise<number> {
    try {
      const { data, error } = await this.supabase.rpc(
        "cleanup_old_weather_forecasts"
      );

      if (error) {
        console.error("Error cleaning up old weather forecasts:", error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error("Error calling cleanup function:", error);
      return 0;
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  async getCacheStats(): Promise<{
    total_forecasts: number;
    forecasts_by_date: Record<string, number>;
    oldest_forecast: string | null;
    newest_forecast: string | null;
    unique_locations: number;
  }> {
    try {
      // Get total count
      const { count: totalCount } = await this.supabase
        .from("weather_forecast_cache")
        .select("*", { count: "exact", head: true });

      // Get forecasts by date
      const { data: byDate } = await this.supabase
        .from("weather_forecast_cache")
        .select("forecast_date")
        .order("forecast_date", { ascending: false });

      // Get date range
      const { data: oldestForecast } = await this.supabase
        .from("weather_forecast_cache")
        .select("forecast_date")
        .order("forecast_date", { ascending: true })
        .limit(1);

      const { data: newestForecast } = await this.supabase
        .from("weather_forecast_cache")
        .select("forecast_date")
        .order("forecast_date", { ascending: false })
        .limit(1);

      // Get unique locations count
      const { data: allLocations } = await this.supabase
        .from("weather_forecast_cache")
        .select("latitude, longitude");

      const uniqueLocations = allLocations
        ? Array.from(
            new Set(allLocations.map((l) => `${l.latitude},${l.longitude}`))
          )
        : [];

      // Count forecasts by date
      const forecastsByDate: Record<string, number> = {};
      byDate?.forEach((item) => {
        const date = item.forecast_date;
        forecastsByDate[date] = (forecastsByDate[date] || 0) + 1;
      });

      return {
        total_forecasts: totalCount || 0,
        forecasts_by_date: forecastsByDate,
        oldest_forecast: oldestForecast?.[0]?.forecast_date || null,
        newest_forecast: newestForecast?.[0]?.forecast_date || null,
        unique_locations: uniqueLocations?.length || 0,
      };
    } catch (error) {
      console.error("Error getting cache stats:", error);
      return {
        total_forecasts: 0,
        forecasts_by_date: {},
        oldest_forecast: null,
        newest_forecast: null,
        unique_locations: 0,
      };
    }
  }

  /**
   * Check if we should fetch new forecast data
   * For historical dates (yesterday and before), cache forever
   * For today and future dates, cache for a reasonable time
   */
  shouldRefreshForecast(date: string, cachedAt?: string): boolean {
    const forecastDate = new Date(date);
    const today = new Date();
    const cacheDate = cachedAt ? new Date(cachedAt) : null;

    // Reset time to compare just dates
    today.setHours(0, 0, 0, 0);
    forecastDate.setHours(0, 0, 0, 0);

    // For historical dates (yesterday and before), never refresh
    if (forecastDate < today) {
      return false;
    }

    // For today, refresh if cache is older than 6 hours
    if (forecastDate.getTime() === today.getTime()) {
      if (!cacheDate) return true;
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
      return cacheDate < sixHoursAgo;
    }

    // For future dates, refresh if cache is older than 12 hours
    if (!cacheDate) return true;
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    return cacheDate < twelveHoursAgo;
  }

  /**
   * Get multiple dates' weather data efficiently
   */
  async getCachedWeatherForDates(
    lat: number,
    lon: number,
    dates: string[]
  ): Promise<Record<string, WeatherApiResponse | null>> {
    try {
      const { latitude, longitude } = this.getRoundedCoordinates(lat, lon);

      const { data, error } = await this.supabase
        .from("weather_forecast_cache")
        .select("*")
        .eq("latitude", latitude)
        .eq("longitude", longitude)
        .in("forecast_date", dates);

      if (error) {
        console.warn("Error fetching multiple cached weather dates:", error);
        return {};
      }

      const result: Record<string, WeatherApiResponse | null> = {};

      dates.forEach((date) => {
        const cached = data?.find((item) => item.forecast_date === date);
        if (cached) {
          result[date] = {
            temperature: cached.temperature_avg,
            conditions: cached.conditions,
            precipitation: cached.precipitation_total,
            snowfall: cached.snowfall_total,
            wind_speed: cached.wind_speed_avg,
            trend: cached.temperature_trend || "steady",
            forecast_confidence: cached.forecast_confidence || 0.9,
            daytime_high: cached.temperature_high,
            daytime_low: cached.temperature_low,
            forecast_id: cached.forecast_id,
          };
        } else {
          result[date] = null;
        }
      });

      return result;
    } catch (error) {
      console.warn("Error getting cached weather for multiple dates:", error);
      return {};
    }
  }
}
