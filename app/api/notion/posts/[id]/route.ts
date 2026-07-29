import { NextRequest, NextResponse } from "next/server";
import { readSession } from "../../../../../server/session";
import { updatePostFields } from "../../../../../server/notion/postsRepository";
import { EditableFields } from "../../../../../data/post";

const EDITABLE_FIELDS: (keyof EditableFields)[] = [
  "title",
  "caption",
  "scheduledDate",
  "status",
  "hashtags",
  "canvaLink",
  "gridOrder",
];

/**
 * Validates that a request body only contains recognized editable
 * fields, stripping anything else out. A defensive boundary against
 * a malformed or malicious client sending arbitrary property updates.
 */
function sanitizeChanges(body: unknown): Partial<EditableFields> {
  if (!body || typeof body !== "object") return {};

  const changes: Partial<EditableFields> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) {
      (changes as Record<string, unknown>)[field] = (body as Record<string, unknown>)[field];
    }
  }
  return changes;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = readSession(request);
  if (!session) {
    return NextResponse.json({ error: "Not connected to Notion." }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const changes = sanitizeChanges(body);
  if (Object.keys(changes).length === 0) {
    return NextResponse.json({ success: true });
  }

  try {
    await updatePostFields(session, id, changes);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "We couldn't save your changes.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
