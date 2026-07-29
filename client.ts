import { Client } from "@notionhq/client";

/**
 * Creates a Notion API client for a specific request, using the
 * access token from that request's decrypted session.
 *
 * Unlike the widget's pre-OAuth architecture (which briefly had a
 * client-side "connection" object), there is no module-level token
 * here — every call site must pass one in explicitly, sourced from
 * server/session.ts. That makes it structurally impossible for a
 * request to accidentally use the wrong workspace's token, and keeps
 * every token access traceable to a specific decrypted session.
 */
export function createNotionClient(accessToken: string): Client {
  return new Client({ auth: accessToken });
}
