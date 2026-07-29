import { useEffect, useState } from "react";

interface MountTransitionState<T> {
  shouldRender: boolean;
  isVisible: boolean;
  displayedValue: T | null;
}

/**
 * Drives enter/exit animations for content that mounts/unmounts based
 * on a value becoming present or null (e.g. a selected item opening a
 * side panel or modal).
 *
 * Keeps the last non-null value rendered during the exit transition
 * (so it can fade/slide out instead of vanishing instantly), then
 * fully unmounts after `exitDurationMs`. Extracted out of SidePanel so
 * any future panel/modal/drawer can reuse the same behaviour.
 */
export function useMountTransition<T>(
  value: T | null,
  exitDurationMs: number
): MountTransitionState<T> {
  const [shouldRender, setShouldRender] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [displayedValue, setDisplayedValue] = useState<T | null>(null);

  useEffect(() => {
    if (value !== null) {
      setDisplayedValue(value);
      setShouldRender(true);
      const raf = requestAnimationFrame(() => setIsVisible(true));
      return () => cancelAnimationFrame(raf);
    }

    setIsVisible(false);
    const timeout = setTimeout(() => setShouldRender(false), exitDurationMs);
    return () => clearTimeout(timeout);
  }, [value, exitDurationMs]);

  return { shouldRender, isVisible, displayedValue };
}
