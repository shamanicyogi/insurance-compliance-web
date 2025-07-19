import { Button } from "@/components/ui/button";
import { JSX, ReactNode, useEffect, useState, useCallback } from "react";
import { FormProvider, useFormContext } from "./form-context";
import { X, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { Spinner } from "../ui/spinner";
import { useSession, signOut } from "next-auth/react";

export interface OnboardingData {
  goal: "maintain" | "gain" | "lose";
  targetWeeklyRate?: number | null;
  goalWeight: number;
  weight: number;
  unit: "metric" | "imperial";
  carbCycling: boolean;
  startWeight: number;
  height: number;
  activityLevel: "sedentary" | "light" | "moderate" | "active" | "very_active";
  gender: "male" | "female";
  age: number;
  userId?: string;
  name?: string;
}

interface OnboardingFlowProps {
  steps: JSX.Element[];
  step: number;
  setStep: React.Dispatch<React.SetStateAction<number>>;
  handleBack: () => void;
  handleNext?: () => void;
  isSubmitting: boolean;
}

interface LoadingState {
  images: boolean;
  localStorage: boolean;
}

function OnboardingNavigation({
  step,
  totalSteps,
  handleBack,
  handleNext,
  isSubmitting,
}: {
  step: number;
  totalSteps: number;
  handleBack: () => void;
  handleNext?: () => void;
  isSubmitting: boolean;
}) {
  const { isCurrentStepValid } = useFormContext();
  const { data: session } = useSession();
  const router = useRouter();

  const stepsWithoutContinue: { [key: number]: boolean } = { 0: true };

  return (
    <div className="flex justify-between items-center pt-6">
      {step > 0 && (
        <Button variant="outline" onClick={handleBack} disabled={isSubmitting}>
          Back
        </Button>
      )}
      {step === 0 && <div />} {/* Spacer for consistent layout */}
      {step < totalSteps - 1 && handleNext && !stepsWithoutContinue[step] && (
        <Button
          variant="default"
          onClick={handleNext}
          disabled={isSubmitting || !isCurrentStepValid(step)}
        >
          Continue
        </Button>
      )}
      {step === totalSteps - 1 && (
        <Button
          variant="default"
          onClick={() => {
            console.log("🎯 Final step button clicked");
            console.log("Session exists:", !!session);
            console.log("Is submitting:", isSubmitting);
            console.log("Is current step valid:", isCurrentStepValid(step));

            if (session) {
              console.log("🔄 Redirecting to finalize page");
              router.push("/onboarding/finalize");
            } else {
              console.log("🔄 Calling handleNext (no session)");
              handleNext?.();
            }
          }}
          disabled={isSubmitting || !isCurrentStepValid(step)}
        >
          {session ? "Complete Setup" : "Finish"}
        </Button>
      )}
    </div>
  );
}

function OnboardingFlow({
  steps,
  step,
  setStep,
  handleBack,
  handleNext,
  isSubmitting,
}: OnboardingFlowProps) {
  const router = useRouter();
  const [loadingState, setLoadingState] = useState<LoadingState>({
    images: false,
    localStorage: false,
  });
  const { data: session } = useSession();
  console.log(session, "session");

  const handleExit = () => {
    router.push("/");
  };

  // Use just one image for all steps
  const onboardingImage = "preview.jpg";

  // Simple localStorage loading
  const loadLocalStorageData = useCallback(async () => {
    try {
      // Remove the artificial delay
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem("__test__", "test");
        localStorage.removeItem("__test__");
      }
      setLoadingState((prev) => ({ ...prev, localStorage: true }));
    } catch (error) {
      console.warn("localStorage not available:", error);
      setLoadingState((prev) => ({ ...prev, localStorage: true }));
    }
  }, []);

  // Preload just the one image
  const preloadImage = useCallback(async () => {
    const loadImage = (src: string): Promise<void> => {
      return new Promise((resolve) => {
        const img = new Image();

        const cleanup = () => {
          img.onload = null;
          img.onerror = null;
        };

        img.onload = () => {
          cleanup();
          resolve();
        };

        img.onerror = () => {
          cleanup();
          console.warn(`Failed to load image: ${src}`);
          resolve();
        };

        img.src = src;
      });
    };

    try {
      await loadImage(`/images/onboarding/${onboardingImage}`);
      setLoadingState((prev) => ({ ...prev, images: true }));
    } catch (error) {
      console.error("Image loading failed:", error);
      setLoadingState((prev) => ({ ...prev, images: true }));
    }
  }, [onboardingImage]);

  // Initialize loading on mount - with timeout fallback
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Start both processes
        await Promise.all([preloadImage(), loadLocalStorageData()]);
      } catch (error) {
        console.error("Initialization failed:", error);
        // Force complete loading if anything fails
        setLoadingState({ images: true, localStorage: true });
      }
    };

    initializeApp();

    // Fallback timeout - if loading takes too long, just continue
    const fallbackTimeout = setTimeout(() => {
      console.warn("Loading took too long, forcing completion");
      setLoadingState({ images: true, localStorage: true });
    }, 3000); // Quick timeout since we're only loading one image

    return () => clearTimeout(fallbackTimeout);
  }, [preloadImage, loadLocalStorageData]);

  // Check if everything is loaded
  const isFullyLoaded = loadingState.images && loadingState.localStorage;

  // Show loading screen until everything is ready
  if (!isFullyLoaded) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-6">
        <div className="text-center space-y-4">
          <Spinner className="w-12 h-12 text-primary mx-auto" />
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">
              Loading your experience...
            </h2>
            <div className="text-sm text-muted-foreground">
              Preparing content...
            </div>
          </div>
        </div>

        {/* Simple continue button if loading takes too long */}
        <button
          onClick={() => {
            setLoadingState({ images: true, localStorage: true });
          }}
          className="mt-4 text-sm text-primary hover:underline"
        >
          Continue anyway
        </button>
      </div>
    );
  }

  return (
    <FormProvider>
      <div className="min-h-screen bg-background">
        {/* Hero Image Section */}
        <div className="relative h-[30vh] md:h-[35vh] overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-500"
            style={{
              backgroundImage: `url('/images/onboarding/${onboardingImage}')`,
              backgroundPosition: "center center",
              backgroundSize: "cover",
              // Example: You can adjust any CSS property based on step
              filter: `brightness(${1 + step * 0.1})`, // Gets brighter with each step
              transform: `scale(${1 + step * 0.02})`, // Slightly scales up each step
            }}
          >
            {/* Optional overlay for better text contrast */}
            <div className="absolute inset-0 bg-black/20"></div>
          </div>

          {/* Exit or Logout button */}
          {session ? (
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              disabled={isSubmitting}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/90 hover:bg-white transition-colors disabled:opacity-50 flex items-center gap-1"
              title="Logout"
            >
              <LogOut className="h-5 w-5 text-gray-700" />
              <span className="sr-only">Logout</span>
            </button>
          ) : (
            <button
              onClick={handleExit}
              disabled={isSubmitting}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/90 hover:bg-white transition-colors disabled:opacity-50"
              title="Exit"
            >
              <X className="h-5 w-5 text-gray-700" />
              <span className="sr-only">Exit</span>
            </button>
          )}

          {/* Progress indicator on hero image */}
          {step > 0 && (
            <div className="absolute bottom-6 left-4 right-4 z-10">
              <div className="flex w-full justify-between gap-1 p-2 bg-black/20 rounded-lg backdrop-blur-sm">
                {Array.from({ length: steps.length - 1 }).map((_, i) => {
                  const canNavigate = i < step; // Only allow going to completed steps
                  const isCurrent = i === step - 1;

                  return (
                    <button
                      key={i}
                      onClick={() => canNavigate && setStep(i + 1)}
                      disabled={isSubmitting || !canNavigate}
                      className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                        canNavigate || isCurrent
                          ? "hover:scale-105 cursor-pointer"
                          : "cursor-not-allowed"
                      } disabled:hover:scale-100 disabled:cursor-not-allowed ${
                        i < step
                          ? "bg-primary shadow-sm hover:bg-primary/80"
                          : isCurrent
                          ? "bg-primary shadow-sm"
                          : "bg-white/40 opacity-50"
                      }`}
                      title={
                        canNavigate
                          ? `Go to step ${i + 1}`
                          : isCurrent
                          ? `Current step ${i + 1}`
                          : `Complete previous steps first`
                      }
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Rounded bottom corners that create the curve */}
          <div className="absolute bottom-0 left-0 right-0 h-6 bg-background rounded-t-3xl md:rounded-t-none"></div>
        </div>

        {/* Content Section */}
        <div className="relative bg-background">
          <div className="px-6 py-8 max-w-2xl mx-auto">
            {/* Main content */}
            <div className="mb-8">{steps[step] as unknown as ReactNode}</div>

            {/* Navigation - now moved to bottom */}
            <OnboardingNavigation
              step={step}
              totalSteps={steps.length}
              handleBack={handleBack}
              handleNext={handleNext}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>
      </div>
    </FormProvider>
  );
}

export default OnboardingFlow;
