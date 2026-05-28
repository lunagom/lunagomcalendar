"use client";

import { createContext, useContext, useState } from "react";

type Ctx = {
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
};

const EventHoverContext = createContext<Ctx>({
  hoveredId: null,
  setHoveredId: () => {},
});

export function EventHoverProvider({ children }: { children: React.ReactNode }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  return (
    <EventHoverContext.Provider value={{ hoveredId, setHoveredId }}>
      {children}
    </EventHoverContext.Provider>
  );
}

export function useEventHover() {
  return useContext(EventHoverContext);
}
