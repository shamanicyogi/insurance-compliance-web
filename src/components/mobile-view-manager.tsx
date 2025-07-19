"use client";

import React from "react";

export function MobileViewManager({
  dashboard,
}: {
  dashboard: React.ReactNode;
}) {
  // Fallback to the original dashboard content if no view matches
  return <>{dashboard}</>;
}
