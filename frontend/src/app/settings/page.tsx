"use client";

import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [health, setHealth] = useState<"checking" | "online" | "offline">(
    "checking"
  );

  useEffect(() => {
    fetch("http://localhost:8000/health")
      .then((r) => (r.ok ? setHealth("online") : setHealth("offline")))
      .catch(() => setHealth("offline"));
  }, []);

  return (
    <div className="p-8 space-y-8">
      <div>
        <h2 className="text-2xl font-extrabold text-white mb-1">
          Model Settings
        </h2>
        <p className="text-sm text-on-surface-variant">
          Configuration and system status.
        </p>
      </div>

      {/* Engine Status */}
      <div className="bg-surface-container-high rounded-xl p-6 shadow-lg shadow-black/20 border border-white/5">
        <h3 className="text-sm font-extrabold uppercase tracking-widest text-on-surface mb-6">
          Inference Engines
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-surface-container p-5 rounded-lg border border-outline-variant/20">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-white">VADER</span>
              <span className="px-2 py-0.5 bg-secondary/10 text-secondary text-[10px] font-black rounded-full uppercase">
                Available
              </span>
            </div>
            <p className="text-xs text-on-surface-variant">
              Rule-based sentiment analysis using lexicon and heuristics.
              Compound score thresholds at &plusmn;0.05.
            </p>
            <div className="mt-3 text-[10px] text-outline font-mono">
              vaderSentiment &middot; CPU-only
            </div>
          </div>
          <div className="bg-surface-container p-5 rounded-lg border border-outline-variant/20">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-white">Transformer</span>
              <span className="px-2 py-0.5 bg-secondary/10 text-secondary text-[10px] font-black rounded-full uppercase">
                Available
              </span>
            </div>
            <p className="text-xs text-on-surface-variant">
              HuggingFace DistilBERT fine-tuned on SST-2 for sentiment
              classification.
            </p>
            <div className="mt-3 text-[10px] text-outline font-mono">
              distilbert-base-uncased-finetuned-sst-2 &middot; GPU optional
            </div>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-surface-container-high rounded-xl p-6 shadow-lg shadow-black/20 border border-white/5">
        <h3 className="text-sm font-extrabold uppercase tracking-widest text-on-surface mb-6">
          System Status
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-outline-variant/10">
            <span className="text-sm text-on-surface">Backend API</span>
            <span
              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                health === "online"
                  ? "bg-secondary/10 text-secondary"
                  : health === "offline"
                    ? "bg-tertiary-container/10 text-tertiary-container"
                    : "bg-amber-500/10 text-amber-500"
              }`}
            >
              {health}
            </span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-outline-variant/10">
            <span className="text-sm text-on-surface">API Endpoint</span>
            <span className="text-sm font-mono text-on-surface-variant">
              http://localhost:8000
            </span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-outline-variant/10">
            <span className="text-sm text-on-surface">Database</span>
            <span className="text-sm font-mono text-on-surface-variant">
              PostgreSQL (asyncpg)
            </span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-on-surface">Batch Chunk Size</span>
            <span className="text-sm font-mono text-on-surface-variant">
              50 rows
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
