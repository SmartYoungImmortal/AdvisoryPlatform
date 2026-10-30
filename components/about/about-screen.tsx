// The story's headlines are Prompt semibold (`font-story`); only this page sets it.
import "@fontsource/prompt/600.css";

import { SkipToEnd, StoryClose } from "@/components/about/story-close";
import { Story } from "@/components/about/story";
import { SiteFooter } from "@/components/marketing/site-footer";
import { MobileScreen, ScreenBody } from "@/components/mobile/screen";
import { TopBar } from "@/components/topbar";

/**
 * `/about` — how Advisory came to be, as a story told by the scroll.
 *
 * Five scenes (`Story`), a line or two each over big crayon drawings: the
 * question, searching it, asking around, the people who know, and why asking
 * them is safe; then where to start (`StoryClose`) and the footer.
 *
 * Nothing in the story is a figure, a quote or a name: there are no numbers
 * of users, no press and no team members on this page, because none of that
 * could be checked. The drawn characters stand for the reader and an expert.
 *
 * `wide="md"` because the story is one column below `lg`: at 768 the 448 cap
 * would only leave a phone-width page in a wide frame. From `lg` the story is
 * drawn on the 1710 frame and scaled to the screen.
 */
export function AboutScreen() {
  return (
    <MobileScreen className="pb-0" wide="md">
      <ScreenBody className="relative isolate bg-card">
        {/* `overlay`: the story's first screen runs under the bar, edge to edge. */}
        <TopBar overlay />
        <Story />
        <StoryClose />
        <SiteFooter className="page-scale" />
      </ScreenBody>
      <SkipToEnd />
    </MobileScreen>
  );
}
