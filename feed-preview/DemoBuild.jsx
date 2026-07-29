import { useState, useCallback, useRef, useLayoutEffect, forwardRef, memo } from "react";
import {
  RotateCw, LayoutGrid, List, Play, Layers, ImageOff, Loader2, AlertCircle, X,
} from "lucide-react";

/* ---------------------------------------------------------------------- */
/* Mock data (mirrors data/mockPosts.ts)                                   */
/* ---------------------------------------------------------------------- */

const initialPosts = [
  { id: 1, gridOrder: 0, type: "image", imageUrl: "https://picsum.photos/id/1015/600/600", status: "Published", scheduledDate: "Jul 12" },
  { id: 2, gridOrder: 1, type: "reel", imageUrl: "https://picsum.photos/id/1025/600/600", status: "Scheduled", scheduledDate: "Jul 24" },
  { id: 3, gridOrder: 2, type: "carousel", imageUrl: "https://picsum.photos/id/1035/600/600", status: "Ready", scheduledDate: "Jul 26" },
  { id: 4, gridOrder: 3, type: "image", imageUrl: "https://picsum.photos/id/1043/600/600", status: "Draft", scheduledDate: "Jul 28" },
  { id: 5, gridOrder: 4, type: "reel", imageUrl: "https://picsum.photos/id/1050/600/600", status: "Published", scheduledDate: "Jul 10" },
  { id: 6, gridOrder: 5, type: "carousel", imageUrl: "https://picsum.photos/id/1060/600/600", status: "Scheduled", scheduledDate: "Jul 30" },
  { id: 7, gridOrder: 6, type: "image", imageUrl: "https://picsum.photos/id/1074/600/600", status: "Ready", scheduledDate: "Aug 1" },
  { id: 8, gridOrder: 7, type: "reel", imageUrl: "https://picsum.photos/id/1080/600/600", status: "Draft", scheduledDate: "Aug 3" },
  { id: 9, gridOrder: 8, type: "carousel", imageUrl: "https://picsum.photos/id/1084/600/600", status: "Published", scheduledDate: "Jul 8" },
];

const POST_TYPE_LABEL = { image: "Image", reel: "Reel", carousel: "Carousel" };
const POST_STATUS_DOT_COLOR = {
  Draft: "bg-neutral-400", Ready: "bg-blue-500", Scheduled: "bg-amber-500", Published: "bg-emerald-500",
};

function cn(...values) {
  return values.filter(Boolean).join(" ");
}

/* ---------------------------------------------------------------------- */
/* Mock persistence (mirrors services/feedService.reorderPosts)           */
/* Fails ~15% of the time on purpose, so you can see the error + rollback */
/* ---------------------------------------------------------------------- */

async function mockReorderPosts(orderedPosts) {
  await new Promise((resolve) => setTimeout(resolve, 500));
  if (Math.random() < 0.15) {
    throw new Error("Couldn't save the new order. Please try again.");
  }
  console.log(
    "Persisted order:",
    orderedPosts.map((p, i) => ({ id: p.id, gridOrder: i }))
  );
}

/* ---------------------------------------------------------------------- */
/* useDragReorder (mirrors hooks/useDragReorder.ts)                       */
/* ---------------------------------------------------------------------- */

const DRAG_THRESHOLD_PX = 6;
const SETTLE_TRANSITION = "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)";
const SETTLE_DURATION_MS = 280;
const FLIP_TRANSITION = "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)";

function useDragReorder({ items, getId, onPersist }) {
  const [orderedItems, setOrderedItems] = useState(items);
  const [draggedId, setDraggedId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const orderedItemsRef = useRef(items);
  const elementRefs = useRef(new Map());
  const prevRects = useRef(new Map());
  const draggedIdRef = useRef(null);
  const wasDraggedRef = useRef(false);
  const orderBeforeDragRef = useRef(null);
  const handlersCache = useRef(new Map());
  const refCallbackCache = useRef(new Map());
  const dragSession = useRef(null);

  useLayoutEffect(() => {
    orderedItemsRef.current = orderedItems;
  }, [orderedItems]);

  useLayoutEffect(() => {
    if (draggedIdRef.current === null) setOrderedItems(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const registerRef = useCallback((id) => {
    const cached = refCallbackCache.current.get(id);
    if (cached) return cached;
    const callback = (el) => {
      if (el) elementRefs.current.set(id, el);
      else elementRefs.current.delete(id);
    };
    refCallbackCache.current.set(id, callback);
    return callback;
  }, []);

  useLayoutEffect(() => {
    const newRects = new Map();
    elementRefs.current.forEach((el, id) => newRects.set(id, el.getBoundingClientRect()));

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

  const reorderTo = useCallback((activeId, clientX, clientY) => {
    setOrderedItems((current) => {
      const activeIndex = current.findIndex((item) => getId(item) === activeId);
      if (activeIndex === -1) return current;

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
  }, [getId]);

  const handlePointerMove = useCallback((e) => {
    const session = dragSession.current;
    if (!session || session.pointerId !== e.pointerId) return;

    const dx = e.clientX - session.startX;
    const dy = e.clientY - session.startY;

    if (draggedIdRef.current === null) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
      draggedIdRef.current = session.id;
      wasDraggedRef.current = true;
      orderBeforeDragRef.current = orderedItemsRef.current;
      setDraggedId(session.id);
      const el = elementRefs.current.get(session.id);
      if (el) el.style.transition = "none";
    }

    const el = elementRefs.current.get(session.id);
    if (el) el.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(1.06)`;

    reorderTo(session.id, e.clientX, e.clientY);
  }, [reorderTo]);

  const finishDrag = useCallback(async (id) => {
    const el = elementRefs.current.get(id);
    if (el) {
      el.style.transition = SETTLE_TRANSITION;
      el.style.transform = "";
      window.setTimeout(() => { el.style.transition = ""; }, SETTLE_DURATION_MS);
    }

    draggedIdRef.current = null;
    setDraggedId(null);

    const previousOrder = orderBeforeDragRef.current;
    const finalOrder = orderedItemsRef.current;
    orderBeforeDragRef.current = null;

    const orderChanged = previousOrder !== null &&
      previousOrder.some((item, index) => getId(item) !== getId(finalOrder[index]));

    if (!orderChanged) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      await onPersist(finalOrder);
    } catch (err) {
      if (previousOrder) setOrderedItems(previousOrder);
      setSaveError(err instanceof Error ? err.message : "Couldn't save the new order. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [getId, onPersist]);

  const handlePointerUp = useCallback((e) => {
    const session = dragSession.current;
    if (!session || session.pointerId !== e.pointerId) return;
    const target = e.currentTarget;
    if (target.hasPointerCapture(e.pointerId)) target.releasePointerCapture(e.pointerId);
    dragSession.current = null;
    if (draggedIdRef.current !== null) void finishDrag(draggedIdRef.current);
  }, [finishDrag]);

  const getDragHandlers = useCallback((item) => {
    const id = getId(item);
    const cached = handlersCache.current.get(id);
    if (cached) return cached;

    const handlers = {
      onPointerDown: (e) => {
        if (e.button !== 0) return;
        dragSession.current = { id, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY };
        wasDraggedRef.current = false;
        e.currentTarget.setPointerCapture(e.pointerId);
      },
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerUp,
    };

    handlersCache.current.set(id, handlers);
    return handlers;
  }, [getId, handlePointerMove, handlePointerUp]);

  const handleContainerClickCapture = useCallback((e) => {
    if (wasDraggedRef.current) {
      wasDraggedRef.current = false;
      e.stopPropagation();
    }
  }, []);

  const dismissSaveError = useCallback(() => setSaveError(null), []);

  return {
    items: orderedItems, draggedId, isSaving, saveError, dismissSaveError,
    registerRef, getDragHandlers, handleContainerClickCapture,
  };
}

/* ---------------------------------------------------------------------- */
/* PostCard (mirrors components/PostCard.tsx)                             */
/* ---------------------------------------------------------------------- */

function PostTypeIcon({ type }) {
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

const PostCard = memo(forwardRef(function PostCard(
  { post, onClick, isDragging, onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
  ref
) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      ref={ref}
      onClick={() => onClick?.(post)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      className={cn(
        "group relative aspect-square touch-none select-none overflow-hidden bg-white ring-1 ring-[#F2F2F2] shadow-[0_1px_2px_rgba(15,15,15,0.05)] transition-all duration-[220ms] ease-out cursor-pointer",
        isDragging && "z-20 cursor-grabbing shadow-[0_24px_48px_-16px_rgba(15,15,15,0.35)]",
        !isDragging && "hover:z-10 hover:-translate-y-[3px] hover:scale-[1.02] hover:shadow-[0_16px_32px_-12px_rgba(15,15,15,0.25)]"
      )}
      style={{ borderRadius: "16px" }}
    >
      {!loaded && <div className="absolute inset-0 animate-pulse bg-neutral-200/70" />}
      <img
        src={post.imageUrl}
        alt=""
        draggable={false}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={cn("h-full w-full object-cover transition-opacity duration-500 ease-out", loaded ? "opacity-100" : "opacity-0")}
      />
      <PostTypeIcon type={post.type} />
      <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-300 ease-out group-hover:bg-black/[0.18]" />
      <div className="absolute bottom-3 left-3 translate-y-1 opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100">
        <p className="text-[12.5px] font-medium leading-tight text-white">{POST_TYPE_LABEL[post.type]}</p>
        <p className="text-[11px] leading-tight text-white/70">{post.scheduledDate}</p>
      </div>
      <div className="absolute bottom-3 right-3 translate-y-1 opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100">
        <div className="flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 backdrop-blur-sm">
          <span className={`h-1.5 w-1.5 rounded-full ${POST_STATUS_DOT_COLOR[post.status]}`} />
          <span className="text-[11px] font-medium leading-none text-neutral-800">{post.status}</span>
        </div>
      </div>
    </div>
  );
}));

/* ---------------------------------------------------------------------- */
/* Saving indicator / error toast (mirrors components/ReorderStatus.tsx)  */
/* ---------------------------------------------------------------------- */

function SavingIndicator() {
  return (
    <div className="pointer-events-none absolute right-4 top-4 z-20 flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 shadow-[0_4px_16px_-4px_rgba(15,15,15,0.15)] ring-1 ring-[#F2F2F2]">
      <Loader2 className="h-3 w-3 animate-spin text-neutral-400" strokeWidth={2} />
      <span className="text-[12px] font-medium text-neutral-500">Saving order…</span>
    </div>
  );
}

function ReorderErrorToast({ message, onDismiss }) {
  return (
    <div className="absolute right-4 top-4 z-20 flex max-w-[260px] items-start gap-2 rounded-xl bg-rose-50 px-3.5 py-3 shadow-[0_4px_16px_-4px_rgba(15,15,15,0.15)]">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" strokeWidth={2} />
      <p className="text-[12.5px] leading-snug text-rose-600">{message}</p>
      <button type="button" onClick={onDismiss} aria-label="Dismiss" className="ml-auto shrink-0 text-rose-400 transition-colors duration-200 ease-out hover:text-rose-600">
        <X className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* FeedHeader (unchanged)                                                 */
/* ---------------------------------------------------------------------- */

function FeedHeader() {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h2 className="text-[15px] font-semibold leading-tight tracking-[-0.01em] text-neutral-900">Feed Preview</h2>
        <p className="mt-0.5 text-[13px] leading-tight text-neutral-400">Drag any post to reorder it</p>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" aria-label="Refresh" className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition-all duration-200 ease-out hover:bg-neutral-100 hover:text-neutral-700 active:scale-90">
          <RotateCw className="h-[15px] w-[15px]" strokeWidth={2} />
        </button>
        <div className="flex items-center gap-0.5 rounded-full bg-neutral-100 p-0.5">
          <button type="button" aria-label="Grid view" className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-neutral-800 shadow-[0_1px_2px_rgba(15,15,15,0.08)] transition-all duration-200 ease-out">
            <LayoutGrid className="h-[13px] w-[13px]" strokeWidth={2} />
          </button>
          <button type="button" aria-label="List view" className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 transition-all duration-200 ease-out hover:text-neutral-600">
            <List className="h-[13px] w-[13px]" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* FeedPreview (mirrors components/FeedPreview.tsx)                       */
/* ---------------------------------------------------------------------- */

const getPostId = (post) => post.id;

export default function FeedPreview() {
  const {
    items: orderedPosts, draggedId, isSaving, saveError, dismissSaveError,
    registerRef, getDragHandlers, handleContainerClickCapture,
  } = useDragReorder({ items: initialPosts, getId: getPostId, onPersist: mockReorderPosts });

  return (
    <div className="flex items-center justify-center bg-white p-10 min-h-screen">
      <div
        className="relative w-full max-w-xl bg-white p-6"
        style={{
          borderRadius: 20,
          boxShadow: "0 1px 2px rgba(15, 15, 15, 0.04), 0 8px 24px -8px rgba(15, 15, 15, 0.08), 0 16px 40px -16px rgba(15, 15, 15, 0.06)",
        }}
      >
        <FeedHeader />

        <div
          style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "16px" }}
          onClickCapture={handleContainerClickCapture}
        >
          {orderedPosts.map((post) => {
            const dragHandlers = getDragHandlers(post);
            return (
              <PostCard
                key={post.id}
                ref={registerRef(post.id)}
                post={post}
                isDragging={draggedId === post.id}
                onPointerDown={dragHandlers.onPointerDown}
                onPointerMove={dragHandlers.onPointerMove}
                onPointerUp={dragHandlers.onPointerUp}
                onPointerCancel={dragHandlers.onPointerCancel}
              />
            );
          })}
        </div>

        {isSaving && <SavingIndicator />}
        {saveError && !isSaving && <ReorderErrorToast message={saveError} onDismiss={dismissSaveError} />}
      </div>
    </div>
  );
}
