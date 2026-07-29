import { useCallback, useEffect, useRef, useState } from "react";
import { EditableFields, Post } from "../data/post";

const DEBOUNCE_MS = 800;
const SAVED_INDICATOR_MS = 1600;

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface UsePostAutosaveResult {
  /** Current (possibly unsaved) values for every editable field. */
  draft: EditableFields;
  /** Updates one field's draft value and (re)schedules a debounced save. */
  updateField: <K extends keyof EditableFields>(field: K, value: EditableFields[K]) => void;
  saveStatus: SaveStatus;
  saveError: string | null;
  /** Re-attempts the most recently failed save. */
  retry: () => void;
}

function pickEditableFields(post: Post): EditableFields {
  return {
    title: post.title,
    caption: post.caption,
    scheduledDate: post.scheduledDate,
    status: post.status,
    hashtags: post.hashtags,
    canvaLink: post.canvaLink,
    gridOrder: post.gridOrder,
  };
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((value, index) => value === b[index]);
  }
  return a === b;
}

function diffFields(current: EditableFields, baseline: EditableFields): Partial<EditableFields> {
  const diff: Partial<EditableFields> = {};

  (Object.keys(current) as (keyof EditableFields)[]).forEach((key) => {
    if (!valuesEqual(current[key], baseline[key])) {
      // A generic "copy only the keys that differ" loop can't be
      // expressed without a cast here; the field-by-field equality
      // check above is what keeps this safe in practice.
      (diff as Record<string, unknown>)[key] = current[key];
    }
  });

  return diff;
}

function pickFields<K extends keyof EditableFields>(
  source: EditableFields,
  keys: K[]
): Pick<EditableFields, K> {
  const result = {} as Pick<EditableFields, K>;
  keys.forEach((key) => {
    result[key] = source[key];
  });
  return result;
}

/**
 * Debounced, diff-based autosave for a single post's editable fields.
 *
 * - Every `updateField` call updates the local draft immediately (so
 *   typing feels instant) and (re)starts an 800ms debounce timer.
 * - When the timer fires, only the fields that actually differ from
 *   the last successfully-saved baseline are sent to `onSave` — so
 *   editing several fields within the debounce window still produces
 *   one request with just what changed, not one request per field.
 * - On success, the baseline advances and a brief "saved" status is
 *   shown before returning to idle.
 * - On failure, the affected fields are rolled back to the baseline
 *   (so the UI never shows something that isn't actually persisted)
 *   and the failed change is kept so `retry()` can re-attempt it
 *   without the user re-typing anything.
 *
 * All internal callbacks read the latest draft/baseline through refs
 * rather than closures, matching the pattern used in useDragReorder,
 * so this hook's public functions stay referentially stable.
 */
export function usePostAutosave(
  post: Post,
  onSave: (id: Post["id"], changes: Partial<EditableFields>) => Promise<void>
): UsePostAutosaveResult {
  const [draft, setDraft] = useState<EditableFields>(() => pickEditableFields(post));
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const draftRef = useRef(draft);
  const baselineRef = useRef<EditableFields>(pickEditableFields(post));
  const postIdRef = useRef(post.id);
  const onSaveRef = useRef(onSave);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedFadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRetryRef = useRef<Partial<EditableFields> | null>(null);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  // Switching to a different post resets everything. Guarded by id
  // (not the whole post object) so re-fetches that produce a new
  // object reference for the *same* post don't wipe an in-progress edit.
  useEffect(() => {
    if (postIdRef.current === post.id) return;

    postIdRef.current = post.id;
    const fields = pickEditableFields(post);
    setDraft(fields);
    draftRef.current = fields;
    baselineRef.current = fields;
    pendingRetryRef.current = null;
    setSaveStatus("idle");
    setSaveError(null);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (savedFadeTimer.current) clearTimeout(savedFadeTimer.current);
  }, [post]);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (savedFadeTimer.current) clearTimeout(savedFadeTimer.current);
    };
  }, []);

  const performSave = useCallback(async (changes: Partial<EditableFields>) => {
    if (Object.keys(changes).length === 0) return;

    setSaveStatus("saving");
    setSaveError(null);

    try {
      await onSaveRef.current(postIdRef.current, changes);

      baselineRef.current = { ...baselineRef.current, ...changes };
      pendingRetryRef.current = null;
      setSaveStatus("saved");

      if (savedFadeTimer.current) clearTimeout(savedFadeTimer.current);
      savedFadeTimer.current = setTimeout(() => setSaveStatus("idle"), SAVED_INDICATOR_MS);
    } catch (err) {
      pendingRetryRef.current = changes;

      // Restore the fields that failed to their last-known-good
      // value, so the visible draft never disagrees with what's
      // actually persisted.
      const changedKeys = Object.keys(changes) as (keyof EditableFields)[];
      const reverted = pickFields(baselineRef.current, changedKeys);
      setDraft((current) => ({ ...current, ...reverted }));

      setSaveStatus("error");
      setSaveError(err instanceof Error ? err.message : "Couldn't save your changes.");
    }
  }, []);

  const scheduleSave = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      const changes = diffFields(draftRef.current, baselineRef.current);
      void performSave(changes);
    }, DEBOUNCE_MS);
  }, [performSave]);

  const updateField = useCallback(
    <K extends keyof EditableFields>(field: K, value: EditableFields[K]) => {
      setDraft((current) => ({ ...current, [field]: value }));
      scheduleSave();
    },
    [scheduleSave]
  );

  const retry = useCallback(() => {
    const changes = pendingRetryRef.current;
    if (!changes) return;

    // Re-apply the values that failed so the field shows what's being
    // retried, rather than making the user retype them.
    setDraft((current) => ({ ...current, ...changes }));
    void performSave(changes);
  }, [performSave]);

  return { draft, updateField, saveStatus, saveError, retry };
}
