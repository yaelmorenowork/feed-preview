import { NextRequest, NextResponse } from "next/server";
import { readSession } from "../../../../../server/session";
import { updatePostOrder } from "../../../../../server/notion/postsRepository";
import { Post } from "../../../../../data/post";

interface ReorderBody {
  /** Only the posts whose gridOrder actually changed — the client
   *  diffs before calling this, so requests stay small as a board grows. */
  changedPosts: Array<Pick<Post, "id" | "gridOrder">>;
}

function isValidBody(body: unknown): body is ReorderBody {
  if (!body || typeof body !== "object") return false;
  const changed = (body as Partial<ReorderBody>).changedPosts;
  return Array.isArray(changed) && changed.every((post) => post && "id" in post);
}

export async function POST(request: NextRequest) {
  const session = readSession(request);
  if (!session) {
    return NextResponse.json({ error: "Not connected to Notion." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!isValidBody(body)) {
    return NextResponse.json({ error: "Invalid reorder payload." }, { status: 400 });
  }

  try {
    await updatePostOrder(session, body.changedPosts as Post[]);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "We couldn't save the new order.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
