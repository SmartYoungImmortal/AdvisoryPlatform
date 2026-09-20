import { useTranslations } from "next-intl";

import {
  LegalClose,
  LegalDocument,
  type LegalSectionData,
} from "@/components/legal/legal-document";

/**
 * `/pdpa` — the privacy notice, as a document and only that.
 *
 * It carried a boxed "สรุปสาระสำคัญ" card of three rows, inherited from the
 * consent screen this route used to be. It went because it was a summary of the
 * document it sat on top of — profile data is clause 2, chat retention is
 * clauses 2 and 7, payments is clause 5 — and its own closing line said so
 * ("รายละเอียดที่ใช้บังคับอยู่ในข้อ 1 ถึงข้อ 11 ด้านล่าง"). A boxed card was also
 * the only framed object on a page of plain prose.
 *
 * The accept action went with it. Consent belongs to the sign-up form, whose
 * required checkbox already blocks submission until it is ticked; asking again
 * on a public document recorded nothing and handed a reader who only wanted to
 * read the policy a decision to make.
 *
 * The summary card is kept on purpose. A privacy notice that opens with what is
 * collected, in three lines, before eleven clauses of detail, is the shape a
 * PDPA notice is supposed to have; it is also the one part of the old screen
 * that was doing real work.
 */
export function PdpaScreen() {
  const t = useTranslations("pdpa");

  const sections: readonly LegalSectionData[] = [
    { title: t("s1Title"), paragraphs: [t("s1p1"), t("s1p2")] },
    {
      title: t("s2Title"),
      paragraphs: [t("s2p1")],
      bullets: [t("s2b1"), t("s2b2"), t("s2b3"), t("s2b4"), t("s2b5")],
    },
    { title: t("s3Title"), paragraphs: [t("s3p1"), t("s3p2")] },
    {
      title: t("s4Title"),
      paragraphs: [t("s4p1")],
      bullets: [t("s4b1"), t("s4b2"), t("s4b3"), t("s4b4"), t("s4b5")],
    },
    { title: t("s5Title"), paragraphs: [t("s5p1"), t("s5p2")] },
    { title: t("s6Title"), paragraphs: [t("s6p1"), t("s6p2")] },
    {
      title: t("s7Title"),
      paragraphs: [t("s7p1")],
      bullets: [t("s7b1"), t("s7b2"), t("s7b3")],
    },
    { title: t("s8Title"), paragraphs: [t("s8p1"), t("s8p2")] },
    { title: t("s9Title"), paragraphs: [t("s9p1"), t("s9p2")] },
    {
      title: t("s10Title"),
      paragraphs: [t("s10p1")],
      bullets: [
        t("s10b1"),
        t("s10b2"),
        t("s10b3"),
        t("s10b4"),
        t("s10b5"),
        t("s10b6"),
        t("s10b7"),
      ],
    },
    { title: t("s11Title"), paragraphs: [t("s11p1")] },
  ];

  return (
    <LegalDocument
      effective={t("effective")}
      lead={t("lead")}
      sections={sections}
      title={t("title")}
    >
      {/* No accept button. This is a public document, reached from the footer of
          every page, and a policy that asks a reader to agree to it is a consent
          step wearing a document's clothes. Consent is already taken where it
          belongs — the required checkbox on the sign-up form
          (`register-screen`'s `register-consent`, which blocks submission until
          it is ticked). Asking again here collected nothing and gave a reader
          who only wanted to read the policy a decision to make. */}
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
