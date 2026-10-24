"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { HandQuestion } from "@/components/home/hand-question";
import { priceLadder, priceRange, type OpenDay } from "@/components/home/home-data";
import { OpenTodayStrip } from "@/components/home/open-today";
import { FRAME, SectionLead, SectionTitle } from "@/components/home/section-parts";
import { ServiceCard } from "@/components/home/service-card";
import { Rise, Throw } from "@/components/motion";
import type { LiveService } from "@/lib/catalogue/live";
import { cn } from "@/lib/utils";

/** The ladder's own shape in muted blocks while the catalogue loads. */
function LadderSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-4 lg:gap-5">
      {[0, 1, 2].map((i) => (
        <span className="block h-36 animate-pulse rounded-card bg-muted/70 lg:h-44" key={i} />
      ))}
    </div>
  );
}

/**
 * Chapter three: "how much will this cost me?", answered with the rule (a
 * price per session, set by the expert, the platform fee shown apart before
 * paying), the real range the catalogue runs from and to, and three real
 * services that show it, cheapest first, so the column reads as a scale.
 * Then who can be booked today, the page's one moving strip.
 *
 * The question and the rule on the left, the services on the right.
 */
export function ChapterCost({
  items,
  open,
  loading,
}: {
  readonly items: readonly LiveService[];
  readonly open: OpenDay;
  readonly loading: boolean;
}) {
  const t = useTranslations("home");
  const format = useFormatter();
  const ladder = priceLadder(items);
  const range = priceRange(items);

  let services: ReactNode = null;
  if (ladder.length > 0) {
    services = (
      <Throw className="flex flex-col gap-4 lg:gap-5" delay={1.1} key={ladder.length} origin="left">
        {ladder.map((item) => (
          <ServiceCard item={item} key={item.id} photoClassName="w-28 lg:w-48" variant="wide" />
        ))}
      </Throw>
    );
  } else if (loading) {
    services = <LadderSkeleton />;
  }

  return (
    <section className="w-full shrink-0 py-16 lg:pt-28 lg:pb-24" data-slot="home-cost">
      <div className="flex flex-col gap-14 lg:gap-24">
        <div className={cn(FRAME, "grid gap-10 lg:grid-cols-12 lg:items-start lg:gap-6")}>
          <div className="flex flex-col gap-4 lg:col-span-5 lg:gap-6">
            <HandQuestion ask="askCost" className="text-4xl text-hero-ink lg:text-7xl" />
            <Rise className="flex flex-col gap-4 lg:gap-6" delay={0.9}>
              <SectionTitle>{t("costTitle")}</SectionTitle>
              <SectionLead>{t("costBody")}</SectionLead>
              {range ? (
                <p className="text-lg text-muted-foreground lg:text-xl">
                  {t.rich("costRange", {
                    min: format.number(range.min, "baht"),
                    max: format.number(range.max, "baht"),
                    n: (chunks) => <span className="font-latin font-semibold text-foreground tabular-nums">{chunks}</span>,
                  })}
                </p>
              ) : null}
            </Rise>
          </div>
          <div className="lg:col-span-6 lg:col-start-7 lg:pt-4">{services}</div>
        </div>
        <OpenTodayStrip compact items={items} loading={loading} open={open} />
      </div>
    </section>
  );
}
