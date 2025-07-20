"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { ModalProvider } from "@/lib/contexts/modal-context";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

interface AppLayoutProps {
  children: React.ReactNode;
  className?: string;
}

// Mobile header component with hamburger menu
function MobileHeader() {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 px-4 bg-background border-b">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <div className="flex items-center gap-2 font-bold text-lg">
        <span>SlipCheck</span>
      </div>
    </header>
  );
}

// Desktop header component (minimal, no toggle)
function DesktopHeader() {
  return (
    <header className="flex h-3 shrink-0 items-center bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Minimal header for desktop - toggle is now in sidebar */}
    </header>
  );
}

export function AppLayout({ children, className }: AppLayoutProps) {
  const isMobile = useIsMobile();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && status !== "loading" && !session) {
      router.push("/login");
    }
  }, [mounted, status, session, router]);

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  if (status === "loading") {
    return <div className="p-8">Loading...</div>;
  }

  if (!session) {
    return <div className="p-8">Redirecting to login...</div>;
  }

  // Use the same sidebar layout for both mobile and desktop
  return (
    <SidebarProvider>
      <ModalProvider>
        <AppSidebar />
        <SidebarInset>
          {isMobile ? <MobileHeader /> : <DesktopHeader />}
          <main className="flex-1 overflow-auto">
            <div className={cn(isMobile ? "p-4" : "p-6", className)}>
              {children}
            </div>
          </main>
        </SidebarInset>
      </ModalProvider>
    </SidebarProvider>
  );
}
