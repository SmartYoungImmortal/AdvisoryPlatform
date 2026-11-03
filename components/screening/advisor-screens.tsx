import { FileText } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  MobileScreen,
  ScreenBody,
  ScreenHeading,
  ScreenSpacer,
  ScreenTopBar,
} from "@/components/mobile/screen";
import { StatusPill } from "@/components/mobile/status-pill";
import { Card, StackRow, TimeMeta } from "@/components/screening/parts";

/** Figma "Advisor - Screening requests (Light)" — 995:11505. */
export function ScreeningRequestsScreen() {
  const t = useTranslations("screening");
  const c = useTranslations("common");

  return (
    // No desktop frame was drawn for this flow, so it follows the rule the
    // drawn ones set: the canvas opens up and the blocks hold a readable
    // column rather than a 448px strip stranded on a 1440 page.
    <MobileScreen wide>
      <ScreenTopBar href="/profile" label={c("back")} />
      <ScreenBody className="lg:[&>*]:mx-auto lg:[&>*]:w-full lg:[&>*]:max-w-[720px]">
        <ScreenHeading className="pt-4" title={t("requestsTitle")} />

        {/* The two groups had the same grey caption and identical rows, so
            nothing on the screen said which requests were still owed an answer.
            The heads state it, and the group's own colour carries it: amber
            chips and a pill on what is waiting, the outcome on what is done. */}
        <div className="flex w-full shrink-0 flex-col items-start gap-2 px-6 pt-5">
          <p className="w-full text-base font-semibold text-foreground lg:text-lg">
            {t("pending")}
          </p>
          <Card>
            <StackRow
              body={t("req1Body")}
              href="/screening/review"
              icon={FileText}
              iconClassName="bg-warning/15 text-warning"
              title={t("req1Name")}
              trailing={<TimeMeta time={t("req1Time")} unread />}
            />
            <StackRow
              body={t("req2Body")}
              href="/screening/review"
              icon={FileText}
              iconClassName="bg-warning/15 text-warning"
              title={t("req2Name")}
              trailing={<TimeMeta time={t("req2Time")} unread />}
            />
            <StackRow
              body={t("req3Body")}
              href="/screening/review"
              icon={FileText}
              iconClassName="bg-warning/15 text-warning"
              title={t("req3Name")}
              trailing={<TimeMeta time={t("req3Time")} />}
            />
          </Card>
        </div>

        <div className="flex w-full shrink-0 flex-col items-start gap-2 px-6 pt-5">
          <p className="w-full text-base font-semibold text-foreground lg:text-lg">
            {t("answered")}
          </p>
          <Card>
            {/* These two rows' bodies already *are* the outcome — "รับคำขอแล้ว"
                and "ปฏิเสธคำขอ" — so the outcome moves into a pill and the body
                stops being a grey line that has to be read to be found. */}
            <StackRow
              body={<StatusPill tone="success">{t("req4Body")}</StatusPill>}
              href="/screening/review"
              icon={FileText}
              iconClassName="bg-success/12 text-success"
              title={t("req4Name")}
              trailing={<TimeMeta time={t("yesterday")} />}
            />
            <StackRow
              body={<StatusPill tone="danger">{t("req5Body")}</StatusPill>}
              href="/screening/review"
              icon={FileText}
              iconClassName="bg-destructive/10 text-destructive"
              title={t("req5Name")}
              trailing={<TimeMeta time={t("yesterday")} />}
            />
          </Card>
        </div>

        <ScreenSpacer />
      </ScreenBody>
    </MobileScreen>
  );
}
