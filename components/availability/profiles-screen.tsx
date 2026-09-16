import Link from "next/link";
import { Globe, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { DeleteProfileDialog } from "@/components/availability/delete-profile-dialog";
import { WeekTable } from "@/components/availability/week-table";
import {
  MobileScreen,
  ScreenBody,
  ScreenTopBar,
} from "@/components/mobile/screen";
import { ThaiText } from "@/components/mobile/thai-text";
import {
  AVAILABILITY_PROFILES,
  type AvailabilityProfileFixture,
  type ProfilesScreenState,
} from "@/lib/availability/profiles";

/** Figma "Note" — the tinted accent strip both states close on. */
function Note({ children }: { readonly children: string }) {
  return (
    <div className="flex w-full shrink-0 flex-col items-start overflow-clip px-6">
      <div className="flex w-full shrink-0 items-start gap-2 overflow-clip rounded-lg bg-accent-surface px-3 py-2.5">
        <Info className="mt-px size-4 shrink-0 text-muted-foreground" />
        <p className="min-w-px flex-1 text-xs font-normal text-muted-foreground">
          <ThaiText>{children}</ThaiText>
        </p>
      </div>
    </div>
  );
}

/** Figma "Add profile" — a dashed, muted-ground button on its own row. */
function AddProfileButton({ label }: { readonly label: ReactNode }) {
  return (
    <Link
      className="flex w-full shrink-0 items-center justify-center gap-2 overflow-clip rounded-[12px] border border-dashed border-border bg-muted p-3.5 text-sm font-medium text-primary"
      href="/availability/profiles"
    >
      {label}
    </Link>
  );
}

/** Figma "Profile" — one 14px-radius card per Availability Profile. */
function ProfileCard({
  profile,
}: {
  readonly profile: AvailabilityProfileFixture;
}) {
  const t = useTranslations("availability");

  return (
    <article className="flex w-full shrink-0 flex-col items-start gap-2.5 overflow-clip rounded-xl border border-border bg-card p-3.5">
      <div className="flex w-full shrink-0 items-center gap-2 overflow-clip">
        <h2 className="min-w-px flex-1 text-base font-medium text-foreground">
          {profile.name}
        </h2>
        {profile.isDefault ? (
          <span className="flex shrink-0 items-start rounded-full bg-accent-surface px-[9px] py-[3px] text-xs font-normal whitespace-nowrap text-primary">
            {t("defaultBadge")}
          </span>
        ) : null}
        <Link
          className="shrink-0 text-sm font-medium whitespace-nowrap text-primary"
          href="/availability/profiles"
        >
          {t("edit")}
        </Link>
        {/* The default profile is what every Service falls back to, so its delete is
            present but inert — the frame draws it at half opacity rather than hiding
            it, which keeps the two cards' rows the same shape. */}
        {profile.isDefault ? (
          <span className="shrink-0 text-sm font-medium whitespace-nowrap text-muted-foreground opacity-50">
            {t("delete")}
          </span>
        ) : (
          <Link
            className="shrink-0 text-sm font-medium whitespace-nowrap text-destructive"
            href="/availability/profiles/delete"
          >
            {t("delete")}
          </Link>
        )}
      </div>

      <div className="flex w-full shrink-0 items-center gap-2 overflow-clip rounded-lg bg-muted px-3 py-2.5">
        <Globe className="size-4 shrink-0 text-muted-foreground" />
        <p className="min-w-px flex-1 font-latin text-sm font-normal text-foreground">
          {profile.timezone}
        </p>
      </div>

      <WeekTable windows={profile.windows} />

      <Link
        className="w-full text-sm font-medium text-primary"
        href="/availability/profiles"
      >
        {t("addSpecificDate")}
      </Link>
      <p className="w-full text-xs font-normal text-muted-foreground">
        {t("usedByServices", { count: profile.serviceCount })}
      </p>
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
  const isEmpty = state === "empty";

  return (
    <MobileScreen>
      <ScreenTopBar href="/availability" label={c("back")} />

      <ScreenBody className="gap-4 pb-6">
        <div className="flex w-full shrink-0 flex-col items-start gap-1.5 overflow-clip px-6">
          <h1 className="w-full text-2xl font-semibold text-foreground">
            {t("profilesTitle")}
          </h1>
          <p className="text-sm font-normal text-muted-foreground">
            <ThaiText>{t("profilesSubtitle")}</ThaiText>
          </p>
        </div>

        <div className="flex w-full shrink-0 flex-col items-start gap-2.5 overflow-clip px-6">
          {isEmpty ? (
            /* Figma "Empty" — a single card carrying the centred explanation. */
            <div className="flex w-full shrink-0 flex-col items-center gap-1.5 overflow-clip rounded-xl border border-border bg-card px-3.5 py-5 text-center">
              <p className="w-full text-base font-medium text-foreground">
                {t("emptyTitle")}
              </p>
              <p className="w-full text-xs font-normal text-muted-foreground">
                <ThaiText>{t("emptyBody")}</ThaiText>
              </p>
            </div>
          ) : (
            AVAILABILITY_PROFILES.map((profile) => (
              <ProfileCard key={profile.id} profile={profile} />
            ))
          )}

          <AddProfileButton label={t("addProfile")} />
        </div>

        <Note>{isEmpty ? t("emptyNote") : t("profilesNote")}</Note>
      </ScreenBody>

      {state === "delete" ? <DeleteProfileDialog /> : null}
    </MobileScreen>
  );
}
