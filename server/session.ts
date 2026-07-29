import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import type { NextRequest, NextResponse } from "next/server";
import { env } from "./env";

/**
 * Everything this app knows about a connected Notion workspace.
 * `accessToken` is the one genuinely sensitive field — it never
 * leaves the server (see app/api/notion/session/route.ts, which
 * returns a token-free summary to the client).
 */
export interface NotionSession {
  accessToken: string;
  workspaceId: string;
  workspaceName: string;
  workspaceIcon: string | null;
  botId: string;
  /** Set once the user finishes the setup assistant. Actually a Notion
   *  data source ID under the hood (see server/notion/schema.ts) — kept
   *  named databaseId because that's what the product concept is to a
   *  user; they never need to know Notion's data-source model exists. */
  databaseId?: string;
  /** Maps this app's required property names to the user's actual
   *  property names, for databases that don't match our defaults
   *  exactly. See server/notion/schema.ts. */
  propertyMap?: Record<string, string>;
}

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

export const SESSION_COOKIE_NAME = "notion_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

/** Derives a fixed 32-byte AES key from SESSION_SECRET, whatever its length. */
function getEncryptionKey(): Buffer {
  return createHash("sha256").update(env.SESSION_SECRET).digest();
}

/** Encrypts a session into an opaque, tamper-proof cookie value. */
export function encryptSession(session: NotionSession): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv);

  const plaintext = Buffer.from(JSON.stringify(session), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString("base64url");
}

/**
 * Decrypts a cookie value back into a session. Returns null (rather
 * than throwing) for anything malformed, tampered with, or encrypted
 * under a since-rotated SESSION_SECRET — a bad cookie should look
 * like "signed out", not crash the request.
 */
export function decryptSession(cookieValue: string): NotionSession | null {
  try {
    const raw = Buffer.from(cookieValue, "base64url");
    const iv = raw.subarray(0, IV_LENGTH);
    const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return JSON.parse(decrypted.toString("utf8")) as NotionSession;
  } catch {
    return null;
  }
}

/** Reads and decrypts the session from an incoming request, if present. */
export function readSession(request: NextRequest): NotionSession | null {
  const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!cookie) return null;
  return decryptSession(cookie);
}

/** Cookies are marked Secure in production (requires HTTPS) but not
 *  in local development, where `next dev` normally serves plain HTTP —
 *  browsers silently drop Secure cookies on non-HTTPS origins, which
 *  would otherwise break the entire OAuth flow locally. */
const IS_PRODUCTION = process.env.NODE_ENV === "production";

/** Encrypts and attaches the session cookie to an outgoing response. */
export function writeSession(response: NextResponse, session: NotionSession): void {
  response.cookies.set(SESSION_COOKIE_NAME, encryptSession(session), {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/** Removes the session cookie (disconnect / logout). */
export function clearSession(response: NextResponse): void {
  response.cookies.delete(SESSION_COOKIE_NAME);
}
