import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { env } from "../../../../server/env";

const STATE_COOKIE_NAME = "notion_oauth_state";
const STATE_COOKIE_MAX_AGE_SECONDS = 600; // 10 minutes — just long enough for the redirect round-trip.
const IS_PRODUCTION = process.env.NODE_ENV === "production";

/**
 * Starts the Notion OAuth flow: redirects the user to Notion's
 * authorization screen. Notion sends them back to
 * NOTION_REDIRECT_URI (the callback route below) once they approve.
 *
 * A random `state` value is generated and stored in a short-lived
 * httpOnly cookie, then echoed back by Notion in the callback — a
 * standard OAuth CSRF mitigation that stops a malicious site from
 * tricking a user's browser into completing our OAuth flow with
 * attacker-controlled parameters.
 */
export async function GET(_request: NextRequest) {
  let authorizeUrl: URL;

  try {
    const state = randomBytes(16).toString("hex");

    authorizeUrl = new URL("https://api.notion.com/v1/oauth/authorize");
    authorizeUrl.searchParams.set("client_id", env.NOTION_CLIENT_ID);
    authorizeUrl.searchParams.set("redirect_uri", env.NOTION_REDIRECT_URI);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("owner", "user");
    authorizeUrl.searchParams.set("state", state);

    const response = NextResponse.redirect(authorizeUrl);

    response.cookies.set(STATE_COOKIE_NAME, state, {
      httpOnly: true,
      secure: IS_PRODUCTION,
      sameSite: "none",
      path: "/",
      maxAge: STATE_COOKIE_MAX_AGE_SECONDS,
    });

    return response;
  } catch (err) {
    // Most likely a missing environment variable in this deployment
    // (see server/env.ts) — surface a clear message instead of a
    // generic 500, since this is the very first step a new user hits.
    console.error("[oauth authorize]", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "This app isn't configured correctly yet. Please contact support." },
      { status: 500 }
    );
  }
}
