"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { TrendPoint } from "@/lib/api";

interface MergedPoint {
  hour: string;
  Positive: number;
  Negative: number;
  Neutral: number;
}

function mergeTrends(raw: TrendPoint[]): MergedPoint[] {
  const map = new Map<string, MergedPoint>();
  for (const { hour, label, count } of raw) {
    if (!map.has(hour)) {
      map.set(hour, { hour, Positive: 0, Negative: 0, Neutral: 0 });
    }
    const point = map.get(hour)!;
    if (label === "Positive" || label === "Negative" || label === "Neutral") {
      point[label] += count;
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.hour).getTime() - new Date(b.hour).getTime()
  );
}

function formatTick(iso: string): string {
  const d = new Date(iso);
  const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  return days[d.getDay()] ?? "";
}

function formatTooltipLabel(label: unknown): string {
  const d = new Date(String(label));
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
  });
}

export default function SentimentChart({
  data,
}: {
  data: TrendPoint[] | null;
}) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-surface-container rounded-xl p-8 shadow-xl shadow-black/30 border border-white/5 relative overflow-hidden h-full flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-surface-container-highest mb-4 block">
            analytics
          </span>
          <p className="text-on-surface-variant text-sm">
            No trend data yet. Analyze some text to populate the chart.
          </p>
        </div>
      </div>
    );
  }

  const merged = mergeTrends(data);

  return (
    <div className="bg-surface-container rounded-xl p-8 shadow-xl shadow-black/30 border border-white/5 relative overflow-hidden h-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-xl font-extrabold text-white">
            Sentiment Velocity
          </h3>
          <p className="text-xs text-on-surface-variant mt-1">
            Rolling 7-day volume window (Hourly)
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2 px-3 py-1 bg-secondary/10 rounded-full">
            <span className="w-2 h-2 rounded-full bg-secondary" />
            <span className="text-[10px] font-bold text-secondary uppercase">
              Positive
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-tertiary-container/10 rounded-full">
            <span className="w-2 h-2 rounded-full bg-tertiary-container" />
            <span className="text-[10px] font-bold text-tertiary-container uppercase">
              Negative
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 rounded-full">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-[10px] font-bold text-amber-500 uppercase">
              Neutral
            </span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={merged}>
          <defs>
            <linearGradient id="gradPos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4edea3" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#4edea3" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradNeg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff516a" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#ff516a" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradNeu" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#424753" opacity={0.3} />
          <XAxis
            dataKey="hour"
            tickFormatter={formatTick}
            stroke="#8c909f"
            fontSize={10}
            fontWeight={700}
            interval="preserveStartEnd"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#8c909f"
            fontSize={10}
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#171f33",
              border: "1px solid #424753",
              borderRadius: "8px",
              color: "#dae2fd",
              fontSize: "12px",
            }}
            labelFormatter={formatTooltipLabel}
          />
          <Legend
            wrapperStyle={{ fontSize: "10px", fontWeight: 700 }}
            iconType="circle"
            iconSize={8}
          />
          <Area
            type="monotone"
            dataKey="Positive"
            stroke="#4edea3"
            fill="url(#gradPos)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="Negative"
            stroke="#ff516a"
            fill="url(#gradNeg)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="Neutral"
            stroke="#f59e0b"
            fill="url(#gradNeu)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
