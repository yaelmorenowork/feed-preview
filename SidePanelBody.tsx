"use client";

import { Post } from "../data/post";
import { usePostAutosave } from "../hooks/usePostAutosave";
import { updatePost } from "../services/feedService";
import { SavingIndicator, SavedIndicator, RetryableErrorToast } from "./ReorderStatus";
import PanelHeader from "./PanelHeader";
import PanelContent from "./PanelContent";
import PanelFooter from "./PanelFooter";

/**
 * Owns the editing/autosave session for whichever post the Side Panel
 * is currently showing. Split out from SidePanel so the autosave hook
 * (which needs a real, non-null Post to initialize) is only ever
 * mounted once a post is actually confirmed — SidePanel itself stays
 * focused on the open/close animation lifecycle.
 */
export default function SidePanelBody({
  post,
  onClose,
}: {
  post: Post;
  onClose: () => void;
}) {
  const { draft, updateField, saveStatus, saveError, retry } = usePostAutosave(
    post,
    updatePost
  );

  return (
    <>
      <PanelHeader post={post} draft={draft} onFieldChange={updateField} />
      <div className="flex-1 overflow-y-auto">
        <PanelContent post={post} draft={draft} onFieldChange={updateField} />
      </div>
      <PanelFooter onClose={onClose} />

      {saveStatus === "saving" && <SavingIndicator label="Saving…" />}
      {saveStatus === "saved" && <SavedIndicator />}
      {saveStatus === "error" && saveError && (
        <RetryableErrorToast message={saveError} onRetry={retry} />
      )}
    </>
  );
}
