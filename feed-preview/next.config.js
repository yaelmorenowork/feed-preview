/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Baseline production security headers. CSP is intentionally left
  // out here — it needs to be tuned to whatever host page ends up
  // embedding this app (if any) and any CDN/image domains used, so
  // it's documented as a required follow-up in DEPLOYMENT.md instead
  // of shipping a guess that either breaks the app or does nothing.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
