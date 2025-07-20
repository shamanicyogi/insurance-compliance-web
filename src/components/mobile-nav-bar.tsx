"use client";

import { TrendingUp, Snowflake, Users, MapPin } from "lucide-react";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";
import { useCompany } from "@/lib/contexts/company-context";
import { useMemo } from "react";

const allNavItems: {
  route: string;
  label: string;
  icon: React.ElementType;
  roles: string[];
}[] = [
  {
    route: "/dashboard",
    label: "Dashboard",
    icon: TrendingUp,
    roles: ["owner", "admin", "manager", "employee"],
  },
  {
    route: "/snow-removal",
    label: "Reports",
    icon: Snowflake,
    roles: ["owner", "admin", "manager"],
  },
  {
    route: "/team",
    label: "Team",
    icon: Users,
    roles: ["owner", "admin", "manager"],
  },
  {
    route: "/sites",
    label: "Sites",
    icon: MapPin,
    roles: ["owner", "admin", "manager"],
  },
];

export function MobileNavBar() {
  const router = useRouter();
  const { userRole } = useCompany();

  // Filter navigation items based on user role
  const filteredNavItems = useMemo(() => {
    if (!userRole) return [];

    return allNavItems.filter((item) => item.roles.includes(userRole));
  }, [userRole]);

  const gridCols =
    filteredNavItems.length === 2
      ? "grid-cols-2"
      : filteredNavItems.length === 3
        ? "grid-cols-3"
        : filteredNavItems.length === 4
          ? "grid-cols-4"
          : "grid-cols-5";

  return (
    <aside className="fixed bottom-0 left-0 right-0 z-50 h-20 bg-background border-t">
      <div className={`grid h-full ${gridCols} items-center`}>
        {filteredNavItems.map((item) => {
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
