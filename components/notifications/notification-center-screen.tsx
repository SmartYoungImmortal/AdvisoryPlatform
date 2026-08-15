import Link from "next/link";
import { Bell, CalendarDays, CreditCard, MessageSquare } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  MobileScreen,
  ScreenBody,
  ScreenHeading,
  ScreenSpacer,
  ScreenTopBar,
} from "@/components/mobile/screen";

/**
 * Figma notification row — 64px tall: a 16px glyph, a title/body stack and a
 * right-aligned relative time with an optional 8px unread dot.
 */
function NotificationRow({
  icon: Icon,
  title,
  body,
  time,
  unread = false,
  href,
}: {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly body: string;
  readonly time: string;
  readonly unread?: boolean;
  readonly href: string;
}) {
  return (
    <Link
      className="flex h-16 w-full shrink-0 items-start gap-3 overflow-clip px-3.5 py-3"
      href={href}
    >
      <Icon className="mt-3 size-4 shrink-0 text-muted-foreground" />
      <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
        <p className="w-full text-sm font-medium text-foreground">
          {title}
        </p>
        <p className="w-full text-xs font-normal text-muted-foreground">
          {body}
        </p>
      </div>
      <div className="mt-[11px] flex shrink-0 items-center gap-2">
        <span className="text-xs font-normal whitespace-nowrap text-muted-foreground">
          {time}
        </span>
        {unread ? <span className="size-2 shrink-0 rounded-full bg-primary" /> : null}
      </div>
    </Link>
  );
}

/** Figma day group — 20px top padding, an 18px caption, then the card. */
function DayGroup({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="flex w-full shrink-0 flex-col items-start gap-2 px-6 pt-5">
      <p className="w-full text-xs font-normal text-muted-foreground">
        {label}
      </p>
      <div className="flex w-full shrink-0 flex-col items-start overflow-clip rounded-xl bg-card">
        {children}
      </div>
    </div>
  );
}

function Divider() {
  return <div className="h-px w-full shrink-0 bg-muted" />;
}

/**
 * Figma "Notification center (Light)" (995:10813) and its empty state (995:10894).
 */
export function NotificationCenterScreen({
  state = "default",
}: {
  readonly state?: "default" | "empty";
}) {
  const t = useTranslations("notifications");
  const c = useTranslations("common");

  return (
    <MobileScreen>
      <ScreenTopBar href="/profile" label={c("back")} />
      <ScreenBody>
        <ScreenHeading className="pt-4" title={t("title")} />

        {state === "empty" ? (
          /* Figma "Empty State": 72px circle, 12px gaps, 306px copy column. */
          <div className="flex w-full shrink-0 flex-col items-center gap-3 px-12 pt-20 text-center">
            <span className="flex size-[72px] shrink-0 items-center justify-center rounded-full bg-muted">
              <Bell className="size-7 text-muted-foreground" />
            </span>
            <p className="w-full text-xl font-semibold text-foreground">
              {t("emptyTitle")}
            </p>
            <p className="w-full text-sm font-normal text-muted-foreground">
              {t("emptyBody")}
            </p>
          </div>
        ) : (
          <>
            <DayGroup label={t("today")}>
              <NotificationRow
                body={t("bookingConfirmedBody")}
                href="/transactions/detail"
                icon={CalendarDays}
                time={t("bookingConfirmedTime")}
                title={t("bookingConfirmedTitle")}
                unread
              />
              <Divider />
              <NotificationRow
                body={t("newMessageBody")}
                href="/chat/sarah-jenskins"
                icon={MessageSquare}
                time={t("newMessageTime")}
                title={t("newMessageTitle")}
                unread
              />
              <Divider />
              <NotificationRow
                body={t("paymentBody")}
                href="/transactions/detail"
                icon={CreditCard}
                time={t("paymentTime")}
                title={t("paymentTitle")}
              />
            </DayGroup>

            <DayGroup label={t("yesterday")}>
              <NotificationRow
                body={t("newMessageBody")}
                href="/chat/sarah-jenskins"
                icon={MessageSquare}
                time={t("yesterday")}
                title={t("newMessageTitle")}
              />
              <Divider />
              <NotificationRow
                body={t("newMessageBody")}
                href="/chat/sarah-jenskins"
                icon={MessageSquare}
                time={t("yesterday")}
                title={t("newMessageTitle")}
              />
            </DayGroup>
          </>
        )}

        <ScreenSpacer />
      </ScreenBody>
    </MobileScreen>
  );
}
