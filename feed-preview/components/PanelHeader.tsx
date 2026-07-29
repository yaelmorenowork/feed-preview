"use client";

import { EditableFields, Post, PostStatus } from "../data/post";
import { POST_STATUS_BADGE_STYLES } from "../lib/postDisplay";

const STATUS_OPTIONS: PostStatus[] = ["Draft", "Ready", "Scheduled", "Published"];

interface PanelHeaderProps {
  post: Post;
  draft: EditableFields;
  onFieldChange: <K extends keyof EditableFields>(field: K, value: EditableFields[K]) => void;
}

export default function PanelHeader({ post, draft, onFieldChange }: PanelHeaderProps) {
  return (
    <div className="px-6 pt-6">
      <div className="overflow-hidden rounded-2xl ring-1 ring-[#F2F2F2]">
        <img
          src={post.imageUrl}
          alt={draft.title}
          draggable={false}
          loading="eager"
          decoding="async"
          className="h-56 w-full object-cover"
        />
      </div>

      <div className="mt-4 flex items-start justify-between gap-3">
        <input
          value={draft.title}
          onChange={(e) => onFieldChange("title", e.target.value)}
          aria-label="Post title"
          className="-ml-1.5 w-full rounded-md px-1.5 py-0.5 text-[16px] font-semibold leading-snug tracking-[-0.01em] text-neutral-900 outline-none transition-colors duration-150 ease-out hover:bg-neutral-50 focus:bg-neutral-50"
        />
        <select
          value={draft.status}
          onChange={(e) => onFieldChange("status", e.target.value as PostStatus)}
          aria-label="Post status"
          className={`shrink-0 cursor-pointer appearance-none rounded-full border-0 px-2.5 py-1 text-[11px] font-medium leading-none outline-none ${POST_STATUS_BADGE_STYLES[draft.status]}`}
        >
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
