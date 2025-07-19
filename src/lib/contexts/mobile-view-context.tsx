"use client";

import React, { createContext, useState, useContext, ReactNode } from "react";

export type MobileView = "progress" | "nutrition" | "training" | "wellbeing";

interface MobileViewContextType {
  currentView: MobileView;
  setCurrentView: (view: MobileView) => void;
}

const MobileViewContext = createContext<MobileViewContextType | undefined>(
  undefined
);

export function MobileViewProvider({ children }: { children: ReactNode }) {
  const [currentView, setCurrentView] = useState<MobileView>("progress");

  return (
    <MobileViewContext.Provider value={{ currentView, setCurrentView }}>
      {children}
    </MobileViewContext.Provider>
  );
}

export function useMobileView() {
  const context = useContext(MobileViewContext);
  if (context === undefined) {
    throw new Error("useMobileView must be used within a MobileViewProvider");
  }
  return context;
}
