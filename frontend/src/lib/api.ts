const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface SummaryData {
  total: number;
  per_label: Record<string, number>;
  average_confidence: number;
}

export interface TrendPoint {
  hour: string;
  label: string;
  count: number;
}

export interface AnalyzeResult {
  label: string;
  score: number;
  engine_used: string;
  id: number;
  created_at: string;
}

export interface BatchResult {
  job_id: string;
  status: string;
  message: string;
}

export async function fetchSummary(): Promise<SummaryData> {
  const res = await fetch(`${API_BASE}/analytics/summary`);
  if (!res.ok) throw new Error("Failed to fetch summary");
  return res.json();
}

export async function fetchTrends(): Promise<TrendPoint[]> {
  const res = await fetch(`${API_BASE}/analytics/trends`);
  if (!res.ok) throw new Error("Failed to fetch trends");
  return res.json();
}

export async function analyzeSentiment(
  text: string,
  engineType: string = "vader"
): Promise<AnalyzeResult> {
  const res = await fetch(`${API_BASE}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, engine_type: engineType }),
  });
  if (!res.ok) throw new Error("Analysis failed");
  return res.json();
}

export interface BatchJobStatus {
  job_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  total_rows: number;
  processed_rows: number;
  engine_type: string;
  error_message: string | null;
  created_at: string;
}

export async function uploadBatch(
  file: File,
  engineType: string = "vader"
): Promise<BatchResult> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(
    `${API_BASE}/analyze/batch?engine_type=${engineType}`,
    { method: "POST", body: form }
  );
  if (!res.ok) throw new Error("Batch upload failed");
  return res.json();
}

export async function fetchBatchStatus(jobId: string): Promise<BatchJobStatus> {
  const res = await fetch(`${API_BASE}/analyze/batch/${jobId}`);
  if (!res.ok) throw new Error("Failed to fetch batch status");
  return res.json();
}
