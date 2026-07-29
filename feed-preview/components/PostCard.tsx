"use client";

import { forwardRef, memo, useState, type PointerEventHandler } from "react";
import { Play, Layers } from "lucide-react";
import { Post, PostType } from "../data/post";
import { widgetConfig } from "../config/widgetConfig";
import { POST_TYPE_LABEL, POST_STATUS_DOT_COLOR } from "../lib/postDisplay";
import { cn } from "../lib/cn";
import { formatDisplayDate } from "../lib/formatDate";

function PostTypeIcon({ type }: { type: PostType }) {
  if (type === "image") return null;

  return (
    <div className="absolute top-2.5 right-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/35 backdrop-blur-sm">
      {type === "reel" ? (
        <Play className="h-3 w-3 fill-white text-white" strokeWidth={0} />
      ) : (
        <Layers className="h-3 w-3 text-white" strokeWidth={2} />
      )}
    </div>
  );
}

interface PostCardProps {
  post: Post;
  onClick?: (post: Post) => void;
  /** Whether this card is the one currently being dragged. */
  isDragging?: boolean;
  onPointerDown?: PointerEventHandler<HTMLDivElement>;
  onPointerMove?: PointerEventHandler<HTMLDivElement>;
  onPointerUp?: PointerEventHandler<HTMLDivElement>;
  onPointerCancel?: PointerEventHandler<HTMLDivElement>;
}

function PostCard(
  {
    post,
    onClick,
    isDragging = false,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
  }: PostCardProps,
  ref: React.Ref<HTMLDivElement>
) {
  const [loaded, setLoaded] = useState(false);
  const isInteractive = Boolean(onClick);

  return (
    <div
      ref={ref}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={`${post.title} — ${POST_TYPE_LABEL[post.type]}, ${post.status}`}
      onClick={() => onClick?.(post)}
      onKeyDown={(e) => {
        if (!isInteractive) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.(post);
        }
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      className={cn(
        "group relative aspect-square touch-none select-none overflow-hidden bg-white ring-1 ring-[#F2F2F2] shadow-[0_1px_2px_rgba(15,15,15,0.05)] transition-all duration-[220ms] ease-out",
        widgetConfig.showSidePanel && "cursor-pointer",
        isDragging && "z-20 cursor-grabbing shadow-[0_24px_48px_-16px_rgba(15,15,15,0.35)]",
        !isDragging &&
          widgetConfig.hoverAnimation &&
          "hover:z-10 hover:-translate-y-[3px] hover:scale-[1.02] hover:shadow-[0_16px_32px_-12px_rgba(15,15,15,0.25)]"
      )}
      style={{ borderRadius: `${widgetConfig.cardRadius}px` }}
    >
      {/* Skeleton loading state */}
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-neutral-200/70" />
      )}

      <img
        src={post.imageUrl}
        alt={post.title}
        draggable={false}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={cn(
          "h-full w-full object-cover transition-opacity duration-500 ease-out",
          loaded ? "opacity-100" : "opacity-0"
        )}
      />

      <PostTypeIcon type={post.type} />

      {/* Hover overlay */}
      <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-300 ease-out group-hover:bg-black/[0.18]" />

      {/* Bottom-left: type + scheduled date */}
      <div className="absolute bottom-3 left-3 translate-y-1 opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100">
        <p className="text-[12.5px] font-medium leading-tight text-white">
          {POST_TYPE_LABEL[post.type]}
        </p>
        {widgetConfig.showPublishDate && (
          <p className="text-[11px] leading-tight text-white/70">
            {formatDisplayDate(post.scheduledDate)}
          </p>
        )}
      </div>

      {/* Bottom-right: status badge */}
      {widgetConfig.showStatus && (
        <div className="absolute bottom-3 right-3 translate-y-1 opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100">
          <div className="flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 backdrop-blur-sm">
            <span
              className={`h-1.5 w-1.5 rounded-full ${POST_STATUS_DOT_COLOR[post.status]}`}
            />
            <span className="text-[11px] font-medium leading-none text-neutral-800">
              {post.status}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Memoized + ref-forwarding: post objects and the onClick handler
 * (setSelectedPost) are referentially stable across FeedPreview
 * re-renders, so without memo, opening/closing the side panel or
 * selecting another post would re-render all grid tiles for no
 * reason. The forwarded ref lets useDragReorder measure and
 * transform this card's DOM node directly for the drag animation.
 */
export default memo(forwardRef(PostCard));
