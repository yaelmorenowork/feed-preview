import { NextRequest, NextResponse } from "next/server";
import { readSession, writeSession } from "../../../../../../server/session";

interface SelectDatabaseBody {
  propertyMap?: Record<string, string>;
}

/**
 * Finalizes setup: saves the chosen database (data source) id, plus
 * any property-name mapping overrides the user confirmed in the
 * setup assistant, into the session. After this, useFeed() etc. will
 * start reading real data from this database.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = readSession(request);
  if (!session) {
    return NextResponse.json({ error: "Not connected to Notion." }, { status: 401 });
  }

  const { id } = await params;

  let body: SelectDatabaseBody = {};
  try {
    body = (await request.json()) as SelectDatabaseBody;
  } catch {
    // No body / invalid JSON is fine — propertyMap is optional.
  }

  const propertyMap =
    body.propertyMap && typeof body.propertyMap === "object" ? body.propertyMap : undefined;

  try {
    const response = NextResponse.json({ success: true });
    writeSession(response, { ...session, databaseId: id, propertyMap });
    return response;
  } catch (err) {
    console.error("[select database]", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "We couldn't save that selection. Please try again." },
      { status: 500 }
    );
  }
}
