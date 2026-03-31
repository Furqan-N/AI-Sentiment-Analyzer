"use client";

import { useState } from "react";
import { analyzeSentiment, type AnalyzeResult } from "@/lib/api";
import { useEngine } from "@/lib/EngineContext";

const LABEL_STYLES: Record<
  string,
  { bar: string; badge: string; badgeBg: string }
> = {
  Positive: {
    bar: "bg-secondary",
    badge: "text-secondary",
    badgeBg: "bg-secondary/10",
  },
  Negative: {
    bar: "bg-tertiary-container",
    badge: "text-tertiary-container",
    badgeBg: "bg-tertiary-container/10",
  },
  Neutral: {
    bar: "bg-amber-500",
    badge: "text-amber-500",
    badgeBg: "bg-amber-500/10",
  },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "Just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min${mins > 1 ? "s" : ""} ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs} hr${hrs > 1 ? "s" : ""} ago`;
}

export default function LiveFeedPage() {
  const [results, setResults] = useState<AnalyzeResult[]>([]);
  const [text, setText] = useState("");
  const { engine, setEngine } = useEngine();
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  async function handleAnalyze() {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const r = await analyzeSentiment(text, engine);
      setResults((prev) => [r, ...prev].slice(0, 200));
      setText("");
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  const filtered =
    filter === "all" ? results : results.filter((r) => r.label === filter);

  const counts = {
    all: results.length,
    Positive: results.filter((r) => r.label === "Positive").length,
    Negative: results.filter((r) => r.label === "Negative").length,
    Neutral: results.filter((r) => r.label === "Neutral").length,
  };

  return (
    <div className="p-8 space-y-6">
      {/* Quick Input Bar */}
      <div className="bg-surface-container-high rounded-xl p-4 shadow-lg shadow-black/20 border border-white/5">
        <div className="flex gap-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            placeholder="Type a message and press Enter to analyze..."
            className="flex-grow bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-4 py-3 text-sm text-white focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-slate-600 transition-all"
          />
          <select
            value={engine}
            onChange={(e) => setEngine(e.target.value as "vader" | "transformer" | "roberta" | "ensemble")}
            className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-3 py-3 text-xs text-on-surface-variant font-bold uppercase focus:outline-none focus:border-primary"
          >
            <option value="vader">VADER</option>
            <option value="transformer">DISTILBERT</option>
            <option value="roberta">ROBERTA</option>
            <option value="ensemble">ENSEMBLE</option>
          </select>
          <button
            onClick={handleAnalyze}
            disabled={loading || !text.trim()}
            className="primary-gradient text-on-primary font-extrabold text-sm rounded-lg px-6 uppercase tracking-wider hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-40"
          >
            {loading ? "..." : "Send"}
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3">
        {(["all", "Positive", "Negative", "Neutral"] as const).map((f) => {
          const isActive = filter === f;
          const colorMap: Record<string, string> = {
            all: "text-primary",
            Positive: "text-secondary",
            Negative: "text-tertiary-container",
            Neutral: "text-amber-500",
          };
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${
                isActive
                  ? `${colorMap[f]} bg-surface-container-high border border-outline-variant/30`
                  : "text-on-surface-variant hover:text-white"
              }`}
            >
              {f === "all" ? "All" : f} ({counts[f]})
            </button>
          );
        })}
      </div>

      {/* Feed */}
      {filtered.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center">
          <span className="material-symbols-outlined text-6xl text-surface-container-highest mb-4">
            sensors_krx
          </span>
          <h4 className="text-xl font-bold text-on-surface-variant">
            Awaiting input signals.
          </h4>
          <p className="text-sm text-slate-600">
            Type a message above to begin real-time analysis.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const style = LABEL_STYLES[r.label] ?? LABEL_STYLES.Neutral;
            return (
              <div
                key={r.id}
                className="bg-surface-container-high/50 p-5 rounded-lg flex items-center justify-between hover:bg-surface-container-high transition-colors group"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className={`${style.bar} w-1 h-12 rounded-full shrink-0`}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-on-surface truncate max-w-md">
                      &ldquo;{r.text}&rdquo;
                    </div>
                    <div className="text-[10px] text-on-surface-variant mt-1 flex items-center gap-2 flex-wrap">
                      <span className="font-bold">
                        {r.engine_used.toUpperCase()}
                      </span>
                      <span>&middot;</span>
                      <span>{timeAgo(r.created_at)}</span>
                      <span>&middot;</span>
                      <span className="font-mono">
                        Confidence: {(r.score * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0 ml-4">
                  <div className="text-right">
                    <div className="text-[10px] text-on-surface-variant font-bold uppercase">
                      Score
                    </div>
                    <div className="text-lg font-black text-white font-mono">
                      {r.score.toFixed(3)}
                    </div>
                  </div>
                  <span
                    className={`px-4 py-1.5 ${style.badgeBg} ${style.badge} text-[10px] font-black rounded-full uppercase`}
                  >
                    {r.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
