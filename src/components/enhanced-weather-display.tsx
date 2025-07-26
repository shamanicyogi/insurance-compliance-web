"use client";

import React from "react";
import {
  Thermometer,
  TrendingUp,
  TrendingDown,
  Minus,
  Sun,
  Cloud,
  CloudRain,
  Snowflake,
  Eye,
  Clock,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface WeatherData {
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

interface EnhancedWeatherDisplayProps {
  weatherData: WeatherData | null;
  isLoading?: boolean;
  isFromCache?: boolean;
  cacheAge?: number; // minutes
  onRefresh?: () => void;
}

const getConditionIcon = (condition: string) => {
  const conditionLower = condition.toLowerCase();
  if (conditionLower.includes("clear")) return <Sun className="h-4 w-4" />;
  if (conditionLower.includes("snow")) return <Snowflake className="h-4 w-4" />;
  if (conditionLower.includes("rain")) return <CloudRain className="h-4 w-4" />;
  if (conditionLower.includes("cloud")) return <Cloud className="h-4 w-4" />;
  return <Eye className="h-4 w-4" />;
};

const getTrendIcon = (trend: string) => {
  switch (trend) {
    case "up":
      return <TrendingUp className="h-3 w-3 text-red-500" />;
    case "down":
      return <TrendingDown className="h-3 w-3 text-blue-500" />;
    default:
      return <Minus className="h-3 w-3 text-gray-500" />;
  }
};

const getTrendLabel = (trend: string) => {
  switch (trend) {
    case "up":
      return "Rising";
    case "down":
      return "Falling";
    default:
      return "Steady";
  }
};

export function EnhancedWeatherDisplay({
  weatherData,
  isLoading,
  isFromCache = false,
  cacheAge,
  onRefresh,
}: EnhancedWeatherDisplayProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Thermometer className="h-4 w-4 animate-pulse" />
            Loading Weather Data...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 bg-gray-200 rounded animate-pulse" />
                <div className="h-6 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!weatherData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Thermometer className="h-4 w-4" />
            Weather Conditions
            <Badge variant="outline">No Data</Badge>
          </CardTitle>
          <CardDescription>
            Weather data will be automatically fetched when a site is selected.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const confidencePercentage = Math.round(
    weatherData.forecast_confidence * 100
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Thermometer className="h-4 w-4" />
            <CardTitle>Weather Conditions</CardTitle>
            {isFromCache ? (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Cached
                {cacheAge && cacheAge < 60 && (
                  <span className="text-xs">({cacheAge}m ago)</span>
                )}
              </Badge>
            ) : (
              <Badge variant="default">Live Data</Badge>
            )}
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Refresh
            </button>
          )}
        </div>
        <CardDescription>
          Automatically retrieved weather data for this location and date.{" "}
          {confidencePercentage < 80 && (
            <span className="text-amber-600">
              (Confidence: {confidencePercentage}%)
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Primary Weather Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Current Temperature</p>
            <p className="text-2xl font-bold">
              {weatherData.temperature.toFixed(1)}°C
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Daily Range</p>
            <p className="text-lg font-semibold">
              {weatherData.daytime_low.toFixed(1)}° /{" "}
              {weatherData.daytime_high.toFixed(1)}°
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {getTrendIcon(weatherData.trend)}
              <span>{getTrendLabel(weatherData.trend)}</span>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Conditions</p>
            <div className="flex items-center gap-2">
              {getConditionIcon(weatherData.conditions)}
              <span className="text-sm font-medium">
                {weatherData.conditions.charAt(0).toUpperCase() +
                  weatherData.conditions.slice(1)}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Forecast Quality</p>
            <div className="space-y-1">
              <Progress value={confidencePercentage} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {confidencePercentage}% confidence
              </p>
            </div>
          </div>
        </div>

        {/* Secondary Weather Details */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-4 border-t">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Snowfall</p>
            <p className="text-lg font-semibold">
              {weatherData.snowfall > 0 ? (
                <span>{weatherData.snowfall} cm</span>
              ) : (
                <span>None</span>
              )}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Precipitation</p>
            <p className="text-lg font-semibold">
              {weatherData.precipitation > 0 ? (
                <span>{weatherData.precipitation} mm</span>
              ) : (
                <span>None</span>
              )}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Wind Speed</p>
            <p className="text-lg font-semibold">
              {weatherData.wind_speed.toFixed(1)} km/h
            </p>
          </div>
        </div>

        {/* Data Source Info */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Data will be automatically saved with your report</span>
              {weatherData.forecast_id && (
                <Badge variant="outline" className="text-xs">
                  ID: {weatherData.forecast_id.split("_")[1]?.slice(0, 8)}
                </Badge>
              )}
            </div>
            {isFromCache && cacheAge && cacheAge >= 60 && (
              <span className="text-amber-600">
                Cached {Math.floor(cacheAge / 60)}h {cacheAge % 60}m ago
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
