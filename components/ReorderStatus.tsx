"use client";

import { Loader2, AlertCircle, Check, X } from "lucide-react";

// Shared small "status pill" components for async save feedback.
// Originally built for drag & drop grid reordering; also used by the
// Side Panel's field autosave (see hooks/usePostAutosave.ts) so both
// features share one consistent visual language instead of two.

/**
 * Small floating pill shown only while a reorder is being persisted.
 * Sits in the corner of the feed card; invisible at rest, so it adds
 * no change to the widget's default appearance.
 */
export function SavingIndicator({ label = "Saving order…" }: { label?: string }) {
  return (
    <div className="pointer-events-none absolute right-4 top-4 z-20 flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 shadow-[0_4px_16px_-4px_rgba(15,15,15,0.15)] ring-1 ring-[#F2F2F2]">
      <Loader2 className="h-3 w-3 animate-spin text-neutral-400" strokeWidth={2} />
      <span className="text-[12px] font-medium text-neutral-500">{label}</span>
    </div>
  );
}

/**
 * Small floating pill shown briefly after a save succeeds. Reused by
 * the Side Panel's field autosave — non-interrupting, fades back to
 * nothing on its own (the caller controls the timing).
 */
export function SavedIndicator({ label = "Saved" }: { label?: string }) {
  return (
    <div className="pointer-events-none absolute right-4 top-4 z-20 flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 shadow-[0_4px_16px_-4px_rgba(15,15,15,0.15)] ring-1 ring-[#F2F2F2]">
      <Check className="h-3 w-3 text-emerald-500" strokeWidth={2.5} />
      <span className="text-[12px] font-medium text-neutral-500">{label}</span>
    </div>
  );
}

/**
 * Small dismissible error toast shown when persisting a reorder
 * fails. The order itself is already restored by useDragReorder by
 * the time this renders — this is just the user-facing notice.
 */
export function ReorderErrorToast({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div className="absolute right-4 top-4 z-20 flex max-w-[260px] items-start gap-2 rounded-xl bg-rose-50 px-3.5 py-3 shadow-[0_4px_16px_-4px_rgba(15,15,15,0.15)]">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" strokeWidth={2} />
      <p className="text-[12.5px] leading-snug text-rose-600">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="ml-auto shrink-0 text-rose-400 transition-colors duration-200 ease-out hover:text-rose-600"
      >
        <X className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}

/**
 * Error toast with an explicit Retry action, for saves that failed
 * but where the user's intended change is still available to
 * re-attempt (see usePostAutosave) — used by the Side Panel's field
 * autosave instead of ReorderErrorToast, which only supports dismiss.
 */
export function RetryableErrorToast({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="absolute right-4 top-4 z-20 flex max-w-[260px] items-start gap-2 rounded-xl bg-rose-50 px-3.5 py-3 shadow-[0_4px_16px_-4px_rgba(15,15,15,0.15)]">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" strokeWidth={2} />
      <div className="min-w-0">
        <p className="text-[12.5px] leading-snug text-rose-600">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-1.5 text-[12px] font-medium text-rose-700 underline decoration-rose-300 underline-offset-2 transition-colors duration-200 ease-out hover:text-rose-800"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
