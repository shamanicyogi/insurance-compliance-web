"use client";

import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
// import { useSession } from "next-auth/react";
import {
  MapPin,
  Clock,
  Thermometer,
  CloudSnow,
  Calculator,
  Save,
  Send,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

import type {
  Site,
  CreateReportRequest,
  WeatherCondition,
  WeatherTrend,
  SnowRemovalReportWithRelations,
} from "@/types/snow-removal";

interface WeatherData {
  temperature: number;
  conditions: WeatherCondition;
  snowfall: number;
  trend: WeatherTrend;
  forecast_confidence: number;
  // Enhanced forecast data from API
  daytime_high: number;
  daytime_low: number;
  forecast_id?: string;
}

interface Calculations {
  salt_recommendation_kg: number;
  material_cost_estimate: number;
  temperature_factor: number;
  condition_factor: number;
}

// Form validation schema
const snowRemovalSchema = z.object({
  site_id: z.string().min(1, "Site is required"),
  date: z.string().min(1, "Date is required"),
  dispatched_for: z.string().min(1, "Dispatch time is required"),
  start_time: z.string().min(1, "Start time is required"),
  finish_time: z.string().optional(),
  truck: z.string().optional(),
  tractor: z.string().optional(),
  handwork: z.string().optional(),
  snow_removal_method: z.enum([
    "plow",
    "shovel",
    "noAction",
    "salt",
    "combination",
  ]),
  follow_up_plans: z.enum([
    "allClear",
    "activeSnowfall",
    "monitorConditions",
    "returnInHour",
    "callSupervisor",
  ]),
  salt_used_kg: z.number().min(0).optional(),
  deicing_material_kg: z.number().min(0).optional(),
  salt_alternative_kg: z.number().min(0).optional(),
  comments: z.string().optional(),
  is_draft: z.boolean().default(true),
});

type FormData = z.infer<typeof snowRemovalSchema>;

interface SnowRemovalFormProps {
  reportId?: string;
  existingReport?: SnowRemovalReportWithRelations; // For editing drafts
  onSubmit?: (data: CreateReportRequest) => Promise<void>;
  className?: string;
}

const WeatherConditionBadge = ({
  condition,
}: {
  condition: WeatherCondition;
}) => {
  const colors = {
    clear: "bg-green-100 text-green-800",
    rain: "bg-blue-100 text-blue-800",
    lightSnow: "bg-gray-100 text-gray-800",
    heavySnow: "bg-slate-100 text-slate-800",
    driftingSnow: "bg-cyan-100 text-cyan-800",
    freezingRain: "bg-red-100 text-red-800",
    sleet: "bg-purple-100 text-purple-800",
  };

  const labels = {
    clear: "Clear",
    rain: "Rain",
    lightSnow: "Light Snow",
    heavySnow: "Heavy Snow",
    driftingSnow: "Drifting Snow",
    freezingRain: "Freezing Rain",
    sleet: "Sleet",
  };

  return <Badge className={colors[condition]}>{labels[condition]}</Badge>;
};

export function SnowRemovalForm({
  // reportId,
  existingReport,
  onSubmit,
  className,
}: SnowRemovalFormProps) {
  // const { data: session } = useSession();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [calculations, setCalculations] = useState<Calculations | null>(null);
  const [gpsLocation, setGpsLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // Manual weather input state (used when auto-fetch fails)
  const [manualWeather, setManualWeather] = useState({
    temperature: "",
    snowfall: "",
    conditions: "clear" as WeatherCondition,
    trend: "steady" as WeatherTrend,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(snowRemovalSchema),
    defaultValues: existingReport
      ? {
          // Use existing report data for editing
          site_id: existingReport.site_id,
          date: existingReport.date,
          dispatched_for: existingReport.dispatched_for,
          start_time: existingReport.start_time,
          finish_time: existingReport.finish_time || "",
          truck: existingReport.truck || "",
          tractor: existingReport.tractor || "",
          handwork: existingReport.handwork || "",
          snow_removal_method: existingReport.snow_removal_method,
          follow_up_plans: existingReport.follow_up_plans,
          salt_used_kg: existingReport.salt_used_kg || 0,
          deicing_material_kg: existingReport.deicing_material_kg || 0,
          salt_alternative_kg: existingReport.salt_alternative_kg || 0,
          comments: existingReport.comments || "",
          is_draft: existingReport.is_draft,
        }
      : {
          // Default values for new reports
          date: new Date().toISOString().split("T")[0],
          dispatched_for: new Date().toTimeString().slice(0, 5),
          start_time: new Date().toTimeString().slice(0, 5),
          is_draft: true,
          salt_used_kg: 0,
          deicing_material_kg: 0,
          salt_alternative_kg: 0,
          // Fix controlled/uncontrolled input warnings
          truck: "",
          tractor: "",
          handwork: "",
          finish_time: "",
          comments: "",
        },
  });

  const {
    watch,
    setValue,
    handleSubmit,
    control,
    formState: { errors, isValid },
  } = form;
  const selectedSiteId = watch("site_id");

  // Load sites on component mount
  useEffect(() => {
    const loadSites = async () => {
      try {
        const response = await fetch("/api/snow-removal/sites");
        if (response.ok) {
          const data = await response.json();
          setSites(data.sites);
        } else {
          toast.error("Failed to load sites");
        }
      } catch {
        toast.error("Error loading sites");
      } finally {
        setSitesLoading(false);
      }
    };

    loadSites();
  }, []);

  // Get GPS location (optional - won't break if unavailable)
  useEffect(() => {
    // Check if geolocation is available and permissions allow it
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      // Use a timeout to avoid hanging if permission dialog is ignored
      const timeoutId = setTimeout(() => {
        console.warn("GPS location request timed out");
      }, 5000);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeoutId);
          setGpsLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          clearTimeout(timeoutId);
          // Don't warn for permission denied - this is expected in many cases
          if (error.code !== error.PERMISSION_DENIED) {
            console.warn("GPS location not available:", error.message);
          }
        },
        {
          timeout: 5000,
          enableHighAccuracy: false,
          maximumAge: 300000, // 5 minutes
        }
      );
    }
  }, []);

  // Auto-calculate salt usage when manual weather data changes
  useEffect(() => {
    if (!weatherData && manualWeather.temperature !== "") {
      const selectedSite = sites.find((site) => site.id === selectedSiteId);
      if (selectedSite) {
        const baseRate = 0.1; // kg per sq ft base rate
        const siteSize = selectedSite.size_sqft || 10000; // Default to 10k sq ft if not set

        // Temperature factor: colder = more salt needed
        const tempFactor =
          parseFloat(manualWeather.temperature) < -10
            ? 1.4
            : parseFloat(manualWeather.temperature) < -5
              ? 1.2
              : parseFloat(manualWeather.temperature) < 0
                ? 1.1
                : 1.0;

        // Condition factor: more salt for snow/ice conditions
        const conditionFactor = manualWeather.conditions.includes("Snow")
          ? 1.3
          : manualWeather.conditions === "freezingRain"
            ? 1.4
            : manualWeather.conditions === "sleet"
              ? 1.2
              : 1.0;

        // Snowfall factor: more snow = more salt
        const snowfallFactor = 1 + parseFloat(manualWeather.snowfall) / 10; // 10cm = double the salt

        const saltRecommendation =
          baseRate * siteSize * tempFactor * conditionFactor * snowfallFactor;

        // Update the form with the calculated recommendation
        setValue("salt_used_kg", Math.round(saltRecommendation * 10) / 10);
      }
    }
  }, [manualWeather, sites, selectedSiteId, weatherData, setValue]);

  // Auto-fill weather data when site changes
  useEffect(() => {
    const autoFillWeatherData = async () => {
      if (!selectedSiteId) {
        console.log("No site selected, skipping weather fetch");
        // Clear weather data when no site is selected
        setWeatherData(null);
        setCalculations(null);
        setWeatherLoading(false);
        setWeatherError(null);
        return;
      }

      const selectedSite = sites.find((site) => site.id === selectedSiteId);
      console.log("Selected site:", selectedSite);

      if (!selectedSite?.latitude || !selectedSite?.longitude) {
        console.log("Site missing coordinates, skipping weather fetch");
        setWeatherData(null);
        setCalculations(null);
        setWeatherLoading(false);
        setWeatherError(null);
        return;
      }

      console.log(
        `Fetching weather for: ${selectedSite.name} (${selectedSite.latitude}, ${selectedSite.longitude})`
      );
      setWeatherLoading(true);

      try {
        // Get weather data from our secure API endpoint
        const weatherResponse = await fetch(
          `/api/snow-removal/weather?lat=${selectedSite.latitude}&lon=${selectedSite.longitude}`,
          {
            credentials: "include",
          }
        );

        console.log("Weather API response status:", weatherResponse.status);

        if (!weatherResponse.ok) {
          throw new Error(`Weather API error: ${weatherResponse.status}`);
        }

        const weatherData = await weatherResponse.json();
        console.log("Weather data received:", weatherData);
        console.log("Enhanced forecast data:", {
          temperature: weatherData.temperature,
          high: weatherData.daytime_high,
          low: weatherData.daytime_low,
          forecast_id: weatherData.forecast_id,
        });

        // Transform API response to our expected format
        const transformedWeatherData = {
          temperature: weatherData.temperature,
          conditions: weatherData.conditions,
          snowfall: weatherData.snowfall, // API already returns cm, no conversion needed
          trend: weatherData.trend,
          forecast_confidence: weatherData.forecast_confidence,
          // Enhanced forecast data from API
          daytime_high: weatherData.daytime_high,
          daytime_low: weatherData.daytime_low,
          forecast_id: weatherData.forecast_id,
        };

        // Calculate material usage (this could be moved to an API endpoint later)
        const calculateMaterialUsage = (weather: WeatherData, site: Site) => {
          const baseRate = 0.1; // kg per sq ft base rate
          const siteSize = site.size_sqft || 10000; // Default to 10k sq ft if not set

          // Temperature factor: colder = more salt needed
          const tempFactor =
            weather.temperature < -10
              ? 1.4
              : weather.temperature < -5
                ? 1.2
                : weather.temperature < 0
                  ? 1.1
                  : 1.0;

          // Condition factor: more salt for snow/ice conditions
          const conditionFactor = weather.conditions.includes("Snow")
            ? 1.3
            : weather.conditions === "freezingRain"
              ? 1.4
              : weather.conditions === "sleet"
                ? 1.2
                : 1.0;

          // Snowfall factor: more snow = more salt
          const snowfallFactor = 1 + weather.snowfall / 10; // 10cm = double the salt

          const saltRecommendation =
            baseRate * siteSize * tempFactor * conditionFactor * snowfallFactor;
          const costEstimate = saltRecommendation * 0.5; // $0.50 per kg estimate

          return {
            salt_recommendation_kg: Math.round(saltRecommendation * 10) / 10, // Round to 1 decimal
            material_cost_estimate: Math.round(costEstimate * 100) / 100, // Round to 2 decimals
            temperature_factor: tempFactor,
            condition_factor: conditionFactor,
          };
        };

        const calculations = calculateMaterialUsage(
          transformedWeatherData,
          selectedSite
        );

        setWeatherData(transformedWeatherData);
        setCalculations(calculations);
        setWeatherError(null); // Clear any previous errors

        // Auto-fill recommended amounts
        setValue("salt_used_kg", calculations.salt_recommendation_kg);

        toast.success("Weather data loaded successfully");
      } catch (error) {
        console.error("Failed to load weather data:", error);

        // Clear weather data on error
        setWeatherData(null);
        setCalculations(null);

        // Set error state
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to load weather data";
        setWeatherError(errorMessage);

        toast.error(errorMessage, {
          action: {
            label: "Retry",
            onClick: () => autoFillWeatherData(),
          },
        });
      } finally {
        setWeatherLoading(false);
      }
    };

    if (selectedSiteId && sites.length > 0) {
      autoFillWeatherData();
    }
  }, [selectedSiteId, sites, setValue]);

  const resetFormState = () => {
    // Reset the form to default values
    form.reset({
      date: new Date().toISOString().split("T")[0],
      dispatched_for: new Date().toTimeString().slice(0, 5),
      start_time: new Date().toTimeString().slice(0, 5),
      is_draft: true,
      salt_used_kg: undefined,
      deicing_material_kg: undefined,
      salt_alternative_kg: undefined,
      truck: "",
      tractor: "",
      handwork: "",
      finish_time: "",
      comments: "",
      site_id: "",
      snow_removal_method: undefined,
      follow_up_plans: undefined,
    });

    // Clear additional state
    setWeatherData(null);
    setCalculations(null);
    setGpsLocation(null);
    setWeatherError(null);
    setWeatherLoading(false);

    // Reset manual weather state
    setManualWeather({
      temperature: "",
      snowfall: "",
      conditions: "clear",
      trend: "steady",
    });

    // Force form to re-render with cleared values
    setTimeout(() => {
      form.trigger();
    }, 0);
  };

  const onFormSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      // Use weatherData if available, otherwise use manualWeather
      const weatherToUse = weatherData || {
        temperature: parseFloat(manualWeather.temperature) || 0,
        snowfall: parseFloat(manualWeather.snowfall) || 0,
        conditions: manualWeather.conditions,
        trend: manualWeather.trend,
        daytime_high: parseFloat(manualWeather.temperature) || 0, // Use same temp as fallback
        daytime_low: parseFloat(manualWeather.temperature) || 0, // Use same temp as fallback
        forecast_confidence: 0.5, // Default confidence for manual data
      };

      const reportData: CreateReportRequest = {
        ...data,
        // GPS coordinates as separate fields (matching database schema)
        gps_latitude: gpsLocation?.latitude,
        gps_longitude: gpsLocation?.longitude,
        gps_accuracy: gpsLocation ? 10 : undefined, // 10 meters accuracy
        // Include current weather data from form to ensure consistency
        air_temperature: weatherToUse.temperature,
        snowfall_accumulation_cm: weatherToUse.snowfall,
        precipitation_type: weatherToUse.conditions,
        temperature_trend: weatherToUse.trend,
        conditions_upon_arrival: weatherToUse.conditions,
        // Enhanced forecast data
        daytime_high: weatherToUse.daytime_high || weatherToUse.temperature,
        daytime_low: weatherToUse.daytime_low || weatherToUse.temperature,
        weather_forecast_id: weatherData?.forecast_id || undefined,
        // Auto-filled fields
        operator: "",
        site_name: "",
        salt_used_kg: data.salt_used_kg || 0,
        deicing_material_kg: data.deicing_material_kg || 0,
        salt_alternative_kg: data.salt_alternative_kg || 0,
        // Include weather data for storage
        weather_data: {
          api_source: weatherData ? "secure_endpoint" : "manual_input",
          temperature: weatherToUse.temperature,
          precipitation: 0,
          wind_speed: 0,
          conditions: weatherToUse.conditions,
          forecast_confidence: weatherToUse.forecast_confidence || 0.5,
        },
        // Include calculations
        calculations: {
          salt_recommendation_kg:
            calculations?.salt_recommendation_kg ||
            Math.max(10, weatherToUse.temperature < 0 ? 20 : 10),
          material_cost_estimate:
            calculations?.material_cost_estimate ||
            Math.max(5, weatherToUse.temperature < 0 ? 10 : 5),
          temperature_factor:
            calculations?.temperature_factor ||
            (weatherToUse.temperature < 0 ? 1.2 : 1.0),
          condition_factor:
            calculations?.condition_factor ||
            (weatherToUse.conditions.includes("Snow") ? 1.3 : 1.0),
          cost_per_kg: 0.5,
        },
      };

      if (onSubmit) {
        try {
          await onSubmit(reportData);
          // Always clear form after successful submission via callback
          resetFormState();
          toast.success(
            data.is_draft
              ? "Report saved as draft"
              : "Report submitted successfully"
          );
        } catch (error) {
          console.error("Error in onSubmit callback:", error);
          toast.error("Failed to save report");
        }
      } else {
        const response = await fetch("/api/snow-removal/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reportData),
        });

        if (response.ok) {
          // const result = await response.json();
          toast.success(
            data.is_draft
              ? "Report saved as draft"
              : "Report submitted successfully"
          );
          // Clear form after successful API submission
          resetFormState();
        } else {
          const error = await response.json();
          toast.error(error.message || "Failed to submit report");
        }
      }
    } catch {
      toast.error("Error submitting report");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = () => {
    setValue("is_draft", true);
    handleSubmit(onFormSubmit)();
  };

  const handleSubmitFinal = () => {
    setValue("is_draft", false);
    handleSubmit(onFormSubmit)();
  };

  return (
    <form
      onSubmit={handleSubmit(onFormSubmit)}
      className={`space-y-6 ${className}`}
    >
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudSnow className="h-5 w-5" />
            Snow Removal Report
          </CardTitle>
          <CardDescription>
            Complete your snow removal compliance report. Weather data and
            material calculations are automated.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* General Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            General Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Controller
                name="date"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="date"
                    id="date"
                    className={errors.date ? "border-red-500" : ""}
                  />
                )}
              />
              {errors.date && (
                <p className="text-sm text-red-500">{errors.date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dispatched_for">Dispatched For *</Label>
              <Controller
                name="dispatched_for"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="time"
                    id="dispatched_for"
                    className={errors.dispatched_for ? "border-red-500" : ""}
                  />
                )}
              />
              {errors.dispatched_for && (
                <p className="text-sm text-red-500">
                  {errors.dispatched_for.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="truck">Truck</Label>
              <Controller
                name="truck"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    value={field.value || ""}
                    id="truck"
                    placeholder="Truck identifier"
                  />
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tractor">Tractor</Label>
              <Controller
                name="tractor"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    value={field.value || ""}
                    id="tractor"
                    placeholder="Tractor identifier"
                  />
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="handwork">Handwork</Label>
              <Controller
                name="handwork"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    value={field.value || ""}
                    id="handwork"
                    placeholder="Manual work details"
                  />
                )}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Site Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Site Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="site_id">Site *</Label>
              {sitesLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Controller
                  name="site_id"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger
                        className={`w-full ${errors.site_id ? "border-red-500" : ""}`}
                      >
                        <SelectValue placeholder="Select a site" />
                      </SelectTrigger>
                      <SelectContent>
                        {sites.map((site) => (
                          <SelectItem key={site.id} value={site.id}>
                            <div className="flex items-center gap-2">
                              <span>{site.name}</span>
                              <Badge
                                variant={
                                  site.priority === "high"
                                    ? "destructive"
                                    : "secondary"
                                }
                              >
                                {site.priority}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
              {errors.site_id && (
                <p className="text-sm text-red-500">{errors.site_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_time">Start Time *</Label>
              <Controller
                name="start_time"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="time"
                    id="start_time"
                    className={errors.start_time ? "border-red-500" : ""}
                  />
                )}
              />
              {errors.start_time && (
                <p className="text-sm text-red-500">
                  {errors.start_time.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="finish_time">Finish Time</Label>
              <Controller
                name="finish_time"
                control={control}
                render={({ field }) => (
                  <Input {...field} type="time" id="finish_time" />
                )}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weather Information */}
      {weatherLoading ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Thermometer className="h-4 w-4" />
              Weather Conditions
              <Badge variant="secondary" className="animate-pulse">
                Fetching weather data...
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center space-y-2">
                <Skeleton className="h-4 w-20 mx-auto" />
                <Skeleton className="h-8 w-16 mx-auto" />
              </div>
              <div className="text-center space-y-2">
                <Skeleton className="h-4 w-16 mx-auto" />
                <Skeleton className="h-6 w-24 mx-auto" />
              </div>
              <div className="text-center space-y-2">
                <Skeleton className="h-4 w-20 mx-auto" />
                <Skeleton className="h-6 w-20 mx-auto" />
              </div>
              <div className="text-center space-y-2">
                <Skeleton className="h-4 w-16 mx-auto" />
                <Skeleton className="h-6 w-12 mx-auto" />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : weatherError ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Thermometer className="h-4 w-4" />
              Weather Conditions
              <Badge variant="outline">Manual Input</Badge>
            </CardTitle>
            <CardDescription>
              Auto-fetch failed. Please enter weather data manually.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {weatherError} - Using manual input mode.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="manual-temperature">Temperature (°C) *</Label>
                <Input
                  id="manual-temperature"
                  type="number"
                  step="0.1"
                  value={manualWeather.temperature}
                  onChange={(e) =>
                    setManualWeather((prev) => ({
                      ...prev,
                      temperature: e.target.value,
                    }))
                  }
                  placeholder="e.g., -5.5"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="manual-snowfall">Snowfall (cm)</Label>
                <Input
                  id="manual-snowfall"
                  type="number"
                  step="0.1"
                  min="0"
                  value={manualWeather.snowfall}
                  onChange={(e) =>
                    setManualWeather((prev) => ({
                      ...prev,
                      snowfall: e.target.value,
                    }))
                  }
                  placeholder="e.g., 2.5"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="manual-conditions">Weather Conditions *</Label>
                <Select
                  value={manualWeather.conditions}
                  onValueChange={(value: WeatherCondition) =>
                    setManualWeather((prev) => ({ ...prev, conditions: value }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clear">Clear</SelectItem>
                    <SelectItem value="rain">Rain</SelectItem>
                    <SelectItem value="lightSnow">Light Snow</SelectItem>
                    <SelectItem value="heavySnow">Heavy Snow</SelectItem>
                    <SelectItem value="driftingSnow">Drifting Snow</SelectItem>
                    <SelectItem value="freezingRain">Freezing Rain</SelectItem>
                    <SelectItem value="sleet">Sleet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="manual-trend">Temperature Trend</Label>
                <Select
                  value={manualWeather.trend}
                  onValueChange={(value: WeatherTrend) =>
                    setManualWeather((prev) => ({ ...prev, trend: value }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="up">Up</SelectItem>
                    <SelectItem value="down">Down</SelectItem>
                    <SelectItem value="steady">Steady</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const selectedSite = sites.find(
                    (site) => site.id === selectedSiteId
                  );
                  if (selectedSite?.latitude && selectedSite?.longitude) {
                    setWeatherError(null);
                    // Trigger the weather fetch by calling the useEffect dependency
                    setValue("site_id", selectedSiteId);
                  }
                }}
                className="text-sm"
              >
                Retry Auto-Fetch
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : weatherData ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Thermometer className="h-4 w-4" />
              Weather Conditions
              <Badge variant="secondary">Auto-filled</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Current Temp</p>
                <p className="text-2xl font-bold">
                  {weatherData.temperature}°C
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">High / Low</p>
                <p className="text-lg font-semibold">
                  {weatherData.daytime_high?.toFixed(1)}° /{" "}
                  {weatherData.daytime_low?.toFixed(1)}°
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Conditions</p>
                <WeatherConditionBadge condition={weatherData.conditions} />
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Snowfall</p>
                <p className="text-lg font-semibold">
                  {weatherData.snowfall} cm
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : selectedSiteId ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Thermometer className="h-4 w-4" />
              Weather Conditions
              <Badge variant="outline">Manual Input</Badge>
            </CardTitle>
            <CardDescription>
              Enter weather conditions for this report.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="manual-temperature-fallback">
                  Temperature (°C) *
                </Label>
                <Input
                  id="manual-temperature-fallback"
                  type="number"
                  step="0.1"
                  value={manualWeather.temperature}
                  onChange={(e) =>
                    setManualWeather((prev) => ({
                      ...prev,
                      temperature: e.target.value,
                    }))
                  }
                  placeholder="e.g., -5.5"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="manual-snowfall-fallback">Snowfall (cm)</Label>
                <Input
                  id="manual-snowfall-fallback"
                  type="number"
                  step="0.1"
                  min="0"
                  value={manualWeather.snowfall}
                  onChange={(e) =>
                    setManualWeather((prev) => ({
                      ...prev,
                      snowfall: e.target.value,
                    }))
                  }
                  placeholder="e.g., 2.5"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="manual-conditions-fallback">
                  Weather Conditions *
                </Label>
                <Select
                  value={manualWeather.conditions}
                  onValueChange={(value: WeatherCondition) =>
                    setManualWeather((prev) => ({ ...prev, conditions: value }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clear">Clear</SelectItem>
                    <SelectItem value="rain">Rain</SelectItem>
                    <SelectItem value="lightSnow">Light Snow</SelectItem>
                    <SelectItem value="heavySnow">Heavy Snow</SelectItem>
                    <SelectItem value="driftingSnow">Drifting Snow</SelectItem>
                    <SelectItem value="freezingRain">Freezing Rain</SelectItem>
                    <SelectItem value="sleet">Sleet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="manual-trend-fallback">Temperature Trend</Label>
                <Select
                  value={manualWeather.trend}
                  onValueChange={(value: WeatherTrend) =>
                    setManualWeather((prev) => ({ ...prev, trend: value }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="up">Up</SelectItem>
                    <SelectItem value="down">Down</SelectItem>
                    <SelectItem value="steady">Steady</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Work Details */}
      <Card>
        <CardHeader>
          <CardTitle>Work Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="snow_removal_method">Snow Removal Method *</Label>
              <Controller
                name="snow_removal_method"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger
                      className={`w-full ${
                        errors.snow_removal_method ? "border-red-500" : ""
                      }`}
                    >
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="plow">Plow</SelectItem>
                      <SelectItem value="shovel">Shovel</SelectItem>
                      <SelectItem value="salt">Salt Only</SelectItem>
                      <SelectItem value="combination">Combination</SelectItem>
                      <SelectItem value="noAction">No Action</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.snow_removal_method && (
                <p className="text-sm text-red-500">
                  {errors.snow_removal_method.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="follow_up_plans">Follow-up Plans *</Label>
              <Controller
                name="follow_up_plans"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger
                      className={`w-full ${errors.follow_up_plans ? "border-red-500" : ""}`}
                    >
                      <SelectValue placeholder="Select follow-up plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="allClear">
                        All Clear, will monitor
                      </SelectItem>
                      <SelectItem value="activeSnowfall">
                        Active Snowfall, will return for additional clearance at
                        1cm of accumulation
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.follow_up_plans && (
                <p className="text-sm text-red-500">
                  {errors.follow_up_plans.message}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Material Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Material Usage
            {weatherLoading && (
              <Badge variant="secondary" className="animate-pulse">
                Calculating...
              </Badge>
            )}
            {calculations && !weatherLoading && (
              <Badge variant="secondary">Auto-calculated</Badge>
            )}
          </CardTitle>
          {calculations && !weatherLoading && (
            <CardDescription>
              Recommended amounts based on site size, weather conditions, and
              temperature.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {weatherLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          ) : (
            <>
              {calculations && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Recommended salt usage:{" "}
                    {calculations.salt_recommendation_kg} kg (Estimated cost: $
                    {calculations.material_cost_estimate})
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="salt_used_kg">Salt Used (kg)</Label>
                  <Controller
                    name="salt_used_kg"
                    control={control}
                    render={({ field: { onChange, value, ...field } }) => (
                      <Input
                        {...field}
                        type="number"
                        step="0.1"
                        min="0"
                        value={
                          value !== undefined && value !== null
                            ? String(value)
                            : ""
                        }
                        onChange={(e) =>
                          onChange(
                            e.target.value
                              ? parseFloat(e.target.value)
                              : undefined
                          )
                        }
                        id="salt_used_kg"
                      />
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deicing_material_kg">
                    Deicing Material (kg)
                  </Label>
                  <Controller
                    name="deicing_material_kg"
                    control={control}
                    render={({ field: { onChange, value, ...field } }) => (
                      <Input
                        {...field}
                        type="number"
                        step="0.1"
                        min="0"
                        value={
                          value !== undefined && value !== null
                            ? String(value)
                            : ""
                        }
                        onChange={(e) =>
                          onChange(
                            e.target.value
                              ? parseFloat(e.target.value)
                              : undefined
                          )
                        }
                        id="deicing_material_kg"
                      />
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salt_alternative_kg">
                    Salt Alternative (kg)
                  </Label>
                  <Controller
                    name="salt_alternative_kg"
                    control={control}
                    render={({ field: { onChange, value, ...field } }) => (
                      <Input
                        {...field}
                        type="number"
                        step="0.1"
                        min="0"
                        value={
                          value !== undefined && value !== null
                            ? String(value)
                            : ""
                        }
                        onChange={(e) =>
                          onChange(
                            e.target.value
                              ? parseFloat(e.target.value)
                              : undefined
                          )
                        }
                        id="salt_alternative_kg"
                      />
                    )}
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Comments */}
      <Card>
        <CardHeader>
          <CardTitle>Comments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="comments">Additional Comments</Label>
            <Controller
              name="comments"
              control={control}
              render={({ field }) => (
                <Textarea
                  {...field}
                  id="comments"
                  placeholder="Any additional observations, issues, or notes..."
                  className="min-h-[100px]"
                />
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={handleSaveDraft}
          disabled={loading || !isValid}
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          Save Draft
        </Button>
        <Button
          type="button"
          onClick={handleSubmitFinal}
          disabled={loading || !isValid}
          className="flex items-center gap-2"
        >
          <Send className="h-4 w-4" />
          Submit Report
        </Button>
      </div>
    </form>
  );
}
