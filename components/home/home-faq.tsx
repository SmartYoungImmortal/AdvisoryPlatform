"use client";

import { ArrowRight, Plus } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { HandQuestion } from "@/components/home/hand-question";
import { FRAME, SectionTitle } from "@/components/home/section-parts";
import { Rise } from "@/components/motion";
import { ThaiText } from "@/components/mobile/thai-text";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

/**
 * Chapter five: "still not sure?", answered with the questions people ask
 * before their first booking: the same eight `landing.faq*` the marketing page
 * lists, home opening with the first six and linking to the rest.
 *
 * The question stays in view on the left on `lg` (`position: sticky`) while
 * the answers are read on the right, a plus that turns to a cross marking each.
 */
export function HomeFaq() {
  const t = useTranslations("home");
  const l = useTranslations("landing");
  const items = [
    { q: l("faq1Question"), a: l("faq1Answer") },
    { q: l("faq2Question"), a: l("faq2Answer") },
    { q: l("faq3Question"), a: l("faq3Answer") },
    { q: l("faq4Question"), a: l("faq4Answer") },
    { q: l("faq5Question"), a: l("faq5Answer") },
    { q: l("faq6Question"), a: l("faq6Answer") },
  ];

  return (
    <section className="w-full shrink-0 py-16 lg:py-28" data-slot="home-faq">
      <div className={cn(FRAME, "grid gap-8 lg:grid-cols-12 lg:gap-6")}>
        <div className="flex flex-col gap-3 lg:sticky lg:top-32 lg:col-span-5 lg:self-start lg:gap-5">
          <HandQuestion ask="askUnsure" className="text-4xl text-hero-ink lg:text-7xl" />
          <Rise className="flex flex-col items-start gap-2 lg:gap-4" delay={0.9}>
            <SectionTitle>{t("faqTitle")}</SectionTitle>
            <Link
              className="group/all flex h-11 items-center gap-1.5 text-base font-medium text-foreground lg:h-12 lg:text-lg"
              href="/landing#faq"
            >
              <span className="underline underline-offset-4">{t("faqMore")}</span>
              <ArrowRight
                aria-hidden
                className="size-4 transition-transform duration-300 group-hover/all:translate-x-1 motion-reduce:transition-none lg:size-5"
              />
            </Link>
          </Rise>
        </div>
        <Accordion className="border-t border-border lg:col-span-7 lg:col-start-6">
          {/* Between the root and its items so each row can rise on its own;
              the items still register with the root through context. */}
          <Rise className="flex flex-col" delay={1} stagger>
            {items.map(({ q, a }) => (
              <AccordionItem className="border-b border-border" key={q} value={q}>
                <AccordionTrigger className="items-center gap-6 py-5 text-base font-medium text-foreground hover:no-underline lg:py-7 lg:text-xl [&_[data-slot=accordion-trigger-icon]]:hidden">
                  <span className="min-w-0 flex-1">{q}</span>
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border text-foreground transition-[background-color,border-color,color] duration-300 group-aria-expanded/accordion-trigger:border-hero-action group-aria-expanded/accordion-trigger:bg-hero-action group-aria-expanded/accordion-trigger:text-hero-action-foreground motion-reduce:transition-none lg:size-12">
                    <Plus
                      aria-hidden
                      className="size-4.5 transition-transform duration-300 ease-out group-aria-expanded/accordion-trigger:rotate-45 motion-reduce:transition-none lg:size-5"
                    />
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pr-14 pb-6 text-base leading-relaxed text-muted-foreground lg:pr-20 lg:pb-8 lg:text-lg">
                  <ThaiText>{a}</ThaiText>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Rise>
        </Accordion>
      </div>
    </section>
  );
}
