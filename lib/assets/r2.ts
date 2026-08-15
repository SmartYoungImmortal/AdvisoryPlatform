import type { StaticImageData } from "next/image";

/**
 * Design assets served from the `advisory-platform-assets` R2 bucket rather
 * than the build output.
 *
 * Each object is shaped like the `StaticImageData` a static `import` would
 * produce, so `<Image src={...} />` keeps the same intrinsic width/height and
 * nothing reflows. Keys carry a content hash, which is what makes the
 * `immutable` cache-control on the objects safe — changing an image means
 * uploading a new key, never overwriting one.
 *
 * To add or replace an asset: put the file in `assets/`, upload it under
 * `<dir>/<name>.<sha256[:8]>.<ext>`, and update the entry here.
 */
const R2_BASE = "https://pub-07e53481352743c1826a900d773cb1f7.r2.dev";

/** `assets/avatars/advisor` — 480x320. */
export const advisor: StaticImageData = {
  src: `${R2_BASE}/avatars/advisor.fb3d2e11.png`,
  width: 480,
  height: 320,
};

/** `assets/avatars/araya-s` — 112x112. */
export const arayaS: StaticImageData = {
  src: `${R2_BASE}/avatars/araya-s.83897fe0.png`,
  width: 112,
  height: 112,
};

/** `assets/avatars/christopher-nolan` — 240x135. */
export const christopherNolan: StaticImageData = {
  src: `${R2_BASE}/avatars/christopher-nolan.dcf7b370.png`,
  width: 240,
  height: 135,
};

/** `assets/chat/desk-photo` — 640x427. */
export const deskPhoto: StaticImageData = {
  src: `${R2_BASE}/chat/desk-photo.ee7d085e.png`,
  width: 640,
  height: 427,
};

/** `assets/chat/document-preview` — 640x640. */
export const documentPreview: StaticImageData = {
  src: `${R2_BASE}/chat/document-preview.aed09afe.png`,
  width: 640,
  height: 640,
};

/** `assets/illustrations/error-no-connection` — 303x263. */
export const errorNoConnection: StaticImageData = {
  src: `${R2_BASE}/illustrations/error-no-connection.5c82dd75.svg`,
  width: 303,
  height: 263,
};

/** `assets/illustrations/error-not-found` — 276x264. */
export const errorNotFound: StaticImageData = {
  src: `${R2_BASE}/illustrations/error-not-found.e2eeb9a3.svg`,
  width: 276,
  height: 264,
};

/** `assets/illustrations/error-search` — 257x247. */
export const errorSearch: StaticImageData = {
  src: `${R2_BASE}/illustrations/error-search.fdb54670.svg`,
  width: 257,
  height: 247,
};

/** `assets/avatars/james-gunn` — 240x240. */
export const jamesGunn: StaticImageData = {
  src: `${R2_BASE}/avatars/james-gunn.4e5ee422.png`,
  width: 240,
  height: 240,
};

/** `assets/marketing/cta-band` — 910x640. Landing CTA band photo, 2x of 402x320. */
export const landingCtaBand: StaticImageData = {
  src: `${R2_BASE}/marketing/cta-band.b3fab7d6.jpg`,
  width: 910,
  height: 640,
};

/**
 * `assets/marketing/hero-poster` — 720x1280. First frame of the landing hero
 * clip, so the banner shows the right image before the first HLS segment lands
 * and stays a still for readers who ask for reduced motion.
 */
export const landingHeroPoster: StaticImageData = {
  src: `${R2_BASE}/marketing/hero-poster.17d69a85.jpg`,
  width: 720,
  height: 1280,
};

/** Landing hero clip — 720x1280 @ 25fps, silent, VOD HLS. */
export const landingHeroVideo = `${R2_BASE}/advisory-home/9_16/720/stream.m3u8`;

/** `assets/illustrations/logo` — 112x61. */
export const logo: StaticImageData = {
  src: `${R2_BASE}/illustrations/logo.9f276dba.svg`,
  width: 112,
  height: 61,
};

/** `assets/illustrations/messages-empty` — 218x186. */
export const messagesEmpty: StaticImageData = {
  src: `${R2_BASE}/illustrations/messages-empty.b7444e25.svg`,
  width: 218,
  height: 186,
};

/** `assets/avatars/sarah-jenskins` — 480x320. */
export const sarahJenskins: StaticImageData = {
  src: `${R2_BASE}/avatars/sarah-jenskins.e07d45e9.png`,
  width: 480,
  height: 320,
};

/**
 * `assets/services/advisors-desk` — 480x856. The service cover shared by the
 * tax-planning listings. Portrait, because the frames crop it to both a 216x120
 * banner and an 88px square; a landscape source would run out of pixels in the
 * square.
 */
export const serviceAdvisorsDesk: StaticImageData = {
  src: `${R2_BASE}/services/advisors-desk.f0019d0e.jpg`,
  width: 480,
  height: 856,
};

/** `assets/services/advisors-review` — 640x450. Business-consulting cover. */
export const serviceAdvisorsReview: StaticImageData = {
  src: `${R2_BASE}/services/advisors-review.01eb4317.jpg`,
  width: 640,
  height: 450,
};

/** `assets/services/laptop-code` — 640x426. Tech/interview cover. */
export const serviceLaptopCode: StaticImageData = {
  src: `${R2_BASE}/services/laptop-code.6b8941bb.jpg`,
  width: 640,
  height: 426,
};

/** `assets/onboarding/thai-national-id` — 700x466. */
export const thaiNationalId: StaticImageData = {
  src: `${R2_BASE}/onboarding/thai-national-id.3964db40.png`,
  width: 700,
  height: 466,
};

/** `assets/illustrations/wallet-failed` — 280x280. */
export const walletFailed: StaticImageData = {
  src: `${R2_BASE}/illustrations/wallet-failed.204b0c76.svg`,
  width: 280,
  height: 280,
};

/** `assets/illustrations/wallet-success` — 280x280. */
export const walletSuccess: StaticImageData = {
  src: `${R2_BASE}/illustrations/wallet-success.03df6fb7.svg`,
  width: 280,
  height: 280,
};
