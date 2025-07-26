"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MapPin, Clock, Save, Send, Plus, Trash2, Copy } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

import type {
  Site,
  CreateReportRequest,
  WeatherCondition,
  WeatherTrend,
} from "@/types/snow-removal";

import { EnhancedWeatherDisplay } from "@/components/enhanced-weather-display";

interface WeatherData {
  temperature: number;
  conditions: WeatherCondition;
  snowfall: number;
  precipitation: number;
  wind_speed: number;
  trend: WeatherTrend;
  forecast_confidence: number;
  daytime_high: number;
  daytime_low: number;
  forecast_id?: string;
  isFromCache?: boolean;
  cacheAge?: number;
}

// Validation schema - exactly like single form but with multiple sites
const siteSchema = z.object({
  site_id: z.string().min(1, "Site is required"),
  start_time: z.string().min(1, "Start time is required"),
  finish_time: z.string().optional(),
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
});

const formSchema = z.object({
  date: z.string().min(1, "Date is required"),
  dispatched_for: z.string().min(1, "Dispatch time is required"),
  truck: z.string().optional(),
  tractor: z.string().optional(),
  handwork: z.string().optional(),
  sites: z.array(siteSchema).min(1, "At least one site is required"),
  is_draft: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

interface SnowRemovalFormProps {
  onSubmit?: (data: CreateReportRequest[]) => Promise<void>;
  className?: string;
}

export function SnowRemovalForm({ onSubmit, className }: SnowRemovalFormProps) {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      dispatched_for: new Date().toTimeString().slice(0, 5), // Current time in HH:MM format
      truck: "",
      tractor: "",
      handwork: "",
      sites: [
        {
          site_id: "",
          start_time: "",
          finish_time: "",
          snow_removal_method: "noAction",
          follow_up_plans: "allClear",
          salt_used_kg: 0,
          deicing_material_kg: 0,
          salt_alternative_kg: 0,
          comments: "",
        },
      ],
      is_draft: true,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "sites",
  });

  const watchedDate = watch("date");
  const watchedDispatchedFor = watch("dispatched_for");

  // Load sites on component mount
  useEffect(() => {
    const loadSites = async () => {
      try {
        const response = await fetch("/api/snow-removal/sites");
        if (response.ok) {
          const data = await response.json();
          setSites(data.sites);
        }
      } catch (error) {
        console.error("Error loading sites:", error);
        toast.error("Failed to load sites");
      } finally {
        setSitesLoading(false);
      }
    };

    loadSites();
  }, []);

  // Load weather data when date changes - exactly like single form
  useEffect(() => {
    if (!sites.length) return;
    console.log(sites, "sites");

    const loadWeatherData = async () => {
      setWeatherLoading(true);

      try {
        const response = await fetch(
          `/api/snow-removal/weather?date=${watchedDate}&lat=${sites[0].latitude}&lon=${sites[0].longitude}`
        );

        if (response.ok) {
          const data = await response.json();
          setWeatherData({
            temperature: data.temperature,
            conditions: data.conditions,
            snowfall: data.snowfall,
            precipitation: data.precipitation || 0,
            wind_speed: data.wind_speed || 0,
            trend: data.trend,
            forecast_confidence: data.forecast_confidence,
            daytime_high: data.daytime_high,
            daytime_low: data.daytime_low,
            forecast_id: data.forecast_id,
            isFromCache: true, // Assuming cached since no force=true
            cacheAge: undefined, // Could be enhanced with actual cache age
          });
        }
      } catch (error) {
        console.error("Error loading weather:", error);
      } finally {
        setWeatherLoading(false);
      }
    };

    loadWeatherData();
  }, [sites]);

  // Auto-populate site times when a site is selected
  const populateTimesForSite = useCallback(
    (siteIndex: number) => {
      const dispatchTime = getValues("dispatched_for");
      if (!dispatchTime) return;

      const addHoursToTime = (timeStr: string, hours: number): string => {
        const [hoursStr, minutesStr] = timeStr.split(":");
        const date = new Date();
        date.setHours(parseInt(hoursStr) + hours, parseInt(minutesStr), 0, 0);
        return date.toTimeString().slice(0, 5);
      };

      const allSites = getValues("sites");
      const currentSite = allSites[siteIndex];

      // Only populate if times are empty (don't override user input)
      if (
        currentSite.site_id &&
        !currentSite.start_time &&
        !currentSite.finish_time
      ) {
        let startTime: string;

        if (siteIndex === 0) {
          // First site: start 1 hour after dispatch
          startTime = addHoursToTime(dispatchTime, 1);
        } else {
          // Subsequent sites: start 1 hour after previous site's finish
          const previousSite = allSites[siteIndex - 1];
          if (previousSite.finish_time) {
            startTime = addHoursToTime(previousSite.finish_time, 1);
          } else {
            // If previous site doesn't have finish time, calculate from dispatch
            startTime = addHoursToTime(dispatchTime, 1 + siteIndex * 2);
          }
        }

        const finishTime = addHoursToTime(startTime, 1);

        setValue(`sites.${siteIndex}.start_time`, startTime);
        setValue(`sites.${siteIndex}.finish_time`, finishTime);
      }
    },
    [getValues, setValue]
  );

  // Watch for dispatch time changes and update all sites
  useEffect(() => {
    if (watchedDispatchedFor) {
      const currentSites = getValues("sites");
      currentSites.forEach((site, index) => {
        if (site.site_id && !site.start_time && !site.finish_time) {
          populateTimesForSite(index);
        }
      });
    }
  }, [watchedDispatchedFor, populateTimesForSite, getValues]);

  // Refresh weather data function
  const refreshWeatherData = async () => {
    setWeatherLoading(true);
    setWeatherData(null);

    try {
      // Use current date for weather fetch with force refresh
      const response = await fetch(
        `/api/snow-removal/weather?date=${watchedDate}&lat=${sites[0].latitude}&lon=${sites[0].longitude}&force=true`
      );

      if (response.ok) {
        const data = await response.json();
        setWeatherData({
          temperature: data.temperature,
          conditions: data.conditions,
          snowfall: data.snowfall,
          precipitation: data.precipitation || 0,
          wind_speed: data.wind_speed || 0,
          trend: data.trend,
          forecast_confidence: data.forecast_confidence,
          daytime_high: data.daytime_high,
          daytime_low: data.daytime_low,
          forecast_id: data.forecast_id,
          isFromCache: false, // Fresh API call
          cacheAge: 0,
        });
      }
    } catch (error) {
      console.error("Error refreshing weather:", error);
    } finally {
      setWeatherLoading(false);
    }
  };

  const addSite = () => {
    const dispatchTime = getValues("dispatched_for");
    const existingSites = getValues("sites");

    // Calculate start time for the new site
    let newStartTime = "";
    let newFinishTime = "";

    if (dispatchTime && existingSites.length > 0) {
      const addHoursToTime = (timeStr: string, hours: number): string => {
        const [hoursStr, minutesStr] = timeStr.split(":");
        const date = new Date();
        date.setHours(parseInt(hoursStr) + hours, parseInt(minutesStr), 0, 0);
        return date.toTimeString().slice(0, 5);
      };

      // Find the last site with a finish time
      const lastSiteWithFinish = existingSites
        .slice()
        .reverse()
        .find((site) => site.finish_time);

      if (lastSiteWithFinish?.finish_time) {
        // Start 1 hour after the last site's finish time
        newStartTime = addHoursToTime(lastSiteWithFinish.finish_time, 1);
      } else {
        // Fallback: calculate based on dispatch time and number of sites
        newStartTime = addHoursToTime(
          dispatchTime,
          1 + existingSites.length * 2
        );
      }

      newFinishTime = addHoursToTime(newStartTime, 1);
    }

    append({
      site_id: "",
      start_time: newStartTime,
      finish_time: newFinishTime,
      snow_removal_method: "noAction",
      follow_up_plans: "allClear",
      salt_used_kg: 0,
      deicing_material_kg: 0,
      salt_alternative_kg: 0,
      comments: "",
    });
  };

  const removeSite = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  const duplicateSite = (index: number) => {
    const siteData = getValues(`sites.${index}`);
    append({
      ...siteData,
      site_id: "", // Clear site selection for duplicate
      start_time: "",
      finish_time: "",
      comments: "",
    });
  };

  const onFormSubmit = async (data: FormData) => {
    setLoading(true);

    try {
      // Create individual reports for each site - exactly like single form
      const reports: CreateReportRequest[] = data.sites.map((siteData) => {
        const site = sites.find((s) => s.id === siteData.site_id);
        const report: CreateReportRequest = {
          // Site-specific data
          site_id: siteData.site_id,
          date: data.date,
          dispatched_for: data.dispatched_for,
          start_time: siteData.start_time,
          finish_time: siteData.finish_time,
          truck: data.truck,
          tractor: data.tractor,
          handwork: data.handwork,
          snow_removal_method: siteData.snow_removal_method,
          salt_used_kg: siteData.salt_used_kg || 0,
          deicing_material_kg: siteData.deicing_material_kg || 0,
          salt_alternative_kg: siteData.salt_alternative_kg || 0,
          follow_up_plans: siteData.follow_up_plans,
          comments: siteData.comments,
          is_draft: data.is_draft,

          // Auto-filled fields from weather data (like single form)
          site_name: site?.name || "",
          operator: "", // Will be filled by API
          conditions_upon_arrival: weatherData?.conditions || "clear",
          daytime_high: weatherData?.daytime_high || 0,
          daytime_low: weatherData?.daytime_low || 0,
          weather_forecast_id: weatherData?.forecast_id,
          air_temperature: weatherData?.temperature || 0,
          temperature_trend: weatherData?.trend || "steady",
          snowfall_accumulation_cm: weatherData?.snowfall || 0,
          precipitation_type: weatherData?.conditions || "clear",
          submitted_at: data.is_draft ? undefined : new Date().toISOString(),

          // Include structured weather data for storage
          weather_data: weatherData
            ? {
                api_source: "openweathermap",
                temperature: weatherData.temperature,
                precipitation: weatherData.precipitation || 0,
                wind_speed: weatherData.wind_speed,
                conditions: weatherData.conditions,
                forecast_confidence: weatherData.forecast_confidence,
                daytime_high: weatherData.daytime_high,
                daytime_low: weatherData.daytime_low,
                snowfall: weatherData.snowfall,
                trend: weatherData.trend,
                isFromCache: weatherData.isFromCache,
                cacheAge: weatherData.cacheAge,
              }
            : undefined,
        };
        return report;
      });

      await onSubmit?.(reports);
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Error submitting form");
    } finally {
      setLoading(false);
    }
  };

  const submitAsDraft = () => {
    setValue("is_draft", true);
    handleSubmit(onFormSubmit)();
  };

  const submitFinal = () => {
    setValue("is_draft", false);
    handleSubmit(onFormSubmit)();
  };

  if (sitesLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className={className}>
      <div className="space-y-6">
        {/* Shared Information Section - exactly like single form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              General Information
            </CardTitle>
            <CardDescription>
              Information that applies to all sites visited during this shift
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  {...register("date")}
                  className={errors.date ? "border-red-500" : ""}
                />
                {errors.date && (
                  <p className="text-sm text-red-500">{errors.date.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dispatched_for">Dispatched For</Label>
                <Input
                  id="dispatched_for"
                  type="time"
                  {...register("dispatched_for")}
                  className={errors.dispatched_for ? "border-red-500" : ""}
                />
                {errors.dispatched_for && (
                  <p className="text-sm text-red-500">
                    {errors.dispatched_for.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="truck">Truck</Label>
                <Input
                  id="truck"
                  {...register("truck")}
                  placeholder="Truck number/ID"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tractor">Tractor</Label>
                <Input
                  id="tractor"
                  {...register("tractor")}
                  placeholder="Tractor number/ID"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="handwork">Hand Work</Label>
                <Input
                  id="handwork"
                  {...register("handwork")}
                  placeholder="Hand work details"
                />
              </div>
            </div>

            {/* Enhanced Weather Display */}
            <EnhancedWeatherDisplay
              weatherData={weatherData}
              isLoading={weatherLoading}
              isFromCache={weatherData?.isFromCache}
              cacheAge={weatherData?.cacheAge}
              onRefresh={refreshWeatherData}
            />
          </CardContent>
        </Card>

        {/* Sites Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Sites Visited ({fields.length})
            </CardTitle>
            <CardDescription>
              Add details for each site visited during this shift
            </CardDescription>
            <div className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSite}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Site
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {fields.map((field, index) => (
              <div key={field.id} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold">
                    Site {index + 1}
                    {sites.find((s) => s.id === watch(`sites.${index}.site_id`))
                      ?.name && (
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        -{" "}
                        {
                          sites.find(
                            (s) => s.id === watch(`sites.${index}.site_id`)
                          )?.name
                        }
                      </span>
                    )}
                  </h4>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => duplicateSite(index)}
                      className="flex items-center gap-1"
                    >
                      <Copy className="h-3 w-3" />
                      Copy
                    </Button>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeSite(index)}
                        className="flex items-center gap-1 text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 p-4 border rounded-lg">
                  {/* First row: Site, Snow Removal Method, Follow-up Plans */}
                  <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Site</Label>
                      <Controller
                        name={`sites.${index}.site_id`}
                        control={control}
                        render={({ field }) => (
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              // Auto-populate times when site is selected
                              setTimeout(() => populateTimesForSite(index), 0);
                            }}
                            value={field.value}
                          >
                            <SelectTrigger
                              className={`w-full ${
                                errors.sites?.[index]?.site_id
                                  ? "border-red-500"
                                  : ""
                              }`}
                            >
                              <SelectValue placeholder="Select a site" />
                            </SelectTrigger>
                            <SelectContent>
                              {sites
                                .filter(
                                  (site) =>
                                    // Allow current selection or sites not already selected
                                    field.value === site.id ||
                                    !watch("sites").some(
                                      (s, i) =>
                                        i !== index && s.site_id === site.id
                                    )
                                )
                                .map((site) => (
                                  <SelectItem key={site.id} value={site.id}>
                                    <div className="flex items-center justify-between w-full">
                                      <span>{site.name}</span>
                                      <Badge
                                        variant="outline"
                                        className="ml-2 bg-background text-foreground border-border hover:bg-background hover:text-foreground"
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
                      {errors.sites?.[index]?.site_id && (
                        <p className="text-sm text-red-500">
                          {errors.sites[index]?.site_id?.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Snow Removal Method</Label>
                      <Controller
                        name={`sites.${index}.snow_removal_method`}
                        control={control}
                        render={({ field }) => (
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="plow">Plow</SelectItem>
                              <SelectItem value="shovel">Shovel</SelectItem>
                              <SelectItem value="salt">Salt Only</SelectItem>
                              <SelectItem value="combination">
                                Combination
                              </SelectItem>
                              <SelectItem value="noAction">
                                No Action
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Follow-up Plans</Label>
                      <Controller
                        name={`sites.${index}.follow_up_plans`}
                        control={control}
                        render={({ field }) => (
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="allClear">
                                All Clear
                              </SelectItem>
                              <SelectItem value="activeSnowfall">
                                Active Snowfall
                              </SelectItem>
                              <SelectItem value="monitorConditions">
                                Monitor Conditions
                              </SelectItem>
                              <SelectItem value="returnInHour">
                                Return in 1 Hour
                              </SelectItem>
                              <SelectItem value="callSupervisor">
                                Call Supervisor
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </div>

                  {/* Second row: Start Time, Finish Time, (empty) */}
                  <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <Input
                        type="time"
                        {...register(`sites.${index}.start_time`)}
                        className={
                          errors.sites?.[index]?.start_time
                            ? "border-red-500"
                            : ""
                        }
                      />
                      {errors.sites?.[index]?.start_time && (
                        <p className="text-sm text-red-500">
                          {errors.sites[index]?.start_time?.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Finish Time</Label>
                      <Input
                        type="time"
                        {...register(`sites.${index}.finish_time`)}
                      />
                    </div>

                    {/* Empty third column for consistent sizing on desktop */}
                    <div className="hidden md:block"></div>
                  </div>

                  <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Salt Used (kg)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        {...register(`sites.${index}.salt_used_kg`, {
                          valueAsNumber: true,
                        })}
                        onFocus={(e) => {
                          if (e.target.value === "0") {
                            e.target.value = "";
                          }
                        }}
                        onBlur={(e) => {
                          if (e.target.value === "") {
                            setValue(`sites.${index}.salt_used_kg`, 0);
                          }
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Deicing Material (kg)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        {...register(`sites.${index}.deicing_material_kg`, {
                          valueAsNumber: true,
                        })}
                        onFocus={(e) => {
                          if (e.target.value === "0") {
                            e.target.value = "";
                          }
                        }}
                        onBlur={(e) => {
                          if (e.target.value === "") {
                            setValue(`sites.${index}.deicing_material_kg`, 0);
                          }
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Salt Alternative (kg)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        {...register(`sites.${index}.salt_alternative_kg`, {
                          valueAsNumber: true,
                        })}
                        onFocus={(e) => {
                          if (e.target.value === "0") {
                            e.target.value = "";
                          }
                        }}
                        onBlur={(e) => {
                          if (e.target.value === "") {
                            setValue(`sites.${index}.salt_alternative_kg`, 0);
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Comments</Label>
                    <Textarea
                      {...register(`sites.${index}.comments`)}
                      placeholder="Additional notes for this site..."
                      rows={2}
                    />
                  </div>
                </div>

                {index < fields.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={submitAsDraft}
            disabled={loading || isSubmitting}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Save as Draft
          </Button>
          <Button
            type="button"
            onClick={submitFinal}
            disabled={loading || isSubmitting}
            className="flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            Submit Report
          </Button>
        </div>
      </div>
    </form>
  );
}
