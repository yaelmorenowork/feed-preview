"use client";

import { NOTION_AUTHORIZE_URL } from "./notionConnectionService";
import type { SchemaValidation } from "./notionSetupService";

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

/** Where to send the browser to reconnect (or connect for the first time). */
export const RECONNECT_URL = NOTION_AUTHORIZE_URL;

/**
 * Clears the selected database while keeping the Notion workspace
 * connection, so the user lands back on the database picker instead
 * of having to reconnect entirely.
 */
export async function changeDatabase(): Promise<void> {
  const response = await fetch("/api/notion/databases/deselect", { method: "POST" });
  await parseJsonOrThrow(response, "We couldn't change your database. Please try again.");
}

export interface CacheRefreshResult extends SchemaValidation {
  refreshedAt: string;
}

/**
 * Re-validates the connected database's schema live against Notion.
 * See app/api/notion/cache/refresh/route.ts for why this — rather
 * than a no-op — is the honest meaning of "refresh" here.
 */
export async function refreshCache(): Promise<CacheRefreshResult> {
  const response = await fetch("/api/notion/cache/refresh", { method: "POST" });
  return parseJsonOrThrow<CacheRefreshResult>(
    response,
    "We couldn't refresh right now. Please try again."
  );
}

/** Fully resets the app: clears the Notion connection and database selection. */
export async function resetConfiguration(): Promise<void> {
  const response = await fetch("/api/notion/reset", { method: "POST" });
  await parseJsonOrThrow(response, "We couldn't reset your configuration. Please try again.");
}
