import { useEffect } from "react";

/**
 * Calls `onEscape` when the Escape key is pressed while `active` is
 * true. Standard expected behavior for any dismissible overlay
 * (side panel, modal, dropdown); extracted as a hook so any future
 * overlay can reuse it instead of re-wiring its own listener.
 */
export function useEscapeKey(active: boolean, onEscape: () => void): void {
  useEffect(() => {
    if (!active) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onEscape();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [active, onEscape]);
}
