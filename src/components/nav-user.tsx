"use client";

import { IconDotsVertical } from "@tabler/icons-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useSession, signOut } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { ThemeMenuItems } from "@/components/theme-toggle";
import { useCompany } from "@/lib/contexts/company-context";

export function NavUser() {
  const { data: session } = useSession();
  const { isMobile } = useSidebar();
  const { userRole } = useCompany();

  // Fetch minimal user data (just display_name and avatar_url)
  const { data: userData } = useQuery({
    queryKey: ["userAvatar", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;

      const response = await fetch("/api/user/profile-picture");
      if (!response.ok) {
        throw new Error("Failed to fetch user avatar data");
      }
      return response.json();
    },
    enabled: !!session?.user?.id,
    staleTime: 50 * 60 * 1000, // 50 minutes - refresh before signed URLs expire
    gcTime: 60 * 60 * 1000, // 1 hour - match signed URL expiry
  });

  if (!session) return null;

  const userInitials = userData?.display_name
    ? userData.display_name.substring(0, 2).toUpperCase()
    : session.user?.name?.substring(0, 2).toUpperCase() || "U";

  // Check if user can see admin/manager features
  const canAccessSettings = userRole && ["owner", "admin"].includes(userRole);
  const canAccessBilling = userRole && ["owner", "admin"].includes(userRole);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage
                  src={userData?.avatar_url || undefined}
                  alt={userData?.display_name || session.user?.name || "User"}
                />
                <AvatarFallback className="rounded-lg">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {userData?.display_name || session.user?.name}
                </span>
                <span className="text-muted-foreground truncate text-xs">
                  {session.user?.email}
                </span>
              </div>
              <IconDotsVertical className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            {/* <DropdownMenuGroup> */}
            {/* <DropdownMenuItem asChild>
                <Link
                  href="/profile"
                  className="cursor-pointer flex w-full items-center"
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem> */}
            {/* {canAccessSettings && (
                <DropdownMenuItem asChild>
                  <Link
                    href="/settings"
                    className="cursor-pointer flex w-full items-center"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
              )} */}
            {/* {canAccessBilling && (
                <DropdownMenuItem asChild>
                  <Link
                    href="/billing"
                    className="cursor-pointer flex w-full items-center"
                  >
                    <IconCreditCard className="mr-2 h-4 w-4" />
                    <span>Billing</span>
                  </Link>
                </DropdownMenuItem>
              )} */}
            {/* </DropdownMenuGroup> */}
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <ThemeMenuItems />
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/" })}
              className="cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
