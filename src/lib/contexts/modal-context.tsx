"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

type ModalType = "meal" | "workout" | "water" | "mood" | "sleep";

interface ModalContextType {
  isModalOpen: (modal: ModalType) => boolean;
  openModal: (modal: ModalType) => void;
  closeModal: (modal: ModalType) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return context;
}

export function ModalProvider({ children }: { children: ReactNode }) {
  const [openModals, setOpenModals] = useState<Set<ModalType>>(new Set());

  const openModal = (modal: ModalType) => {
    setOpenModals((prev) => new Set(prev).add(modal));
  };

  const closeModal = (modal: ModalType) => {
    setOpenModals((prev) => {
      const newSet = new Set(prev);
      newSet.delete(modal);
      return newSet;
    });
  };

  const isModalOpen = (modal: ModalType) => {
    return openModals.has(modal);
  };

  const value = {
    isModalOpen,
    openModal,
    closeModal,
  };

  return (
    <ModalContext.Provider value={value}>{children}</ModalContext.Provider>
  );
}
