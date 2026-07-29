import { NextRequest, NextResponse } from "next/server";
import type { DataSourceObjectResponse } from "@notionhq/client";
import { readSession } from "../../../../server/session";
import { createNotionClient } from "../../../../server/notion/client";
import { withNotionErrorHandling } from "../../../../server/notion/request";

interface DatabaseSummary {
  id: string;
  title: string;
  icon: string | null;
}

function isDataSource(result: {
  object: string;
}): result is DataSourceObjectResponse {
  return result.object === "data_source";
}

/**
 * Lists the databases the connected integration has access to, for
 * the setup assistant's picker step.
 *
 * Under Notion's current API, a database's queryable identity is
 * actually its "data source" — searching for data_source objects
 * gives us title, icon, and id in one request, without a separate
 * lookup per database.
 */
export async function GET(request: NextRequest) {
  const session = readSession(request);

  if (!session) {
    return NextResponse.json({ error: "Not connected to Notion." }, { status: 401 });
  }

  try {
    const client = createNotionClient(session.accessToken);

    const results = await withNotionErrorHandling(
      () =>
        client.search({
          filter: { property: "object", value: "data_source" },
          page_size: 50,
        }),
      "We couldn't load your Notion databases. Please try again."
    );

    const databases: DatabaseSummary[] = results.results
      .filter(isDataSource)
      .map((dataSource) => ({
        id: dataSource.id,
        title: dataSource.title.map((t) => t.plain_text).join("") || "Untitled",
        icon: dataSource.icon?.type === "emoji" ? dataSource.icon.emoji : null,
      }));

    return NextResponse.json({ databases });
  } catch (err) {
    const message = err instanceof Error ? err.message : "We couldn't load your Notion databases.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
