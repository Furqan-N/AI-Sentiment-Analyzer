"use client";

import type { AnalyzeResult } from "@/lib/api";

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

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + "..." : text;
}

export default function LiveSignalFeed({
  results,
}: {
  results: AnalyzeResult[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-sm font-extrabold uppercase tracking-widest text-on-surface">
          Live Signal Feed
        </h3>
        <div className="text-[10px] font-bold text-on-surface-variant">
          {results.length} SIGNALS
        </div>
      </div>

      {results.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center">
          <span className="material-symbols-outlined text-6xl text-surface-container-highest mb-4">
            analytics
          </span>
          <h4 className="text-xl font-bold text-on-surface-variant">
            Model is idling.
          </h4>
          <p className="text-sm text-slate-600">
            Provide input or upload a data stream to begin.
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {results.map((r) => {
            const style = LABEL_STYLES[r.label] ?? LABEL_STYLES.Neutral;
            return (
              <div
                key={r.id}
                className="bg-surface-container-high/50 p-4 rounded-lg flex items-center justify-between hover:bg-surface-container-high transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`${style.bar} w-1 h-10 rounded-full shrink-0`} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-on-surface truncate">
                      &ldquo;{truncate(r.text, 80)}&rdquo;
                    </div>
                    <div className="text-[10px] text-on-surface-variant mt-1 flex items-center gap-2">
                      <span className="font-bold">#{r.id}</span>
                      <span>&middot;</span>
                      <span>{timeAgo(r.created_at)}</span>
                      <span>&middot;</span>
                      <span className={`${style.badge}/80`}>
                        {r.engine_used.toUpperCase()}
                      </span>
                      <span>&middot;</span>
                      <span className="font-mono">
                        {(r.score * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <span
                    className={`px-3 py-1 ${style.badgeBg} ${style.badge} text-[10px] font-black rounded-full uppercase`}
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
