import type { NextConfig } from "next";

/**
 * Static export so the fixture can be served as plain files during a scan.
 * `trailingSlash` makes every locale land at `<locale>/index.html`, which the
 * proof server maps onto the `?locale=` query BhashaFix scans with.
 */
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  reactStrictMode: true,
};

export default nextConfig;
