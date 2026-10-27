"use client";

import { useTranslations } from "next-intl";

import { AdvisorPeople } from "@/components/home/advisor-spotlight";
import { HandQuestion } from "@/components/home/hand-question";
import type { HomeAdvisor } from "@/components/home/home-data";
import { FRAME, SectionTitle } from "@/components/home/section-parts";
import { VettingChecks, VettingCounts, VettingNote, type CatalogueCounts } from "@/components/home/vetting";
import { ThaiText } from "@/components/mobile/thai-text";
import { Rise } from "@/components/motion";
import { cn } from "@/lib/utils";

/**
 * Chapter two: "are they actually any good?", answered twice. First with the
 * people themselves, up close: one at length with their real services and
 * score, the rest beside them (`AdvisorPeople`). Then with what every one of
 * them went through before their first booking, and what the catalogue holds
 * today, counted from the API.
 *
 * Centred, where the first chapter talks across the page: the question at the
 * top in the visitor's hand, the answer under it in type.
 */
export function ChapterGood({
  advisors,
  loading,
  counts,
}: {
  readonly advisors: readonly HomeAdvisor[];
  readonly loading: boolean;
  readonly counts: CatalogueCounts | null;
}) {
  const t = useTranslations("home");
  const people = loading || advisors.length > 0;

  return (
    <section className="w-full shrink-0 py-16 lg:py-28" data-slot="home-good">
      <div className={cn(FRAME, "flex flex-col gap-10 lg:gap-16")}>
        <div className="flex flex-col gap-3 lg:items-center lg:gap-4 lg:text-center">
          <HandQuestion ask="askGood" className="text-4xl text-hero-ink lg:text-7xl" />
          <Rise delay={0.9}>
            <SectionTitle>{t("goodTitle")}</SectionTitle>
          </Rise>
        </div>

        {people ? <AdvisorPeople advisors={advisors} delay={1.1} /> : null}

        <div className="flex flex-col gap-10 border-t border-border pt-12 lg:gap-16 lg:pt-20">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-6">
            <Rise className="flex flex-col gap-3 lg:col-span-7 lg:gap-5">
              <h3 className="font-hero text-2xl font-normal tracking-tight text-hero-ink lg:text-4xl lg:leading-tight">
                <ThaiText>{t("vettingBandTitle")}</ThaiText>
              </h3>
              <VettingNote />
            </Rise>
            <VettingCounts className="lg:col-span-5" counts={counts} />
          </div>
          <VettingChecks />
        </div>
      </div>
    </section>
  );
}
