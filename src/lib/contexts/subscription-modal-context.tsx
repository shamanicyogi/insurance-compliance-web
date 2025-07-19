"use client";

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from "react";
import PaymentModal from "@/components/payment-modal";
import { useSession } from "next-auth/react";

interface SubscriptionModalContextType {
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

const SubscriptionModalContext = createContext<
  SubscriptionModalContextType | undefined
>(undefined);

export function useSubscriptionModal() {
  const context = useContext(SubscriptionModalContext);
  if (!context) {
    throw new Error(
      "useSubscriptionModal must be used within a SubscriptionModalProvider"
    );
  }
  return context;
}

export function SubscriptionModalProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: session } = useSession();

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const handleGlobalClick = useCallback(
    (event: MouseEvent) => {
      // If user has a subscription, or the modal is already open, do nothing.
      if (session?.user?.hasActiveSubscription || isModalOpen) {
        return;
      }

      let target = event.target as HTMLElement;
      let requiresSubscription = false;

      // Check if the clicked element or any of its parents requires a subscription.
      while (target && target !== document.body) {
        if (target.hasAttribute("data-requires-subscription")) {
          requiresSubscription = true;
          break;
        }
        target = target.parentElement as HTMLElement;
      }

      // If the action is protected, block it and open the modal.
      if (requiresSubscription) {
        event.preventDefault();
        event.stopPropagation();
        openModal();
      }
    },
    [session, isModalOpen]
  );

  useEffect(() => {
    // Use capturing to intercept the event early.
    document.addEventListener("click", handleGlobalClick, true);
    return () => {
      document.removeEventListener("click", handleGlobalClick, true);
    };
  }, [handleGlobalClick]);

  const value = {
    isModalOpen,
    openModal,
    closeModal,
  };

  return (
    <SubscriptionModalContext.Provider value={value}>
      {children}
      <PaymentModal isOpen={isModalOpen} onClose={closeModal} />
    </SubscriptionModalContext.Provider>
  );
}
