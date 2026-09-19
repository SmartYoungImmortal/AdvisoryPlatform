import { useTranslations } from "next-intl";

import { deskPhoto as desk, documentPreview as doc } from "@/lib/assets/r2";
import { CHAT_PANE, ChatFooter, ChatHeader } from "@/components/chat/chat-chrome";
import { ChatList } from "@/components/chat/chat-inbox-screen";
import {
  DayDivider,
  FailedMessage,
  FileBody,
  ImageBody,
  MyMessage,
  MyText,
  PartnerMessage,
  PartnerText,
} from "@/components/chat/messages";
import { MobileScreen, ScreenBody } from "@/components/mobile/screen";
import { TopBar } from "@/components/topbar";
import { cn } from "@/lib/utils";

/**
 * Figma "Chat" (995:8152) and "Chat - Message failed" (995:8209). The failed frame
 * keeps only the last two media messages and appends the retry bubble.
 */
export function ChatThreadScreen({
  threadId,
  state = "default",
}: {
  /** Passed through to the header so its report control can address this thread. */
  readonly threadId: string;
  readonly state?: "default" | "message-failed";
}) {
  const t = useTranslations("chat");
  const isFailed = state === "message-failed";

  // The thread frame stacks its blocks with a 16px gap. Figma's desktop chat
  // (1952:8003) sets the same thread in the right half of a card with the
  // inbox beside it, under the app's nav — so the phone's full-bleed screen
  // becomes a pane, and the list it came from stays visible.
  return (
    <MobileScreen className="gap-4 lg:gap-0" wide>
      <div className="hidden w-full lg:block">
        <TopBar unreadNotifications />
      </div>

      <div className={cn("flex w-full min-h-0 flex-1 flex-col", CHAT_PANE)}>
        <ChatList
          activeId={threadId}
          className="hidden lg:flex lg:h-full lg:w-80 lg:shrink-0 lg:border-e lg:border-border lg:pt-4"
        />

        <div className="flex w-full min-h-0 flex-1 flex-col">
      <ChatHeader threadId={threadId} />
      {/* Figma "Container": 16px side padding, 12px between messages. The ground
          is stated rather than inherited: inside the desktop pane the card
          surface would otherwise reach under the bubbles and flatten them. */}
      <ScreenBody className="items-start gap-3 bg-background px-4 py-3 lg:px-6 lg:py-4">
        {isFailed ? null : (
          <>
            <DayDivider>{t("yesterday")}</DayDivider>
            <MyMessage time="23.53">
              <MyText>{t("thread.myOffer")}</MyText>
            </MyMessage>
            <PartnerMessage time="23.57">
              <PartnerText>{t("thread.greeting")}</PartnerText>
            </PartnerMessage>
            <PartnerMessage time="23.59">
              <PartnerText>{t("thread.long")}</PartnerText>
            </PartnerMessage>
            <PartnerMessage time="23.59">
              <PartnerText>{t("thread.askAnything")}</PartnerText>
            </PartnerMessage>
            <DayDivider>{t("today")}</DayDivider>
            <PartnerMessage bubbleClassName="items-start gap-2.5" time="00.03">
              <FileBody meta={t("thread.fileMeta")} name={t("thread.fileName")} />
            </PartnerMessage>
            {/* A file I sent: the accent fill would put muted meta on blue, so
                the bubble takes the accent's *surface* token instead — still
                plainly my side, still readable. It was `bg-muted`, which is now
                the page's own step. */}
            <MyMessage bubbleClassName="gap-2.5 bg-accent-surface" time="00.05">
              <FileBody meta={t("thread.fileMeta")} name={t("thread.fileName")} />
            </MyMessage>
          </>
        )}

        {/* A photo fills its bubble now — the 8px ring of bubble colour round
            the image was the only padding in the thread doing nothing. */}
        <PartnerMessage bubbleClassName="h-[213px] w-46 p-0" time="00.06">
          <ImageBody src={doc} />
        </PartnerMessage>
        <MyMessage bubbleClassName="h-[149px] w-[255px] bg-brand-image p-0" time="00.07">
          <ImageBody src={desk} />
        </MyMessage>

        {isFailed ? (
          <FailedMessage meta={t("thread.failedMeta")} text={t("thread.failedText")} />
        ) : null}
      </ScreenBody>
      <ChatFooter sendVariant={isFailed ? "muted" : "primary"} />
        </div>
      </div>
    </MobileScreen>
  );
}
