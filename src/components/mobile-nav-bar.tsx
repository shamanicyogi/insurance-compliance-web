"use client";

import { cn } from "@/lib/utils";
import { QuickAddMenu } from "./quick-add-menu";
import { TrendingUp, HeartPulse, Dumbbell, Smile } from "lucide-react";
import { useMobileView, MobileView } from "@/lib/contexts/mobile-view-context";
import { Button } from "./ui/button";

const navItems: { view: MobileView; label: string; icon: React.ElementType }[] =
  [
    { view: "progress", label: "Progress", icon: TrendingUp },
    { view: "nutrition", label: "Nutrition", icon: HeartPulse },
    { view: "training", label: "Training", icon: Dumbbell },
    { view: "wellbeing", label: "Wellbeing", icon: Smile },
  ];

export function MobileNavBar() {
  const { currentView, setCurrentView } = useMobileView();

  return (
    <aside className="fixed bottom-0 left-0 right-0 z-50 h-20 bg-background border-t">
      <div className="grid h-full grid-cols-5 items-center">
        {navItems.slice(0, 2).map((item) => (
          <Button
            key={item.view}
            variant="ghost"
            className={cn(
              "flex flex-col items-center justify-start pt-3 gap-1 text-muted-foreground hover:text-primary h-full rounded-none",
              currentView === item.view &&
                "text-secondary-foreground dark:text-primary"
            )}
            onClick={() => setCurrentView(item.view)}
          >
            <item.icon className="h-6 w-6" />
            <span className="text-xs">{item.label}</span>
          </Button>
        ))}

        <div className="flex items-center justify-center">
          <div className="-translate-y-3.5">
            <QuickAddMenu />
          </div>
        </div>

        {navItems.slice(2).map((item) => (
          <Button
            key={item.view}
            variant="ghost"
            className={cn(
              "flex flex-col items-center justify-start pt-3 gap-1 text-muted-foreground hover:text-primary h-full rounded-none",
              currentView === item.view &&
                "text-secondary-foreground dark:text-primary"
            )}
            onClick={() => setCurrentView(item.view)}
          >
            <item.icon className="h-6 w-6" />
            <span className="text-xs">{item.label}</span>
          </Button>
        ))}
      </div>
    </aside>
  );
}
