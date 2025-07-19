"use client";

import { Suspense } from "react";
import { SnowRemovalOnboarding } from "./snow-removal-onboarding";

export function SnowRemovalOnboardingWrapper() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <SnowRemovalOnboarding />
    </Suspense>
  );
}
