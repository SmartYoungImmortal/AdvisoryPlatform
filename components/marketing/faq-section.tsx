"use client";

import { Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ThaiText } from "@/components/mobile/thai-text";
import { cn } from "@/lib/utils";

/**
 * The eight questions, and now their answers.
 *
 * Figma draws this as eight rows with a chevron on each and the first one
 * expanded, so it was transcribed as eight `<div>`s: the chevrons pointed at
 * nothing, and seven of the eight questions had no answer written anywhere in
 * the message file — the frame only ever showed the first one, so only the first
 * one existed. The rows are a real accordion here and the missing seven answers
 * are written.
 *
 * `"use client"`: Base UI's accordion owns open state and the panel height it
 * animates to.
 */
export function FaqSection({
  className,
  limit,
}: {
  readonly className?: string;
  /** Show only the first N questions — the home screen does not need all eight. */
  readonly limit?: number;
}) {
  const t = useTranslations("landing");

  const items = [
    { q: t("faq1Question"), a: t("faq1Answer") },
    { q: t("faq2Question"), a: t("faq2Answer") },
    { q: t("faq3Question"), a: t("faq3Answer") },
    { q: t("faq4Question"), a: t("faq4Answer") },
    { q: t("faq5Question"), a: t("faq5Answer") },
    { q: t("faq6Question"), a: t("faq6Answer") },
    { q: t("faq7Question"), a: t("faq7Answer") },
    { q: t("faq8Question"), a: t("faq8Answer") },
  ].slice(0, limit ?? 8);

  return (
    <Accordion className={cn("w-full", className)}>
      {items.map(({ q, a }) => (
        <AccordionItem
          className="border-b border-border last:border-b-0"
          key={q}
          value={q}
        >
          {/* The primitive appends its own chevron at the row's far edge. This
              row is led by the toggle instead, so that one is hidden and a bead
              carrying plus/minus takes the front — the open state is then legible
              from the marker itself rather than from a glyph 300px away. */}
          <AccordionTrigger className="items-center gap-3 hover:no-underline [&_[data-slot=accordion-trigger-icon]]:hidden">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-marker text-primary shadow-[inset_0_0_8px_var(--marker-sheen)]">
              <Plus
                aria-hidden
                className="size-4 group-aria-expanded/accordion-trigger:hidden"
              />
              <Minus
                aria-hidden
                className="hidden size-4 group-aria-expanded/accordion-trigger:block"
              />
            </span>
            <span className="min-w-px flex-1 text-sm font-semibold text-foreground">
              {q}
            </span>
          </AccordionTrigger>
          {/* Indented past the bead so the answer hangs off its question rather
              than starting back at the page inset. */}
          <AccordionContent className="pl-10 text-sm leading-relaxed font-normal text-muted-foreground">
            <ThaiText>{a}</ThaiText>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
