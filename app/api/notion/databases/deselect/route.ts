import { NextRequest, NextResponse } from "next/server";
import { readSession, writeSession } from "../../../../../server/session";

/**
 * Clears the selected database (and any property mapping) while
 * keeping the Notion connection itself intact, so the user lands back
 * on the setup assistant's database picker instead of having to
 * reconnect their whole workspace just to pick a different database.
 */
export async function POST(request: NextRequest) {
  const session = readSession(request);
  if (!session) {
    return NextResponse.json({ error: "Not connected to Notion." }, { status: 401 });
  }

  try {
    const response = NextResponse.json({ success: true });
    writeSession(response, {
      accessToken: session.accessToken,
      workspaceId: session.workspaceId,
      workspaceName: session.workspaceName,
      workspaceIcon: session.workspaceIcon,
      botId: session.botId,
      // databaseId and propertyMap intentionally omitted — this is
      // what "deselecting" the database means.
    });
    return response;
  } catch (err) {
    console.error("[deselect database]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "We couldn't change your database. Please try again." }, { status: 500 });
  }
}
