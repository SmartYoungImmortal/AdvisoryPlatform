"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { SiteFooter } from "@/components/marketing/site-footer";
import { MobileScreen, ScreenBody } from "@/components/mobile/screen";
import { TopBar } from "@/components/topbar";
import { useAppLocale } from "@/lib/i18n/locale-provider";
import { legalChrome } from "@/lib/legal/chrome";
import type { LegalDoc } from "@/lib/legal/types";
import { cn } from "@/lib/utils";

/** The prose, in the foreground ink: in a contract the body text is the page. */
const PROSE = "text-base leading-relaxed text-foreground";

/**
 * A legal document page, the terms and the privacy policy alike.
 *
 * The order is a legal centre's: a breadcrumb, the title with the date it took
 * effect and its version, then the text. Around that, what makes a long
 * contract usable rather than merely present:
 *
 * - **Two tabs** between the documents, since a reader of one usually needs
 *   the other next.
 * - **A contents column** on a desktop that stays beside the text and lights
 *   up the clause being read; each clause is also a link target (`#booking`).
 *
 * The language follows the app's own switch (`useAppLocale`), and the
 * document is data in `lib/legal`.
 *
 * `login` on the bar for the reason `/landing` passes it: these are public
 * pages linked from every footer, and the signed-in bell would bounce a guest
 * to the sign-in screen.
 */
export function LegalDocument({
  document: byLocale,
  current,
}: {
  readonly document: Readonly<Record<"th" | "en", LegalDoc>>;
  readonly current: "terms" | "privacy";
}) {
  const { locale } = useAppLocale();
  const doc = byLocale[locale];
  const chrome = legalChrome[locale];
  const [active, setActive] = useState(doc.sections[0]?.id);
  const article = useRef<HTMLElement>(null);

  // The clause nearest the top of the reading area is the one lit in the
  // contents. Observed against `ScreenBody`, which is what scrolls, not the
  // window; the band is the top third, so a clause counts as "being read"
  // once its heading is well into view.
  useEffect(() => {
    const root = article.current?.closest<HTMLElement>('[data-slot="screen-body"]') ?? null;
    const headings = Array.from(article.current?.querySelectorAll("section[id]") ?? []);
    if (headings.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const seen = entries.filter((entry) => entry.isIntersecting);
        if (seen.length > 0) setActive(seen[0].target.id);
      },
      { root, rootMargin: "0px 0px -66% 0px" },
    );
    for (const heading of headings) observer.observe(heading);
    return () => observer.disconnect();
  }, [doc]);

  const tabs = [
    { id: "terms", href: "/terms", label: chrome.terms },
    { id: "privacy", href: "/pdpa", label: chrome.privacy },
  ] as const;

  return (
    // `"md"`: a document is one column, so a phone-width page at 768px would
    // only float in an empty tablet. See `MobileViewport`.
    <MobileScreen className="bg-card pb-0" wide="md">
      {/* The home hero's two lights at the top of the page (`bg-legal-wash`),
          drawn from the very top so they run behind the bar too. */}
      {/* `bg-local`: `ScreenBody` is the scroller, and without it the lights
          would stay pinned to the top of the window instead of scrolling
          away with the page's first screen. */}
      <ScreenBody className="bg-card bg-legal-wash bg-local bg-no-repeat">
        <TopBar dock login />

        {/* `doc-scale` (`app/globals.css`): on a landscape tablet the whole
            document is the 1710 desktop page made smaller, not desktop-sized
            type in two thirds of the room. */}
        <article
          className="doc-scale mx-auto flex w-full max-w-280 flex-1 flex-col px-6 pt-6 pb-16 md:px-8 lg:pt-10 lg:pb-24"
          ref={article}
        >
          <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link className="hover:text-foreground" href="/">
                  {chrome.home}
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li aria-current="page" className="text-foreground">
                {doc.title}
              </li>
            </ol>
          </nav>

          <header className="mt-5 flex flex-col gap-3">
            <h1 className="text-3xl leading-tight font-bold text-foreground md:text-4xl lg:text-5xl">
              {doc.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              {doc.effective} · {doc.version}
            </p>
          </header>

          {/* The two documents as tabs: a reader of one usually wants the
              other next. Pills, as every action on this site is. */}
          <div className="mt-6 flex flex-wrap gap-2" role="tablist">
            {tabs.map((tab) => (
              <Link
                aria-selected={tab.id === current}
                className={cn(
                  "flex h-10 items-center rounded-full px-4 text-sm font-medium transition-colors",
                  tab.id === current
                    ? "bg-hero-action text-hero-action-foreground"
                    : "border border-border text-foreground hover:bg-muted",
                )}
                href={tab.href}
                key={tab.id}
                role="tab"
              >
                {tab.label}
              </Link>
            ))}
          </div>

          <div className="mt-10 grid grid-cols-1 gap-10 lg:mt-14 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16">
            {/* The contents, beside the text on a desktop and in step with it.
                Hidden below `lg`, where there is no column for it. */}
            <aside className="hidden lg:block">
              <nav aria-label={chrome.contents} className="sticky top-28 flex flex-col gap-3">
                <p className="text-sm font-semibold text-foreground">{chrome.contents}</p>
                <ol className="flex flex-col border-l border-border">
                  {doc.sections.map((section, index) => (
                    <li key={section.id}>
                      {/* The active state is colour and the rule only, never
                          weight: a bolder title is wider, and a title that
                          wraps one line further pushed every item below it
                          down as the reader scrolled. */}
                      <a
                        aria-current={active === section.id ? "true" : undefined}
                        className={cn(
                          "-ml-px flex gap-2 border-l-2 py-1.5 pl-4 text-sm leading-snug transition-colors",
                          active === section.id
                            ? "border-foreground text-foreground"
                            : "border-transparent text-muted-foreground hover:text-foreground",
                        )}
                        href={`#${section.id}`}
                      >
                        <span className="font-latin tabular-nums">{index + 1}.</span>
                        {section.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </aside>

            <div className="flex max-w-200 min-w-0 flex-col gap-12">
              <div className="flex flex-col gap-4">
                {doc.lead.map((paragraph) => (
                  <p className={PROSE} key={paragraph}>
                    {paragraph}
                  </p>
                ))}
              </div>

              {doc.sections.map((section, index) => (
                // `scroll-mt-28`: a jump to `#booking` lands below the sticky
                // bar rather than under it.
                <section className="flex scroll-mt-28 flex-col gap-4" id={section.id} key={section.id}>
                  <h2 className="flex gap-3 text-xl leading-snug font-bold text-foreground md:text-2xl">
                    <span className="font-latin text-muted-foreground tabular-nums">{index + 1}.</span>
                    {section.title}
                  </h2>
                  {section.paragraphs?.map((paragraph) => (
                    <p className={PROSE} key={paragraph}>
                      {paragraph}
                    </p>
                  ))}
                  {section.bullets?.length ? (
                    <ul className={cn("flex list-outside list-disc flex-col gap-2 pl-5", PROSE)}>
                      {section.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  ) : null}
                  {section.subsections?.map((sub, subIndex) => (
                    <div className="flex flex-col gap-2 pt-2" key={sub.title}>
                      <h3 className="flex gap-2 text-base font-semibold text-foreground md:text-lg">
                        <span className="font-latin text-muted-foreground tabular-nums">
                          {index + 1}.{subIndex + 1}
                        </span>
                        {sub.title}
                      </h3>
                      {sub.paragraphs?.map((paragraph) => (
                        <p className={PROSE} key={paragraph}>
                          {paragraph}
                        </p>
                      ))}
                      {sub.bullets?.length ? (
                        <ul className={cn("flex list-outside list-disc flex-col gap-2 pl-5", PROSE)}>
                          {sub.bullets.map((bullet) => (
                            <li key={bullet}>{bullet}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ))}
                </section>
              ))}

              <p className="border-t border-border pt-8 text-base text-muted-foreground">
                {doc.contact.body}{" "}
                <a
                  className="font-latin font-semibold text-foreground underline underline-offset-2"
                  href={`mailto:${doc.contact.email}`}
                >
                  {doc.contact.email}
                </a>
              </p>
            </div>
          </div>
        </article>
        <SiteFooter />
      </ScreenBody>
    </MobileScreen>
  );
}
