"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { CalendarClock, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { authPill } from "@/components/auth/auth-split";
import { DeleteProfileDialog } from "@/components/availability/delete-profile-dialog";
import { useQueryValue } from "@/components/bookings/booking-flow";
import { ApiErrorCard } from "@/components/service/parts";
import { Button } from "@/components/ui/button";
import { DESK_BOX, DESK_GLYPH, DESK_PILL, DeskPage } from "@/components/work/desk-page";
import { cn } from "@/lib/utils";
import { availabilityApi, type AvailabilityProfile } from "@/lib/availability/api";
import { invalidate, useResource } from "@/lib/api/use-resource";
import type { ProfilesScreenState } from "@/lib/availability/profiles";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

/**
 * A week in a line: neighbouring days with the same hours run together —
 * "จ.–ศ. 09:00–17:00 · ส. 10:00–12:00" — so a schedule reads at a glance.
 */
function useWeekLine(): (profile: AvailabilityProfile) => string {
  const t = useTranslations("schedule");
  return (profile) => {
    const hours = DAYS.map((_, index) =>
      profile.weeklyWindows
        .filter((window) => window.dayOfWeek === index + 1)
        .toSorted((a, b) => a.startTime.localeCompare(b.startTime))
        .map((window) => `${window.startTime.slice(0, 5)}–${window.endTime.slice(0, 5)}`)
        .join(", "),
    );
    const parts: string[] = [];
    let start = 0;
    while (start < DAYS.length) {
      let end = start;
      while (end + 1 < DAYS.length && hours[end + 1] === hours[start]) end += 1;
      if (hours[start]) {
        const days = start === end ? t(`short.${DAYS[start]}`) : `${t(`short.${DAYS[start]}`)}–${t(`short.${DAYS[end]}`)}`;
        parts.push(`${days} ${hours[start]}`);
      }
      start = end + 1;
    }
    return parts.length > 0 ? parts.join(" · ") : t("noWeeklyHours");
  };
}

/**
 * `/availability/profiles`: the advisor's schedules, on the desk's frame —
 * each a row with its week in a line and how many services book from it,
 * opening its editor; a schedule no service uses can be deleted. The way to
 * make another is in the heading.
 */
export function ProfilesScreen({ state = "default" }: { readonly state?: ProfilesScreenState }) {
  const t = useTranslations("schedule");
  const a = useTranslations("availability");
  const router = useRouter();
  const weekLine = useWeekLine();
  const profiles = useResource<AvailabilityProfile[]>(
    "availability/profiles",
    useCallback((signal: AbortSignal) => availabilityApi.getProfiles(signal), []),
  );
  const usage = useResource<Map<string, number>>(
    "advisors/me/services",
    useCallback((signal: AbortSignal) => availabilityApi.getProfileServiceUsage(signal), []),
  );
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const selectedId = useQueryValue("id") ?? "";
  const rows = profiles.data ?? [];
  const selected = rows.find((profile) => profile.id === selectedId);
  const failure = profiles.error ?? usage.error;

  const remove = async () => {
    if (!selected) return;
    setDeleteError(null);
    try {
      await availabilityApi.deleteProfile(selected.id);
      invalidate("availability/profiles");
      invalidate("advisors/me/services");
      invalidate("services/");
      profiles.reload();
      router.push("/availability/profiles");
    } catch (cause) {
      setDeleteError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  return (
    <DeskPage
      action={
        <Button className={cn(authPill(true), DESK_PILL)} nativeButton={false} render={<Link href="/availability/profiles/new" />}>
          <Plus aria-hidden />
          {t("createTitle")}
        </Button>
      }
      backHref="/availability"
      subtitle={t("listSubtitle")}
      title={a("profilesTitle")}
    >
      <div className="mt-5 flex flex-col gap-6 lg:mt-8">
        {failure ? (
          <ApiErrorCard
            error={failure}
            onRetry={() => {
              profiles.reload();
              usage.reload();
            }}
            title={t("loadFailed")}
          />
        ) : !profiles.data || !usage.data ? (
          <div aria-busy className="h-40 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none" />
        ) : rows.length === 0 ? (
          <div className={cn(DESK_BOX, "flex flex-col items-center gap-3 px-6 py-12 text-center lg:gap-5 lg:py-20")}>
            <span className="flex size-11 items-center justify-center rounded-full bg-muted text-hero-ink/75 lg:size-14">
              <CalendarClock aria-hidden className="size-5 lg:size-7" strokeWidth={1.5} />
            </span>
            <div className="flex flex-col items-center gap-1">
              <h2 className="text-base font-semibold text-foreground lg:text-frame-figure">{a("emptyTitle")}</h2>
              <p className="text-xs text-balance text-muted-foreground lg:text-frame-meta">{a("emptyBody")}</p>
            </div>
          </div>
        ) : (
          <ul className={cn(DESK_BOX, "flex flex-col divide-y divide-border")}>
            {rows.map((profile) => {
              const used = usage.data?.get(profile.id) ?? 0;
              return (
                <li className="flex items-center gap-3 px-4 py-4 lg:gap-5 lg:px-6" key={profile.id}>
                  <span className={DESK_GLYPH}>
                    <CalendarClock aria-hidden className="size-4 lg:size-6" strokeWidth={1.75} />
                  </span>
                  <Link
                    className="flex min-w-0 flex-1 flex-col gap-0.5 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50 lg:gap-1"
                    href={`/availability/profiles/edit?id=${encodeURIComponent(profile.id)}`}
                  >
                    <span className="truncate text-sm font-medium text-foreground lg:text-frame-body">{profile.name}</span>
                    <span className="truncate font-latin text-xs text-muted-foreground tabular-nums lg:text-frame-meta">{weekLine(profile)}</span>
                    <span className="text-xs text-muted-foreground lg:text-frame-label">{a("usedByServices", { count: used })}</span>
                  </Link>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      className="h-9 rounded-full px-3 text-sm font-medium"
                      nativeButton={false}
                      render={<Link href={`/availability/profiles/edit?id=${encodeURIComponent(profile.id)}`} />}
                      variant="ghost"
                    >
                      {a("edit")}
                    </Button>
                    {used === 0 ? (
                      <Button
                        className="h-9 rounded-full px-3 text-sm font-medium text-destructive hover:text-destructive"
                        nativeButton={false}
                        render={<Link href={`/availability/profiles/delete?id=${encodeURIComponent(profile.id)}`} />}
                        variant="ghost"
                      >
                        {a("delete")}
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-sm text-muted-foreground lg:text-frame-meta">{a("profilesNote")}</p>
      </div>

      {state === "delete" && selected ? <DeleteProfileDialog error={deleteError} onDelete={() => void remove()} profileName={selected.name} /> : null}
    </DeskPage>
  );
}
