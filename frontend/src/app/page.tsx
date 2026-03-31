"use client";

import { useEffect, useState, useCallback } from "react";
import {
  fetchSummary,
  fetchTrends,
  type SummaryData,
  type TrendPoint,
  type AnalyzeResult,
} from "@/lib/api";
import StatCards from "@/components/StatCards";
import InteractiveSandbox from "@/components/InteractiveSandbox";
import SentimentChart from "@/components/SentimentChart";
import LiveSignalFeed from "@/components/LiveSignalFeed";

export default function OverviewPage() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [trends, setTrends] = useState<TrendPoint[] | null>(null);
  const [results, setResults] = useState<AnalyzeResult[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [s, t] = await Promise.all([fetchSummary(), fetchTrends()]);
      setSummary(s);
      setTrends(t);
    } catch {
      /* backend offline */
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function handleNewResult(r: AnalyzeResult) {
    setResults((prev) => [r, ...prev].slice(0, 100));
    loadData();
  }

  return (
    <div className="p-8 space-y-8">
      <StatCards data={summary} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <InteractiveSandbox onResult={handleNewResult} />
        </div>
        <div className="lg:col-span-2">
          <SentimentChart data={trends} />
        </div>
      </div>

      <LiveSignalFeed results={results} />
    </div>
  );
}
