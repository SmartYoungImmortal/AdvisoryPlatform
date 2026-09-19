import Link from "next/link";
import { ChevronLeft, Image as ImageIcon, Info, Plus, SendHorizontal, Video } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatAvatar } from "@/components/chat/chat-avatar";
import { cn } from "@/lib/utils";

/**
 * The desktop two-pane card the three thread screens share — Figma's desktop
 * chat (1952:8003) stands the inbox and the open thread side by side in one
 * card.
 *
 * It is `Surface`'s raised tier written as `lg:` variants rather than the
 * component: below `lg` there is no card at all, because the thread *is* the
 * screen — full-bleed, `h-dvh`, its own scroll. It was pasted in all three files
 * before this, at `rounded-xl` instead of the card step and with no elevation.
 */
export const CHAT_PANE =
  "lg:mx-auto lg:w-full lg:max-w-[1440px] lg:flex-row lg:overflow-clip lg:rounded-card lg:border lg:border-border lg:bg-card lg:shadow-card";

/**
 * Figma "Chat Header" — 402 x 84: 24px top padding, a 40px back chevron, a 40px
 * avatar, the 24/24 Geist semibold name (-0.625 tracking) and 24px action glyphs,
 * closed by a hairline 20px below the row.
 */
/**
 * `threadId` is only here so the trailing control can address this thread's
 * report screen. The header is otherwise identical for every thread — the
 * prototype renders the same conversation behind each id.
 */
export function ChatHeader({ threadId }: { readonly threadId: string }) {
  const t = useTranslations("chat");
  const c = useTranslations("common");

  // Figma draws the closing rule as a zero-height stroke, so it is painted with
  // ::after and the 20px trailing space is padding instead of a gap.
  //
  // The bar takes the card surface: the messages behind it sit on the page
  // ground now, so the chrome at either end of the thread has to be the thing
  // that does not scroll *and* does not look like a message.
  return (
    <div className="relative flex w-full shrink-0 flex-col items-start bg-card pt-6 pb-5 after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:bg-border after:content-[''] lg:py-4">
      <div className="flex w-full shrink-0 items-center gap-4 px-4 lg:gap-3 lg:px-5">
        {/* The desktop pane has the inbox beside it, so there is nothing for a
            back chevron to do there. */}
        <Button
          aria-label={c("back")}
          className="size-10 shrink-0 lg:hidden"
          nativeButton={false}
          render={<Link href="/chat" />}
          size="icon"
          variant="ghost"
        >
          <ChevronLeft className="size-10" />
        </Button>
        <div className="flex min-w-px flex-1 items-center gap-2.5 self-stretch">
          <ChatAvatar presence="online" size={40} />
          <p className="font-latin min-w-px flex-1 truncate text-2xl leading-6 font-semibold tracking-[-0.625px] text-foreground">
            {t("partner")}
          </p>
        </div>
        <Button
          aria-label={t("videoCall")}
          className="size-6 shrink-0"
          size="icon"
          variant="ghost"
        >
          <Video className="size-6" />
        </Button>
        {/* The one way into the report flow. It sat inert here — a ghost button
            with no href and no handler — until the report frames landed.
            `nativeButton={false}` is what tells Base UI it ended up on an anchor;
            without it `check-a11y-render.mjs` fails the build. */}
        <Button
          aria-label={t("info")}
          className="size-6 shrink-0"
          nativeButton={false}
          render={<Link href={`/chat/${threadId}/report`} />}
          size="icon"
          variant="ghost"
        >
          <Info className="size-6" />
        </Button>
      </div>
    </div>
  );
}

/**
 * Figma "Chat Footer" — 402 x 76: a hairline, then a 16px gap above the compose row
 * (8px side padding, 24px attach glyphs, the 36px input and a 36px send button).
 */
export function ChatFooter({
  sendVariant = "muted",
}: {
  readonly sendVariant?: "muted" | "primary";
}) {
  const t = useTranslations("chat");

  return (
    // Card surface, like the header: the compose row is the other end of the
    // thread's chrome, and the messages scroll on the page ground between them.
    <div className="relative flex w-full shrink-0 flex-col items-start bg-card pt-4 pb-6 before:absolute before:top-0 before:left-0 before:h-px before:w-full before:bg-border before:content-['']">
      <div className="flex w-full shrink-0 items-center gap-2 px-2">
        {/* Figma draws these as bare 24px glyphs; as real buttons they keep that
            box but gain the focus ring, hover and press states. */}
        <Button aria-label={t("attach")} className="size-6 shrink-0" size="icon" variant="ghost">
          <Plus className="size-6" />
        </Button>
        <Button
          aria-label={t("attachImage")}
          className="size-6 shrink-0"
          size="icon"
          variant="ghost"
        >
          <ImageIcon className="size-6" />
        </Button>
        <Input
          aria-label={t("title")}
          className="font-latin min-w-px flex-1 rounded-card border-border bg-muted px-3.5 text-sm shadow-none"
          placeholder={t("messagePlaceholder")}
          type="text"
        />
        <Button
          aria-label={t("send")}
          className={cn(
            "size-9 shrink-0 border-0",
            // Nothing to send: the well step rather than the hairline colour,
            // which was a border token doing duty as a fill.
            sendVariant === "muted" && "bg-muted text-muted-foreground hover:bg-accented",
          )}
          size="icon"
        >
          <SendHorizontal className="size-5" />
        </Button>
      </div>
    </div>
  );
}
