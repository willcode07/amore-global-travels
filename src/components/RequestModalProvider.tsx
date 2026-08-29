"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { TravelRequestModal } from "@/components/TravelRequestModal";
import { TripType } from "@/lib/types";

export type QuotePrefill = {
  destination?: string;
  tripType?: TripType;
};

type RequestModalContextValue = {
  openModal: (prefill?: QuotePrefill) => void;
};

const RequestModalContext = createContext<RequestModalContextValue | null>(null);

export function RequestModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [prefill, setPrefill] = useState<QuotePrefill>({});

  const openModal = useCallback((next?: QuotePrefill) => {
    setPrefill(next ?? {});
    setOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setOpen(false);
    setPrefill({});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("start") !== "1") return;
    const destination = params.get("destination") ?? undefined;
    const tripType = params.get("tripType") as TripType | null;
    const allowed: TripType[] = [
      "cruise",
      "all_inclusive",
      "vacation_package",
      "not_sure",
    ];
    setPrefill({
      destination,
      tripType: tripType && allowed.includes(tripType) ? tripType : undefined,
    });
    const timer = window.setTimeout(() => setOpen(true), 200);
    return () => window.clearTimeout(timer);
  }, []);

  const value = useMemo(() => ({ openModal }), [openModal]);

  return (
    <RequestModalContext.Provider value={value}>
      {children}
      <TravelRequestModal open={open} onClose={closeModal} prefill={prefill} />
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
  children = "Request a Quote",
  destination,
  tripType,
}: {
  className?: string;
  children?: ReactNode;
  destination?: string;
  tripType?: TripType;
}) {
  const { openModal } = useRequestModal();
  return (
    <button
      type="button"
      onClick={() => openModal({ destination, tripType })}
      className={className}
    >
      {children}
    </button>
  );
}
