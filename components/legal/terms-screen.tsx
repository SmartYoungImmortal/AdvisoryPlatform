import { useTranslations } from "next-intl";

import {
  LegalClose,
  LegalDocument,
  type LegalSectionData,
} from "@/components/legal/legal-document";

/**
 * `/terms` — the terms of service, as a document.
 *
 * It used to be five 14px clauses on the 448px sign-up panel, under the auth
 * chrome, which read as a summary of a contract rather than as the contract. The
 * clauses are the real eleven now and the page is set in `LegalDocument`.
 *
 * The keys are listed here rather than derived from a counter so that every one
 * of them is a literal the typed `Messages` can check: a missing `s7b6` is a
 * build error, not a run-time `s7b6` printed into the page.
 */
export function TermsScreen() {
  const t = useTranslations("terms");

  // Annotated rather than `as const`, so the entries with no list still satisfy
  // the same type as the ones that have one.
  const sections: readonly LegalSectionData[] = [
    { title: t("s1Title"), paragraphs: [t("s1p1"), t("s1p2")] },
    {
      title: t("s2Title"),
      paragraphs: [t("s2p1")],
      bullets: [t("s2b1"), t("s2b2"), t("s2b3"), t("s2b4")],
    },
    { title: t("s3Title"), paragraphs: [t("s3p1"), t("s3p2")] },
    { title: t("s4Title"), paragraphs: [t("s4p1"), t("s4p2")] },
    {
      title: t("s5Title"),
      paragraphs: [t("s5p1")],
      bullets: [t("s5b1"), t("s5b2"), t("s5b3"), t("s5b4")],
    },
    {
      title: t("s6Title"),
      paragraphs: [t("s6p1")],
      bullets: [t("s6b1"), t("s6b2"), t("s6b3"), t("s6b4"), t("s6b5")],
    },
    {
      title: t("s7Title"),
      paragraphs: [t("s7p1")],
      bullets: [t("s7b1"), t("s7b2"), t("s7b3"), t("s7b4"), t("s7b5"), t("s7b6")],
    },
    { title: t("s8Title"), paragraphs: [t("s8p1"), t("s8p2")] },
    { title: t("s9Title"), paragraphs: [t("s9p1"), t("s9p2")] },
    { title: t("s10Title"), paragraphs: [t("s10p1"), t("s10p2")] },
    { title: t("s11Title"), paragraphs: [t("s11p1"), t("s11p2")] },
  ];

  return (
    <LegalDocument
      effective={t("effective")}
      lead={t("lead")}
      sections={sections}
      title={t("title")}
    >
      {/* One sentence, as the reference closes. The heading above it named a
          department the reader had no use for, and the link to the privacy
          policy repeated what the site footer already carries twice. */}
      <LegalClose>
        <p className="w-full text-base leading-relaxed font-normal text-muted-foreground">
          {t("contactBody")}{" "}
          <a
            className="font-latin font-medium text-primary transition-colors hover:underline"
            href={`mailto:${t("contactEmail")}`}
          >
            {t("contactEmail")}
          </a>
        </p>
      </LegalClose>
    </LegalDocument>
  );
}
