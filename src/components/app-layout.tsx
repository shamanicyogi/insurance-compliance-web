"use client";

import { ReactNode } from "react";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileNavBar } from "@/components/mobile-nav-bar";
import { ModalProvider, useModal } from "@/lib/contexts/modal-context";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { MobileViewProvider } from "@/lib/contexts/mobile-view-context";
import { MobileViewManager } from "./mobile-view-manager";
import { DialogTitle } from "@radix-ui/react-dialog";
import { VisuallyHidden } from "@/components/ui/visually-hidden";

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
          style={{
            maxWidth: "95vw",
            maxHeight: "95vh",
            width: "auto",
            height: "auto",
          }}
        >
          <VisuallyHidden>
            <DialogTitle>Log Meal</DialogTitle>
          </VisuallyHidden>
          {/* Modal content will be set by the component that opens it */}
        </DialogContent>
      </Dialog>
    </>
  );
}

interface AppLayoutProps {
  children: ReactNode;
  className?: string;
}

export function AppLayout({ children, className }: AppLayoutProps) {
  const isMobile = useIsMobile();
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  if (status === "loading") {
    return <div className="p-8">Loading...</div>;
  }

  if (!session) {
    return <div className="p-8">Please sign in to continue.</div>;
  }

  if (isMobile) {
    return (
      <MobileViewProvider>
        <ModalProvider>
          <div className="flex h-screen flex-col bg-sidebar">
            <div className="flex-1 flex flex-col min-h-0">
              <main className="flex-1 overflow-auto bg-background">
                <div className={cn("p-4", className)}>{children}</div>
              </main>
              <MobileNavBar />
              <GlobalModals />
            </div>
            <MobileViewManager dashboard={<div>Dashboard</div>} />
          </div>
        </ModalProvider>
      </MobileViewProvider>
    );
  }

  return (
    <ModalProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <main className="flex-1 overflow-auto bg-background p-8">
            <div className={cn("mx-auto", className)}>{children}</div>
          </main>
          <GlobalModals />
        </SidebarInset>
      </SidebarProvider>
    </ModalProvider>
  );
}
