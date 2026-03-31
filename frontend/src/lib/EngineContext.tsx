"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type EngineType = "vader" | "transformer";

interface EngineContextValue {
  engine: EngineType;
  setEngine: (e: EngineType) => void;
}

const EngineContext = createContext<EngineContextValue>({
  engine: "vader",
  setEngine: () => {},
});

export function EngineProvider({ children }: { children: ReactNode }) {
  const [engine, setEngine] = useState<EngineType>("vader");
  return (
    <EngineContext.Provider value={{ engine, setEngine }}>
      {children}
    </EngineContext.Provider>
  );
}

export function useEngine() {
  return useContext(EngineContext);
}
