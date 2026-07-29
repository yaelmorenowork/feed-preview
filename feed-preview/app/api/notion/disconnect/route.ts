import { NextResponse } from "next/server";
import { clearSession } from "../../../../server/session";

/**
 * Disconnects the workspace: deletes the session cookie. Doesn't call
 * Notion's token revocation endpoint (Notion tokens aren't
 * user-revocable via API at the time of writing) — the user can also
 * remove this integration's access from their own Notion workspace
 * settings for a full revoke.
 */
export async function POST() {
  const response = NextResponse.json({ success: true });
  clearSession(response);
  return response;
}
