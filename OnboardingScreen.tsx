"use client";

import { type CSSProperties } from "react";
import { Database, ExternalLink, AlertCircle } from "lucide-react";
import { NOTION_AUTHORIZE_URL } from "../services/notionConnectionService";
import { CARD_SHADOW } from "../lib/elevation";

const containerStyle: CSSProperties = {
  borderRadius: 24,
  boxShadow: CARD_SHADOW,
};

const CONNECTION_ERROR_MESSAGES: Record<string, string> = {
  access_denied: "You declined the request, so nothing was connected. You can try again anytime.",
  invalid_state: "That connection attempt expired or looked tampered with. Please try again.",
  token_exchange_failed: "Notion couldn't confirm that authorization. Please try again.",
  unexpected: "Something unexpected happened while connecting. Please try again.",
};

/**
 * First-run screen: connects the user's Notion workspace via
 * Notion's official OAuth flow (app/api/auth/notion). No token is
 * ever typed, copied, or seen by the user — clicking through takes
 * them to Notion's own authorization screen and back.
 */
export default function OnboardingScreen({
  connectionError,
}: {
  connectionError?: string | null;
}) {
  const errorMessage = connectionError
    ? CONNECTION_ERROR_MESSAGES[connectionError] ?? CONNECTION_ERROR_MESSAGES.unexpected
    : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-10">
      <div className="w-full max-w-md bg-white p-8" style={containerStyle}>
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-900">
            <Database className="h-5 w-5 text-white" strokeWidth={1.75} />
          </div>
          <h1 className="mt-4 text-[17px] font-semibold tracking-[-0.01em] text-neutral-900">
            Connect your Notion workspace
          </h1>
          <p className="mt-1.5 max-w-[280px] text-[13.5px] leading-relaxed text-neutral-400">
            You'll be taken to Notion to approve access, then brought right back here.
          </p>
        </div>

        {errorMessage && (
          <div className="mt-6 flex items-start gap-2 rounded-xl bg-rose-50 px-3.5 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" strokeWidth={2} />
            <p className="text-[13px] leading-snug text-rose-600">{errorMessage}</p>
          </div>
        )}

        <a
          href={NOTION_AUTHORIZE_URL}
          className="mt-8 flex items-center justify-center gap-2 rounded-xl bg-neutral-900 py-2.5 text-[13px] font-medium text-white transition-colors duration-200 ease-out hover:bg-neutral-800"
        >
          Connect with Notion
          <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
        </a>

        <p className="mt-4 text-center text-[12px] leading-relaxed text-neutral-400">
          Notion will ask which pages and databases to share — you're always in control of
          what this app can see.
        </p>
      </div>
    </div>
  );
}
