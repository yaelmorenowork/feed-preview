/**
 * Centralized, validated access to server-only environment variables.
 *
 * Only ever imported from server/ and app/api/ code — never from
 * components/ or hooks/. None of these are NEXT_PUBLIC_-prefixed, so
 * Next.js never includes them in the client bundle; importing this
 * file from client code would be a build-time signal something is
 * wrong, not a silent leak.
 *
 * Each value is read lazily (via a getter) and validated on first
 * access, so a missing variable fails loudly and specifically the
 * moment the route that needs it runs — not by crashing the entire
 * server at boot, and not by silently proceeding with `undefined`.
 */
function required(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. See .env.example for setup instructions.`
    );
  }

  return value;
}

export const env = {
  get NOTION_CLIENT_ID(): string {
    return required("NOTION_CLIENT_ID");
  },
  get NOTION_CLIENT_SECRET(): string {
    return required("NOTION_CLIENT_SECRET");
  },
  get NOTION_REDIRECT_URI(): string {
    return required("NOTION_REDIRECT_URI");
  },
  get APP_URL(): string {
    return required("APP_URL");
  },
  get SESSION_SECRET(): string {
    return required("SESSION_SECRET");
  },
};
