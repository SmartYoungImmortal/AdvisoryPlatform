import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Globe, Info, Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { DeleteServiceDialog } from "@/components/advisor-services/delete-service-dialog";
import { WeekTable } from "@/components/availability/week-table";
import { SiteFooter } from "@/components/marketing/site-footer";
import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import {
  MobileScreen,
  ScreenBody,
  ScreenTopBar,
} from "@/components/mobile/screen";
import { Surface, surfaceClass } from "@/components/mobile/surface";
import { ThaiText } from "@/components/mobile/thai-text";
import { TopBar } from "@/components/topbar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PAGE } from "@/lib/layout";
import { cn } from "@/lib/utils";
import { SLOT_MINUTES, type AdvisorServiceRecord } from "@/lib/advisor-services";
import {
  CREATE_PLACEHOLDERS,
  EDIT_VALUES,
  MAX_SERVICE_IMAGES,
  PREVIEW_TIMEZONE,
  PREVIEW_WEEK,
  PROFILE_OPTIONS,
  SERVICE_CATEGORIES,
  SERVICE_LIMIT,
  type ServiceFormMode,
  type ServiceFormState,
} from "@/lib/advisor-services/form";

/**
 * Figma "Back Bar" — the 52px row under the app's nav, at the page inset, and
 * the white "Head Band" the title sits in above the grey body.
 */
const BACK_BAR = "lg:h-13 lg:bg-card lg:pt-0 lg:pb-0 lg:pl-10 xl:pl-30";
const HEAD_BAND = "w-full shrink-0 lg:border-b lg:border-border lg:bg-card";

/** Figma field label — the form's 14/20 semibold. */
function FieldLabel({
  htmlFor,
  children,
}: {
  readonly htmlFor?: string;
  readonly children: ReactNode;
}) {
  return (
    <label
      className="w-full text-sm font-semibold text-foreground"
      htmlFor={htmlFor}
    >
      {children}
    </label>
  );
}

function FieldBlock({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full shrink-0 flex-col items-start gap-1 overflow-clip",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Figma's plain note — a 14px info glyph and a 12/18 line, no ground. */
function InlineNote({ children }: { readonly children: string }) {
  return (
    <div className="flex w-full shrink-0 items-start gap-2 overflow-clip">
      <Info className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
      <p className="min-w-px flex-1 text-xs font-normal text-muted-foreground">
        <ThaiText>{children}</ThaiText>
      </p>
    </div>
  );
}

/** A note on a tinted ground — the accent one or the muted one. */
function GroundNote({
  tone,
  children,
}: {
  readonly tone: "accent" | "muted";
  readonly children: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full shrink-0 items-start gap-2 overflow-clip rounded-lg px-3 py-2.5",
        tone === "accent" ? "bg-accent-surface" : "bg-muted",
      )}
    >
      <Info className="mt-px size-4 shrink-0 text-muted-foreground" />
      <p className="min-w-px flex-1 text-xs font-normal text-muted-foreground">
        <ThaiText>{children}</ThaiText>
      </p>
    </div>
  );
}

/**
 * Figma "Row" — a card with a title, a caption and a trailing control.
 *
 * The rows that lead somewhere are `Surface interactive`, so the hover lift and
 * the press come from the same place every other tappable card in the app gets
 * them; the ones holding a Switch stay static, because the card is not what you
 * click.
 */
function SettingRow({
  title,
  caption,
  trailing,
  titleClassName,
  href,
}: {
  readonly title: ReactNode;
  readonly caption: string;
  readonly trailing: ReactNode;
  readonly titleClassName?: string;
  readonly href?: string;
}) {
  const body = (
    <>
      <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
        <p
          className={cn(
            "w-full text-sm font-semibold text-foreground",
            titleClassName,
          )}
        >
          {title}
        </p>
        <p className="w-full text-xs font-normal text-muted-foreground">
          <ThaiText>{caption}</ThaiText>
        </p>
      </div>
      {trailing}
    </>
  );
  const className = cn(
    surfaceClass({ interactive: Boolean(href) }),
    "flex w-full shrink-0 items-center gap-3 overflow-clip p-3",
  );

  return href ? (
    <Link className={className} href={href}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

/** A select over a fixed option list, the way the admin console already builds them. */
function OptionSelect({
  id,
  items,
  defaultValue,
  placeholder,
}: {
  readonly id: string;
  readonly items: ReadonlyArray<{ readonly value: string; readonly label: string }>;
  readonly defaultValue?: string;
  readonly placeholder: string;
}) {
  return (
    <Select defaultValue={defaultValue} items={[...items]}>
      <SelectTrigger className="w-full" id={id}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** The chosen profile's timezone and week, previewed under its select. */
function ProfilePreview({ density }: { readonly density: "regular" | "compact" }) {
  const compact = density === "compact";

  return (
    <div className="flex w-full shrink-0 flex-col items-start gap-2 overflow-clip">
      <div
        className={cn(
          "flex w-full shrink-0 items-center gap-2 overflow-clip rounded-lg bg-muted px-3",
          compact ? "py-2" : "py-2.5",
        )}
      >
        <Globe
          className={cn(
            "shrink-0 text-muted-foreground",
            compact ? "size-3.5" : "size-4",
          )}
        />
        <p
          className={cn(
            "min-w-px flex-1 font-latin font-normal text-foreground",
            compact ? "text-xs" : "text-sm",
          )}
        >
          {PREVIEW_TIMEZONE}
        </p>
      </div>
      <WeekTable density={density} windows={PREVIEW_WEEK} />
    </div>
  );
}

/** Figma "+ สร้างชุดเวลาว่างใหม่" — the dashed row under the profile select. */
function CreateProfileRow() {
  const t = useTranslations("serviceForm");

  return (
    <Link
      className="flex w-full shrink-0 items-center justify-center gap-2 overflow-clip rounded-card border border-dashed border-border bg-muted px-3.5 py-3 text-sm font-medium text-primary transition-colors hover:bg-accent-surface"
      href="/availability/profiles/new"
    >
      {t("createProfile")}
    </Link>
  );
}

/** Figma "Image Strip" (edit) — the service's gallery with an add tile trailing. */
function ImageStrip({ record }: { readonly record: AdvisorServiceRecord }) {
  return (
    <div className="flex w-full shrink-0 items-start gap-2 overflow-clip">
      {record.service.gallery.slice(0, 3).map((image) => (
        <Image
          alt=""
          className="h-22 min-w-px flex-1 rounded-card object-cover lg:h-28"
          key={image.src}
          src={image}
        />
      ))}
      <span className="flex h-22 min-w-px flex-1 items-center justify-center overflow-clip rounded-card border border-dashed border-input bg-muted lg:h-28">
        <Plus className="size-4.5 text-muted-foreground" />
      </span>
    </div>
  );
}

/** Figma "Dropzone" (create) — nothing uploaded yet, so the whole row is the target. */
function ImageDropzone() {
  const t = useTranslations("serviceForm");

  return (
    <div className="flex h-30 w-full shrink-0 flex-col items-center justify-center gap-2 overflow-clip rounded-card border border-dashed border-input bg-muted lg:h-36">
      <span className="flex size-9 items-center justify-center rounded-full bg-card">
        <Plus className="size-4.5 text-primary" />
      </span>
      <p className="text-xs font-normal text-muted-foreground">
        {t("addImages", { max: MAX_SERVICE_IMAGES })}
      </p>
    </div>
  );
}

/** Figma "Limit stepper" — the per-service ceiling, adjusted an hour at a time. */
function LimitStepper() {
  const t = useTranslations("serviceForm");

  return (
    <Surface className="flex w-full shrink-0 items-center gap-3 overflow-clip p-3">
      <p className="min-w-px flex-1 text-base font-medium text-foreground">
        {t("limitStepperLabel")}
      </p>
      <div className="flex shrink-0 items-center overflow-clip rounded-lg border border-border bg-muted">
        <span
          aria-hidden
          className="flex size-9 items-center justify-center text-primary"
        >
          <Minus className="size-4" />
        </span>
        <span className="min-w-14 text-center text-sm font-medium text-foreground">
          {t("hours", { count: SERVICE_LIMIT.hours })}
        </span>
        <span
          aria-hidden
          className="flex size-9 items-center justify-center text-primary"
        >
          <Plus className="size-4" />
        </span>
      </div>
    </Surface>
  );
}

/**
 * Figma "Create service" / "Edit service" and the create variants — one form.
 *
 * `create` starts empty and publishes; `edit` starts filled, saves, and is the only
 * mode with the hide/delete zone. The per-mode differences are exactly the ones the
 * frames draw, including two that look like drift but are reproduced as drawn:
 * the slot-length note appears on the default create frame only, and the edit frame
 * previews the profile week at a denser size than create does.
 *
 * With no Availability Profile yet there is nothing a service could be booked
 * against, so publishing is disabled rather than hidden — the Advisor can still save
 * a draft, and the reason sits directly under the empty select.
 */
export function ServiceFormScreen({
  mode,
  state = "default",
  record,
}: {
  readonly mode: ServiceFormMode;
  readonly state?: ServiceFormState;
  readonly record?: AdvisorServiceRecord;
}) {
  const t = useTranslations("serviceForm");
  const c = useTranslations("common");
  const edit = mode === "edit";
  const noProfile = state === "no-profile";
  const limitOn = state === "limit-on";
  const backHref = edit && record
    ? `/advisor/services/${record.serviceId}`
    : "/advisor/services";

  // The pair the phone pins to its bottom edge and the desktop frame parks at the
  // foot of the rail. Written once, placed twice — the bar is the phone's answer
  // to the same need and stops at `lg`.
  const actions = (
    <>
      <NeutralButton className="w-30 shrink-0" href={backHref}>
        {edit ? c("cancel") : t("saveDraft")}
      </NeutralButton>
      <PrimaryButton
        className="min-w-px flex-1"
        disabled={noProfile}
        href={noProfile ? undefined : backHref}
      >
        {edit ? t("saveChanges") : t("publish")}
      </PrimaryButton>
    </>
  );

  return (
    // Figma "Desktop / Create service (Light)" (1998:28438) and "Edit service"
    // (1998:29262): the phone's single column becomes the 788px form beside a
    // 380px rail holding the availability profile it will be booked against —
    // and, at the foot of that rail, the actions the phone pins to its edge.
    <MobileScreen className="pb-0" wide>
      <div className="hidden w-full lg:block">
        <TopBar unreadNotifications />
      </div>
      <ScreenTopBar className={BACK_BAR} href={backHref} label={c("back")} />

      <ScreenBody className="gap-4 pb-6 lg:gap-0 lg:pb-0">
        <div className={HEAD_BAND}>
          <div className={cn("flex w-full shrink-0 flex-col items-start gap-1.5 overflow-clip px-6", PAGE, "lg:py-6")}>
            <h1 className="w-full text-2xl font-semibold text-foreground">
              {edit ? t("editTitle") : t("createTitle")}
            </h1>
            {edit ? null : (
              <p className="text-sm font-normal text-muted-foreground">
                <ThaiText>{t("createSubtitle")}</ThaiText>
              </p>
            )}
          </div>
        </div>

        {/* Figma "Body" (1998:28469). `contents` keeps the phone's one column;
            from `lg` the same blocks fall into the two, and `order` is what
            keeps the profile between the category and the switches on the
            phone while it rides in the rail here. */}
        <div
          className={cn(
            "contents lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-x-8 lg:pt-10 lg:pb-22",
            PAGE,
          )}
        >
        <div className="contents lg:col-start-1 lg:row-start-1 lg:flex lg:flex-col lg:gap-3.5">
        <div className="order-1 flex w-full shrink-0 flex-col items-start gap-2 overflow-clip px-6 lg:px-0">
          <FieldLabel>{t("imagesLabel")}</FieldLabel>
          {edit && record ? <ImageStrip record={record} /> : <ImageDropzone />}
        </div>

        <div className="order-2 flex w-full shrink-0 flex-col items-start gap-3.5 overflow-clip px-6 lg:px-0">
          <FieldBlock>
            <FieldLabel htmlFor="service-name">{t("nameLabel")}</FieldLabel>
            <Input
              className="h-9"
              defaultValue={edit ? record?.service.title : undefined}
              id="service-name"
              placeholder={edit ? undefined : t("namePlaceholder")}
              type="text"
            />
          </FieldBlock>

          <FieldBlock>
            <FieldLabel htmlFor="service-description">
              {t("descriptionLabel")}
            </FieldLabel>
            <Textarea
              className="h-21 resize-y field-sizing-fixed"
              defaultValue={edit ? EDIT_VALUES.description : undefined}
              id="service-description"
              placeholder={edit ? undefined : t("descriptionPlaceholder")}
            />
          </FieldBlock>

          <div className="flex w-full shrink-0 items-start gap-3 overflow-clip">
            <FieldBlock className="min-w-px flex-1">
              <FieldLabel htmlFor="service-price">{t("priceLabel")}</FieldLabel>
              <Input
                className="h-9"
                defaultValue={edit ? EDIT_VALUES.price : undefined}
                id="service-price"
                inputMode="numeric"
                placeholder={edit ? undefined : CREATE_PLACEHOLDERS.price}
                type="text"
              />
            </FieldBlock>
            <FieldBlock className="min-w-px flex-1">
              <FieldLabel htmlFor="service-max-slots">
                {t("maxSlotsLabel")}
              </FieldLabel>
              <Input
                className="h-9"
                defaultValue={edit ? EDIT_VALUES.maxSlots : undefined}
                id="service-max-slots"
                inputMode="numeric"
                placeholder={edit ? undefined : CREATE_PLACEHOLDERS.maxSlots}
                type="text"
              />
            </FieldBlock>
          </div>

          {!edit && state === "default" ? (
            <GroundNote tone="muted">
              {t("slotNote", { minutes: SLOT_MINUTES })}
            </GroundNote>
          ) : null}

          <FieldBlock>
            <FieldLabel htmlFor="service-category">
              {t("categoryLabel")}
            </FieldLabel>
            <OptionSelect
              defaultValue={edit ? EDIT_VALUES.category : undefined}
              id="service-category"
              items={SERVICE_CATEGORIES}
              placeholder={t("categoryPlaceholder")}
            />
          </FieldBlock>
        </div>

        {/* The three switches the phone stacks under the profile select. On the
            desktop frame the profile has moved to the rail, so these close the
            form column instead — `order-4` is what keeps the phone's sequence. */}
        <div className="order-4 flex w-full shrink-0 flex-col items-start gap-3.5 overflow-clip px-6 lg:px-0">
          <div className="flex w-full shrink-0 flex-col items-start gap-2 overflow-clip">
            <SettingRow
              caption={limitOn ? t("limitOnCaption") : t("limitOffCaption")}
              title={
                limitOn
                  ? t("limitOnTitle", { hours: SERVICE_LIMIT.hours })
                  : t("limitOffTitle")
              }
              titleClassName="text-base font-medium"
              trailing={
                <Switch
                  aria-label={t("limitOffTitle")}
                  className="shrink-0"
                  defaultChecked={limitOn}
                />
              }
            />
            {limitOn ? <LimitStepper /> : null}
            <GroundNote tone="accent">
              {limitOn
                ? t("limitOnNote", {
                    global: SERVICE_LIMIT.globalHours,
                    hours: SERVICE_LIMIT.hours,
                  })
                : t("limitOffNote")}
            </GroundNote>
          </div>

          <div className="flex w-full shrink-0 flex-col items-start gap-2 overflow-clip">
            <SettingRow
              caption={t("screeningCaption")}
              title={t("screeningTitle")}
              trailing={
                <Switch
                  aria-label={t("screeningTitle")}
                  className="shrink-0"
                  defaultChecked={edit}
                />
              }
            />
            {edit ? (
              <SettingRow
                caption={t("screeningCount", {
                  count: EDIT_VALUES.screeningQuestionCount,
                })}
                href="/screening/setup"
                title={t("screeningManage")}
                trailing={
                  <ChevronRight className="size-4.5 shrink-0 text-muted-foreground" />
                }
              />
            ) : null}
            <InlineNote>
              {edit ? t("screeningEditNote") : t("screeningCreateNote")}
            </InlineNote>
          </div>

          <div className="flex w-full shrink-0 flex-col items-start gap-2 overflow-clip">
            <SettingRow
              caption={t("trialCaption")}
              title={t("trialTitle")}
              trailing={
                <Switch
                  aria-label={t("trialTitle")}
                  className="shrink-0"
                  defaultChecked={edit}
                />
              }
            />
            {edit ? (
              <>
                <div className="flex w-full shrink-0 flex-col items-start gap-1 overflow-clip">
                  <label
                    className="w-full text-sm font-medium text-foreground"
                    htmlFor="service-trial-profile"
                  >
                    {t("trialProfileLabel")}
                  </label>
                  <OptionSelect
                    defaultValue={EDIT_VALUES.trialProfile}
                    id="service-trial-profile"
                    items={PROFILE_OPTIONS}
                    placeholder={t("noProfilePlaceholder")}
                  />
                  <ProfilePreview density="compact" />
                </div>
                <InlineNote>{t("trialNote")}</InlineNote>
              </>
            ) : null}
          </div>
        </div>

        {edit && record ? (
          /* Figma "Danger Zone" — hiding is reversible and keeps existing bookings;
             deleting is neither, which is why only it opens a confirmation. */
          <div className="order-5 flex w-full shrink-0 flex-col items-start gap-2 overflow-clip px-6 lg:px-0">
            <SettingRow
              caption={t("hideCaption")}
              title={t("hideTitle")}
              trailing={null}
            />
            <SettingRow
              caption={t("deleteCaption")}
              href={`/advisor/services/${record.serviceId}/edit/delete`}
              title={t("deleteTitle")}
              titleClassName="text-destructive"
              trailing={null}
            />
          </div>
        ) : null}
        </div>

        {/* Figma's rail (1998:28470) — the availability profile the service is
            booked against, previewed, with the actions parked under it. */}
        <div className="contents lg:col-start-2 lg:row-start-1 lg:flex lg:flex-col lg:gap-3.5">
          <div className="order-3 flex w-full shrink-0 flex-col items-start gap-1.5 overflow-clip px-6 lg:px-0">
            <label
              className="w-full text-sm font-medium text-foreground"
              htmlFor="service-profile"
            >
              {t("profileLabel")}
            </label>
            <OptionSelect
              defaultValue={noProfile ? undefined : EDIT_VALUES.profile}
              id="service-profile"
              items={noProfile ? [] : PROFILE_OPTIONS}
              placeholder={t("noProfilePlaceholder")}
            />
            {noProfile ? (
              <p className="w-full text-center text-xs font-normal text-muted-foreground">
                <ThaiText>{t("noProfileHint")}</ThaiText>
              </p>
            ) : (
              <ProfilePreview density={edit ? "compact" : "regular"} />
            )}
            <CreateProfileRow />
          </div>

          <div className="order-6 hidden w-full shrink-0 items-center gap-3 lg:flex">
            {actions}
          </div>
        </div>
        </div>

        <SiteFooter className="mt-auto hidden lg:flex" />
      </ScreenBody>

      {/* The desktop rail carries the same pair, so the pinned bar stops here. */}
      <div className="flex w-full shrink-0 items-start gap-3 overflow-clip border-t border-border bg-card px-6 py-3 lg:hidden">
        {actions}
      </div>

      {state === "delete" && record ? (
        <DeleteServiceDialog record={record} />
      ) : null}
    </MobileScreen>
  );
}
