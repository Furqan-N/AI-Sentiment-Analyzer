"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type EngineType = "vader" | "transformer" | "roberta" | "ensemble";

interface EngineContextValue {
  engine: EngineType;
  setEngine: (e: EngineType) => void;
}

const EngineContext = createContext<EngineContextValue>({
  engine: "ensemble",
  setEngine: () => {},
});

export function EngineProvider({ children }: { children: ReactNode }) {
  const [engine, setEngine] = useState<EngineType>("ensemble");
  return (
    <EngineContext.Provider value={{ engine, setEngine }}>
      {children}
    </EngineContext.Provider>
  );
}

export function useEngine() {
  return useContext(EngineContext);
}
