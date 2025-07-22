"use client";

import * as React from "react";
import {
  IconActivity,
  IconSnowflake,
  IconUsers,
  IconMapPin,
  // IconSettings,
} from "@tabler/icons-react";
import { NavMain } from "@/components/nav-main";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavUser } from "./nav-user";
import { Shield } from "lucide-react";
import { useCompany } from "@/lib/contexts/company-context";
import { useIsMobile } from "@/hooks/use-mobile";

// All possible navigation items
const allNavItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: IconActivity,
    roles: ["owner", "admin", "manager", "employee"], // All roles can see dashboard
  },
  {
    title: "Snow Reports",
    url: "/snow-removal",
    icon: IconSnowflake,
    roles: ["owner", "admin", "manager", "employee"], // Only managers and above
  },
  {
    title: "Team",
    url: "/team",
    icon: IconUsers,
    roles: ["owner", "admin", "manager"], // Only managers and above
  },
  {
    title: "Sites",
    url: "/sites",
    icon: IconMapPin,
    roles: ["owner", "admin", "manager"], // Only managers and above
  },
  // {
  //   title: "Settings",
  //   url: "/settings",
  //   icon: IconSettings,
  //   roles: ["owner", "admin"], // Only admins and owners
  // },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { userRole } = useCompany();
  const { state } = useSidebar();
  const isMobile = useIsMobile();

  // Filter navigation items based on user role
  const filteredNavItems = React.useMemo(() => {
    if (!userRole) return [];

    return allNavItems.filter((item) => item.roles.includes(userRole));
  }, [userRole]);

  return (
    <Sidebar collapsible={isMobile ? "offcanvas" : "icon"} {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            {state === "collapsed" && !isMobile ? (
              // Collapsed state: Only show toggle button, hide logo
              <div className="flex justify-center">
                <SidebarTrigger className="h-8 w-8 hover:bg-accent/50" />
              </div>
            ) : (
              // Expanded state: Logo and toggle side by side
              <div className="flex items-center gap-2">
                <SidebarMenuButton
                  asChild
                  size="lg"
                  className={`data-[slot=sidebar-menu-button]:!p-2 ${!isMobile ? "flex-1" : ""}`}
                >
                  <a href="/dashboard">
                    {/* Show full logo when expanded or on mobile */}
                    <span className="flex items-center gap-2 font-bold text-lg">
                      <Shield className="h-5 w-5 text-primary" />
                      SlipCheck
                    </span>
                  </a>
                </SidebarMenuButton>

                {/* Toggle button on the right */}
                {!isMobile && (
                  <SidebarTrigger className="h-8 w-8 hover:bg-accent/50" />
                )}
              </div>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={filteredNavItems} />
        <NavUser />
      </SidebarContent>
    </Sidebar>
  );
}
