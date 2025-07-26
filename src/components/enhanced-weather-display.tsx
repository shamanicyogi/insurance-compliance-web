"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Cloud,
  CloudRain,
  CloudSnow,
  RefreshCw,
  Sun,
  Thermometer,
  Wind,
} from "lucide-react";

interface WeatherData {
  temperature: number;
  conditions: string;
  precipitation: number;
  wind_speed: number;
  forecast_confidence: number;
  daytime_high?: number;
  daytime_low?: number;
  snowfall?: number;
  trend?: string;
  isFromCache?: boolean;
  cacheAge?: number;
}

interface EnhancedWeatherDisplayProps {
  weatherData?: WeatherData;
  isLoading?: boolean;
  isFromCache?: boolean;
  cacheAge?: number;
  onRefresh?: () => void;
}

const getWeatherIcon = (conditions: string) => {
  const condition = conditions.toLowerCase();
  if (condition.includes("clear") || condition.includes("sunny")) {
    return <Sun className="h-5 w-5" />;
  } else if (condition.includes("snow")) {
    return <CloudSnow className="h-5 w-5" />;
  } else if (condition.includes("rain") || condition.includes("drizzle")) {
    return <CloudRain className="h-5 w-5" />;
  } else {
    return <Cloud className="h-5 w-5" />;
  }
};

const formatCacheAge = (minutes?: number): string => {
  if (!minutes) return "";
  if (minutes < 60) return `${Math.round(minutes)}m ago`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);
  if (remainingMinutes === 0) return `${hours}h ago`;
  return `${hours}h ${remainingMinutes}m ago`;
};

export function EnhancedWeatherDisplay({
  weatherData,
  isLoading = false,
  isFromCache = false,
  cacheAge,
  onRefresh,
}: EnhancedWeatherDisplayProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Thermometer className="h-5 w-5" />
            Weather Conditions
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Loading weather data...
          </p>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!weatherData) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Thermometer className="h-5 w-5" />
            Weather Conditions
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            No weather data available
          </p>
        </div>
        {onRefresh && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Load Weather
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Thermometer className="h-5 w-5" />
          Weather Conditions
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Automatically retrieved weather data for this location and date.
        </p>
        <div className="flex items-center gap-3 mt-2">
          {isFromCache && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              Cached {cacheAge ? formatCacheAge(cacheAge) : ""}
            </Badge>
          )}
          {onRefresh && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              className="h-7 px-2 text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current Temperature */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">
            Current Temperature
          </div>
          <div className="text-3xl font-bold">
            {weatherData.temperature.toFixed(1)}°C
          </div>
        </div>

        {/* Daily Range */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">
            Daily Range
          </div>
          <div className="text-xl font-semibold">
            {weatherData.daytime_low?.toFixed(1) ?? "—"}° /{" "}
            {weatherData.daytime_high?.toFixed(1) ?? "—"}°
          </div>
          {weatherData.trend && (
            <div className="text-sm text-muted-foreground">
              — {weatherData.trend}
            </div>
          )}
        </div>

        {/* Conditions */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">
            Conditions
          </div>
          <div className="flex items-center gap-2 text-lg font-medium">
            {getWeatherIcon(weatherData.conditions)}
            {weatherData.conditions}
          </div>
        </div>

        {/* Forecast Quality */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">
            Forecast Quality
          </div>
          <div className="space-y-2">
            <Progress
              value={weatherData.forecast_confidence * 100}
              className="h-2"
            />
            <div className="text-sm text-muted-foreground">
              {Math.round(weatherData.forecast_confidence * 100)}% confidence
            </div>
          </div>
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Snowfall */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">
            Snowfall
          </div>
          <div className="text-xl font-semibold">
            {weatherData.snowfall ? `${weatherData.snowfall} cm` : "None"}
          </div>
        </div>

        {/* Precipitation */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">
            Precipitation
          </div>
          <div className="text-xl font-semibold">
            {weatherData.precipitation > 0
              ? `${weatherData.precipitation.toFixed(1)} mm`
              : "None"}
          </div>
        </div>

        {/* Wind Speed */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">
            Wind Speed
          </div>
          <div className="flex items-center gap-2 text-xl font-semibold">
            <Wind className="h-4 w-4" />
            {weatherData.wind_speed.toFixed(1)} km/h
          </div>
        </div>
      </div>

      <Separator />

      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <span>Data will be automatically saved with your report</span>
        <span className="font-mono">
          ID: {Math.random().toString().slice(2, 10)}
        </span>
      </div>
    </div>
  );
}
