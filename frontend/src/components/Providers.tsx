"use client";

import { EngineProvider } from "@/lib/EngineContext";
import type { ReactNode } from "react";

export default function Providers({ children }: { children: ReactNode }) {
  return <EngineProvider>{children}</EngineProvider>;
}
