"use client";

import React from "react";
import { useMobileView } from "@/lib/contexts/mobile-view-context";
import { NutritionView } from "./views/nutrition-view";
import { TrainingView } from "./views/training-view";
import { WellbeingView } from "./views/wellbeing-view";
import { ProgressView } from "./views/progress-view";

export function MobileViewManager({
  dashboard,
}: {
  dashboard: React.ReactNode;
}) {
  const { currentView } = useMobileView();

  // Handle each view explicitly
  if (currentView === "progress") {
    return <ProgressView />;
  }

  if (currentView === "nutrition") {
    return <NutritionView />;
  }

  if (currentView === "training") {
    return <TrainingView />;
  }

  if (currentView === "wellbeing") {
    return <WellbeingView />;
  }

  // Fallback to the original dashboard content if no view matches
  return <>{dashboard}</>;
}
