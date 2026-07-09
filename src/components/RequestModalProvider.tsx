"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import {
  TravelRequestModal,
  useTravelRequestModal,
} from "@/components/TravelRequestModal";

type RequestModalContextValue = {
  openModal: () => void;
};

const RequestModalContext = createContext<RequestModalContextValue | null>(null);

export function RequestModalProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const onHome = pathname === "/";
  const { open, openModal, closeModal } = useTravelRequestModal(onHome);

  const value = useMemo(() => ({ openModal }), [openModal]);

  return (
    <RequestModalContext.Provider value={value}>
      {children}
      <TravelRequestModal open={open} onClose={closeModal} />
    </RequestModalContext.Provider>
  );
}

export function useRequestModal() {
  const context = useContext(RequestModalContext);
  if (!context) {
    throw new Error("useRequestModal must be used within RequestModalProvider");
  }
  return context;
}

export function StartTravelButton({
  className,
  children = "Start your travel",
}: {
  className?: string;
  children?: ReactNode;
}) {
  const { openModal } = useRequestModal();
  return (
    <button type="button" onClick={openModal} className={className}>
      {children}
    </button>
  );
}

/** Lightweight open control for pages that only need a button without auto-popup. */
export function ManualRequestModalTrigger({
  className,
  children = "Start your travel",
}: {
  className?: string;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      <TravelRequestModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
