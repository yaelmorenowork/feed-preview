import { useCallback, useLayoutEffect, useRef, useState } from "react";

type ItemId = string | number;

interface UseDragReorderOptions<T> {
  /** Current source-of-truth items (e.g. from a data-fetching hook). */
  items: T[];
  /** Extracts a stable unique id from an item. Should be a stable
   *  reference (defined outside the component) so drag handlers can
   *  be cached correctly. */
  getId: (item: T) => ItemId;
  /** Persists the final order. Rejects -> the previous order is
   *  restored. Receives both the new order and the order before this
   *  drag, so a persistence layer can write only what changed. */
  onPersist: (orderedItems: T[], previousItems: T[]) => Promise<void>;
}

interface DragHandlers {
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerCancel: (e: React.PointerEvent<HTMLElement>) => void;
}

const DRAG_THRESHOLD_PX = 6;
const SETTLE_TRANSITION = "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)";
const SETTLE_DURATION_MS = 280;
const FLIP_TRANSITION = "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)";

/**
 * Generic drag-to-reorder hook using a hand-rolled FLIP animation —
 * no drag & drop library required.
 *
 * How it works:
 *  - `items` (state) is the authoritative visual order. Reordering it
 *    (via live drag) re-renders the list in the new DOM order.
 *  - Every other (non-dragged) element gets its position change
 *    animated by the FLIP technique: measure before, let the browser
 *    lay out the new order, measure after, then animate the visual
 *    delta back to zero.
 *  - The actively dragged element is *not* driven by FLIP — its
 *    transform is written directly to the DOM on every pointer move
 *    (bypassing React state) so it tracks the cursor at 60fps with no
 *    lag, then eases into its final slot on drop.
 *  - A short-movement threshold distinguishes a genuine drag from a
 *    plain click, so existing click-to-open behavior on the item
 *    keeps working unless the user actually drags.
 *
 * All internal callbacks read live state through refs rather than
 * closures, so they stay referentially stable across renders — that
 * lets getDragHandlers() cache one handler set per item id, which in
 * turn lets consumers (e.g. a memoized card component) avoid
 * re-rendering every item on every keystroke of the drag.
 *
 * Persistence is fully decoupled: `onPersist` is the only seam this
 * hook talks to. Swapping the backing store (e.g. a different
 * persistence layer) never touches this hook.
 */
export function useDragReorder<T>({
  items,
  getId,
  onPersist,
}: UseDragReorderOptions<T>) {
  const [orderedItems, setOrderedItems] = useState<T[]>(items);
  const [draggedId, setDraggedId] = useState<ItemId | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const orderedItemsRef = useRef<T[]>(items);
  const elementRefs = useRef<Map<ItemId, HTMLElement>>(new Map());
  const prevRects = useRef<Map<ItemId, DOMRect>>(new Map());
  const draggedIdRef = useRef<ItemId | null>(null);
  const wasDraggedRef = useRef(false);
  const orderBeforeDragRef = useRef<T[] | null>(null);
  const handlersCache = useRef<Map<ItemId, DragHandlers>>(new Map());

  const dragSession = useRef<{
    id: ItemId;
    pointerId: number;
    startX: number;
    startY: number;
  } | null>(null);

  // Keep the ref mirror of orderedItems current for callbacks that
  // need to read the latest order without depending on it (which
  // would otherwise force them to be recreated on every reorder step).
  useLayoutEffect(() => {
    orderedItemsRef.current = orderedItems;
  }, [orderedItems]);

  // Keep the local order in sync with the source data, but never while
  // a drag is in flight (that would rip the item out from under the
  // user's cursor mid-gesture).
  useLayoutEffect(() => {
    if (draggedIdRef.current === null) {
      setOrderedItems(items);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const refCallbackCache = useRef<Map<ItemId, (el: HTMLElement | null) => void>>(
    new Map()
  );

  /**
   * Returns a cached ref callback per item id, so passing
   * `ref={registerRef(id)}` inline in JSX doesn't create a new
   * function (and thus detach/reattach the DOM ref) on every render.
   */
  const registerRef = useCallback((id: ItemId) => {
    const cached = refCallbackCache.current.get(id);
    if (cached) return cached;

    const callback = (el: HTMLElement | null) => {
      if (el) {
        elementRefs.current.set(id, el);
      } else {
        elementRefs.current.delete(id);
      }
    };

    refCallbackCache.current.set(id, callback);
    return callback;
  }, []);

  // FLIP: animate every non-dragged item from its previous position to
  // its new one whenever the order changes.
  useLayoutEffect(() => {
    const newRects = new Map<ItemId, DOMRect>();

    elementRefs.current.forEach((el, id) => {
      newRects.set(id, el.getBoundingClientRect());
    });

    newRects.forEach((newRect, id) => {
      if (id === draggedIdRef.current) return;

      const oldRect = prevRects.current.get(id);
      const el = elementRefs.current.get(id);
      if (!el || !oldRect) return;

      const dx = oldRect.left - newRect.left;
      const dy = oldRect.top - newRect.top;

      if (dx === 0 && dy === 0) return;

      el.style.transition = "none";
      el.style.transform = `translate(${dx}px, ${dy}px)`;

      requestAnimationFrame(() => {
        el.style.transition = FLIP_TRANSITION;
        el.style.transform = "";
      });
    });

    prevRects.current = newRects;
  }, [orderedItems]);

  /** Stable — only depends on getId, never on the current order. */
  const reorderTo = useCallback(
    (activeId: ItemId, clientX: number, clientY: number) => {
      setOrderedItems((current) => {
        const activeIndex = current.findIndex((item) => getId(item) === activeId);
        if (activeIndex === -1) return current;

        // Find the closest item (by center point) to the pointer,
        // excluding the one being dragged, to use as the swap target.
        let targetIndex = activeIndex;
        let bestDistance = Infinity;

        current.forEach((item, index) => {
          const id = getId(item);
          if (id === activeId) return;

          const el = elementRefs.current.get(id);
          if (!el) return;

          const rect = el.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const distance = Math.hypot(clientX - centerX, clientY - centerY);

          if (distance < bestDistance) {
            bestDistance = distance;
            targetIndex = index;
          }
        });

        if (targetIndex === activeIndex) return current;

        const next = current.slice();
        const [moved] = next.splice(activeIndex, 1);
        next.splice(targetIndex, 0, moved);
        return next;
      });
    },
    [getId]
  );

  /** Stable — reads live order via orderedItemsRef, not a closure. */
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const session = dragSession.current;
      if (!session || session.pointerId !== e.pointerId) return;

      const dx = e.clientX - session.startX;
      const dy = e.clientY - session.startY;

      if (draggedIdRef.current === null) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;

        // Movement threshold exceeded: this is now a genuine drag.
        draggedIdRef.current = session.id;
        wasDraggedRef.current = true;
        orderBeforeDragRef.current = orderedItemsRef.current;
        setDraggedId(session.id);

        const el = elementRefs.current.get(session.id);
        if (el) el.style.transition = "none";
      }

      const el = elementRefs.current.get(session.id);
      if (el) {
        el.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(1.06)`;
      }

      reorderTo(session.id, e.clientX, e.clientY);
    },
    [reorderTo]
  );

  /** Stable — reads live order via orderedItemsRef, not a closure. */
  const finishDrag = useCallback(
    async (id: ItemId) => {
      const el = elementRefs.current.get(id);

      if (el) {
        // Ease the dragged element from wherever the cursor left it
        // back into its (already correct) grid slot.
        el.style.transition = SETTLE_TRANSITION;
        el.style.transform = "";
        window.setTimeout(() => {
          el.style.transition = "";
        }, SETTLE_DURATION_MS);
      }

      draggedIdRef.current = null;
      setDraggedId(null);

      const previousOrder = orderBeforeDragRef.current;
      const finalOrder = orderedItemsRef.current;
      orderBeforeDragRef.current = null;

      if (previousOrder === null) return;

      const orderChanged = previousOrder.some(
        (item, index) => getId(item) !== getId(finalOrder[index])
      );

      if (!orderChanged) return;

      setIsSaving(true);
      setSaveError(null);

      try {
        await onPersist(finalOrder, previousOrder);
      } catch (err) {
        // Roll back to the order before this drag — triggers the same
        // FLIP effect above, so the restore animates smoothly too.
        if (previousOrder) setOrderedItems(previousOrder);
        setSaveError(
          err instanceof Error
            ? err.message
            : "Couldn't save the new order. Please try again."
        );
      } finally {
        setIsSaving(false);
      }
    },
    [getId, onPersist]
  );

  /** Stable — depends only on the already-stable finishDrag. */
  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const session = dragSession.current;
      if (!session || session.pointerId !== e.pointerId) return;

      const target = e.currentTarget;
      if (target.hasPointerCapture(e.pointerId)) {
        target.releasePointerCapture(e.pointerId);
      }

      dragSession.current = null;

      if (draggedIdRef.current !== null) {
        void finishDrag(draggedIdRef.current);
      }
    },
    [finishDrag]
  );

  /**
   * Returns a cached, stable handler set per item id. Because
   * handlePointerMove/handlePointerUp are themselves stable, these
   * cached objects never need to be recreated — so a memoized card
   * component only re-renders when its own props actually change,
   * not on every drag frame of a sibling.
   */
  const getDragHandlers = useCallback(
    (item: T): DragHandlers => {
      const id = getId(item);
      const cached = handlersCache.current.get(id);
      if (cached) return cached;

      const handlers: DragHandlers = {
        onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
          // Only the primary button/touch/pen contact starts a drag.
          if (e.button !== 0) return;

          dragSession.current = {
            id,
            pointerId: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
          };
          wasDraggedRef.current = false;
          e.currentTarget.setPointerCapture(e.pointerId);
        },
        onPointerMove: handlePointerMove,
        onPointerUp: handlePointerUp,
        onPointerCancel: handlePointerUp,
      };

      handlersCache.current.set(id, handlers);
      return handlers;
    },
    [getId, handlePointerMove, handlePointerUp]
  );

  /**
   * Capture-phase click guard for the grid container: swallows the
   * click that follows a drag so the existing "open side panel on
   * click" behavior doesn't fire right after the user drops a card.
   */
  const handleContainerClickCapture = useCallback((e: React.MouseEvent) => {
    if (wasDraggedRef.current) {
      wasDraggedRef.current = false;
      e.stopPropagation();
    }
  }, []);

  const dismissSaveError = useCallback(() => setSaveError(null), []);

  return {
    items: orderedItems,
    draggedId,
    isSaving,
    saveError,
    dismissSaveError,
    registerRef,
    getDragHandlers,
    handleContainerClickCapture,
  };
}
