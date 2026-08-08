import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  /* config options here */
};

// Cloudflare (OpenNext) — enables Cloudflare bindings during `next dev`
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();

const withNextIntl = createNextIntlPlugin(
  './lib/i18n/index.ts'
);
export default withNextIntl(nextConfig);