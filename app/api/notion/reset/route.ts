import { NextResponse } from "next/server";
import { clearSession } from "../../../../server/session";

/**
 * "Reset configuration" for Settings — a full teardown. Unlike
 * deselect (which only clears the chosen database), this clears the
 * entire session, including the Notion connection itself, so the
 * user starts completely over from the installation wizard.
 *
 * Functionally identical to /api/notion/disconnect today; kept as a
 * separate route because the two actions mean different things to a
 * user (disconnect = "sign out", reset = "start over from scratch")
 * and may reasonably diverge later (e.g. reset could also clear
 * locally-cached diagnostics state) without disconnect changing.
 */
export async function POST() {
  const response = NextResponse.json({ success: true });
  clearSession(response);
  return response;
}
