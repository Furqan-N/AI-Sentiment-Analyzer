"use client";

import type { SummaryData } from "@/lib/api";

function Sparkline({
  heights,
  color,
}: {
  heights: number[];
  color: string;
}) {
  return (
    <div className="flex items-end gap-1 h-full w-full">
      {heights.map((h, i) => (
        <div
          key={i}
          className={`w-full rounded-t-sm ${color}`}
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-surface-container-high rounded-xl p-6 shadow-lg shadow-black/20 animate-pulse">
      <div className="h-3 w-20 bg-surface-container-highest rounded mb-4" />
      <div className="h-8 w-16 bg-surface-container-highest rounded" />
    </div>
  );
}

export default function StatCards({ data }: { data: SummaryData | null }) {
  if (!data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  const total = data.total;
  const pos = data.per_label["Positive"] ?? 0;
  const neg = data.per_label["Negative"] ?? 0;
  const neu = data.per_label["Neutral"] ?? 0;
  const posPct = total > 0 ? ((pos / total) * 100).toFixed(1) : "0.0";
  const negPct = total > 0 ? ((neg / total) * 100).toFixed(1) : "0.0";
  const neuPct = total > 0 ? ((neu / total) * 100).toFixed(1) : "0.0";

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Total Volume */}
      <div className="bg-surface-container-high rounded-xl p-6 shadow-lg shadow-black/20 flex flex-col">
        <span className="text-on-surface-variant font-medium text-xs uppercase tracking-widest mb-2">
          Total Volume
        </span>
        <div className="flex items-end justify-between">
          <h2 className="text-3xl font-extrabold text-white">
            {total.toLocaleString()}
          </h2>
          <div className="h-8 w-24">
            <Sparkline
              heights={[25, 50, 75, 50, 100]}
              color="bg-primary/20"
            />
          </div>
        </div>
        <span className="text-secondary text-[10px] font-bold mt-2 flex items-center gap-1">
          <span className="material-symbols-outlined text-[12px]">
            trending_up
          </span>
          {total} records analyzed
        </span>
      </div>

      {/* Positive */}
      <div className="bg-surface-container-high rounded-xl p-6 shadow-lg shadow-black/20 flex flex-col">
        <span className="text-on-surface-variant font-medium text-xs uppercase tracking-widest mb-2">
          % Positive
        </span>
        <div className="flex items-end justify-between">
          <h2 className="text-3xl font-extrabold text-secondary">{posPct}%</h2>
          <div className="h-8 w-24">
            <Sparkline
              heights={[50, 75, 80, 75, 100]}
              color="bg-secondary"
            />
          </div>
        </div>
        <span className="text-secondary text-[10px] font-bold mt-2">
          {pos} positive signals
        </span>
      </div>

      {/* Negative */}
      <div className="bg-surface-container-high rounded-xl p-6 shadow-lg shadow-black/20 flex flex-col">
        <span className="text-on-surface-variant font-medium text-xs uppercase tracking-widest mb-2">
          % Negative
        </span>
        <div className="flex items-end justify-between">
          <h2 className="text-3xl font-extrabold text-tertiary-container">
            {negPct}%
          </h2>
          <div className="h-8 w-24">
            <Sparkline
              heights={[50, 33, 25, 20, 10]}
              color="bg-tertiary-container"
            />
          </div>
        </div>
        <span className="text-tertiary-container text-[10px] font-bold mt-2">
          {neg} negative signals
        </span>
      </div>

      {/* Neutral */}
      <div className="bg-surface-container-high rounded-xl p-6 shadow-lg shadow-black/20 flex flex-col">
        <span className="text-on-surface-variant font-medium text-xs uppercase tracking-widest mb-2">
          % Neutral
        </span>
        <div className="flex items-end justify-between">
          <h2 className="text-3xl font-extrabold text-amber-500">
            {neuPct}%
          </h2>
          <div className="h-8 w-24">
            <Sparkline
              heights={[50, 50, 50, 50, 50]}
              color="bg-amber-500/40"
            />
          </div>
        </div>
        <span className="text-on-surface-variant text-[10px] font-bold mt-2">
          {neu} neutral signals
        </span>
      </div>
    </div>
  );
}
