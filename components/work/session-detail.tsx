"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Clock } from "lucide-react";
import { useTranslations } from "next-intl";

import { StatusPill } from "@/components/mobile/status-pill";
import { Surface, SurfaceList } from "@/components/mobile/surface";
import { ThaiText } from "@/components/mobile/thai-text";
import { WorkSectionHead } from "@/components/work/section-head";
import { cn } from "@/lib/utils";
import { NEXT_SESSION, sessionDetail, type SessionFixture } from "@/lib/work";

/**
 * One booked session, opened up — the screening answers included, because those
 * answers are the reason the screen exists: they are what an Advisor reads before
 * walking in.
 *
 * Every session row used to link here and this sheet always described the same
 * fixture, which is how it came to say 16:00 under a card that said 10:00. The row
 * hands its id over in the query string and the sheet reads it, so the detail is the
 * session that was tapped. The read is the only reason this is a client component;
 * `output: "export"` has no server to resolve a search param, so the page prerenders
 * with the next session and the query fills in on hydration — the same arrangement
 * the admin console's list screens use.
 */
export function SessionDetailView({
  session,
}: {
  readonly session: SessionFixture;
}) {
  const t = useTranslations("work");
  const imminent = session.startsInMinutes !== undefined;

  return (
    <>
      <div className="flex w-full shrink-0 flex-col items-start px-6">
        {/* The countdown is the accent's job, so a session that is merely later
            today does not get to borrow it — it states its hour on a well. */}
        <Surface
          className={cn(
            "flex w-full items-center gap-3 p-4",
            imminent && "border-primary bg-accent-surface",
          )}
          tier={imminent ? "raised" : "well"}
        >
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full",
              imminent
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground",
            )}
          >
            <Clock aria-hidden className="size-4.5" />
          </span>
          <div className="flex min-w-px flex-1 flex-col items-start gap-0.5">
            <p className="text-base font-semibold text-foreground">
              {imminent
                ? t("startsInLong", { minutes: session.startsInMinutes })
                : t("todayRangeLong", { range: session.range })}
            </p>
            {imminent ? (
              <p className="text-xs font-normal text-muted-foreground">
                {t("todayRangeLong", { range: session.range })}
              </p>
            ) : null}
          </div>
          {imminent ? (
            <StatusPill className="lg:text-sm" tone="accent">
              {t("startsIn", { minutes: session.startsInMinutes })}
            </StatusPill>
          ) : null}
        </Surface>
      </div>

      <div className="flex w-full shrink-0 flex-col items-start gap-2.5 px-6">
        <WorkSectionHead title={t("adviseeHeading")} />
        <Surface className="flex w-full items-center gap-3 p-3.5">
          <Image
            alt=""
            className="size-11 shrink-0 rounded-full object-cover"
            src={session.avatar}
          />
          <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
            <p className="text-sm font-semibold text-foreground">
              {session.adviseeName}
            </p>
            <p className="text-xs font-normal text-muted-foreground">
              {t("serviceSlotsLength", {
                service: session.serviceTitle,
                slots: session.slots,
                hours: session.durationHours,
              })}
            </p>
          </div>
        </Surface>
      </div>

      <div className="flex w-full shrink-0 flex-col items-start gap-2.5 px-6">
        <WorkSectionHead
          title={t("answersHeading")}
          trailing={
            <p className="shrink-0 text-sm font-normal text-muted-foreground">
              {t("answerCount", { count: session.answers.length })}
            </p>
          }
        />
        {/* One card with hairlines, not three stacked cards: the answers are one
            document, and three shadows down a column read as three unrelated
            objects. */}
        <SurfaceList>
          {session.answers.map((item) => (
            <div
              className="flex w-full flex-col items-start gap-1 p-3.5"
              key={item.id}
            >
              <p className="w-full text-xs font-normal text-muted-foreground">
                {item.question}
              </p>
              <p className="w-full text-sm font-normal text-foreground">
                <ThaiText>{item.answer}</ThaiText>
              </p>
            </div>
          ))}
        </SurfaceList>
      </div>
    </>
  );
}

/** The same view, for the session named in `?id=`. */
export function SessionDetailFromQuery() {
  const id = useSearchParams().get("id");
  return <SessionDetailView session={sessionDetail(id)} />;
}

/** What the prerender shows, and what a visitor with no id gets. */
export function SessionDetailFallback() {
  return <SessionDetailView session={NEXT_SESSION} />;
}
