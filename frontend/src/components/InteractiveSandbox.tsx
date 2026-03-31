"use client";

import { useState } from "react";
import { analyzeSentiment, type AnalyzeResult } from "@/lib/api";
import { useEngine } from "@/lib/EngineContext";

const LABEL_COLOR: Record<string, string> = {
  Positive: "text-secondary",
  Negative: "text-tertiary-container",
  Neutral: "text-amber-500",
};

export default function InteractiveSandbox({
  onResult,
}: {
  onResult: (r: AnalyzeResult) => void;
}) {
  const [text, setText] = useState("");
  const { engine, setEngine } = useEngine();
  const [loading, setLoading] = useState(false);
  const [latest, setLatest] = useState<AnalyzeResult | null>(null);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!text.trim()) return;
    setLoading(true);
    setError("");
    try {
      const result = await analyzeSentiment(text, engine);
      setLatest(result);
      onResult(result);
    } catch {
      setError("Inference failed. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-surface-container-high rounded-xl p-6 shadow-xl shadow-black/30 border border-white/5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <label className="text-[0.6875rem] font-bold uppercase tracking-widest text-primary">
          Interactive Sandbox
        </label>
        <div className="flex items-center gap-2">
          <select
            value={engine}
            onChange={(e) => setEngine(e.target.value as "vader" | "transformer" | "roberta" | "ensemble")}
            className="bg-surface-container-lowest border border-outline-variant/30 rounded px-2 py-1 text-[10px] text-on-surface-variant font-bold uppercase focus:outline-none focus:border-primary"
          >
            <option value="vader">VADER</option>
            <option value="transformer">DISTILBERT</option>
            <option value="roberta">ROBERTA</option>
            <option value="ensemble">ENSEMBLE</option>
          </select>
          <span className="text-[0.6875rem] font-bold text-on-surface-variant">
            ENGINE
          </span>
        </div>
      </div>

      <div className="flex-grow flex flex-col space-y-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-grow bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-4 text-sm text-white focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-slate-600 resize-none transition-all min-h-[120px]"
          placeholder="Enter text to test real-time sentiment extraction..."
        />

        {(latest || error) && (
          <div className="bg-surface-container-highest p-4 rounded-lg flex items-center justify-between">
            {error ? (
              <span className="text-tertiary-container text-sm">{error}</span>
            ) : latest ? (
              <>
                <div>
                  <div className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">
                    Confidence Score
                  </div>
                  <div className="text-xl font-black text-white">
                    {latest.score.toFixed(3)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold text-secondary uppercase mb-1">
                    Result
                  </div>
                  <div
                    className={`text-xl font-black uppercase ${LABEL_COLOR[latest.label] ?? "text-white"}`}
                  >
                    {latest.label}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !text.trim()}
          className="w-full py-4 primary-gradient text-on-primary font-extrabold text-sm rounded-lg uppercase tracking-widest hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-40"
        >
          {loading ? "Processing..." : "Run Inference"}
        </button>
      </div>
    </div>
  );
}
