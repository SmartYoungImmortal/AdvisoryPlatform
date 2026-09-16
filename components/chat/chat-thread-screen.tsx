import { useTranslations } from "next-intl";

import { deskPhoto as desk, documentPreview as doc } from "@/lib/assets/r2";
import { ChatFooter, ChatHeader } from "@/components/chat/chat-chrome";
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

/**
 * Figma "Chat" (995:8152) and "Chat - Message failed" (995:8209). The failed frame
 * keeps only the last two media messages and appends the retry bubble.
 */
export function ChatThreadScreen({
  state = "default",
}: {
  readonly state?: "default" | "message-failed";
}) {
  const t = useTranslations("chat");
  const isFailed = state === "message-failed";

  // The thread frame stacks its blocks with a 16px gap.
  return (
    <MobileScreen className="gap-4">
      <ChatHeader />
      {/* Figma "Container": 16px side padding, 12px between messages. */}
      <ScreenBody className="items-start gap-3 px-4">
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
    </MobileScreen>
  );
}
