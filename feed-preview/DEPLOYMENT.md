# Deployment guide

## 1. Create the Notion integration

1. Go to https://www.notion.so/my-integrations and create a new **public** integration
   (public, not internal — this app connects to *other people's* workspaces via OAuth).
2. Under **Capabilities**, enable: Read content, Update content, Insert content.
3. Under **OAuth Domain & URIs**, add a redirect URI matching exactly what you'll set as
   `NOTION_REDIRECT_URI` below (e.g. `https://yourapp.com/api/auth/notion/callback`).
4. Copy the **OAuth client ID** and **OAuth client secret** from this page.

## 2. Environment variables

Copy `.env.example` to `.env.local` (for local dev) or set these in your hosting
provider's environment variable settings (production):

| Variable | Where it's used | Secret? |
|---|---|---|
| `NOTION_CLIENT_ID` | Building the OAuth authorize URL | No, but keep server-side anyway |
| `NOTION_CLIENT_SECRET` | Exchanging the OAuth code for a token | **Yes — never expose to the client** |
| `NOTION_REDIRECT_URI` | Must exactly match the integration's configured redirect URI | No |
| `APP_URL` | Building redirect targets after OAuth completes | No |
| `SESSION_SECRET` | Encrypting the session cookie that holds the access token | **Yes** |

Generate `SESSION_SECRET` with `openssl rand -base64 32`. Rotating it invalidates
every existing session (users will need to reconnect) — treat it like a database
password, not a config toggle.

None of these are `NEXT_PUBLIC_`-prefixed, so Next.js never bundles them into
client-side JavaScript. `server/env.ts` is the only place they're read, and it's
only ever imported from `server/` and `app/api/` code.

## 3. Deploying

This is a standard Next.js App Router project — `npm run build && npm run start`,
or deploy directly to Vercel/any Next.js-compatible host. There is no database to
provision: session state lives entirely in an encrypted, httpOnly cookie (see
`server/session.ts`), and post data is read/written directly from/to the user's
Notion workspace on each request.

**Requires Node.js 18.18+** (Next.js 16 requirement).

## 4. Known follow-ups before a hardened production rollout

- **Content-Security-Policy**: not set by default (see `next.config.js`) because it
  depends on whether this app is embedded in an iframe (e.g. inside Notion) or used
  standalone, and on your Notion image domains. Add one before launch.
- **X-Frame-Options**: also intentionally left unset for the same reason — set it
  once you know whether this app is meant to be iframe-embedded.
- Sessions are cookie-based with no server-side revocation list; if a token is
  compromised, the fix is rotating `SESSION_SECRET` (signs everyone out) plus
  revoking the integration's access from the affected Notion workspace's settings.
