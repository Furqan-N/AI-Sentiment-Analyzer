"use client";

import { useEffect, useState } from "react";
import { analyzeSentiment } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface EngineTestResult {
  status: "idle" | "testing" | "success" | "error";
  label?: string;
  score?: number;
  error?: string;
}

export default function SettingsPage() {
  const [health, setHealth] = useState<"checking" | "online" | "offline">(
    "checking"
  );
  const [latency, setLatency] = useState<number | null>(null);
  const [vaderTest, setVaderTest] = useState<EngineTestResult>({ status: "idle" });
  const [transformerTest, setTransformerTest] = useState<EngineTestResult>({ status: "idle" });

  function checkHealth() {
    setHealth("checking");
    setLatency(null);
    const start = performance.now();
    fetch(`${API_BASE}/health`)
      .then((r) => {
        const ms = Math.round(performance.now() - start);
        setLatency(ms);
        setHealth(r.ok ? "online" : "offline");
      })
      .catch(() => setHealth("offline"));
  }

  useEffect(() => {
    checkHealth();
  }, []);

  async function testEngine(engine: "vader" | "transformer") {
    const setter = engine === "vader" ? setVaderTest : setTransformerTest;
    setter({ status: "testing" });
    try {
      const result = await analyzeSentiment("This is a great test of the sentiment engine!", engine);
      setter({ status: "success", label: result.label, score: result.score });
    } catch {
      setter({ status: "error", error: "Engine unavailable" });
    }
  }

  function renderTestBadge(test: EngineTestResult) {
    if (test.status === "idle") return null;
    if (test.status === "testing") {
      return (
        <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[10px] font-black rounded-full uppercase">
          Testing...
        </span>
      );
    }
    if (test.status === "error") {
      return (
        <span className="px-2 py-0.5 bg-tertiary-container/10 text-tertiary-container text-[10px] font-black rounded-full uppercase">
          Error
        </span>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <span className="px-2 py-0.5 bg-secondary/10 text-secondary text-[10px] font-black rounded-full uppercase">
          {test.label}
        </span>
        <span className="text-[10px] font-mono text-on-surface-variant">
          {((test.score ?? 0) * 100).toFixed(1)}%
        </span>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h2 className="text-2xl font-extrabold text-white mb-1">
          Model Settings
        </h2>
        <p className="text-sm text-on-surface-variant">
          Configuration, diagnostics, and engine testing.
        </p>
      </div>

      {/* Engine Cards */}
      <div className="bg-surface-container-high rounded-xl p-6 shadow-lg shadow-black/20 border border-white/5">
        <h3 className="text-sm font-extrabold uppercase tracking-widest text-on-surface mb-6">
          Inference Engines
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* VADER */}
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
            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() => testEngine("vader")}
                disabled={vaderTest.status === "testing"}
                className="px-4 py-2 bg-surface-container-lowest border border-outline-variant/30 rounded-lg text-[10px] font-bold uppercase tracking-wider text-on-surface-variant hover:text-white hover:border-primary transition-all disabled:opacity-40"
              >
                {vaderTest.status === "testing" ? "Testing..." : "Test Engine"}
              </button>
              {renderTestBadge(vaderTest)}
            </div>
          </div>

          {/* Transformer */}
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
            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() => testEngine("transformer")}
                disabled={transformerTest.status === "testing"}
                className="px-4 py-2 bg-surface-container-lowest border border-outline-variant/30 rounded-lg text-[10px] font-bold uppercase tracking-wider text-on-surface-variant hover:text-white hover:border-primary transition-all disabled:opacity-40"
              >
                {transformerTest.status === "testing" ? "Testing..." : "Test Engine"}
              </button>
              {renderTestBadge(transformerTest)}
            </div>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-surface-container-high rounded-xl p-6 shadow-lg shadow-black/20 border border-white/5">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-extrabold uppercase tracking-widest text-on-surface">
            System Status
          </h3>
          <button
            onClick={checkHealth}
            disabled={health === "checking"}
            className="flex items-center gap-2 px-4 py-2 bg-surface-container-lowest border border-outline-variant/30 rounded-lg text-[10px] font-bold uppercase tracking-wider text-on-surface-variant hover:text-white hover:border-primary transition-all disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[14px]">refresh</span>
            {health === "checking" ? "Checking..." : "Refresh"}
          </button>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-outline-variant/10">
            <span className="text-sm text-on-surface">Backend API</span>
            <div className="flex items-center gap-3">
              {latency !== null && health === "online" && (
                <span className="text-[10px] font-mono text-on-surface-variant">
                  {latency}ms
                </span>
              )}
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
          </div>
          <div className="flex items-center justify-between py-3 border-b border-outline-variant/10">
            <span className="text-sm text-on-surface">API Endpoint</span>
            <span className="text-sm font-mono text-on-surface-variant">
              {API_BASE}
            </span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-outline-variant/10">
            <span className="text-sm text-on-surface">Database</span>
            <span className="text-sm font-mono text-on-surface-variant">
              PostgreSQL (asyncpg)
            </span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-outline-variant/10">
            <span className="text-sm text-on-surface">Batch Chunk Size</span>
            <span className="text-sm font-mono text-on-surface-variant">
              50 rows
            </span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-on-surface">API Documentation</span>
            <a
              href={`${API_BASE}/docs`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-mono text-primary hover:underline"
            >
              <span>Open Swagger UI</span>
              <span className="material-symbols-outlined text-[14px]">open_in_new</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
