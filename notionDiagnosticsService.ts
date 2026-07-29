"use client";

export type CheckStatus = "pass" | "fail" | "warning" | "skipped";

export interface DiagnosticCheck {
  id: "connection" | "database" | "permissions" | "properties" | "api" | "version";
  label: string;
  status: CheckStatus;
  message: string;
  fixSteps?: string[];
}

export interface DiagnosticsReport {
  overallStatus: "healthy" | "issues";
  checks: DiagnosticCheck[];
}

/**
 * Runs every health check (connection, database, permissions,
 * properties, live API status, version) and returns a structured
 * report — never a raw error, since server/notion/diagnostics.ts
 * already translates every failure into plain language.
 */
export async function runDiagnostics(): Promise<DiagnosticsReport> {
  const response = await fetch("/api/notion/diagnostics", { cache: "no-store" });

  if (!response.ok) {
    // The diagnostics route itself doesn't fail (it reports issues as
    // data, not HTTP errors) — this only triggers on a genuinely
    // unexpected server problem.
    return {
      overallStatus: "issues",
      checks: [
        {
          id: "connection",
          label: "Diagnostics",
          status: "fail",
          message: "Couldn't run diagnostics right now. Please try again.",
        },
      ],
    };
  }

  return (await response.json()) as DiagnosticsReport;
}
