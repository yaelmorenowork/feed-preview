"use client";

import { EditableFields, Post } from "../data/post";

/**
 * Data-access layer for feed posts.
 *
 * Every function here calls this app's own /api/notion/* routes —
 * never Notion directly. The access token lives only in an encrypted,
 * httpOnly session cookie the server reads (see server/session.ts);
 * this file, and everything that calls it (useFeed, useDragReorder,
 * usePostAutosave), never sees it.
 *
 * There is intentionally no mock-data fallback here: Widget.tsx only
 * renders FeedPreview once setup is confirmed complete, so by the
 * time any of these run, a real database is expected to be
 * configured. A misconfiguration should surface as a clear error
 * (see FeedErrorState), not silently substitute placeholder content —
 * showing a paying customer fake posts when their sync is actually
 * broken would be worse than a clear error message.
 */

async function parseJsonOrThrow<T>(response: Response, fallbackMessage: string): Promise<T> {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data && typeof data === "object" && typeof (data as { error?: unknown }).error === "string"
        ? (data as { error: string }).error
        : fallbackMessage;
    throw new Error(message);
  }

  return data as T;
}

export async function getPosts(): Promise<Post[]> {
  const response = await fetch("/api/notion/posts", { cache: "no-store" });
  const { posts } = await parseJsonOrThrow<{ posts: Post[] }>(
    response,
    "We couldn't load your posts. Please try again."
  );
  return posts;
}

export async function getPost(id: Post["id"]): Promise<Post | undefined> {
  const posts = await getPosts();
  return posts.find((post) => post.id === id);
}

/**
 * Persists a new grid order for the feed. Only the posts whose
 * position actually changed are sent — Notion enforces API rate
 * limits, so this matters as a board grows.
 */
export async function reorderPosts(
  orderedPosts: Post[],
  previousPosts: Post[]
): Promise<void> {
  const postsWithUpdatedOrder = orderedPosts.map((post, index) => ({
    ...post,
    gridOrder: index,
  }));

  const previousIndexById = new Map(
    previousPosts.map((post, index) => [post.id, index])
  );

  const changedPosts = postsWithUpdatedOrder.filter(
    (post, index) => previousIndexById.get(post.id) !== index
  );

  if (changedPosts.length === 0) return;

  const response = await fetch("/api/notion/posts/reorder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      changedPosts: changedPosts.map(({ id, gridOrder }) => ({ id, gridOrder })),
    }),
  });

  await parseJsonOrThrow(response, "We couldn't save the new post order. Please try again.");
}

/**
 * Persists edits to a single post's fields (title, caption, publish
 * date, status, hashtags, Canva link, grid order). Only the fields
 * present in `changes` are sent; usePostAutosave is responsible for
 * diffing before calling this.
 */
export async function updatePost(
  id: Post["id"],
  changes: Partial<EditableFields>
): Promise<void> {
  if (Object.keys(changes).length === 0) return;

  const response = await fetch(`/api/notion/posts/${encodeURIComponent(String(id))}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(changes),
  });

  await parseJsonOrThrow(response, "We couldn't save your changes. Please try again.");
}
