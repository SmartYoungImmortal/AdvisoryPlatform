import { CalendarCheck, Search, Star, Video } from "lucide-react";
import { useTranslations } from "next-intl";

import { ThaiText } from "@/components/mobile/thai-text";

/**
 * The four steps of a consultation, taught rather than listed.
 *
 * The copy has been written since the marketing page shipped — four titles with
 * a line of explanation each, under `landing.step*` — and has only ever been
 * seen by readers who are not signed in. A reader deciding whether to book is
 * exactly who needs it, so it runs here too.
 *
 * A number in a bead beside the line it belongs to, the way an instruction reads
 * on paper. The earlier attempt at this on home was three numbered circles side
 * by side with the bodies dropped, which is the shape every product page uses
 * and says nothing; the whole value is in the sentence under each verb.
 */
const STEPS = [
  { icon: Search, title: "step1Title", body: "step1Body" },
  { icon: CalendarCheck, title: "step2Title", body: "step2Body" },
  { icon: Video, title: "step3Title", body: "step3Body" },
  { icon: Star, title: "step4Title", body: "step4Body" },
] as const;

export function HowToUse() {
  const t = useTranslations("landing");

  return (
    <div className="flex w-full shrink-0 flex-col items-start gap-3">
      <p className="w-full px-6 text-base font-semibold text-foreground">
        {t("stepsTitle")}
      </p>
      {/* A rail of cards rather than a stacked list. Three text lists in a row —
          the steps, the vetting promise, the questions — read as one long column
          of the same thing; a sideways axis and a lifted surface break that up
          and make the steps look like something to move through.

          Metrics read off the reference at a 390 viewport rather than guessed:
          the item is 90% of the rail with a 16px lead and 24px of vertical room
          for the shadow, snapped to centre; the card is 12px radius, 32px inset,
          16px between the glyph and the copy, on a 0 4px 30px / 12% shadow. The
          rail itself carries no gap — the item's own lead is the gap. First and
          last leads are this page's 24px inset, not the reference's 40. */}
      <ol className="flex w-full shrink-0 snap-x snap-mandatory items-stretch overflow-x-auto">
        {STEPS.map(({ icon: Icon, title, body }) => (
          <li
            className="min-w-0 shrink-0 basis-[90%] snap-center py-6 pl-4 first:pl-6 last:pr-6"
            key={title}
          >
            <div className="flex h-full flex-col items-center justify-center gap-4 rounded-[12px] bg-card p-8 text-center shadow-lift">
              <Icon aria-hidden className="size-12 shrink-0 text-primary" />
              <div className="w-full">
                <p className="mb-2 w-full text-xl font-bold text-foreground">
                  {t(title)}
                </p>
                <p className="w-full text-base font-normal text-muted-foreground">
                  <ThaiText>{t(body)}</ThaiText>
                </p>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
