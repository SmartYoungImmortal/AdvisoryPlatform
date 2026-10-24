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

/**
 * The brand lockup — the blue mark plus "Advisory", 1700x416, used everywhere
 * from the console to the marketing footer. It is uploaded under a fixed key
 * rather than a content hash, so replacing the file at that key changes the
 * logo across the app; it is served without `immutable`.
 *
 * It is a wide lockup — roughly 4:1 — where the script wordmark it replaced was
 * 1.8:1, so a box sized by height now draws more than twice as wide. Every call
 * site sizes it by height and lets the width follow.
 */
export const logo: StaticImageData = {
  src: `${R2_BASE}/Logo/Advisory.png`,
  width: 1700,
  height: 416,
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

/*
 * Service covers for the seeded services whose advisor is not on the home
 * ring. Unsplash, under the Unsplash License, cropped to 960x600 (16:10, the
 * `/search` card's frame); the source photo is named on each.
 */

/** `assets/services/freelance-calculator` — 960x600. Unsplash photo-1626266061368. */
export const serviceFreelanceCalculator: StaticImageData = {
  src: `${R2_BASE}/services/freelance-calculator.a84fbb41.jpg`,
  width: 960,
  height: 600,
};

/**
 * `assets/services/tax-review` — 960x600. Unsplash photo-1586486855514. Not the
 * coffee-and-forms shot: that one is the hero ring's `q2`.
 */
export const serviceTaxReview: StaticImageData = {
  src: `${R2_BASE}/services/tax-review.41ca15a7.jpg`,
  width: 960,
  height: 600,
};

/** `assets/services/company-books` — 960x600. Unsplash photo-1460925895917. */
export const serviceCompanyBooks: StaticImageData = {
  src: `${R2_BASE}/services/company-books.d8e4807c.jpg`,
  width: 960,
  height: 600,
};

/** `assets/services/career-notes` — 960x600. Unsplash photo-1484480974693. */
export const serviceCareerNotes: StaticImageData = {
  src: `${R2_BASE}/services/career-notes.8aa10535.jpg`,
  width: 960,
  height: 600,
};

/** `assets/services/shop-owner` — 960x600. Unsplash photo-1753351052363. */
export const serviceShopOwner: StaticImageData = {
  src: `${R2_BASE}/services/shop-owner.b26fcfdd.jpg`,
  width: 960,
  height: 600,
};

/** `assets/services/business-board` — 960x600. Unsplash photo-1531403009284. */
export const serviceBusinessBoard: StaticImageData = {
  src: `${R2_BASE}/services/business-board.3eb25c25.jpg`,
  width: 960,
  height: 600,
};

/**
 * `assets/services/contract-meeting` — 960x600. Unsplash photo-1758518730327. Not
 * the pen-on-paper shot: that one is the hero ring's `q3`.
 */
export const serviceContractMeeting: StaticImageData = {
  src: `${R2_BASE}/services/contract-meeting.1125b345.jpg`,
  width: 960,
  height: 600,
};

/** `assets/services/interview-practice` — 960x600. Unsplash photo-1573497620053. */
export const serviceInterviewPractice: StaticImageData = {
  src: `${R2_BASE}/services/interview-practice.72b93854.jpg`,
  width: 960,
  height: 600,
};

/*
 * The second batch, one per service the seed's `MORE_SERVICES` adds. Same source,
 * licence and crop as above; each chosen so that it repeats neither another
 * cover nor a hero ring photo.
 */
const cover = (file: string): StaticImageData => ({
  src: `${R2_BASE}/services/${file}`,
  width: 960,
  height: 600,
});

/** Unsplash photo-1759428679273. */
export const serviceFirstHome = cover("first-home.08893a24.jpg");
/** Unsplash photo-1589758438368. */
export const serviceCreditCard = cover("credit-card.f91bfee4.jpg");
/** Unsplash photo-1634757439914. */
export const serviceRefinance = cover("refinance.5cd00f94.jpg");
/** Unsplash photo-1635859890085. */
export const serviceLoanPapers = cover("loan-papers.da51032f.jpg");
/** Unsplash photo-1522708323590. */
export const serviceCondoRoom = cover("condo-room.c82c3d48.jpg");
/** Unsplash photo-1672380135241. */
export const serviceFreelanceDeal = cover("freelance-deal.afdaa8a2.jpg");
/** Unsplash photo-1551836022. */
export const servicePayStructure = cover("pay-structure.ed33546f.jpg");
/** Unsplash photo-1686771416537. */
export const serviceHiringTable = cover("hiring-table.fe7bf719.jpg");
/** Unsplash photo-1544396821. */
export const serviceYearEndBinders = cover("year-end-binders.f80e841b.jpg");
/** Unsplash photo-1529078155058. */
export const serviceExcelNumbers = cover("excel-numbers.e5529469.jpg");
/** Unsplash photo-1790749871388. */
export const serviceFreelanceRate = cover("freelance-rate.8026fa4b.jpg");
/** Unsplash photo-1595246135406. */
export const serviceShopParcel = cover("shop-parcel.9e07a997.jpg");
/** Unsplash photo-1611926653458. */
export const serviceSocialAds = cover("social-ads.6acd9b9d.jpg");
/** Unsplash photo-1571907483086. */
export const servicePriceTags = cover("price-tags.898bc6ee.jpg");
/** Unsplash photo-1609921212029. */
export const serviceTechPortfolio = cover("tech-portfolio.e8bb9a7f.jpg");
/** Unsplash photo-1698047681432. */
export const serviceResumeRead = cover("resume-read.4df77d7a.jpg");
/** Unsplash photo-1758873272412. */
export const serviceCompanyStart = cover("company-start.9dc1dd75.jpg");
/** Unsplash photo-1600880292203. */
export const serviceCompanyForm = cover("company-form.7ab3a2b5.jpg");
/** Unsplash photo-1763729805496. */
export const serviceJobContract = cover("job-contract.31f5eb20.jpg");
/** Unsplash photo-1579621970563. */
export const serviceFirstInvest = cover("first-invest.c2b8330c.jpg");
/** Unsplash photo-1633158829875. */
export const serviceTaxFund = cover("tax-fund.a767947b.jpg");

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

/**
 * `assets/brands/<provider>` — 24x24 SVG marks for the sign-in buttons, from
 * Simple Icons (CC0), drawn in the page's ink (#171717).
 */
export const brandMarks: Readonly<Record<"google" | "facebook" | "apple", StaticImageData>> = {
  google: { src: `${R2_BASE}/brands/google.139b2c3d.svg`, width: 24, height: 24 },
  facebook: { src: `${R2_BASE}/brands/facebook.ee4e6829.svg`, width: 24, height: 24 },
  apple: { src: `${R2_BASE}/brands/apple.5bbe1534.svg`, width: 24, height: 24 },
};

/** `assets/hero/ground` — 3200x2000. The room behind the home hero's ring. */
export const heroGround: StaticImageData = {
  src: `${R2_BASE}/hero/ground.3487762c.jpg`,
  width: 3200,
  height: 2000,
};

const heroImage = (key: string, width: number, height: number): StaticImageData => ({
  src: `${R2_BASE}/hero/${key}`,
  width,
  height,
});

/**
 * `assets/hero/q<n>` and `q<n>-face` — the photograph and the portrait on each
 * of the home hero's ring cards, by card number. Photographs 560x560 (11 and
 * 12 are 480x600), portraits 96x96.
 */
export const heroCards: Readonly<
  Record<number, { readonly photo: StaticImageData; readonly face: StaticImageData }>
> = {
  1: { photo: heroImage("q1.accf96d3.jpg", 560, 560), face: heroImage("q1-face.8eb33ddb.jpg", 96, 96) },
  2: { photo: heroImage("q2.80e55167.jpg", 560, 560), face: heroImage("q2-face.50b06429.jpg", 96, 96) },
  3: { photo: heroImage("q3.77cc24fc.jpg", 560, 560), face: heroImage("q3-face.b83e18b9.jpg", 96, 96) },
  4: { photo: heroImage("q4.223bf809.jpg", 560, 560), face: heroImage("q4-face.0be00332.jpg", 96, 96) },
  5: { photo: heroImage("q5.b15a9e8b.jpg", 560, 560), face: heroImage("q5-face.91cde5b6.jpg", 96, 96) },
  6: { photo: heroImage("q6.f658799a.jpg", 560, 560), face: heroImage("q6-face.8590391e.jpg", 96, 96) },
  7: { photo: heroImage("q7.059e86cd.jpg", 560, 560), face: heroImage("q7-face.c0289e21.jpg", 96, 96) },
  8: { photo: heroImage("q8.4d8522b7.jpg", 560, 560), face: heroImage("q8-face.55c1196c.jpg", 96, 96) },
  9: { photo: heroImage("q9.e2d43ff2.jpg", 560, 560), face: heroImage("q9-face.66ed76ef.jpg", 96, 96) },
  10: { photo: heroImage("q10.9ce3c564.jpg", 560, 560), face: heroImage("q10-face.50daa8d2.jpg", 96, 96) },
  11: { photo: heroImage("q11.d26171fe.jpg", 480, 600), face: heroImage("q11-face.35a1262b.jpg", 96, 96) },
  12: { photo: heroImage("q12.264f53c5.jpg", 480, 600), face: heroImage("q12-face.0fbcebd3.jpg", 96, 96) },
};
