"use client";

import { useState } from "react";
import { ExternalLink, X } from "lucide-react";
import { EditableFields, Post } from "../data/post";
import { POST_TYPE_LABEL } from "../lib/postDisplay";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-[13px] text-neutral-400">{label}</span>
      <span className="text-[13px] font-medium text-neutral-800">{value}</span>
    </div>
  );
}

const FIELD_LABEL_CLASSES =
  "text-[12px] font-medium uppercase tracking-wide text-neutral-400";

/**
 * Shared classes for an editable field's input/textarea: transparent
 * and borderless at rest (reads like plain text, matching the
 * previous read-only look), with a subtle background and border
 * appearing on hover/focus to signal it's editable.
 */
const FIELD_INPUT_CLASSES =
  "mt-2 w-full rounded-lg border border-transparent bg-transparent px-0 py-1 text-[13.5px] text-neutral-800 outline-none transition-all duration-150 ease-out hover:bg-neutral-50 hover:px-2.5 focus:border-[#F2F2F2] focus:bg-neutral-50 focus:px-2.5";

/**
 * Shared classes for the two action buttons, so the rendered anchor
 * (when a link is available) and the inert button (when it isn't)
 * always look pixel-identical.
 */
const SECONDARY_ACTION_CLASSES =
  "flex items-center justify-center gap-2 rounded-xl border border-[#F2F2F2] bg-white py-2.5 text-[13px] font-medium text-neutral-700 transition-colors duration-200 ease-out hover:bg-neutral-50";
const PRIMARY_ACTION_CLASSES =
  "flex items-center justify-center gap-2 rounded-xl bg-neutral-900 py-2.5 text-[13px] font-medium text-white transition-colors duration-200 ease-out hover:bg-neutral-800";

interface PanelContentProps {
  post: Post;
  draft: EditableFields;
  onFieldChange: <K extends keyof EditableFields>(field: K, value: EditableFields[K]) => void;
}

export default function PanelContent({ post, draft, onFieldChange }: PanelContentProps) {
  const [hashtagInput, setHashtagInput] = useState("");

  function addHashtag() {
    const tag = hashtagInput.trim().replace(/^#/, "");
    setHashtagInput("");
    if (!tag || draft.hashtags.includes(tag)) return;
    onFieldChange("hashtags", [...draft.hashtags, tag]);
  }

  function removeHashtag(tag: string) {
    onFieldChange(
      "hashtags",
      draft.hashtags.filter((existing) => existing !== tag)
    );
  }

  return (
    <div className="px-6 pt-5">
      <div className="divide-y divide-[#F2F2F2] border-y border-[#F2F2F2]">
        <div className="flex items-center justify-between py-2.5">
          <label htmlFor="publish-date" className="text-[13px] text-neutral-400">
            Publish date
          </label>
          <input
            id="publish-date"
            type="date"
            value={draft.scheduledDate}
            onChange={(e) => onFieldChange("scheduledDate", e.target.value)}
            className="rounded-md bg-transparent px-1.5 py-0.5 text-right text-[13px] font-medium text-neutral-800 outline-none transition-colors duration-150 ease-out hover:bg-neutral-50 focus:bg-neutral-50"
          />
        </div>
        <Row label="Content type" value={POST_TYPE_LABEL[post.type]} />
      </div>

      <div className="mt-5">
        <p className={FIELD_LABEL_CLASSES}>Caption</p>
        <textarea
          value={draft.caption}
          onChange={(e) => onFieldChange("caption", e.target.value)}
          aria-label="Caption"
          rows={4}
          className={`${FIELD_INPUT_CLASSES} resize-none leading-relaxed`}
        />
      </div>

      <div className="mt-5">
        <p className={FIELD_LABEL_CLASSES}>Hashtags</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {draft.hashtags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 rounded-full bg-neutral-100 py-1 pl-2.5 pr-1.5 text-[12px] font-medium text-neutral-600"
            >
              #{tag}
              <button
                type="button"
                onClick={() => removeHashtag(tag)}
                aria-label={`Remove ${tag}`}
                className="text-neutral-400 transition-colors duration-150 ease-out hover:text-neutral-700"
              >
                <X className="h-3 w-3" strokeWidth={2.5} />
              </button>
            </span>
          ))}
          <input
            value={hashtagInput}
            onChange={(e) => setHashtagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addHashtag();
              }
            }}
            onBlur={addHashtag}
            placeholder="Add tag…"
            aria-label="Add hashtag"
            className="w-20 rounded-full bg-transparent px-2 py-1 text-[12px] text-neutral-500 outline-none placeholder:text-neutral-300"
          />
        </div>
      </div>

      <div className="mt-5">
        <p className={FIELD_LABEL_CLASSES}>Canva link</p>
        <input
          type="url"
          value={draft.canvaLink ?? ""}
          onChange={(e) => onFieldChange("canvaLink", e.target.value)}
          placeholder="https://canva.com/design/…"
          aria-label="Canva link"
          className={FIELD_INPUT_CLASSES}
        />
      </div>

      <div className="mt-5">
        <p className={FIELD_LABEL_CLASSES}>Grid order</p>
        <input
          type="number"
          value={draft.gridOrder ?? 0}
          onChange={(e) => onFieldChange("gridOrder", Number(e.target.value))}
          aria-label="Grid order"
          className={FIELD_INPUT_CLASSES}
        />
      </div>

      <div className="mt-6 flex flex-col gap-2">
        {draft.canvaLink ? (
          <a
            href={draft.canvaLink}
            target="_blank"
            rel="noopener noreferrer"
            className={SECONDARY_ACTION_CLASSES}
          >
            Open in Canva
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
          </a>
        ) : (
          <button type="button" disabled className={`${SECONDARY_ACTION_CLASSES} opacity-50`}>
            Open in Canva
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        )}

        {post.notionPageUrl ? (
          <a
            href={post.notionPageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={PRIMARY_ACTION_CLASSES}
          >
            Open in Notion
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
          </a>
        ) : (
          <button type="button" className={PRIMARY_ACTION_CLASSES}>
            Open in Notion
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  );
}
