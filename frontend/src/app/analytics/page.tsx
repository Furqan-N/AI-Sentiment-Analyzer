"use client";

import { useEffect, useState } from "react";
import {
  fetchSummary,
  fetchTrends,
  type SummaryData,
  type TrendPoint,
} from "@/lib/api";
import SentimentChart from "@/components/SentimentChart";

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [trends, setTrends] = useState<TrendPoint[] | null>(null);

  useEffect(() => {
    Promise.all([fetchSummary(), fetchTrends()])
      .then(([s, t]) => {
        setSummary(s);
        setTrends(t);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="p-8 space-y-8">
      <div>
        <h2 className="text-2xl font-extrabold text-white mb-1">
          Historical Analytics
        </h2>
        <p className="text-sm text-on-surface-variant">
          Deep analysis of sentiment patterns over time.
        </p>
      </div>

      <SentimentChart data={trends} />

      {/* Breakdown Table */}
      <div className="bg-surface-container-high rounded-xl p-6 shadow-lg shadow-black/20 border border-white/5">
        <h3 className="text-sm font-extrabold uppercase tracking-widest text-on-surface mb-6">
          Label Breakdown
        </h3>
        {summary ? (
          <div className="space-y-4">
            {(["Positive", "Negative", "Neutral"] as const).map((label) => {
              const count = summary.per_label[label] ?? 0;
              const pct =
                summary.total > 0
                  ? ((count / summary.total) * 100).toFixed(1)
                  : "0.0";
              const colorBar: Record<string, string> = {
                Positive: "bg-secondary",
                Negative: "bg-tertiary-container",
                Neutral: "bg-amber-500",
              };
              const colorText: Record<string, string> = {
                Positive: "text-secondary",
                Negative: "text-tertiary-container",
                Neutral: "text-amber-500",
              };
              return (
                <div key={label}>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-sm font-bold ${colorText[label]}`}
                    >
                      {label}
                    </span>
                    <span className="text-sm font-mono text-on-surface-variant">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-surface-container-lowest rounded-full h-2">
                    <div
                      className={`${colorBar[label]} h-2 rounded-full transition-all duration-500`}
                      style={{
                        width: `${summary.total > 0 ? (count / summary.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
            <div className="pt-4 border-t border-outline-variant/20 flex items-center justify-between">
              <span className="text-sm font-bold text-on-surface">
                Average Confidence
              </span>
              <span className="text-lg font-black text-primary font-mono">
                {(summary.average_confidence * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-on-surface-variant text-sm">
            Loading...
          </div>
        )}
      </div>
    </div>
  );
}
