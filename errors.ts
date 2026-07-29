/**
 * Thrown for any failure originating from the Notion integration
 * (bad credentials, unreachable database, malformed schema, etc.).
 * Lets callers distinguish "Notion failed" from other error sources
 * (e.g. for logging/analytics) without parsing message strings.
 */
export class NotionIntegrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotionIntegrationError";
  }
}
