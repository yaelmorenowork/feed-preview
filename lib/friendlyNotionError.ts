import { isNotionClientError, APIErrorCode } from "@notionhq/client";

export interface FriendlyError {
  title: string;
  message: string;
  fixSteps: string[];
}

/**
 * Plain-language translations for Notion's technical error codes.
 * This is what makes "never show technical errors, explain exactly
 * how to fix it" (from the Diagnostics/Settings/installation
 * requirements) actually true, instead of just a design intention —
 * every place that surfaces a Notion failure to the user should route
 * it through toFriendlyError() rather than printing err.message.
 */
const FRIENDLY_MESSAGES: Partial<Record<APIErrorCode, FriendlyError>> = {
  [APIErrorCode.Unauthorized]: {
    title: "Your Notion connection has expired",
    message: "This app's access to your Notion workspace is no longer valid.",
    fixSteps: ['Open Settings and choose "Reconnect Notion."'],
  },
  [APIErrorCode.RestrictedResource]: {
    title: "Missing permission",
    message: "This app doesn't have permission to access that database anymore.",
    fixSteps: [
      "Open the database in Notion.",
      'Click the "•••" menu in the top-right corner.',
      'Under "Connections," add this app back.',
    ],
  },
  [APIErrorCode.ObjectNotFound]: {
    title: "Database not found",
    message: "The selected database couldn't be found. It may have been deleted, moved, or unshared.",
    fixSteps: ['Open Settings and choose "Change database" to pick a new one.'],
  },
  [APIErrorCode.RateLimited]: {
    title: "Too many requests",
    message: "Notion has asked this app to slow down for a moment.",
    fixSteps: ["Wait about a minute, then try again."],
  },
  [APIErrorCode.ServiceUnavailable]: {
    title: "Notion is temporarily unavailable",
    message: "Notion's own servers are having trouble right now — this isn't something you can fix.",
    fixSteps: ["Try again in a few minutes."],
  },
  [APIErrorCode.ServiceOverload]: {
    title: "Notion is temporarily overloaded",
    message: "Notion's servers are under heavy load right now — this isn't something you can fix.",
    fixSteps: ["Try again in a few minutes."],
  },
  [APIErrorCode.GatewayTimeout]: {
    title: "Notion took too long to respond",
    message: "The request to Notion timed out.",
    fixSteps: ["Try again — this is usually temporary."],
  },
  [APIErrorCode.InternalServerError]: {
    title: "Notion had an internal problem",
    message: "This is an issue on Notion's side, not with your setup.",
    fixSteps: ["Try again in a few minutes."],
  },
};

const DEFAULT_FRIENDLY_ERROR: FriendlyError = {
  title: "Something went wrong",
  message: "We ran into an unexpected problem talking to Notion.",
  fixSteps: ["Try again. If this keeps happening, open the Diagnostics screen for more detail."],
};

const NETWORK_FRIENDLY_ERROR: FriendlyError = {
  title: "Couldn't reach Notion",
  message: "This app couldn't connect to Notion's servers.",
  fixSteps: ["Check your internet connection and try again."],
};

/**
 * Converts any error this app might throw while talking to Notion
 * into a friendly title, message, and concrete fix steps — never a
 * raw error code, stack trace, or HTTP status.
 */
export function toFriendlyError(error: unknown): FriendlyError {
  if (isNotionClientError(error) && "code" in error) {
    const known = FRIENDLY_MESSAGES[error.code as APIErrorCode];
    if (known) return known;
  }

  if (error instanceof TypeError && /fetch/i.test(error.message)) {
    return NETWORK_FRIENDLY_ERROR;
  }

  return DEFAULT_FRIENDLY_ERROR;
}
