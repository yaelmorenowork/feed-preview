"use client";

import { Post } from "../data/post";
import { useMountTransition } from "../hooks/useMountTransition";
import { useEscapeKey } from "../hooks/useEscapeKey";
import SidePanelBody from "./SidePanelBody";

const PANEL_EXIT_DURATION_MS = 250;
const PANEL_SHADOW = "-24px 0 48px -24px rgba(15, 15, 15, 0.18)";

export default function SidePanel({
  post,
  onClose,
}: {
  post: Post | null;
  onClose: () => void;
}) {
  const { shouldRender, isVisible, displayedValue: displayedPost } =
    useMountTransition(post, PANEL_EXIT_DURATION_MS);

  useEscapeKey(shouldRender, onClose);

  if (!shouldRender || !displayedPost) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/20 transition-opacity duration-[250ms] ease-out ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${displayedPost.title} details`}
        className={`absolute right-0 top-0 flex h-full w-full max-w-[380px] flex-col bg-white transition-all duration-[250ms] ease-out ${
          isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
        }`}
        style={{ boxShadow: PANEL_SHADOW }}
      >
        {/* Re-mounted per post via key, so an in-flight edit/autosave
            session never bleeds from one post into another. */}
        <SidePanelBody key={displayedPost.id} post={displayedPost} onClose={onClose} />
      </div>
    </div>
  );
}
