"use client";

import { TrendingUp, Snowflake, Users, MapPin } from "lucide-react";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";

const navItems: { route: string; label: string; icon: React.ElementType }[] = [
  { route: "/dashboard", label: "Dashboard", icon: TrendingUp },
  { route: "/snow-removal", label: "Reports", icon: Snowflake },
  { route: "/team", label: "Team", icon: Users },
  { route: "/sites", label: "Sites", icon: MapPin },
];

export function MobileNavBar() {
  const router = useRouter();

  return (
    <aside className="fixed bottom-0 left-0 right-0 z-50 h-20 bg-background border-t">
      <div className="grid h-full grid-cols-5 items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.route}
              variant="ghost"
              className="flex h-full flex-col items-center justify-center gap-1 rounded-none"
              onClick={() => router.push(item.route)}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs">{item.label}</span>
            </Button>
          );
        })}
      </div>
    </aside>
  );
}
