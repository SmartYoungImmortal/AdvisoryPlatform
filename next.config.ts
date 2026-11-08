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
  // The development badge, bottom-left by default, sat on the app rail's
  // settings item (`components/account/app-frame.tsx`). Dev only.
  devIndicators: { position: "bottom-right" },
  // `next dev` reaches the API the way the qa Worker does (worker/api-proxy.ts):
  // through this origin, so the session cookie is first-party. Set
  // NEXT_PUBLIC_API_URL to this server and API_PROXY_TARGET to the API. Dev
  // only — a static export has no rewrites. The Socket.IO client asks for
  // `/socket.io/`, so the trailing slash is kept rather than redirected away.
  ...(process.env.NODE_ENV === "development" && process.env.API_PROXY_TARGET
    ? {
        skipTrailingSlashRedirect: true,
        async rewrites() {
          const target = process.env.API_PROXY_TARGET;
          return [
            { source: "/api/:path*", destination: `${target}/api/:path*` },
            { source: "/socket.io/", destination: `${target}/socket.io/` },
          ];
        },
      }
    : {}),
  images: {
    // Cloudflare's static assets have no image-optimisation endpoint to call,
    // so images are emitted with their original src.
    unoptimized: true,
    // Design assets live in the advisory-platform-assets R2 bucket — see
    // lib/assets/r2.ts.
    remotePatterns: [
      { protocol: "https", hostname: "pub-07e53481352743c1826a900d773cb1f7.r2.dev" },
      // Placeholder photography on `/about`, until real imagery replaces it.
      // Listed even though `unoptimized` above means the host is not checked at
      // runtime: turning optimisation back on without this would break every
      // image on that page, and the failure would look like a bad URL.
      { protocol: "https", hostname: "picsum.photos" },
      // Stock portraits the API seed writes to demo accounts' `image`.
      { protocol: "https", hostname: "randomuser.me" },
      // The service page's mock photographs (`components/service/service-photo-sets.ts`).
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

const withNextIntl = createNextIntlPlugin(
  './lib/i18n/index.ts'
);
export default withNextIntl(nextConfig);
