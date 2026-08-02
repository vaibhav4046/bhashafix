import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The serverless browser stack must stay out of the bundle: @sparticuz/chromium
  // ships a binary pack that has to remain on disk, and puppeteer-core resolves
  // its transport at runtime.
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
  transpilePackages: [
    "@bhashafix/crawler",
    "@bhashafix/extractor",
    "@bhashafix/linguistic-engine",
    "@bhashafix/locale-engine",
  ],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; object-src 'none'; img-src 'self' data: blob:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-src 'self' blob:",
          },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
