import { useTranslations } from "next-intl";

import { deskPhoto as desk, documentPreview as doc } from "@/lib/assets/r2";
import { ChatFooter, ChatHeader } from "@/components/chat/chat-chrome";
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

      <div className="flex w-full min-h-0 flex-1 flex-col lg:mx-auto lg:w-full lg:max-w-[1440px] lg:flex-row lg:overflow-clip lg:rounded-xl lg:border lg:border-border lg:bg-card">
        <ChatList
          activeId={threadId}
          className="hidden lg:flex lg:h-full lg:w-80 lg:shrink-0 lg:border-e lg:border-border lg:pt-4"
        />

        <div className="flex w-full min-h-0 flex-1 flex-col">
      <ChatHeader threadId={threadId} />
      {/* Figma "Container": 16px side padding, 12px between messages. */}
      <ScreenBody className="items-start gap-3 px-4 lg:px-6 lg:py-4">
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
            <MyMessage bubbleClassName="gap-2.5 bg-muted" time="00.05">
              <FileBody meta={t("thread.fileMeta")} name={t("thread.fileName")} />
            </MyMessage>
          </>
        )}

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
