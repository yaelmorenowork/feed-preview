"use client";

export interface UpdateStatus {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  releaseNotesUrl: string | null;
  /** False when no update manifest is configured yet — this app
   *  honestly reports "not checked" rather than claiming to be
   *  up to date without ever having verified it. */
  checked: boolean;
}

const FALLBACK_STATUS: UpdateStatus = {
  currentVersion: "unknown",
  latestVersion: "unknown",
  updateAvailable: false,
  releaseNotesUrl: null,
  checked: false,
};

export async function checkForUpdates(): Promise<UpdateStatus> {
  try {
    const response = await fetch("/api/version", { cache: "no-store" });
    if (!response.ok) return FALLBACK_STATUS;
    return (await response.json()) as UpdateStatus;
  } catch {
    return FALLBACK_STATUS;
  }
}
