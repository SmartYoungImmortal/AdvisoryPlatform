import type { MetadataRoute } from "next";

/**
 * The web app manifest — what makes the app installable to a home screen.
 *
 * A file convention rather than a hand-written `public/manifest.json`: Next
 * emits it as a static `manifest.webmanifest` at build and links it from every
 * page's <head> itself, which is the half that is easy to forget. It survives
 * `output: "export"` because nothing here is computed per request.
 *
 * `display: "standalone"` is the whole point on this product. Every screen is
 * already drawn inside a 448px mobile canvas (`MobileViewport`), so installed it
 * loses the browser chrome and reads as the app it was designed as.
 *
 * The colours are the light theme's own: `--background` behind the splash and
 * `--card` for the bar, spelled out because a manifest is JSON and cannot read a
 * CSS custom property. They need updating by hand if those tokens move.
 *
 * NOTE: the icons in `public/` are placeholders — the shipped lockup reversed on
 * `--foreground`, generated rather than designed. `icon-maskable-512` holds the
 * lockup inside the inner 80% so Android's mask cannot crop it. Replace all four
 * with real artwork before this is put in front of anyone.
 */
/**
 * A metadata file is a route, and under `output: "export"` every route has to
 * declare that it is static — without this the manifest 500s with
 * `export const dynamic = "force-static"/export const revalidate not configured`
 * rather than failing at build, so it is only caught by asking for the file.
 */
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Advisory Platform",
    short_name: "Advisory",
    description: "แพลตฟอร์มจับคู่ผู้ขอคำปรึกษากับที่ปรึกษา",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "th",
    dir: "ltr",
    background_color: "#fafafa",
    theme_color: "#ffffff",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
