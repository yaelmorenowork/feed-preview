"use client";

import { useState, type CSSProperties } from "react";
import FeedHeader from "./FeedHeader";
import PostCard from "./PostCard";
import EmptyState from "./EmptyState";
import FeedErrorState from "./FeedErrorState";
import FeedSkeletonGrid from "./FeedSkeletonGrid";
import SidePanel from "./SidePanel";
import { SavingIndicator, ReorderErrorToast } from "./ReorderStatus";
import { Post } from "../data/post";
import { useFeed } from "../hooks/useFeed";
import { useDragReorder } from "../hooks/useDragReorder";
import { widgetConfig } from "../config/widgetConfig";
import { CARD_SHADOW } from "../lib/elevation";
import { reorderPosts } from "../services/feedService";

// Hoisted out of the component: widgetConfig is a frozen, module-level
// constant, so these never need to be recomputed on re-render.
const containerStyle: CSSProperties = {
  borderRadius: 20,
  boxShadow: CARD_SHADOW,
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: `repeat(${widgetConfig.gridColumns}, minmax(0, 1fr))`,
  gap: `${widgetConfig.cardGap}px`,
};

// Defined once, outside the component: useDragReorder relies on this
// being referentially stable across renders to keep its cached drag
// handlers valid (see useDragReorder's docs).
const getPostId = (post: Post) => post.id;

export default function FeedPreview() {
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const { posts, isLoading, error, retry } = useFeed();

  const {
    items: orderedPosts,
    draggedId,
    isSaving,
    saveError,
    dismissSaveError,
    registerRef,
    getDragHandlers,
    handleContainerClickCapture,
  } = useDragReorder({
    items: posts,
    getId: getPostId,
    onPersist: reorderPosts,
  });

  return (
    <div className="flex items-center justify-center bg-white p-10">
      <div className="relative w-full max-w-xl bg-white p-6" style={containerStyle}>
        {widgetConfig.showHeader && <FeedHeader postCount={orderedPosts.length} />}

        {error ? (
          <FeedErrorState message={error} onRetry={retry} />
        ) : isLoading ? (
          <FeedSkeletonGrid />
        ) : orderedPosts.length === 0 ? (
          <EmptyState />
        ) : (
          <div style={gridStyle} onClickCapture={handleContainerClickCapture}>
            {orderedPosts.map((post) => {
              const dragHandlers = getDragHandlers(post);

              return (
                <PostCard
                  key={post.id}
                  ref={registerRef(post.id)}
                  post={post}
                  onClick={widgetConfig.showSidePanel ? setSelectedPost : undefined}
                  isDragging={draggedId === post.id}
                  onPointerDown={dragHandlers.onPointerDown}
                  onPointerMove={dragHandlers.onPointerMove}
                  onPointerUp={dragHandlers.onPointerUp}
                  onPointerCancel={dragHandlers.onPointerCancel}
                />
              );
            })}
          </div>
        )}

        {isSaving && <SavingIndicator />}
        {saveError && !isSaving && (
          <ReorderErrorToast message={saveError} onDismiss={dismissSaveError} />
        )}
      </div>

      {widgetConfig.showSidePanel && (
        <SidePanel post={selectedPost} onClose={() => setSelectedPost(null)} />
      )}
    </div>
  );
}
