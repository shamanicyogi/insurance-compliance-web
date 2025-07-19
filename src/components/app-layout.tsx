"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { SiteHeader } from "@/components/site-header";
import TrialBanner from "@/components/trial-banner";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileNavBar } from "@/components/mobile-nav-bar";
import { ModalProvider, useModal } from "@/lib/contexts/modal-context";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { MobileViewProvider } from "@/lib/contexts/mobile-view-context";
import { MobileViewManager } from "./mobile-view-manager";
import { DialogTitle } from "@radix-ui/react-dialog";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { SubscriptionModalProvider } from "@/lib/contexts/subscription-modal-context";

// A component to render the modals, keeping the main layout clean
function GlobalModals() {
  const { isModalOpen, closeModal } = useModal();

  return (
    <>
      <Dialog
        open={isModalOpen("meal")}
        onOpenChange={() => closeModal("meal")}
      >
        <DialogContent
          className="bg-transparent p-0 border-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <VisuallyHidden>
            <DialogTitle>Log a Meal</DialogTitle>
          </VisuallyHidden>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isModalOpen("workout")}
        onOpenChange={() => closeModal("workout")}
      >
        <DialogContent
          className="bg-transparent p-0 border-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <VisuallyHidden>
            <DialogTitle>Log a Workout</DialogTitle>
          </VisuallyHidden>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isModalOpen("water")}
        onOpenChange={() => closeModal("water")}
      >
        <DialogContent className="bg-transparent p-0 border-0">
          <VisuallyHidden>
            <DialogTitle>Log Water Intake</DialogTitle>
          </VisuallyHidden>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isModalOpen("mood")}
        onOpenChange={() => closeModal("mood")}
      >
        <DialogContent className="bg-transparent p-0 border-0">
          <VisuallyHidden>
            <DialogTitle>Log a Journal Entry</DialogTitle>
          </VisuallyHidden>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isModalOpen("sleep")}
        onOpenChange={() => closeModal("sleep")}
      >
        <DialogContent
          className="bg-transparent p-0 border-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <VisuallyHidden>
            <DialogTitle>Log Sleep</DialogTitle>
          </VisuallyHidden>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const pathname = usePathname();

  const isDashboardPage = pathname === "/dashboard";

  // Render a mobile-optimized layout
  if (isMobile) {
    // Show the tabbed dashboard view only on the dashboard page
    if (isDashboardPage) {
      return (
        <ModalProvider>
          <SubscriptionModalProvider>
            <MobileViewProvider>
              <SidebarProvider
                style={
                  {
                    "--sidebar-width": "calc(var(--spacing) * 72)",
                    "--header-height": "calc(var(--spacing) * 12)",
                  } as React.CSSProperties
                }
              >
                <AppSidebar />
                <div className="relative flex flex-1 flex-col">
                  <TrialBanner />
                  <SiteHeader />
                  <main className="pb-20">
                    <div className="container">
                      <MobileViewManager dashboard={children} />
                    </div>
                  </main>
                  <GlobalModals />
                  <MobileNavBar />
                </div>
              </SidebarProvider>
            </MobileViewProvider>
          </SubscriptionModalProvider>
        </ModalProvider>
      );
    }

    // Render a standard layout for all other mobile pages
    return (
      <ModalProvider>
        <SubscriptionModalProvider>
          <SidebarProvider
            style={
              {
                "--sidebar-width": "calc(var(--spacing) * 72)",
                "--header-height": "calc(var(--spacing) * 12)",
              } as React.CSSProperties
            }
          >
            <AppSidebar />
            <div className="relative flex flex-1 flex-col">
              <TrialBanner />
              <SiteHeader />
              <main>
                <div className="container pt-4">{children}</div>
              </main>
              <GlobalModals />
            </div>
          </SidebarProvider>
        </SubscriptionModalProvider>
      </ModalProvider>
    );
  }

  // Render the default desktop layout with a sidebar
  return (
    <ModalProvider>
      <SubscriptionModalProvider>
        <SidebarProvider
          style={
            {
              "--sidebar-width": "calc(var(--spacing) * 72)",
              "--header-height": "calc(var(--spacing) * 12)",
            } as React.CSSProperties
          }
        >
          <AppSidebar variant="inset" />
          <SidebarInset>
            <TrialBanner />
            <SiteHeader />
            <div className="container">{children}</div>
            <GlobalModals />
          </SidebarInset>
        </SidebarProvider>
      </SubscriptionModalProvider>
    </ModalProvider>
  );
}
