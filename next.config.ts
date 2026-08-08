import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  // The app is presentational only — no route handlers, middleware, or server
  // actions — so every page prerenders. Exporting them as plain HTML lets
  // Cloudflare serve the site straight from static assets instead of booting a
  // Next server in a Worker on every request, which was exceeding the 10ms CPU
  // limit and returning "Error 1102 Worker exceeded resource limits".
  // Revisit once real server-side work (an API, auth, ISR) lands.
  output: "export",
  images: {
    // Cloudflare's static assets have no image-optimisation endpoint to call,
    // so images are emitted with their original src.
    unoptimized: true,
    // Design assets live in the advisory-platform-assets R2 bucket — see
    // lib/assets/r2.ts.
    remotePatterns: [
      { protocol: "https", hostname: "pub-07e53481352743c1826a900d773cb1f7.r2.dev" },
    ],
  },
};

const withNextIntl = createNextIntlPlugin(
  './lib/i18n/index.ts'
);
export default withNextIntl(nextConfig);
