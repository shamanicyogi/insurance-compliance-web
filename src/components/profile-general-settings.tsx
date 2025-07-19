"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";

const activityLevels = [
  { value: "sedentary", label: "Sedentary (little or no exercise)" },
  { value: "light", label: "Light (exercise 1-3 times/week)" },
  { value: "moderate", label: "Moderate (exercise 3-5 times/week)" },
  { value: "active", label: "Active (exercise 6-7 times/week)" },
  { value: "very_active", label: "Very Active (intense exercise daily)" },
];

const goalTypes = [
  { value: "lose", label: "Lose Weight" },
  { value: "maintain", label: "Maintain Weight" },
  { value: "gain", label: "Gain Weight" },
];

const dietTypes = [
  { value: "balanced", label: "Balanced" },
  { value: "low_fat", label: "Low Fat" },
  { value: "low_carb", label: "Low Carb" },
  { value: "keto", label: "Keto" },
];

const genderOptions = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const unitOptions = [
  { value: "metric", label: "Metric (kg, cm)" },
  { value: "imperial", label: "Imperial (lbs, inches)" },
];

// Form validation schema
const profileFormSchema = z.object({
  display_name: z.string().min(2, "Name must be at least 2 characters"),
  age: z.coerce.number().min(13).max(120),
  gender: z.enum(["male", "female"]),
  weight: z.coerce.number().positive("Weight must be a positive number"),
  goal_weight: z.coerce
    .number()
    .positive("Target weight must be a positive number"),
  height: z.coerce.number().positive("Height must be a positive number"),
  activity_level: z.enum([
    "sedentary",
    "light",
    "moderate",
    "active",
    "very_active",
  ]),
  goal: z.enum(["lose", "maintain", "gain"]),
  diet_type: z.enum(["balanced", "low_fat", "low_carb", "keto"]),
  unit_preference: z.enum(["metric", "imperial"]),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface UserData {
  id: string;
  display_name?: string;
  email?: string;
  gender?: "male" | "female";
  age?: number;
  weight?: number;
  weight_kg?: number;
  weight_lbs?: number;
  goal_weight?: number;
  target_weight_kg?: number;
  target_weight_lbs?: number;
  height?: number;
  height_cm?: number;
  height_inches?: number;
  activity_level?:
    | "sedentary"
    | "light"
    | "moderate"
    | "active"
    | "very_active";
  goal?: "lose" | "maintain" | "gain";
  diet_type?: "balanced" | "low_fat" | "low_carb" | "keto";
  unit_preference?: "metric" | "imperial";
  avatar_url?: string;
}

interface ProfileGeneralSettingsProps {
  userData: UserData | null;
}

export function ProfileGeneralSettings({
  userData,
}: ProfileGeneralSettingsProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [, setUserProfileData] = useState(userData);
  const [isSaving, setIsSaving] = useState(false);
  const [isUnitChanging, setIsUnitChanging] = useState(false);

  // Initialize form with user data
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      display_name: userData?.display_name || "",
      age: userData?.age || 30,
      gender: userData?.gender || "male",
      weight:
        userData?.unit_preference === "imperial"
          ? userData?.weight_lbs
          : userData?.weight_kg || 70,
      goal_weight:
        userData?.unit_preference === "imperial"
          ? userData?.target_weight_lbs
          : userData?.target_weight_kg || 70,
      height:
        userData?.unit_preference === "imperial"
          ? userData?.height_inches
          : userData?.height_cm || 170,
      activity_level: userData?.activity_level || "moderate",
      goal: userData?.goal || "maintain",
      diet_type: userData?.diet_type || "balanced",
      unit_preference: userData?.unit_preference || "metric",
    },
  });

  // Watch for unit preference changes
  const unitPreference = form.watch("unit_preference");

  // When unit preference changes, fetch updated data
  useEffect(() => {
    // Store the previous value for comparison
    const previousUnitPref = form.formState.defaultValues?.unit_preference;
    const currentUnitPref = unitPreference;

    // Only update if the unit preference actually changed and not on first render
    if (previousUnitPref && currentUnitPref !== previousUnitPref) {
      const updateUnitPreference = async () => {
        try {
          setIsUnitChanging(true);

          // 1. Update unit preference via API
          const response = await fetch("/api/user/profile", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ unit_preference: currentUnitPref }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
              errorData.error || "Failed to update unit preference"
            );
          }

          // 2. Fetch the updated user data
          const profileResponse = await fetch("/api/user/profile");
          if (!profileResponse.ok)
            throw new Error("Failed to fetch updated profile");

          const updatedUserData = await profileResponse.json();
          setUserProfileData(updatedUserData);

          // 3. Invalidate queries
          queryClient.invalidateQueries({ queryKey: ["userStats"] });

          toast.success("Unit preference updated successfully");
        } catch (error) {
          console.error("Error updating unit preference:", error);
          toast.error("Failed to update unit preference");
        } finally {
          setIsUnitChanging(false);
        }
      };

      updateUnitPreference();
    }
  }, [unitPreference, form, queryClient]);

  // Handle form submission
  const onSubmit = async (data: ProfileFormValues) => {
    try {
      setIsSaving(true);

      // Transform form data to match API field names
      // Always send both metric and imperial, converting from user's preferred unit
      const isMetric = data.unit_preference === "metric";

      const apiData = {
        display_name: data.display_name,
        age: data.age,
        gender: data.gender,
        activity_level: data.activity_level,
        goal: data.goal,
        diet_type: data.diet_type,
        unit_preference: data.unit_preference,
        // Always send both metric and imperial values
        weight_kg: isMetric ? data.weight : data.weight / 2.20462,
        weight_lbs: isMetric ? data.weight * 2.20462 : data.weight,
        target_weight_kg: isMetric
          ? data.goal_weight
          : data.goal_weight / 2.20462,
        target_weight_lbs: isMetric
          ? data.goal_weight * 2.20462
          : data.goal_weight,
        height_cm: isMetric ? data.height : data.height * 2.54,
        height_inches: isMetric ? data.height / 2.54 : data.height,
      };

      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(apiData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update profile");
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["userStats"] });

      toast.success("Profile updated successfully");
      router.refresh();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card style={{ maxWidth: "92%" }}>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="display_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Age</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {genderOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Weight</FormLabel>
                    <FormControl>
                      {isUnitChanging ? (
                        <div className="flex items-center justify-center h-10 rounded-md border border-input bg-background px-3 py-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : (
                        <Input type="number" {...field} />
                      )}
                    </FormControl>
                    <FormDescription>
                      {form.watch("unit_preference") === "metric"
                        ? "kg"
                        : "lbs"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="goal_weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Weight</FormLabel>
                    <FormControl>
                      {isUnitChanging ? (
                        <div className="flex items-center justify-center h-10 rounded-md border border-input bg-background px-3 py-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : (
                        <Input type="number" {...field} />
                      )}
                    </FormControl>
                    <FormDescription>
                      {form.watch("unit_preference") === "metric"
                        ? "kg"
                        : "lbs"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="height"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Height</FormLabel>
                  {isUnitChanging ? (
                    <div className="flex items-center justify-center h-10 rounded-md border border-input bg-background px-3 py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : form.watch("unit_preference") === "metric" ? (
                    <>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormDescription>cm</FormDescription>
                    </>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <FormControl>
                          <Input
                            type="number"
                            value={Math.floor(field.value / 12)}
                            onChange={(e) => {
                              const feet = parseInt(e.target.value) || 0;
                              const inches = field.value % 12;
                              field.onChange(feet * 12 + inches);
                            }}
                            placeholder="Feet"
                          />
                        </FormControl>
                        <FormDescription>feet</FormDescription>
                      </div>
                      <div>
                        <FormControl>
                          <Input
                            type="number"
                            value={field.value % 12}
                            onChange={(e) => {
                              const inches = parseInt(e.target.value) || 0;
                              const feet = Math.floor(field.value / 12);
                              field.onChange(feet * 12 + inches);
                            }}
                            placeholder="Inches"
                            min={0}
                            max={11}
                          />
                        </FormControl>
                        <FormDescription>inches</FormDescription>
                      </div>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="activity_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Activity Level</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select activity level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activityLevels.map((level) => (
                          <SelectItem key={level.value} value={level.value}>
                            {level.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="goal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Goal</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select goal" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {goalTypes.map((goal) => (
                          <SelectItem key={goal.value} value={goal.value}>
                            {goal.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="diet_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Diet Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select diet type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {dietTypes.map((diet) => (
                          <SelectItem key={diet.value} value={diet.value}>
                            {diet.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit_preference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Preference</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select units" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {unitOptions.map((unit) => (
                          <SelectItem key={unit.value} value={unit.value}>
                            {unit.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" disabled={isSaving} className="w-full">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
