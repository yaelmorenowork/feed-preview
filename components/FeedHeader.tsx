import { RotateCw, LayoutGrid, List } from "lucide-react";

export default function FeedHeader({ postCount }: { postCount: number }) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h2 className="text-[15px] font-semibold leading-tight tracking-[-0.01em] text-neutral-900">
          Feed Preview
        </h2>
        <p className="mt-0.5 text-[13px] leading-tight text-neutral-400">
          {postCount} scheduled post{postCount === 1 ? "" : "s"}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Refresh"
          className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition-all duration-200 ease-out hover:bg-neutral-100 hover:text-neutral-700 active:scale-90"
        >
          <RotateCw className="h-[15px] w-[15px]" strokeWidth={2} />
        </button>

        <div className="flex items-center gap-0.5 rounded-full bg-neutral-100 p-0.5">
          <button
            type="button"
            aria-label="Grid view"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-neutral-800 shadow-[0_1px_2px_rgba(15,15,15,0.08)] transition-all duration-200 ease-out"
          >
            <LayoutGrid className="h-[13px] w-[13px]" strokeWidth={2} />
          </button>
          <button
            type="button"
            aria-label="List view"
            className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 transition-all duration-200 ease-out hover:text-neutral-600"
          >
            <List className="h-[13px] w-[13px]" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
