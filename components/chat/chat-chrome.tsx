import Link from "next/link";
import { ChevronLeft, Image as ImageIcon, Info, Plus, SendHorizontal, Video } from "lucide-react";
import { useTranslations } from "next-intl";

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
        <Link aria-label={c("back")} className="shrink-0 text-foreground" href="/chat">
          <ChevronLeft className="size-10" />
        </Link>
        <div className="flex min-w-px flex-1 items-center gap-2 self-stretch">
          <ChatAvatar size={40} />
          <p className="font-latin shrink-0 text-[24px] leading-[24px] font-semibold tracking-[-0.625px] whitespace-nowrap text-foreground">
            {t("partner")}
          </p>
        </div>
        <button aria-label={t("videoCall")} className="shrink-0 text-foreground" type="button">
          <Video className="size-6" />
        </button>
        <button aria-label={t("info")} className="shrink-0 text-foreground" type="button">
          <Info className="size-6" />
        </button>
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
        <button aria-label={t("attach")} className="shrink-0 text-foreground" type="button">
          <Plus className="size-6" />
        </button>
        <button aria-label={t("attachImage")} className="shrink-0 text-foreground" type="button">
          <ImageIcon className="size-6" />
        </button>
        <input
          aria-label={t("title")}
          className="font-latin h-9 min-w-px flex-1 overflow-clip rounded-[8px] border border-input bg-muted px-3 py-[7.5px] text-[14px] leading-[20px] font-normal text-foreground outline-none placeholder:text-muted-foreground"
          placeholder={t("messagePlaceholder")}
          type="text"
        />
        <button
          aria-label={t("send")}
          className={cn(
            "flex size-9 min-h-9 min-w-9 shrink-0 items-center justify-center rounded-[8px] p-2",
            sendVariant === "primary"
              ? "bg-primary text-primary-foreground"
              : "bg-border text-foreground",
          )}
          type="button"
        >
          <SendHorizontal className="size-5" />
        </button>
      </div>
    </div>
  );
}
