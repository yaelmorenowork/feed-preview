import { NextRequest, NextResponse } from "next/server";
import { readSession } from "../../../../../../server/session";
import { createNotionClient } from "../../../../../../server/notion/client";
import { withNotionErrorHandling } from "../../../../../../server/notion/request";
import { validateDatabaseSchema } from "../../../../../../server/notion/schema";

/**
 * Checks whether a candidate database has the properties this app
 * needs, and suggests automatic mappings for anything missing or the
 * wrong type. This is the data behind the setup assistant screen.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = readSession(request);
  if (!session) {
    return NextResponse.json({ error: "Not connected to Notion." }, { status: 401 });
  }

  const { id } = await params;

  try {
    const client = createNotionClient(session.accessToken);

    const dataSource = await withNotionErrorHandling(
      () => client.dataSources.retrieve({ data_source_id: id }),
      "We couldn't read that database's properties. Please try again."
    );

    if (!("properties" in dataSource)) {
      return NextResponse.json(
        { error: "We don't have full access to that database's properties." },
        { status: 403 }
      );
    }

    const properties = Object.fromEntries(
      Object.entries(dataSource.properties).map(([name, config]) => [
        name,
        { type: config.type },
      ])
    );

    const result = validateDatabaseSchema(properties);
    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "We couldn't validate that database.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
