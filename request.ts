import { NotionIntegrationError } from "../../lib/errors";
import { withTimeout } from "../../lib/withTimeout";

const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Runs a Notion SDK call with a request timeout, normalizing any
 * failure into a single NotionIntegrationError while logging the
 * original technical error for debugging. Shared by every server-side
 * Notion call so error handling and timeout behavior stay consistent.
 *
 * Route handlers catch NotionIntegrationError and turn it into a
 * proper JSON error response — this module never touches HTTP itself.
 */
export async function withNotionErrorHandling<T>(
  request: () => Promise<T>,
  friendlyMessage: string
): Promise<T> {
  try {
    return await withTimeout(
      request(),
      REQUEST_TIMEOUT_MS,
      "The request to Notion timed out. Please try again."
    );
  } catch (err) {
    // Only the raw error's message is logged — Notion SDK errors
    // don't embed the access token, but we avoid dumping the full
    // error object (which could include request metadata) on principle.
    console.error("[notion]", err instanceof Error ? err.message : err);
    throw new NotionIntegrationError(friendlyMessage);
  }
}
