import Link from "next/link";
import { ChevronLeft, Image as ImageIcon, Info, Plus, SendHorizontal, Video } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatAvatar } from "@/components/chat/chat-avatar";
import { cn } from "@/lib/utils";

/**
 * Figma "Chat Header" — 402 x 84: 24px top padding, a 40px back chevron, a 40px
 * avatar, the 24/24 Geist semibold name (-0.625 tracking) and 24px action glyphs,
 * closed by a hairline 20px below the row.
 */
export function ChatHeader() {
  const t = useTranslations("chat");
  const c = useTranslations("common");

  // Figma draws the closing rule as a zero-height stroke, so it is painted with
  // ::after and the 20px trailing space is padding instead of a gap.
  return (
    <div className="relative flex w-full shrink-0 flex-col items-start pt-6 pb-5 after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:bg-border after:content-['']">
      <div className="flex w-full shrink-0 items-center gap-4 px-4">
        <Button
          aria-label={c("back")}
          className="size-10 shrink-0"
          render={<Link href="/chat" />}
          size="icon"
          variant="ghost"
        >
          <ChevronLeft className="size-10" />
        </Button>
        <div className="flex min-w-px flex-1 items-center gap-2 self-stretch">
          <ChatAvatar size={40} />
          <p className="font-latin shrink-0 text-2xl leading-6 font-semibold tracking-[-0.625px] whitespace-nowrap text-foreground">
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
        <Button aria-label={t("info")} className="size-6 shrink-0" size="icon" variant="ghost">
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
    <div className="relative flex w-full shrink-0 flex-col items-start pt-4 pb-6 before:absolute before:top-0 before:left-0 before:h-px before:w-full before:bg-border before:content-['']">
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
          className="font-latin min-w-px flex-1 bg-muted px-3 text-sm shadow-none"
          placeholder={t("messagePlaceholder")}
          type="text"
        />
        <Button
          aria-label={t("send")}
          className={cn(
            "size-9 shrink-0 border-0",
            sendVariant === "muted" && "bg-border text-foreground hover:bg-border/80",
          )}
          size="icon"
        >
          <SendHorizontal className="size-5" />
        </Button>
      </div>
    </div>
  );
}
