"use client";

/**
 * Thin client-side wrapper around this app's own /api/notion/*
 * routes. This file never sees a Notion access token — that lives
 * only in an encrypted, httpOnly cookie the server reads directly
 * (see server/session.ts). Everything here just calls our own API
 * and reads plain JSON responses.
 */

export interface ConnectionStatus {
  connected: boolean;
  workspaceName?: string;
  workspaceIcon?: string | null;
  databaseId?: string | null;
  setupComplete?: boolean;
}

/** Where to send the browser to start the Notion OAuth flow. */
export const NOTION_AUTHORIZE_URL = "/api/auth/notion";

export async function getConnectionStatus(): Promise<ConnectionStatus> {
  try {
    const response = await fetch("/api/notion/session", { cache: "no-store" });
    if (!response.ok) return { connected: false };
    return (await response.json()) as ConnectionStatus;
  } catch {
    return { connected: false };
  }
}

export async function disconnectWorkspace(): Promise<void> {
  await fetch("/api/notion/disconnect", { method: "POST" });
}
