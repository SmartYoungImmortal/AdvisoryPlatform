import { useTranslations } from "next-intl";

import { deskPhoto as desk, documentPreview as doc } from "@/lib/assets/r2";
import { ChatFooter, ChatHeader } from "@/components/chat/chat-chrome";
import { ChatList } from "@/components/chat/chat-inbox-screen";
import { ImageBody, MyMessage, PartnerMessage } from "@/components/chat/messages";
import { MobileScreen, ScreenBody } from "@/components/mobile/screen";
import { OfflineStrip, QueuedMessage } from "@/components/offline/parts";
import { TopBar } from "@/components/topbar";

/**
 * Figma "ออฟไลน์ - ข้อความรอส่ง" (1952:36034) — the chat thread as it looks
 * with the network gone: the last two media messages, then a message that has
 * been written but not sent, and a strip above the compose row saying why.
 *
 * It is the "Chat - Message failed" frame's counterpart. That one has already
 * tried and lost; this one has not tried yet, so the bubble is dashed rather
 * than outlined in the destructive colour, the meta is muted rather than red,
 * and there is nothing to retry — the strip's promise is that the app will send
 * it on its own. The send button keeps the muted fill the frame draws, since
 * there is nowhere for a message to go.
 *
 * The thread chrome, the bubbles and the desktop composition are the chat's
 * own: with no desktop frame for this state, it takes the one the desktop chat
 * (1952:8003) sets — the thread as the right-hand pane of a card with the inbox
 * beside it, under the app's nav.
 */
export function OfflineChatScreen({
  threadId = "sarah-jenskins",
}: {
  readonly threadId?: string;
}) {
  const t = useTranslations("offline");

  return (
    <MobileScreen className="gap-4 lg:gap-0" wide>
      <div className="hidden w-full lg:block">
        <TopBar unreadNotifications />
      </div>

      <div className="flex w-full min-h-0 flex-1 flex-col lg:mx-auto lg:w-full lg:max-w-[1440px] lg:flex-row lg:overflow-clip lg:rounded-xl lg:border lg:border-border lg:bg-card">
        <ChatList
          activeId={threadId}
          className="hidden lg:flex lg:h-full lg:w-80 lg:shrink-0 lg:border-e lg:border-border lg:pt-4"
        />

        <div className="flex w-full min-h-0 flex-1 flex-col">
          <ChatHeader threadId={threadId} />
          {/* Figma "Container": 16px side padding, 12px between messages. */}
          <ScreenBody className="items-start gap-3 px-4 lg:px-6 lg:py-4">
            <PartnerMessage
              bubbleClassName="h-[213px] w-[184px] items-start gap-2.5"
              time="00.06"
            >
              <ImageBody src={doc} />
            </PartnerMessage>
            <MyMessage
              bubbleClassName="h-[149px] w-[255px] gap-2.5 bg-brand-image"
              time="00.07"
            >
              <ImageBody src={desk} />
            </MyMessage>
            <QueuedMessage meta={t("chatQueuedMeta")} text={t("chatQueuedText")} />
          </ScreenBody>
          <OfflineStrip>{t("chatStrip")}</OfflineStrip>
          <ChatFooter sendVariant="muted" />
        </div>
      </div>
    </MobileScreen>
  );
}
