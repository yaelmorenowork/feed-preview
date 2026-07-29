"use client";

import { useCallback, useEffect, useState, type CSSProperties, type ReactElement } from "react";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MinusCircle,
  Loader2,
  RotateCw,
} from "lucide-react";
import { runDiagnostics, type DiagnosticsReport } from "../services/notionDiagnosticsService";
import { CARD_SHADOW } from "../lib/elevation";

const containerStyle: CSSProperties = {
  borderRadius: 24,
  boxShadow: CARD_SHADOW,
};

const STATUS_ICON: Record<string, ReactElement> = {
  pass: <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" strokeWidth={2} />,
  warning: <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" strokeWidth={2} />,
  fail: <XCircle className="h-4 w-4 shrink-0 text-rose-500" strokeWidth={2} />,
  skipped: <MinusCircle className="h-4 w-4 shrink-0 text-neutral-300" strokeWidth={2} />,
};

/**
 * Standalone diagnostics screen (app/diagnostics/page.tsx). Runs
 * every health check the app relies on — connection, database,
 * permissions, required properties, live Notion API status, and
 * widget version — and explains any failure in plain language with
 * concrete fix steps, never a raw error code.
 */
export default function DiagnosticsScreen() {
  const [report, setReport] = useState<DiagnosticsReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(() => {
    setIsLoading(true);
    runDiagnostics()
      .then(setReport)
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-10">
      <div className="w-full max-w-md bg-white p-8" style={containerStyle}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-900">
              <Activity className="h-4 w-4 text-white" strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="text-[15px] font-semibold tracking-[-0.01em] text-neutral-900">
                Diagnostics
              </h1>
              <p className="text-[12px] text-neutral-400">
                {report === null
                  ? "Checking…"
                  : report.overallStatus === "healthy"
                    ? "Everything looks good"
                    : "Something needs attention"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={load}
            disabled={isLoading}
            aria-label="Re-run diagnostics"
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition-all duration-200 ease-out hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-50"
          >
            <RotateCw className={`h-[15px] w-[15px] ${isLoading ? "animate-spin" : ""}`} strokeWidth={2} />
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          {report === null ? (
            <div className="flex items-center justify-center gap-2 py-10 text-neutral-400">
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
              <span className="text-[13px]">Running checks…</span>
            </div>
          ) : (
            report.checks.map((check) => (
              <div
                key={check.id}
                className="flex items-start gap-2.5 rounded-xl border border-[#F2F2F2] px-3.5 py-2.5"
              >
                {STATUS_ICON[check.status]}
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-neutral-800">{check.label}</p>
                  <p className="mt-0.5 text-[12px] leading-snug text-neutral-400">{check.message}</p>
                  {check.fixSteps && check.fixSteps.length > 0 && (
                    <ul className="mt-1.5 flex flex-col gap-0.5">
                      {check.fixSteps.map((step, index) => (
                        <li key={index} className="text-[12px] leading-snug text-neutral-500">
                          {index + 1}. {step}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
