import { NextRequest, NextResponse } from "next/server";
import { readSession } from "../../../../server/session";
import { fetchPosts } from "../../../../server/notion/postsRepository";

export async function GET(request: NextRequest) {
  const session = readSession(request);

  if (!session) {
    return NextResponse.json({ error: "Not connected to Notion." }, { status: 401 });
  }

  if (!session.databaseId) {
    return NextResponse.json(
      { error: "No database is selected yet. Finish setup to choose one." },
      { status: 409 }
    );
  }

  try {
    const posts = await fetchPosts(session);
    return NextResponse.json({ posts });
  } catch (err) {
    const message = err instanceof Error ? err.message : "We couldn't load your posts.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
