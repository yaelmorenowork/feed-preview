"use client";

import { AlertTriangle } from "lucide-react";

export default function FeedErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 ring-1 ring-rose-100/80">
        <AlertTriangle className="h-6 w-6 text-rose-500" strokeWidth={1.75} />
      </div>

      <p className="mt-5 text-[14px] font-medium text-neutral-800">
        Couldn't load your feed
      </p>
      <p className="mt-1 max-w-[280px] text-[13px] leading-relaxed text-neutral-400">
        {message}
      </p>

      <button
        type="button"
        onClick={onRetry}
        className="mt-5 rounded-xl bg-neutral-900 px-4 py-2 text-[13px] font-medium text-white transition-colors duration-200 ease-out hover:bg-neutral-800"
      >
        Retry
      </button>
    </div>
  );
}
