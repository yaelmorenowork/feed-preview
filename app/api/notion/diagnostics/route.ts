import { NextRequest, NextResponse } from "next/server";
import { readSession } from "../../../../server/session";
import { runDiagnostics } from "../../../../server/notion/diagnostics";

export async function GET(request: NextRequest) {
  const session = readSession(request);
  const report = await runDiagnostics(session);
  return NextResponse.json(report);
}
