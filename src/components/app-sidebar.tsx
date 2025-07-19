"use client";

import * as React from "react";
import {
  IconActivity,
  IconSnowflake,
  IconUsers,
  IconMapPin,
  IconSettings,
} from "@tabler/icons-react";
import { NavMain } from "@/components/nav-main";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NavUser } from "./nav-user";

const data = {
  user: {
    // TODO - add user info
    name: "shadcn",
    email: "m@example.com",
    // avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconActivity,
    },
    {
      title: "Snow Reports",
      url: "/snow-removal",
      icon: IconSnowflake,
    },
    {
      title: "Team",
      url: "/team",
      icon: IconUsers,
    },
    {
      title: "Sites",
      url: "/sites",
      icon: IconMapPin,
    },
    {
      title: "Settings",
      url: "/settings",
      icon: IconSettings,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#">
                <span
                  className="text-base font-semibold"
                  style={{ fontFamily: "TrueLies" }}
                >
                  SnowTracker
                </span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavUser />
      </SidebarContent>
    </Sidebar>
  );
}
