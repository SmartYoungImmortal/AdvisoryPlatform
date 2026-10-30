"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarClock, Globe, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { DeleteProfileDialog } from "@/components/availability/delete-profile-dialog";
import { WeekTable } from "@/components/availability/week-table";
import { SiteFooter } from "@/components/marketing/site-footer";
import { EmptyState } from "@/components/mobile/empty-state";
import {
  MobileScreen,
  ScreenBody,
  ScreenTopBar,
} from "@/components/mobile/screen";
import { Surface, surfaceClass } from "@/components/mobile/surface";
import { ThaiText } from "@/components/mobile/thai-text";
import { TopBar } from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { READING_COLUMN, SPLIT_WITH_ASIDE } from "@/lib/layout";
import { cn } from "@/lib/utils";
import { availabilityApi, type AvailabilityProfile } from "@/lib/availability/api";
import { invalidate, useResource } from "@/lib/api/use-resource";
import type { AvailabilityProfileFixture, ProfilesScreenState, Weekday } from "@/lib/availability/profiles";

/**
 * Figma "Back Bar" (1994:28375) and "Head Band" (1994:28378) — the 52px row
 * under the app's nav and the white band the heading sits in, both at the
 * measure the 800px content column sets — which is `READING_COLUMN`, so it is
 * imported rather than spelled out again.
 */
const BACK_BAR = "lg:h-13 lg:bg-card lg:pt-0 lg:pb-0 lg:pl-10 xl:pl-30";
const HEAD_BAND = "w-full shrink-0 lg:border-b lg:border-border lg:bg-card";
const COLUMN = cn(READING_COLUMN, "lg:px-0");

/** How many Services point at a profile at all — the sum the list itself states. */
/** Figma "Note" — the tinted accent strip both states close on. */
function Note({ children }: { readonly children: string }) {
  return (
    <div className={cn("flex w-full shrink-0 flex-col items-start overflow-clip px-6", COLUMN, "lg:pt-4 lg:pb-16")}>
      <div className="flex w-full shrink-0 items-start gap-2 overflow-clip rounded-lg bg-accent-surface px-3 py-2.5">
        <Info className="mt-px size-4 shrink-0 text-muted-foreground" />
        <p className="min-w-px flex-1 text-xs font-normal text-muted-foreground">
          <ThaiText>{children}</ThaiText>
        </p>
      </div>
    </div>
  );
}

/**
 * Figma "Add profile" — a dashed, muted-ground button on its own row.
 *
 * `hover:bg-muted/50` is the row hover everywhere else, but this row's rest state
 * already *is* the muted ground, so it takes the accent tint instead: on a dashed
 * "create" affordance the pointer should say accent, not grey.
 */
function AddProfileButton({ label }: { readonly label: ReactNode }) {
  return (
    <Link
      className="flex w-full shrink-0 items-center justify-center gap-2 overflow-clip rounded-card border border-dashed border-border bg-muted p-3.5 text-sm font-medium text-primary transition-colors hover:bg-accent-surface"
      href="/availability/profiles/new/from-list"
    >
      {label}
    </Link>
  );
}

/**
 * Figma "Profile" — one card per Availability Profile, `raised`: it is an object
 * on the page ground, not a block inside another card.
 *
 * At `lg` the card is 800 wide, and stacked it spent two of its five blocks on
 * air — the timezone row held "Asia/Bangkok" across the full measure and the week
 * put its day 800px from its window. The week moves into the 360px aside from
 * `SPLIT_WITH_ASIDE` and the three text rows keep the main column; the placement
 * is explicit so the phone's reading order (timezone, week, dates, services) is
 * the DOM order at both widths.
 */
function ProfileCard({ profile }: {
  readonly profile: Omit<AvailabilityProfileFixture, "isDefault">;
}) {
  const t = useTranslations("availability");

  return (
    // `surfaceClass` rather than `<Surface>`: the card is an <article>, and the
    // helper is exactly what the component wraps for that case.
    <article
      className={cn(
        surfaceClass(),
        "flex w-full shrink-0 flex-col items-start gap-2.5 overflow-clip p-3.5",
      )}
    >
      <div className="flex w-full shrink-0 items-center gap-2 overflow-clip">
        <h2 className="min-w-px flex-1 text-base font-medium text-foreground">
          {profile.name}
        </h2>
        <Link
          className="shrink-0 text-sm font-medium whitespace-nowrap text-primary transition-colors hover:underline"
          href={`/availability/profiles/edit?id=${encodeURIComponent(profile.id)}`}
        >
          {t("edit")}
        </Link>
        {profile.serviceCount === 0 ? (
          <Link
            className="shrink-0 text-sm font-medium whitespace-nowrap text-destructive transition-colors hover:underline"
            href={`/availability/profiles/delete?id=${encodeURIComponent(profile.id)}`}
          >
            {t("delete")}
          </Link>
        ) : null}
      </div>

      {/* Three auto rows plus a filling one: the week spans them all, and without
          the `1fr` the grid would share the week's extra height out between the
          left column's rows and pull them apart. */}
      <div
        className={cn(
          "flex w-full shrink-0 flex-col items-start gap-2.5",
          SPLIT_WITH_ASIDE,
          "lg:grid-rows-[auto_auto_1fr]",
        )}
      >
        <Surface
          className="flex w-full shrink-0 items-center gap-2 overflow-clip px-3 py-2.5 lg:col-start-1 lg:row-start-1"
          tier="well"
        >
          <Globe className="size-4 shrink-0 text-muted-foreground" />
          <p className="min-w-px flex-1 font-latin text-sm font-normal text-foreground">
            เขตเวลาของอุปกรณ์ · {profile.timezone}
          </p>
        </Surface>

        <WeekTable
          className="lg:col-start-2 lg:row-start-1 lg:row-end-4"
          windows={profile.windows}
        />

        <Link
          className="w-full text-sm font-medium text-primary transition-colors hover:underline lg:col-start-1 lg:row-start-2"
          href={`/availability/profiles/add-date?id=${encodeURIComponent(profile.id)}`}
        >
          {t("addSpecificDate")}
        </Link>
        <p className="w-full text-xs font-normal text-muted-foreground lg:col-start-1 lg:row-start-3">{t("usedByServices", { count: profile.serviceCount })}</p>
      </div>
    </article>
  );
}

/**
 * Figma "Availability - Profiles" (1594:30909), its empty state (1594:31533) and the
 * delete confirmation over it (1594:31904).
 *
 * The delete frame draws the cards condensed to a one-line summary. That is the only
 * place in the section they appear that way, so the cards keep one density here and
 * the dialog simply opens over them — a second card layout for one frame would be a
 * product decision this prototype has no basis for making.
 */
export function ProfilesScreen({
  state = "default",
}: {
  readonly state?: ProfilesScreenState;
}) {
  const t = useTranslations("availability");
  const c = useTranslations("common");
  const router = useRouter();
  const resource = useResource<AvailabilityProfile[]>("availability/profiles", (signal) => availabilityApi.getProfiles(signal));
  const usageResource = useResource<Map<string, number>>("advisors/me/services", (signal) => availabilityApi.getProfileServiceUsage(signal));
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const selectedId = typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("id") ?? "";
  const profiles = resource.data ?? [];
  const isEmpty = !resource.loading && !usageResource.loading && !resource.error && !usageResource.error && profiles.length === 0;
  const selected = profiles.find((profile) => profile.id === selectedId);
  const profileWindows = (profile: AvailabilityProfile): Partial<Record<Weekday, string>> => {
    const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
    const windows: Partial<Record<Weekday, string>> = {};
    days.forEach((day, index) => {
      const ranges = profile.weeklyWindows.filter((window) => window.dayOfWeek === index + 1);
      if (ranges.length) windows[day] = ranges.map((window) => `${window.startTime}–${window.endTime}`).join(", ");
    });
    return windows;
  };
  const remove = async () => {
    if (!selected) return;
    setDeleteError(null);
    try { await availabilityApi.deleteProfile(selected.id); invalidate("availability/profiles"); resource.reload(); router.push("/availability/profiles"); }
    catch (cause) { setDeleteError(cause instanceof Error ? cause.message : "ลบชุดเวลาว่างไม่สำเร็จ"); }
  };

  return (
    // Figma "Desktop / Availability - Profiles (Light)" (1994:28352) and its
    // empty state (1994:28276): the heading becomes a white band, and the cards
    // keep their own surfaces in an 800px column on the grey ground below.
    <MobileScreen wide>
      <div className="hidden w-full lg:block">
        <TopBar unreadNotifications />
      </div>
      <ScreenTopBar className={BACK_BAR} href="/availability" label={c("back")} />

      <ScreenBody className="gap-4 pb-6 lg:gap-0 lg:pb-0">
        <div className={HEAD_BAND}>
          <div className={cn("flex w-full shrink-0 flex-col items-start gap-1.5 overflow-clip px-6", COLUMN, "lg:gap-2 lg:py-5")}>
            <h1 className="w-full text-2xl font-semibold text-foreground lg:text-display">
              {t("profilesTitle")}
            </h1>
            <p className="text-sm font-normal text-muted-foreground">
              <ThaiText>{t("profilesSubtitle")}</ThaiText>
            </p>
            {/* What the list adds up to, stated once. The band at 1440 was a
                full-width white slab holding two lines of text; the figures are
                already in the fixture and every card below repeats a piece of
                them. `lg:` only — the phone's heading is unchanged. */}
          </div>
        </div>

        <div className={cn("flex w-full shrink-0 flex-col items-start gap-2.5 overflow-clip px-6", COLUMN, "lg:pt-12")}>
          {resource.loading || usageResource.loading ? <Surface className="w-full p-6"><p role="status">กำลังโหลดชุดเวลาว่าง…</p></Surface> : resource.error || usageResource.error ? <Surface className="w-full p-6"><p role="alert" className="text-destructive">{(resource.error ?? usageResource.error)?.message}</p><Button variant="link" className="mt-3 h-auto border-0 p-0 text-base font-normal underline" onClick={() => { resource.reload(); usageResource.reload(); }} type="button">ลองอีกครั้ง</Button></Surface> : isEmpty ? (
            /* Figma "Empty" — a single card carrying the centred explanation, now
               the app's one `EmptyState`: same two lines, with the mark and the
               18px title an empty screen is supposed to lead with. */
            <Surface className="w-full shrink-0 overflow-clip">
              <EmptyState
                body={<ThaiText>{t("emptyBody")}</ThaiText>}
                icon={CalendarClock}
                title={t("emptyTitle")}
              />
            </Surface>
          ) : (
            profiles.map((profile) => (
              <ProfileCard key={profile.id} profile={{ id: profile.id, name: profile.name, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, windows: profileWindows(profile), serviceCount: usageResource.data?.get(profile.id) ?? 0 }} />
            ))
          )}

          <AddProfileButton label={t("addProfile")} />
        </div>

        <Note>{isEmpty ? t("emptyNote") : t("profilesNote")}</Note>

        <SiteFooter className="mt-auto hidden lg:flex" />
      </ScreenBody>

      {state === "delete" && selected ? <DeleteProfileDialog profileName={selected.name} error={deleteError} onDelete={() => void remove()} /> : null}
    </MobileScreen>
  );
}
