import { supabase } from "@/lib/supabase";
import { secureError } from "@/lib/utils/secure-logger";

export interface LocationQueryParams {
  latitude: number;
  longitude: number;
  date: string; // YYYY-MM-DD format
  radiusKm?: number; // Optional radius in kilometers for nearby matches
  eventTypes?: string[]; // Optional filter by event types
}

export interface WebhookLocationResult {
  id: string;
  source: string;
  event_type: string;
  vehicle_id: string | null;
  location: string | null;
  latitude: number;
  longitude: number;
  speed: number | null;
  timestamp: string;
  distance_km?: number; // Distance from queried location
  raw_payload: Record<string, unknown>;
  processed: boolean;
  created_at: string;
}

/**
 * Service for querying webhook events by location and date
 * Optimized for finding vehicle events near specific coordinates
 */
export class WebhookLocationService {
  /**
   * Find webhook events at exact coordinates for a specific date
   */
  static async findEventsByExactLocation(
    params: LocationQueryParams
  ): Promise<WebhookLocationResult[]> {
    try {
      let query = supabase
        .from("webhook_events")
        .select("*")
        .eq("source", "ram_tracking")
        .eq("latitude", params.latitude)
        .eq("longitude", params.longitude)
        .gte("timestamp", `${params.date} 00:00:00`)
        .lt("timestamp", `${params.date} 23:59:59`);

      if (params.eventTypes && params.eventTypes.length > 0) {
        query = query.in("event_type", params.eventTypes);
      }

      const { data, error } = await query.order("timestamp", {
        ascending: true,
      });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      secureError("Error finding events by exact location:", error);
      throw new Error("Failed to query events by location");
    }
  }

  /**
   * Find webhook events within a radius of coordinates for a specific date
   * Uses the Haversine formula for distance calculation
   */
  static async findEventsByLocationRadius(
    params: LocationQueryParams
  ): Promise<WebhookLocationResult[]> {
    const radiusKm = params.radiusKm || 0.1; // Default 100m radius

    try {
      // Calculate approximate lat/lng bounds for efficient querying
      const latRange = radiusKm / 111.32; // Roughly 1 degree = 111.32 km
      const lngRange =
        radiusKm / (111.32 * Math.cos((params.latitude * Math.PI) / 180));

      const minLat = params.latitude - latRange;
      const maxLat = params.latitude + latRange;
      const minLng = params.longitude - lngRange;
      const maxLng = params.longitude + lngRange;

      let query = supabase
        .from("webhook_events")
        .select("*")
        .eq("source", "ram_tracking")
        .gte("latitude", minLat)
        .lte("latitude", maxLat)
        .gte("longitude", minLng)
        .lte("longitude", maxLng)
        .gte("timestamp", `${params.date} 00:00:00`)
        .lt("timestamp", `${params.date} 23:59:59`);

      if (params.eventTypes && params.eventTypes.length > 0) {
        query = query.in("event_type", params.eventTypes);
      }

      const { data, error } = await query.order("timestamp", {
        ascending: true,
      });

      if (error) {
        throw error;
      }

      // Filter by exact distance and add distance to results
      const eventsWithDistance = (data || [])
        .map((event) => ({
          ...event,
          distance_km: this.calculateDistance(
            params.latitude,
            params.longitude,
            event.latitude,
            event.longitude
          ),
        }))
        .filter((event) => event.distance_km <= radiusKm)
        .sort((a, b) => a.distance_km - b.distance_km);

      return eventsWithDistance;
    } catch (error) {
      secureError("Error finding events by location radius:", error);
      throw new Error("Failed to query events by location radius");
    }
  }

  /**
   * Find all events for a specific date, grouped by unique locations
   * Useful for seeing all activity across different locations
   */
  static async findEventsByDate(
    date: string,
    eventTypes?: string[]
  ): Promise<WebhookLocationResult[]> {
    try {
      let query = supabase
        .from("webhook_events")
        .select("*")
        .eq("source", "ram_tracking")
        .gte("timestamp", `${date} 00:00:00`)
        .lt("timestamp", `${date} 23:59:59`);

      if (eventTypes && eventTypes.length > 0) {
        query = query.in("event_type", eventTypes);
      }

      const { data, error } = await query.order("timestamp", {
        ascending: true,
      });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      secureError("Error finding events by date:", error);
      throw new Error("Failed to query events by date");
    }
  }

  /**
   * Get summary statistics for a location and date
   */
  static async getLocationSummary(params: LocationQueryParams): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    uniqueVehicles: number;
    timeRange: { earliest: string; latest: string } | null;
  }> {
    try {
      const events = await this.findEventsByLocationRadius(params);

      const eventsByType: Record<string, number> = {};
      const uniqueVehicles = new Set<string>();
      let earliest: string | null = null;
      let latest: string | null = null;

      events.forEach((event) => {
        // Count events by type
        eventsByType[event.event_type] =
          (eventsByType[event.event_type] || 0) + 1;

        // Track unique vehicles
        if (event.vehicle_id) {
          uniqueVehicles.add(event.vehicle_id);
        }

        // Track time range
        if (!earliest || event.timestamp < earliest) {
          earliest = event.timestamp;
        }
        if (!latest || event.timestamp > latest) {
          latest = event.timestamp;
        }
      });

      return {
        totalEvents: events.length,
        eventsByType,
        uniqueVehicles: uniqueVehicles.size,
        timeRange: earliest && latest ? { earliest, latest } : null,
      };
    } catch (error) {
      secureError("Error getting location summary:", error);
      throw new Error("Failed to get location summary");
    }
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private static calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Find the closest events to a location within a time window
   * Useful for finding "likely matches" when exact coordinates don't match
   */
  static async findClosestEvents(
    latitude: number,
    longitude: number,
    date: string,
    maxDistanceKm: number = 1.0,
    limit: number = 10
  ): Promise<WebhookLocationResult[]> {
    const events = await this.findEventsByLocationRadius({
      latitude,
      longitude,
      date,
      radiusKm: maxDistanceKm,
    });

    return events.slice(0, limit);
  }
}
