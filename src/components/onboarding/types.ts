export interface OnboardingData {
  userId?: string;
  weight?: number;
  height?: number;
  unit?: "metric" | "imperial";
  age?: number;
  gender?: "male" | "female";
  activityLevel?: "sedentary" | "light" | "moderate" | "active" | "very_active";
  goalType?: "lose" | "maintain" | "gain";
  weeklyGoal?: number;
  dietType?: "balanced" | "low_fat" | "low_carb" | "keto";
  targetWeightKg?: number;
  targetWeightLbs?: number;
}
