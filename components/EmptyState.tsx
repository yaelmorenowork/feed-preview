import { ImageOff } from "lucide-react";

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {/* Minimal illustration: layered rounded squares */}
      <div className="relative mb-5 h-16 w-16">
        <div className="absolute inset-0 rotate-6 rounded-2xl bg-neutral-100" />
        <div className="absolute inset-0 -rotate-3 rounded-2xl bg-neutral-50 ring-1 ring-neutral-100" />
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white ring-1 ring-[#F2F2F2]">
          <ImageOff className="h-5 w-5 text-neutral-300" strokeWidth={1.75} />
        </div>
      </div>

      <p className="text-[14px] font-medium text-neutral-800">No content yet</p>
      <p className="mt-1 text-[13px] text-neutral-400">
        Create your first post in Notion.
      </p>
    </div>
  );
}
