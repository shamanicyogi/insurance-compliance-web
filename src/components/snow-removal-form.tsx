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
} from "@/types/snow-removal";

interface WeatherData {
  temperature: number;
  conditions: WeatherCondition;
  snowfall: number;
  trend: WeatherTrend;
  forecast_confidence: number;
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
  onSubmit?: (data: CreateReportRequest) => void;
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
  onSubmit,
  className,
}: SnowRemovalFormProps) {
  // const { data: session } = useSession();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [calculations, setCalculations] = useState<Calculations | null>(null);
  const [gpsLocation, setGpsLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(snowRemovalSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      dispatched_for: new Date().toTimeString().slice(0, 5),
      start_time: new Date().toTimeString().slice(0, 5),
      is_draft: true,
      salt_used_kg: 0,
      deicing_material_kg: 0,
      salt_alternative_kg: 0,
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

  // Auto-fill weather data when site changes
  useEffect(() => {
    const autoFillWeatherData = async () => {
      if (!selectedSiteId) {
        console.log("No site selected, skipping weather fetch");
        return;
      }

      const selectedSite = sites.find((site) => site.id === selectedSiteId);
      console.log("Selected site:", selectedSite);

      if (!selectedSite?.latitude || !selectedSite?.longitude) {
        console.log("Site missing coordinates, skipping weather fetch");
        return;
      }

      console.log(
        `Fetching weather for: ${selectedSite.name} (${selectedSite.latitude}, ${selectedSite.longitude})`
      );
      setLoading(true);

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

        // Transform API response to our expected format
        const transformedWeatherData = {
          temperature: weatherData.temperature,
          conditions: weatherData.conditions,
          snowfall: weatherData.snowfall, // API already returns cm, no conversion needed
          trend: weatherData.trend,
          forecast_confidence: weatherData.forecast_confidence,
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

        // Auto-fill recommended amounts
        setValue("salt_used_kg", calculations.salt_recommendation_kg);

        toast.success("Weather data loaded successfully");
      } catch (error) {
        console.error("Failed to load weather data:", error);
        toast.error("Failed to load weather data - using fallback values");

        // Fallback to basic data if weather service fails
        const fallbackWeatherData = {
          temperature: 0,
          conditions: "clear" as WeatherCondition,
          snowfall: 0,
          trend: "steady" as WeatherTrend,
          forecast_confidence: 0.1,
        };

        const fallbackCalculations = {
          salt_recommendation_kg: 25,
          material_cost_estimate: 12.5,
          temperature_factor: 1.0,
          condition_factor: 1.0,
        };

        setWeatherData(fallbackWeatherData);
        setCalculations(fallbackCalculations);
        setValue("salt_used_kg", fallbackCalculations.salt_recommendation_kg);
      } finally {
        setLoading(false);
      }
    };

    if (selectedSiteId && sites.length > 0) {
      autoFillWeatherData();
    }
  }, [selectedSiteId, sites, setValue]);

  const onFormSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const reportData: CreateReportRequest = {
        ...data,
        // GPS coordinates as separate fields (matching database schema)
        gps_latitude: gpsLocation?.latitude,
        gps_longitude: gpsLocation?.longitude,
        gps_accuracy: gpsLocation ? 10 : undefined, // 10 meters accuracy
        // Include current weather data from form to ensure consistency
        air_temperature: weatherData?.temperature || 0,
        snowfall_accumulation_cm: weatherData?.snowfall || 0,
        precipitation_type:
          weatherData?.conditions || ("clear" as WeatherCondition),
        temperature_trend: weatherData?.trend || ("steady" as WeatherTrend),
        conditions_upon_arrival:
          weatherData?.conditions || ("clear" as WeatherCondition),
        // Auto-filled fields (will be overridden by API if not provided)
        daytime_high: 0,
        daytime_low: 0,
        operator: "",
        site_name: "",
        salt_used_kg: data.salt_used_kg || 0,
        deicing_material_kg: data.deicing_material_kg || 0,
        salt_alternative_kg: data.salt_alternative_kg || 0,
        // Include weather data for storage
        weather_data: weatherData
          ? {
              api_source: "secure_endpoint",
              temperature: weatherData.temperature,
              precipitation: 0,
              wind_speed: 0,
              conditions: weatherData.conditions,
              forecast_confidence: weatherData.forecast_confidence,
            }
          : undefined,
        // Include calculations
        calculations: calculations
          ? {
              ...calculations,
              cost_per_kg: 0.5, // Default cost per kg
            }
          : undefined,
      };

      if (onSubmit) {
        onSubmit(reportData);
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
          form.reset();
          setWeatherData(null);
          setCalculations(null);
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
                  <Input {...field} id="truck" placeholder="Truck identifier" />
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
                        className={errors.site_id ? "border-red-500" : ""}
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
      {weatherData && (
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
                <p className="text-sm text-muted-foreground">Temperature</p>
                <p className="text-2xl font-bold">
                  {weatherData.temperature}°C
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
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Confidence</p>
                <p className="text-lg font-semibold">
                  {Math.round(weatherData.forecast_confidence * 100)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                      className={
                        errors.snow_removal_method ? "border-red-500" : ""
                      }
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
                      className={errors.follow_up_plans ? "border-red-500" : ""}
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
                      <SelectItem value="monitorConditions">
                        Monitor Conditions, will check back in 2 hours
                      </SelectItem>
                      <SelectItem value="returnInHour">
                        Return in 1 Hour for follow-up treatment
                      </SelectItem>
                      <SelectItem value="callSupervisor">
                        Call Supervisor for further instructions
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
            {calculations && <Badge variant="secondary">Auto-calculated</Badge>}
          </CardTitle>
          {calculations && (
            <CardDescription>
              Recommended amounts based on site size, weather conditions, and
              temperature.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {calculations && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Recommended salt usage: {calculations.salt_recommendation_kg} kg
                (Estimated cost: ${calculations.material_cost_estimate})
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
                      value !== undefined && value !== null ? String(value) : ""
                    }
                    onChange={(e) =>
                      onChange(e.target.value ? parseFloat(e.target.value) : 0)
                    }
                    id="salt_used_kg"
                  />
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deicing_material_kg">Deicing Material (kg)</Label>
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
                      value !== undefined && value !== null ? String(value) : ""
                    }
                    onChange={(e) =>
                      onChange(e.target.value ? parseFloat(e.target.value) : 0)
                    }
                    id="deicing_material_kg"
                  />
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="salt_alternative_kg">Salt Alternative (kg)</Label>
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
                      value !== undefined && value !== null ? String(value) : ""
                    }
                    onChange={(e) =>
                      onChange(e.target.value ? parseFloat(e.target.value) : 0)
                    }
                    id="salt_alternative_kg"
                  />
                )}
              />
            </div>
          </div>
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
