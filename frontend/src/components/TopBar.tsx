"use client";

import { useEffect, useState } from "react";

export default function TopBar() {
  const [connected, setConnected] = useState(false);
  const [engine, setEngine] = useState<"vader" | "transformer">("vader");

  useEffect(() => {
    fetch("http://localhost:8000/health")
      .then((r) => r.ok && setConnected(true))
      .catch(() => setConnected(false));
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-background bg-gradient-to-b from-surface-container-low to-transparent flex justify-between items-center w-full px-8 h-16">
      <div className="flex items-center gap-8">
        <div className="text-xl font-black text-blue-400 tracking-tighter uppercase">
          Sentiment Engine v2.1
        </div>
        <nav className="hidden md:flex items-center gap-6">
          <button
            onClick={() => setEngine("vader")}
            className={`font-bold uppercase tracking-widest text-[0.6875rem] pb-1 transition-colors ${
              engine === "vader"
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            VADER
          </button>
          <button
            onClick={() => setEngine("transformer")}
            className={`font-bold uppercase tracking-widest text-[0.6875rem] pb-1 transition-colors ${
              engine === "transformer"
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Transformer
          </button>
        </nav>
      </div>
      <div className="flex items-center gap-6">
        <div
          className={`flex items-center gap-2 text-[0.6875rem] font-bold tracking-widest uppercase px-3 py-1 rounded-full ${
            connected
              ? "text-secondary bg-secondary/10"
              : "text-tertiary-container bg-tertiary-container/10"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${connected ? "bg-secondary pulse-animation" : "bg-tertiary-container"}`}
          />
          {connected ? "Live Pulse" : "Offline"}
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <button className="material-symbols-outlined hover:text-white transition-colors">
            sensors
          </button>
          <button className="material-symbols-outlined hover:text-white transition-colors">
            settings
          </button>
          <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center border border-outline-variant/30 text-xs font-bold text-primary">
            FN
          </div>
        </div>
      </div>
    </header>
  );
}
