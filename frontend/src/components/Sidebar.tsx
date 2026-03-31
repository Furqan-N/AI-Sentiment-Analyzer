"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, useEffect, useCallback } from "react";
import { uploadBatch, fetchBatchStatus, type BatchJobStatus } from "@/lib/api";

const NAV_ITEMS = [
  { href: "/", icon: "dashboard", label: "Overview" },
  { href: "/live-feed", icon: "sensors_krx", label: "Live Feed" },
  { href: "/analytics", icon: "analytics", label: "Historical Analytics" },
  { href: "/settings", icon: "settings_input_component", label: "Model Settings" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [activeJob, setActiveJob] = useState<BatchJobStatus | null>(null);

  const pollJob = useCallback(async (jobId: string) => {
    try {
      const status = await fetchBatchStatus(jobId);
      setActiveJob(status);
      if (status.status === "completed" || status.status === "failed") {
        setTimeout(() => setActiveJob(null), 5000);
      }
    } catch {
      setActiveJob(null);
    }
  }, []);

  useEffect(() => {
    if (!activeJob || activeJob.status === "completed" || activeJob.status === "failed") return;
    const interval = setInterval(() => pollJob(activeJob.job_id), 1500);
    return () => clearInterval(interval);
  }, [activeJob, pollJob]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setActiveJob(null);
    try {
      const res = await uploadBatch(file, "vader");
      // Immediately start tracking
      setActiveJob({
        job_id: res.job_id,
        status: "pending",
        total_rows: 0,
        processed_rows: 0,
        engine_type: "vader",
        error_message: null,
        created_at: new Date().toISOString(),
      });
    } catch {
      setActiveJob(null);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const progress =
    activeJob && activeJob.total_rows > 0
      ? Math.round((activeJob.processed_rows / activeJob.total_rows) * 100)
      : 0;

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-surface-container-low border-r border-white/5 shadow-2xl shadow-black/50 flex flex-col py-8 z-50">
      <div className="px-6 mb-10">
        <h1 className="text-lg font-extrabold text-white tracking-tight">
          Mission Control
        </h1>
        <p className="text-[0.6875rem] font-medium text-blue-400 uppercase tracking-widest mt-1">
          v2.1 Stable
        </p>
      </div>

      <nav className="flex-grow space-y-1 px-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-300 ${
                active
                  ? "text-blue-400 bg-surface-container-high border-r-4 border-blue-400 translate-x-1"
                  : "text-slate-400 hover:text-white hover:bg-surface-variant"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-4 mb-2 space-y-3">
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          onChange={handleUpload}
          className="hidden"
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full py-3 primary-gradient text-on-primary font-bold text-sm rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-sm">upload_file</span>
          {uploading ? "Uploading..." : "New Analysis"}
        </button>

        {activeJob && (
          <div className="bg-surface-container-high rounded-lg p-3 border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                Batch Job
              </span>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  activeJob.status === "completed"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : activeJob.status === "failed"
                    ? "bg-red-500/20 text-red-400"
                    : "bg-blue-500/20 text-blue-400"
                }`}
              >
                {activeJob.status}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-mono mb-2">
              {activeJob.job_id}
            </p>
            {activeJob.total_rows > 0 && (
              <>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-1.5">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      activeJob.status === "failed"
                        ? "bg-red-500"
                        : activeJob.status === "completed"
                        ? "bg-emerald-500"
                        : "bg-blue-400"
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 text-right">
                  {activeJob.processed_rows} / {activeJob.total_rows} rows ({progress}%)
                </p>
              </>
            )}
            {activeJob.status === "pending" && (
              <p className="text-[10px] text-slate-500 italic">Waiting to start...</p>
            )}
            {activeJob.error_message && (
              <p className="text-[10px] text-red-400 mt-1 break-words">
                {activeJob.error_message}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="px-3 border-t border-white/5 pt-6 space-y-1">
        <a
          href="#"
          className="flex items-center gap-3 px-4 py-2 text-slate-500 hover:text-white text-sm transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">
            description
          </span>
          <span>Documentation</span>
        </a>
        <a
          href="#"
          className="flex items-center gap-3 px-4 py-2 text-slate-500 hover:text-white text-sm transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">help</span>
          <span>Support</span>
        </a>
      </div>
    </aside>
  );
}
