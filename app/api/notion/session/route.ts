import { NextRequest, NextResponse } from "next/server";
import { readSession } from "../../../../server/session";

/**
 * Lets the frontend check "is a workspace already connected" and, if
 * so, show which one — without the access token ever being part of
 * the response. This is the only session-related data the client is
 * allowed to see.
 */
export async function GET(request: NextRequest) {
  const session = readSession(request);

  if (!session) {
    return NextResponse.json({ connected: false });
  }

  return NextResponse.json({
    connected: true,
    workspaceName: session.workspaceName,
    workspaceIcon: session.workspaceIcon,
    databaseId: session.databaseId ?? null,
    setupComplete: Boolean(session.databaseId),
  });
}
