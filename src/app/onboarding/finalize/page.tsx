"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

export default function OnboardingFinalizePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(true);

  // Helper to collect onboarding data from localStorage
  const collectOnboardingData = () => {
    return {
      activityLevel: localStorage.getItem("activityLevel"),
      age: localStorage.getItem("age"),
      gender: localStorage.getItem("gender"),
      goal: localStorage.getItem("goal"),
      heightCm: localStorage.getItem("heightCm"),
      heightInches: localStorage.getItem("heightInches"),
      heightUnit: localStorage.getItem("heightUnit"),
      weightKg: localStorage.getItem("weightKg"),
      weightLbs: localStorage.getItem("weightLbs"),
      weightUnit: localStorage.getItem("weightUnit"),
      targetWeightKg: localStorage.getItem("targetWeightKg"),
      targetWeightLbs: localStorage.getItem("targetWeightLbs"),
      targetWeight: localStorage.getItem("targetWeight"),
      targetRate: localStorage.getItem("targetRate"),
      onboardingName: localStorage.getItem("onboardingName"),
      preferredUnit: localStorage.getItem("preferredUnit"),
      dietType: localStorage.getItem("dietType"),
      targetCalories: localStorage.getItem("targetCalories"),
      targetProtein: localStorage.getItem("targetProtein"),
      targetCarbs: localStorage.getItem("targetCarbs"),
      targetFat: localStorage.getItem("targetFat"),
      restDayCalories: localStorage.getItem("restDayCalories"),
      restDayProtein: localStorage.getItem("restDayProtein"),
      restDayCarbs: localStorage.getItem("restDayCarbs"),
      restDayFat: localStorage.getItem("restDayFat"),
      carbCyclingEnabled: localStorage.getItem("carbCyclingEnabled") === "true",
    };
  };

  // Helper to clear onboarding data from localStorage
  const clearOnboardingLocalStorage = () => {
    const keysToRemove = [
      "activityLevel",
      "age",
      "gender",
      "goal",
      "heightCm",
      "heightInches",
      "heightUnit",
      "weightKg",
      "weightLbs",
      "weightUnit",
      "targetWeightKg",
      "targetWeightLbs",
      "targetWeight",
      "targetRate",
      "onboardingName",
      "preferredUnit",
      "dietType",
      "targetCalories",
      "targetProtein",
      "targetCarbs",
      "targetFat",
      "restDayCalories",
      "restDayProtein",
      "restDayCarbs",
      "restDayFat",
      "carbCyclingEnabled",
      "onboardingStep",
    ];

    keysToRemove.forEach((key) => localStorage.removeItem(key));
    console.log("🧹 Cleared onboarding data from localStorage");
  };

  // Process onboarding completion
  useEffect(() => {
    const processOnboarding = async () => {
      if (status === "loading") return;

      if (!session?.user?.id) {
        console.log("No session found, redirecting to login");
        router.push("/login");
        return;
      }

      try {
        console.log("🔍 Checking onboarding status");

        // Check if onboarding is already completed
        const statusResponse = await fetch("/api/user/onboarding", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (statusResponse.ok) {
          const userData = await statusResponse.json();
          if (userData.onboarding_completed) {
            console.log(
              "✅ Onboarding already completed, redirecting to dashboard"
            );
            router.push("/dashboard");
            return;
          }
        }

        console.log("🚀 Starting onboarding completion process");

        // Collect all onboarding data from localStorage
        const onboardingData = collectOnboardingData();
        console.log("📊 Collected onboarding data:", onboardingData);

        // Save data to database
        const response = await fetch("/api/user/save-onboarding-data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: session.user.id,
            onboardingData,
          }),
        });

        const responseData = await response.json();
        console.log("📥 API Response:", responseData);

        if (!response.ok) {
          throw new Error(
            responseData.error || "Failed to save onboarding data"
          );
        }

        console.log("✅ Onboarding data saved successfully");

        // Clear localStorage
        clearOnboardingLocalStorage();

        // IMPORTANT: Refresh the session to update the token with onboardingCompleted: true
        console.log("🔄 Refreshing session to update token...");
        await update();

        // Show success message
        toast.success("Welcome! Your profile has been set up successfully.");

        // Small delay to ensure session is updated
        setTimeout(() => {
          console.log("🎯 Redirecting to dashboard...");
          router.push("/dashboard");
        }, 500);
      } catch (error) {
        console.error("❌ Error completing onboarding:", error);
        toast.error("Failed to complete setup. Redirecting to onboarding...");

        // On error, redirect back to onboarding
        router.push("/onboarding");
      } finally {
        setIsProcessing(false);
      }
    };

    processOnboarding();
  }, [session, status, router, update]);

  // Show loading spinner while processing
  if (status === "loading" || isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Spinner className="h-8 w-8 mx-auto mb-4" />
          <p className="text-gray-600">Setting up your profile...</p>
        </div>
      </div>
    );
  }

  // This should rarely be reached as we redirect in the useEffect
  return null;
}
