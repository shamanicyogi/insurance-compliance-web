export interface DailyMetrics {
  date: string;
  weight: number | null;
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } | null;
  sleep: {
    hours: number;
    quality: number;
  } | null;
  hydration: number | null;
  workouts:
    | {
        completed: boolean;
        type: string;
      }[]
    | null;
}

/**
 * Fetches combined metrics for a specific date
 * @param date The date to fetch metrics for in YYYY-MM-DD format
 * @returns Combined metrics for the specified date
 */
export async function getMetricsForDate(
  date: string
): Promise<DailyMetrics | null> {
  try {
    const response = await fetch(`/api/user/metrics?date=${date}`);

    if (!response.ok) {
      throw new Error("Failed to fetch metrics");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching metrics:", error);
    return null;
  }
}

/**
 * Fetches combined metrics for a date range
 * @param startDate The start date in YYYY-MM-DD format
 * @param endDate The end date in YYYY-MM-DD format
 * @returns Array of combined metrics for the specified date range
 */
export async function getMetricsForDateRange(
  startDate: string,
  endDate: string
): Promise<DailyMetrics[]> {
  try {
    const response = await fetch(
      `/api/user/metrics?startDate=${startDate}&endDate=${endDate}`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch metrics range");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching metrics range:", error);
    return [];
  }
}
