"use client";

/**
 * Thin client for the setup-assistant API routes. Like
 * notionConnectionService, this never touches a Notion access token
 * directly — it only calls this app's own /api/notion/databases/*
 * routes and reads plain JSON.
 */

export interface DatabaseSummary {
  id: string;
  title: string;
  icon: string | null;
}

export type PropertyValidationStatus = "matched" | "type_mismatch" | "missing";

export interface PropertyValidationResult {
  name: string;
  label: string;
  description: string;
  type: string;
  optional: boolean;
  status: PropertyValidationStatus;
  suggestion?: { propertyName: string; propertyType: string };
}

export interface SchemaValidation {
  isReady: boolean;
  properties: PropertyValidationResult[];
}

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

export async function listDatabases(): Promise<DatabaseSummary[]> {
  const response = await fetch("/api/notion/databases", { cache: "no-store" });
  const { databases } = await parseJsonOrThrow<{ databases: DatabaseSummary[] }>(
    response,
    "We couldn't load your Notion databases. Please try again."
  );
  return databases;
}

export async function validateDatabase(databaseId: string): Promise<SchemaValidation> {
  const response = await fetch(
    `/api/notion/databases/${encodeURIComponent(databaseId)}/validate`,
    { cache: "no-store" }
  );
  return parseJsonOrThrow<SchemaValidation>(
    response,
    "We couldn't check that database's properties. Please try again."
  );
}

export async function selectDatabase(
  databaseId: string,
  propertyMap: Record<string, string>
): Promise<void> {
  const response = await fetch(
    `/api/notion/databases/${encodeURIComponent(databaseId)}/select`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyMap }),
    }
  );
  await parseJsonOrThrow(response, "We couldn't finish setup. Please try again.");
}
