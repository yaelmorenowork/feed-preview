import { NextRequest, NextResponse } from "next/server";
import { env } from "../../../../../server/env";
import { writeSession } from "../../../../../server/session";

const STATE_COOKIE_NAME = "notion_oauth_state";

interface NotionTokenResponse {
  access_token: string;
  workspace_id: string;
  workspace_name: string | null;
  workspace_icon: string | null;
  bot_id: string;
}

function redirectTo(path: string, request: NextRequest): NextResponse {
  let base: string;
  try {
    base = env.APP_URL;
  } catch {
    // APP_URL isn't set — fall back to the incoming request's own
    // origin so a misconfiguration here doesn't crash the callback
    // outright. APP_URL is still the correct value to set for
    // deployments behind a proxy/CDN where the request's own origin
    // may not match the public-facing URL.
    base = new URL(request.url).origin;
  }
  return NextResponse.redirect(new URL(path, base));
}

/**
 * Handles Notion's redirect back after the user approves (or denies)
 * access. On success, exchanges the one-time authorization code for
 * an access token — the one request in this whole app that uses
 * NOTION_CLIENT_SECRET — and stores the result in an encrypted
 * session cookie. The token is never sent to the browser as JSON or
 * otherwise exposed to client-side JavaScript at any point.
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const oauthError = url.searchParams.get("error");
    const expectedState = request.cookies.get(STATE_COOKIE_NAME)?.value;

    if (oauthError) {
      // The user denied access, or Notion rejected the request.
      return redirectTo(`/?connection_error=${encodeURIComponent(oauthError)}`, request);
    }

    if (!code || !state || !expectedState || state !== expectedState) {
      return redirectTo("/?connection_error=invalid_state", request);
    }

    const basicAuth = Buffer.from(
      `${env.NOTION_CLIENT_ID}:${env.NOTION_CLIENT_SECRET}`
    ).toString("base64");

    const tokenResponse = await fetch("https://api.notion.com/v1/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${basicAuth}`,
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: env.NOTION_REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      console.error("[oauth callback] token exchange failed", tokenResponse.status);
      return redirectTo("/?connection_error=token_exchange_failed", request);
    }

    const tokenData = (await tokenResponse.json()) as NotionTokenResponse;

    const response = redirectTo("/?connected=1", request);

    writeSession(response, {
      accessToken: tokenData.access_token,
      workspaceId: tokenData.workspace_id,
      workspaceName: tokenData.workspace_name ?? "Your Notion workspace",
      workspaceIcon: tokenData.workspace_icon ?? null,
      botId: tokenData.bot_id,
    });

    response.cookies.delete(STATE_COOKIE_NAME);

    return response;
  } catch (err) {
    console.error("[oauth callback]", err instanceof Error ? err.message : err);
    return redirectTo("/?connection_error=unexpected", request);
  }
}
