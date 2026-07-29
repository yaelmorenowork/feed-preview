import { NextRequest, NextResponse } from "next/server";
import { readSession } from "../../../../../server/session";
import { createNotionClient } from "../../../../../server/notion/client";
import { validateDatabaseSchema } from "../../../../../server/notion/schema";
import { toFriendlyError } from "../../../../../lib/friendlyNotionError";

/**
 * "Refresh cache" for Settings. This app doesn't keep a persistent
 * data cache to invalidate (useFeed() already fetches fresh from
 * Notion on every load) — what actually goes stale over time is the
 * *assumption* that the connected database's schema still matches
 * what was validated during setup (a property could be renamed or
 * deleted since). This route re-runs that validation live and
 * reports current results, which is the honest, useful version of
 * "refresh" here rather than a no-op button.
 */
export async function POST(request: NextRequest) {
  const session = readSession(request);
  if (!session) {
    return NextResponse.json({ error: "Not connected to Notion." }, { status: 401 });
  }

  if (!session.databaseId) {
    return NextResponse.json(
      { error: "No database is selected yet." },
      { status: 409 }
    );
  }

  try {
    const client = createNotionClient(session.accessToken);
    const dataSource = await client.dataSources.retrieve({
      data_source_id: session.databaseId,
    });

    if (!("properties" in dataSource)) {
      return NextResponse.json(
        { error: "We don't have full access to that database's properties." },
        { status: 403 }
      );
    }

    const properties = Object.fromEntries(
      Object.entries(dataSource.properties).map(([name, config]) => [name, { type: config.type }])
    );

    const validation = validateDatabaseSchema(properties);
    return NextResponse.json({ refreshedAt: new Date().toISOString(), ...validation });
  } catch (err) {
    const friendly = toFriendlyError(err);
    return NextResponse.json(
      { error: friendly.message, fixSteps: friendly.fixSteps },
      { status: 502 }
    );
  }
}
