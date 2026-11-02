"use client";

import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ImagePlus, LoaderCircle, Pencil, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { EntryDialog, TextAreaField, TextField } from "@/components/advisor/edit-fields";
import { authPill } from "@/components/auth/auth-split";
import { useWeekLine } from "@/components/availability/profiles-screen";
import { SETTINGS_DIALOG_ACTIONS, SettingsDialog, settingsPill } from "@/components/profile/settings-dialog";
import { ApiErrorCard } from "@/components/service/parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  MAX_RELATED_SERVICES,
  MAX_SERVICE_IMAGES,
  MAX_SERVICE_PACKAGES,
  deleteAdvisorService,
  listMyAdvisorServices,
  listServiceCategories,
  removeAdvisorServiceImage,
  removeServicePackageImage,
  replaceMyServicePackages,
  updateAdvisorService,
  uploadAdvisorServiceImage,
  uploadServicePackageImage,
  type AdvisorService,
  type AdvisorServicesPage,
  type ServiceCategory,
  type ServicePackageInput,
} from "@/lib/advisor-services/api";
import type { Paginated } from "@/lib/api/client";
import type { ApiServicePackage } from "@/lib/api/types";
import { invalidate, useResource } from "@/lib/api/use-resource";
import { CUSTOM_BOUNDS } from "@/lib/availability";
import { availabilityApi, type AvailabilityProfile, type GlobalAvailability } from "@/lib/availability/api";
import { useLiveCatalogue } from "@/lib/catalogue/live";
import { cn } from "@/lib/utils";

/**
 * The service's editor: one card per part of the page at the left, each
 * showing what it holds now, and the part pressed open at the right, large,
 * with its own save. On the phone the cards are the page and a part opens in
 * their place, with the way back to them above it.
 *
 * Photographs go up and come out at once (they are files, not fields), and a
 * package's picture goes with the package's save; every other part waits for
 * its own "save". The schedule and the further settings have pages of their
 * own, so their cards lead there.
 */

export type Part = "photos" | "text" | "packages" | "category" | "schedule" | "booking" | "related";

const PILL = "h-10 w-auto px-4 text-sm md:h-10 md:px-5 md:text-sm lg:h-12 lg:px-6 lg:text-frame-body";
const FIELD = "h-11 rounded-xl border-accented bg-card px-4 text-base shadow-none md:h-12 md:text-base";
const PICTURE_TYPES = "image/jpeg,image/png,image/webp";
/** The main category and up to two more (`MAX_EXTRA_CATEGORIES`). */
const MAX_CATEGORIES = 3;
const PICTURE_BYTES = 5 * 1024 * 1024;

function messageOf(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

/** Whole baht from a typed string, or `null` when it is not one. */
function bahtOf(typed: string): number | null {
  const value = Number(typed.replace(/[,\s]/g, ""));
  return Number.isFinite(value) && value >= 0 && Number.isInteger(value) ? value : null;
}

/** Minutes from a typed string: a positive whole number, or `null`. */
function minutesOf(typed: string): number | null {
  const value = Number(typed.trim());
  return Number.isInteger(value) && value >= 1 ? value : null;
}

/** A package as `PUT .../packages` takes it, from what the API answered. */
function packageInput(item: ApiServicePackage): ServicePackageInput {
  return {
    id: item.id,
    name: item.name,
    description: item.description ?? undefined,
    durationMinutes: item.durationMinutes,
    priceSatang: item.priceSatang,
  };
}

export function ListingEditor({
  record,
  images,
  packages,
  onChanged,
  initialPart = null,
}: {
  readonly record: AdvisorService;
  readonly images: readonly string[];
  readonly packages: readonly ApiServicePackage[];
  readonly onChanged: () => void;
  /** The part to open with (the settings route opens on the booking rules). */
  readonly initialPart?: Part | null;
}) {
  const t = useTranslations("ownerService");
  const format = useFormatter();
  const weekLine = useWeekLine();
  /** The part open: on the phone none until one is pressed; from `lg` the photographs until another is. */
  const [open, setOpen] = useState<Part | null>(initialPart);
  const [deleting, setDeleting] = useState(false);
  const shown: Part = open ?? "photos";
  const mine = useResource<AdvisorServicesPage>(
    "advisors/me/services?page=1&limit=100",
    useCallback((signal: AbortSignal) => listMyAdvisorServices(signal), []),
  );
  const categories = useResource<Paginated<ServiceCategory>>("service-categories", listServiceCategories);
  const profiles = useResource<AvailabilityProfile[]>("advisors/me/availability/profiles", availabilityApi.getProfiles);
  const names = new Map((mine.data?.items ?? []).map((item) => [item.id, item.name] as const));
  const related = record.relatedServiceIds ?? [];
  const money = (satang: number) => format.number(satang / 100, "baht");
  const profile = profiles.data?.find((item) => item.id === record.availabilityProfileId);
  const packagePrices = packages.map((item) => item.priceSatang);

  const rows: { readonly part: Part; readonly title: string; readonly value: ReactNode; readonly thumbs?: readonly string[] }[] = [
    {
      part: "photos",
      title: t("photosSection"),
      value: images.length > 0 ? t("photosCount", { count: images.length, max: MAX_SERVICE_IMAGES }) : t("photosNoneShort"),
      thumbs: images.slice(0, 3),
    },
    { part: "text", title: t("textSection"), value: record.name },
    {
      part: "packages",
      title: t("pricingSection"),
      value:
        packages.length > 0
          ? t("packagesSummary", { count: packages.length, from: money(Math.min(...packagePrices)), to: money(Math.max(...packagePrices)) })
          : t("priceSummary", { price: money(record.priceSatang), minutes: record.durationMinutes }),
      thumbs: packages.flatMap((item) => (item.image ? [item.image] : [])).slice(0, 3),
    },
    {
      part: "category",
      title: t("categorySection"),
      value: categories.data
        ? [record.categoryId, ...(record.extraCategoryIds ?? [])]
            .map((id) => categories.data?.items.find((item) => item.id === id)?.name)
            .filter(Boolean)
            .join(" · ")
        : "…",
    },
    {
      part: "schedule",
      title: t("scheduleProfileSection"),
      value: !profiles.data ? "…" : profile ? `${profile.name} · ${weekLine(profile)}` : t("scheduleNone"),
    },
    {
      part: "booking",
      title: t("bookingSection"),
      value: [
        record.dailyConsultationLimitMinutes ? t("limitHours", { count: record.dailyConsultationLimitMinutes / 60 }) : t("limitNone"),
        record.screeningRequired ? t("screeningOn") : null,
        record.trialEnabled && record.trialDurationMinutes ? t("trialOn", { count: record.trialDurationMinutes }) : null,
      ]
        .filter(Boolean)
        .join(" · "),
    },
    {
      part: "related",
      title: t("relatedTitle"),
      value: related.length > 0 ? related.map((id) => names.get(id) ?? "…").join(" · ") : t("relatedAutoShort"),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-8 pb-16 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:gap-12">
      <nav aria-label={t("sectionsLabel")} className={cn("flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start", open && "max-lg:hidden")}>
        <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border">
          {rows.map((row) => {
            const selected = shown === row.part;
            return (
              <li key={row.part}>
                <button
                  aria-current={selected ? "true" : undefined}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3.5 text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset lg:px-5",
                    selected ? "bg-muted" : "hover:bg-muted/50",
                  )}
                  onClick={() => setOpen(row.part)}
                  type="button"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-sm font-medium text-foreground lg:text-frame-meta">{row.title}</span>
                    <span className="truncate text-sm text-muted-foreground lg:text-frame-meta">{row.value}</span>
                  </span>
                  {row.thumbs && row.thumbs.length > 0 ? (
                    <span className="flex shrink-0 -space-x-2.5">
                      {row.thumbs.map((src) => (
                        <span className="block size-8 overflow-hidden rounded-lg bg-muted ring-2 ring-card" key={src}>
                          {/* eslint-disable-next-line @next/next/no-img-element -- presigned storage URLs change per read */}
                          <img alt="" className="size-full object-cover" src={src} />
                        </span>
                      ))}
                    </span>
                  ) : null}
                  <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground lg:hidden" />
                </button>
              </li>
            );
          })}
        </ul>
        <Button
          className="h-10 self-start px-2 text-sm font-medium text-muted-foreground hover:bg-transparent hover:text-destructive lg:text-frame-meta"
          onClick={() => setDeleting(true)}
          type="button"
          variant="ghost"
        >
          <Trash2 aria-hidden className="size-4" />
          {t("deleteService")}
        </Button>
      </nav>

      <div className={cn("min-w-0 lg:mx-auto lg:w-full lg:max-w-2xl", !open && "max-lg:hidden")}>
        <Button className="-ml-2 mb-4 h-9 gap-1 px-2 text-sm lg:hidden" onClick={() => setOpen(null)} type="button" variant="ghost">
          <ChevronLeft aria-hidden className="size-5" />
          {t("allSections")}
        </Button>
        {/* Keyed by the part and the record's save, so each opening starts from what is stored. */}
        {shown === "photos" ? <Photos images={images} onChanged={onChanged} serviceId={record.id} /> : null}
        {shown === "text" ? <TextPart key={`text-${record.modifiedAt}`} onSaved={onChanged} record={record} /> : null}
        {shown === "packages" ? <PackagesPart onChanged={onChanged} packages={packages} record={record} /> : null}
        {shown === "category" ? (
          <CategoryPart categories={categories.data?.items ?? null} key={`category-${record.modifiedAt}`} onSaved={onChanged} record={record} />
        ) : null}
        {shown === "schedule" ? (
          <SchedulePart key={`schedule-${record.modifiedAt}`} onSaved={onChanged} profiles={profiles.data ?? null} record={record} />
        ) : null}
        {shown === "booking" ? <BookingPart key={`booking-${record.modifiedAt}`} onSaved={onChanged} record={record} /> : null}
        {shown === "related" ? <RelatedPart key={`related-${record.modifiedAt}`} onSaved={onChanged} record={record} /> : null}
      </div>

      {deleting ? <DeleteServiceConfirm onClose={() => setDeleting(false)} record={record} /> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ frame */

/** A part opened: its name, a line on it, what it holds, and (for a part that waits) its save. */
function Pane({ title, hint, children, footer }: {
  readonly title: string;
  readonly hint?: ReactNode;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-5 lg:gap-6">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-xl font-semibold text-foreground lg:text-frame-heading">{title}</h2>
        {hint ? <p className="text-sm text-muted-foreground lg:text-frame-meta">{hint}</p> : null}
      </div>
      {children}
      {footer}
    </section>
  );
}

/** A part's save: what happened at the left, putting it back and saving at the right. */
function SaveRow({ dirty, saving, problem, saved, onReset }: {
  readonly dirty: boolean;
  readonly saving: boolean;
  readonly problem: string | null;
  readonly saved: boolean;
  readonly onReset: () => void;
}) {
  const t = useTranslations("ownerService");
  let note: string | null = null;
  if (problem) note = problem;
  else if (saved && !dirty) note = t("savedNote");
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
      <p className={cn("text-sm lg:text-frame-meta", problem ? "text-destructive" : "text-success")} role={problem ? "alert" : "status"}>
        {note}
      </p>
      <div className="flex gap-2">
        <Button className={cn(authPill(false), PILL)} disabled={!dirty || saving} onClick={onReset} type="button" variant="outline">
          {t("discard")}
        </Button>
        <Button className={cn(authPill(true), PILL)} disabled={!dirty || saving} type="submit">
          {saving ? t("saving") : t("save")}
        </Button>
      </div>
    </div>
  );
}

/** The state of one part's save: its call, and whether it went. */
function useSave(onSaved: () => void) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const run = (write: () => Promise<unknown>) => {
    setSaving(true);
    setProblem(null);
    void (async () => {
      try {
        await write();
        setSaved(true);
        onSaved();
      } catch (cause: unknown) {
        setProblem(messageOf(cause));
      } finally {
        setSaving(false);
      }
    })();
  };
  return { saving, saved, problem, setProblem, setSaved, run };
}

function Counter({ count, max }: { readonly count: number; readonly max: number }) {
  return (
    <span className={cn("self-end font-latin text-xs tabular-nums lg:text-frame-label", count > max ? "text-destructive" : "text-muted-foreground")}>
      {count}/{max}
    </span>
  );
}

/* ------------------------------------------------------------------ parts */

/** The name and what it covers, as one part: they are read together on the page. */
function TextPart({ record, onSaved }: { readonly record: AdvisorService; readonly onSaved: () => void }) {
  const t = useTranslations("ownerService");
  const storedDescription = record.description ?? "";
  const [name, setName] = useState(record.name);
  const [description, setDescription] = useState(storedDescription);
  const save = useSave(onSaved);
  const dirty = name !== record.name || description !== storedDescription;
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (!name.trim()) return save.setProblem(t("nameRequired"));
        save.run(() => updateAdvisorService(record.id, { name: name.trim(), description: description.trim() }));
      }}
    >
      <Pane
        footer={
          <SaveRow
            dirty={dirty}
            onReset={() => {
              setName(record.name);
              setDescription(storedDescription);
            }}
            {...save}
          />
        }
        title={t("textSection")}
      >
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-muted-foreground" htmlFor="listing-title">
            {t("titleSection")}
          </label>
          <Textarea
            className="min-h-0 resize-none rounded-xl border-accented bg-card px-4 py-3 text-lg font-semibold text-foreground shadow-none md:text-lg lg:text-frame-body"
            id="listing-title"
            maxLength={150}
            onChange={(event) => {
              setName(event.target.value);
              save.setSaved(false);
            }}
            placeholder={t("namePlaceholder")}
            rows={2}
            value={name}
          />
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-muted-foreground">{t("titleHint")}</p>
            <Counter count={name.length} max={150} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-muted-foreground" htmlFor="listing-description">
            {t("descriptionLabel")}
          </label>
          <Textarea
            className="min-h-56 resize-y rounded-xl border-accented bg-card px-4 py-3 text-base leading-relaxed text-foreground shadow-none md:text-base"
            id="listing-description"
            maxLength={5000}
            onChange={(event) => {
              setDescription(event.target.value);
              save.setSaved(false);
            }}
            placeholder={t("descriptionPlaceholder")}
            value={description}
          />
          <Counter count={description.length} max={5000} />
        </div>
      </Pane>
    </form>
  );
}

/** The price and length a service is sold at when it has no packages: the pricing part's form before any. */
function BasePrice({ record, onSaved }: { readonly record: AdvisorService; readonly onSaved: () => void }) {
  const t = useTranslations("ownerService");
  const storedPrice = String(record.priceSatang / 100);
  const storedMinutes = String(record.durationMinutes);
  const [price, setPrice] = useState(storedPrice);
  const [minutes, setMinutes] = useState(storedMinutes);
  const save = useSave(onSaved);
  return (
    <form
      className="flex flex-col gap-5"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const baht = bahtOf(price);
        const length = minutesOf(minutes);
        if (baht === null) return save.setProblem(t("priceInvalid"));
        if (length === null) return save.setProblem(t("minutesInvalid"));
        save.run(() => updateAdvisorService(record.id, { priceSatang: baht * 100, durationMinutes: length }));
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <FieldWithUnit id="listing-price" label={t("priceLabel")} onChange={(value) => { setPrice(value); save.setSaved(false); }} unit={t("bahtUnit")} value={price} />
        <FieldWithUnit id="listing-minutes" label={t("minutesLabel")} onChange={(value) => { setMinutes(value); save.setSaved(false); }} unit={t("minuteUnit")} value={minutes} />
      </div>
      <SaveRow
        dirty={price !== storedPrice || minutes !== storedMinutes}
        onReset={() => {
          setPrice(storedPrice);
          setMinutes(storedMinutes);
        }}
        {...save}
      />
    </form>
  );
}

/** The category clients find the service under, as capsules. */
function CategoryPart({ record, categories, onSaved }: {
  readonly record: AdvisorService;
  readonly categories: readonly ServiceCategory[] | null;
  readonly onSaved: () => void;
}) {
  const t = useTranslations("ownerService");
  /** Main first: the one the service is shown as, then the ones it is also found under. */
  const stored = [record.categoryId, ...(record.extraCategoryIds ?? [])];
  const [chosen, setChosen] = useState<readonly string[]>(stored);
  const save = useSave(onSaved);
  const dirty = chosen.length !== stored.length || chosen.some((id, at) => id !== stored[at]);
  const full = chosen.length >= MAX_CATEGORIES;
  const toggle = (id: string) => {
    // One stays chosen: a service always has its main category.
    if (chosen.includes(id)) {
      if (chosen.length > 1) setChosen(chosen.filter((entry) => entry !== id));
    } else if (!full) setChosen([...chosen, id]);
    save.setSaved(false);
  };
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        save.run(() => updateAdvisorService(record.id, { categoryId: chosen[0], extraCategoryIds: chosen.slice(1) }));
      }}
    >
      <Pane
        footer={<SaveRow dirty={dirty} onReset={() => setChosen(stored)} {...save} />}
        hint={t("categoryHint", { max: MAX_CATEGORIES })}
        title={t("categorySection")}
      >
        {categories ? (
          <div aria-label={t("categorySection")} className="flex flex-wrap gap-2" role="group">
            {categories.map((item) => {
              const place = chosen.indexOf(item.id);
              const picked = place !== -1;
              return (
                <Button
                  aria-pressed={picked}
                  className={cn(
                    "h-10 rounded-full px-4 text-sm font-medium shadow-none lg:h-11 lg:text-frame-meta",
                    picked ? "border-hero-action bg-hero-action text-hero-action-foreground hover:bg-hero-action/90" : "border-border bg-card",
                  )}
                  disabled={!picked && full}
                  key={item.id}
                  onClick={() => toggle(item.id)}
                  type="button"
                  variant="outline"
                >
                  {item.name}
                  {place === 0 ? <span className="text-xs font-normal opacity-80 lg:text-frame-label">· {t("categoryMain")}</span> : null}
                </Button>
              );
            })}
          </div>
        ) : (
          <div aria-busy className="flex flex-wrap gap-2">
            {[0, 1, 2, 3].map((key) => (
              <span className="block h-10 w-28 animate-pulse rounded-full bg-muted" key={key} />
            ))}
          </div>
        )}
      </Pane>
    </form>
  );
}

/** Which schedule the service is booked against: the schedules as rows with their weeks, one chosen. */
function SchedulePart({ record, profiles, onSaved }: {
  readonly record: AdvisorService;
  readonly profiles: readonly AvailabilityProfile[] | null;
  readonly onSaved: () => void;
}) {
  const t = useTranslations("ownerService");
  const weekLine = useWeekLine();
  const stored = record.availabilityProfileId ?? "";
  const [chosen, setChosen] = useState(stored);
  const save = useSave(onSaved);
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (chosen) save.run(() => updateAdvisorService(record.id, { availabilityProfileId: chosen }));
      }}
    >
      <Pane footer={<SaveRow dirty={chosen !== stored} onReset={() => setChosen(stored)} {...save} />} hint={t("scheduleProfileHint")} title={t("scheduleProfileSection")}>
        {profiles === null ? (
          <span aria-busy className="block h-32 w-full animate-pulse rounded-2xl bg-muted" />
        ) : (
          <div className="flex flex-col gap-3">
            {profiles.length > 0 ? (
              <ul aria-label={t("scheduleProfileSection")} className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border" role="radiogroup">
                {profiles.map((item) => (
                  <li key={item.id}>
                    <button
                      aria-checked={chosen === item.id}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-3.5 text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset lg:px-5",
                        chosen === item.id ? "bg-muted" : "hover:bg-muted/50",
                      )}
                      onClick={() => {
                        setChosen(item.id);
                        save.setSaved(false);
                      }}
                      role="radio"
                      type="button"
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded-full border",
                          chosen === item.id ? "border-hero-action" : "border-accented",
                        )}
                      >
                        {chosen === item.id ? <span className="size-2.5 rounded-full bg-hero-action" /> : null}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="text-sm font-medium text-foreground lg:text-frame-meta">{item.name}</span>
                        <span className="truncate text-sm text-muted-foreground lg:text-frame-meta">{weekLine(item) || t("scheduleEmptyWeek")}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground lg:text-frame-meta">{t("noSchedules")}</p>
            )}
            <Button className={cn(authPill(false), PILL, "self-start")} nativeButton={false} render={<Link href="/availability/profiles/new" />} variant="outline">
              <Plus aria-hidden />
              {t("newSchedule")}
            </Button>
          </div>
        )}
      </Pane>
    </form>
  );
}

/** How the service may be booked: a daily ceiling, questions before booking, a free trial. Switch rows on hairlines. */
function BookingPart({ record, onSaved }: { readonly record: AdvisorService; readonly onSaved: () => void }) {
  const t = useTranslations("ownerService");
  const global = useResource<GlobalAvailability>("availability/global", availabilityApi.getGlobal);
  const ceilingHours = Math.floor((global.data?.dailyConsultationLimitMinutes ?? CUSTOM_BOUNDS.dailyLimitHours.max * 60) / 60);
  const storedLimit = record.dailyConsultationLimitMinutes;
  const [limit, setLimit] = useState<number | null>(storedLimit);
  const [screening, setScreening] = useState(record.screeningRequired);
  const [trial, setTrial] = useState<number | null>(record.trialEnabled ? record.trialDurationMinutes : null);
  const save = useSave(onSaved);
  const dirty =
    limit !== storedLimit || screening !== record.screeningRequired || trial !== (record.trialEnabled ? record.trialDurationMinutes : null);
  const reset = () => {
    setLimit(storedLimit);
    setScreening(record.screeningRequired);
    setTrial(record.trialEnabled ? record.trialDurationMinutes : null);
  };
  const touch = () => save.setSaved(false);
  const hours = Array.from({ length: Math.max(ceilingHours, 1) }, (_, index) => index + 1);

  const row = (title: string, body: string, control: ReactNode, below?: ReactNode) => (
    <li className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-4">
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-medium text-foreground lg:text-frame-meta">{title}</span>
          <span className="text-sm text-muted-foreground lg:text-frame-meta">{body}</span>
        </span>
        {control}
      </div>
      {below}
    </li>
  );

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        save.run(() =>
          updateAdvisorService(record.id, {
            dailyConsultationLimitMinutes: limit,
            screeningRequired: screening,
            trialEnabled: trial !== null,
            ...(trial === null ? {} : { trialDurationMinutes: trial }),
          }),
        );
      }}
    >
      <Pane footer={<SaveRow dirty={dirty} onReset={reset} {...save} />} hint={t("bookingHint")} title={t("bookingSection")}>
        <ul className="flex flex-col divide-y divide-border">
          {row(
            t("limitTitle"),
            t("limitBody"),
            <Switch
              aria-label={t("limitTitle")}
              checked={limit !== null}
              onCheckedChange={(on) => {
                setLimit(on ? Math.min(4, ceilingHours) * 60 : null);
                touch();
              }}
            />,
            limit === null ? null : (
              <Choice
                label={t("limitTitle")}
                onChange={(value) => {
                  setLimit(Number(value) * 60);
                  touch();
                }}
                options={hours.map((count) => ({ value: String(count), label: t("limitHours", { count }) }))}
                value={String(limit / 60)}
              />
            ),
          )}
          {row(
            t("screeningTitle"),
            t("screeningBody"),
            <Switch
              aria-label={t("screeningTitle")}
              checked={screening}
              onCheckedChange={(on) => {
                setScreening(on);
                touch();
              }}
            />,
            screening ? (
              <Link className="self-start text-sm font-medium text-foreground underline underline-offset-4 lg:text-frame-meta" href="/screening/setup">
                {t("screeningSetup")}
              </Link>
            ) : null,
          )}
          {row(
            t("trialTitle"),
            t("trialBody"),
            <Switch
              aria-label={t("trialTitle")}
              checked={trial !== null}
              onCheckedChange={(on) => {
                setTrial(on ? 15 : null);
                touch();
              }}
            />,
            trial === null ? null : (
              <Choice
                label={t("trialTitle")}
                onChange={(value) => {
                  setTrial(Number(value));
                  touch();
                }}
                options={[15, 30].map((count) => ({ value: String(count), label: t("trialMinutes", { count }) }))}
                value={String(trial)}
              />
            ),
          )}
        </ul>
      </Pane>
    </form>
  );
}

/** A small set of choices as capsules, one chosen. */
function Choice({ label, value, options, onChange }: {
  readonly label: string;
  readonly value: string;
  readonly options: readonly { readonly value: string; readonly label: string }[];
  readonly onChange: (next: string) => void;
}) {
  return (
    <div aria-label={label} className="flex flex-wrap gap-2" role="radiogroup">
      {options.map((option) => (
        <Button
          aria-checked={value === option.value}
          className={cn(
            "h-9 rounded-full px-3.5 font-latin text-sm shadow-none lg:h-10 lg:text-frame-meta",
            value === option.value ? "border-hero-action bg-hero-action text-hero-action-foreground hover:bg-hero-action/90" : "border-border bg-card",
          )}
          key={option.value}
          onClick={() => onChange(option.value)}
          role="radio"
          type="button"
          variant="outline"
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}

/** Deleting the service, after asking; the services list is where it ends. */
/** Deleting the service, asked the way signing out is (`LogOutDialog`); the services list is where it ends. */
function DeleteServiceConfirm({ record, onClose }: { readonly record: AdvisorService; readonly onClose: () => void }) {
  const t = useTranslations("ownerService");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const remove = () => {
    setBusy(true);
    setFailed(false);
    void (async () => {
      try {
        await deleteAdvisorService(record.id);
        invalidate("advisors/me/services");
        invalidate("services");
        router.push("/advisor/services");
      } catch {
        setFailed(true);
        setBusy(false);
      }
    })();
  };

  return (
    <SettingsDialog
      description={t("deleteBody")}
      onOpenChange={(next) => {
        if (!next && !busy) onClose();
      }}
      open
      title={t("deleteTitle", { name: record.name })}
    >
      {failed ? (
        <p className="mb-3 text-xs text-destructive md:mb-4 md:text-sm" role="alert">
          {t("deleteFailed")}
        </p>
      ) : null}
      <div className={cn(SETTINGS_DIALOG_ACTIONS, "mt-0 md:mt-0")}>
        <Button className={settingsPill("ghost")} disabled={busy} onClick={onClose} type="button" variant="ghost">
          {t("deleteCancel")}
        </Button>
        <Button className={settingsPill("danger")} disabled={busy} onClick={remove} type="button" variant="ghost">
          {busy ? t("deletePending") : t("deleteYes")}
        </Button>
      </div>
    </SettingsDialog>
  );
}

function RelatedPart({ record, onSaved }: { readonly record: AdvisorService; readonly onSaved: () => void }) {
  const t = useTranslations("ownerService");
  const stored = record.relatedServiceIds ?? [];
  const [chosen, setChosen] = useState<readonly string[]>(stored);
  const save = useSave(onSaved);
  const dirty = chosen.length !== stored.length || chosen.some((id, at) => id !== stored[at]);
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        save.run(() => updateAdvisorService(record.id, { relatedServiceIds: chosen }));
      }}
    >
      <Pane
        footer={<SaveRow dirty={dirty} onReset={() => setChosen(stored)} {...save} />}
        hint={t("relatedBody", { max: MAX_RELATED_SERVICES })}
        title={t("relatedTitle")}
      >
        <RelatedPicker
          chosen={chosen}
          onChange={(next) => {
            setChosen(next);
            save.setSaved(false);
          }}
          serviceId={record.id}
        />
      </Pane>
    </form>
  );
}

/* --------------------------------------------------------------- packages */

/**
 * The packages: each a card with its own picture, name, line, price and
 * length, its order changed by its arrows, opened to edit or removed after
 * asking; a new one added from the same dialog.
 */
function PackagesPart({ record, packages, onChanged }: {
  readonly record: AdvisorService;
  readonly packages: readonly ApiServicePackage[];
  readonly onChanged: () => void;
}) {
  const t = useTranslations("ownerService");
  const serviceId = record.id;
  const format = useFormatter();
  const [editing, setEditing] = useState<{ readonly id: string | null } | null>(null);
  const [removing, setRemoving] = useState<ApiServicePackage | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const write = (next: readonly ServicePackageInput[]) => {
    setBusy(true);
    setProblem(null);
    void (async () => {
      try {
        await replaceMyServicePackages(serviceId, next);
        setRemoving(null);
        onChanged();
      } catch (cause: unknown) {
        setProblem(messageOf(cause));
      } finally {
        setBusy(false);
      }
    })();
  };
  const move = (index: number, offset: number) => {
    const next = packages.map(packageInput);
    const [item] = next.splice(index, 1);
    next.splice(index + offset, 0, item);
    write(next);
  };

  return (
    <Pane hint={packages.length > 0 ? t("packagesHint") : t("pricingHintNone")} title={t("pricingSection")}>
      {packages.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {packages.map((item, index) => (
            <li className="flex items-center gap-4 rounded-2xl border border-border p-3 lg:gap-5 lg:p-4" key={item.id}>
              <span className="block aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-xl bg-muted lg:w-32">
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- presigned storage URLs change per read
                  <img alt="" className="size-full object-cover" src={item.image} />
                ) : null}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate text-base font-semibold text-foreground lg:text-frame-body">{item.name}</span>
                {item.description ? <span className="line-clamp-2 text-sm text-muted-foreground lg:text-frame-meta">{item.description}</span> : null}
                <span className="font-latin text-sm text-foreground tabular-nums lg:text-frame-meta">
                  {t("priceSummary", { price: format.number(item.priceSatang / 100, "baht"), minutes: item.durationMinutes })}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-0.5">
                <Button aria-label={t("moveUp", { name: item.name })} className="size-9 rounded-full" disabled={busy || index === 0} onClick={() => move(index, -1)} size="icon" type="button" variant="ghost">
                  <ArrowUp aria-hidden className="size-4" />
                </Button>
                <Button aria-label={t("moveDown", { name: item.name })} className="size-9 rounded-full" disabled={busy || index === packages.length - 1} onClick={() => move(index, 1)} size="icon" type="button" variant="ghost">
                  <ArrowDown aria-hidden className="size-4" />
                </Button>
                <Button aria-label={t("editPackageNamed", { name: item.name })} className="size-9 rounded-full" disabled={busy} onClick={() => setEditing({ id: item.id })} size="icon" type="button" variant="ghost">
                  <Pencil aria-hidden className="size-4" />
                </Button>
                <Button aria-label={t("removePackage", { number: index + 1 })} className="size-9 rounded-full text-muted-foreground hover:text-destructive" disabled={busy} onClick={() => setRemoving(item)} size="icon" type="button" variant="ghost">
                  <Trash2 aria-hidden className="size-4" />
                </Button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        // Without packages the service is sold as itself: its own price and length are the ones to set.
        <BasePrice key={`price-${record.modifiedAt}`} onSaved={onChanged} record={record} />
      )}
      {problem ? (
        <p className="text-sm text-destructive" role="alert">
          {problem}
        </p>
      ) : null}
      {packages.length < MAX_SERVICE_PACKAGES ? (
        <Button className={cn(authPill(false), PILL, "self-start")} disabled={busy} onClick={() => setEditing({ id: null })} type="button" variant="outline">
          <Plus aria-hidden />
          {t("addPackage")}
        </Button>
      ) : null}

      {editing ? (
        <PackageDialog
          entry={editing.id ? (packages.find((item) => item.id === editing.id) ?? null) : null}
          key={editing.id ?? "new"}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            onChanged();
          }}
          packages={packages}
          serviceId={serviceId}
        />
      ) : null}
      {/* Asked the way deleting the service is: the sign-out dialog's card. */}
      {removing ? (
        <SettingsDialog
          description={t("removePackageBody")}
          onOpenChange={(next) => {
            if (!next && !busy) setRemoving(null);
          }}
          open
          title={t("removePackageConfirm", { name: removing.name })}
        >
          {problem ? (
            <p className="mb-3 text-xs text-destructive md:mb-4 md:text-sm" role="alert">
              {problem}
            </p>
          ) : null}
          <div className={cn(SETTINGS_DIALOG_ACTIONS, "mt-0 md:mt-0")}>
            <Button className={settingsPill("ghost")} disabled={busy} onClick={() => setRemoving(null)} type="button" variant="ghost">
              {t("deleteCancel")}
            </Button>
            <Button
              className={settingsPill("danger")}
              disabled={busy}
              onClick={() => write(packages.filter((item) => item.id !== removing.id).map(packageInput))}
              type="button"
              variant="ghost"
            >
              {busy ? t("deletePending") : t("removePackageYes")}
            </Button>
          </div>
        </SettingsDialog>
      ) : null}
    </Pane>
  );
}

/**
 * One package's dialog: its picture (one, its own, or none to wear the
 * service's), its name and line, its price and length. Saving writes the
 * list with it in place, then puts on or takes off its picture.
 */
function PackageDialog({ serviceId, packages, entry, onClose, onSaved }: {
  readonly serviceId: string;
  readonly packages: readonly ApiServicePackage[];
  readonly entry: ApiServicePackage | null;
  readonly onClose: () => void;
  readonly onSaved: () => void;
}) {
  const t = useTranslations("ownerService");
  const picker = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(entry?.name ?? "");
  const [description, setDescription] = useState(entry?.description ?? "");
  const [price, setPrice] = useState(entry ? String(entry.priceSatang / 100) : "");
  const [minutes, setMinutes] = useState(entry ? String(entry.durationMinutes) : "60");
  /** The picture as it will be: what is stored, a new file, or none. */
  const [picture, setPicture] = useState<{ readonly kind: "stored"; readonly src: string } | { readonly kind: "new"; readonly file: File; readonly src: string } | null>(
    entry?.image ? { kind: "stored", src: entry.image } : null,
  );
  const [errors, setErrors] = useState<{ name?: string; price?: string; minutes?: string; picture?: string }>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // A new file's preview is an object URL; it goes when it is replaced and when the dialog does.
  const preview = picture?.kind === "new" ? picture.src : null;
  useEffect(() => (preview ? () => URL.revokeObjectURL(preview) : undefined), [preview]);

  const pick = (files: FileList | null) => {
    const file = files?.[0];
    if (picker.current) picker.current.value = "";
    if (!file) return;
    if (!PICTURE_TYPES.split(",").includes(file.type)) return setErrors((now) => ({ ...now, picture: t("pictureWrongType") }));
    if (file.size > PICTURE_BYTES) return setErrors((now) => ({ ...now, picture: t("pictureTooBig") }));
    setErrors((now) => ({ ...now, picture: undefined }));
    setPicture({ kind: "new", file, src: URL.createObjectURL(file) });
  };

  const submit = () => {
    const baht = bahtOf(price);
    const length = minutesOf(minutes);
    const found: typeof errors = {};
    if (!name.trim()) found.name = t("packageNameRequired");
    if (baht === null) found.price = t("priceInvalid");
    if (length === null) found.minutes = t("minutesInvalid");
    setErrors(found);
    if (baht === null || length === null || Object.keys(found).length > 0) return;
    const written: ServicePackageInput = {
      id: entry?.id,
      name: name.trim(),
      description: description.trim() || undefined,
      durationMinutes: length,
      priceSatang: baht * 100,
    };
    const list = entry ? packages.map((item) => (item.id === entry.id ? written : packageInput(item))) : [...packages.map(packageInput), written];
    setBusy(true);
    setProblem(null);
    void (async () => {
      try {
        const stored = await replaceMyServicePackages(serviceId, list);
        // A new package is the last of the list as stored.
        const id = entry?.id ?? stored.at(-1)?.id;
        if (id && picture?.kind === "new") await uploadServicePackageImage(serviceId, id, picture.file);
        if (id && entry?.image && !picture) await removeServicePackageImage(serviceId, id);
        onSaved();
      } catch (cause: unknown) {
        setProblem(`${t("packageSaveFailed")}: ${messageOf(cause)}`);
        setBusy(false);
      }
    })();
  };

  return (
    <EntryDialog
      busy={busy}
      focusId="package-name"
      onOpenChange={(next) => (next ? null : onClose())}
      onSubmit={submit}
      open
      problem={problem}
      submitLabel={t("savePackage")}
      title={entry ? t("editPackage") : t("addPackage")}
      wide
    >
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-muted-foreground">{t("packagePicture")}</span>
        <div className="flex items-end gap-3">
          <button
            aria-label={picture ? t("changePicture") : t("addImage")}
            className="relative flex aspect-[4/3] w-40 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-accented bg-card text-foreground outline-none transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50"
            disabled={busy}
            onClick={() => picker.current?.click()}
            type="button"
          >
            {picture ? (
              // eslint-disable-next-line @next/next/no-img-element -- a stored URL or a local preview
              <img alt="" className="absolute inset-0 size-full object-cover" src={picture.src} />
            ) : (
              <ImagePlus aria-hidden className="size-6" />
            )}
          </button>
          {picture ? (
            <div className="flex flex-col items-start gap-1">
              <Button className="h-9 px-3 text-sm" disabled={busy} onClick={() => picker.current?.click()} type="button" variant="ghost">
                {t("changePicture")}
              </Button>
              <Button className="h-9 px-3 text-sm text-muted-foreground hover:text-destructive" disabled={busy} onClick={() => setPicture(null)} type="button" variant="ghost">
                <X aria-hidden className="size-4" />
                {t("removePicture")}
              </Button>
            </div>
          ) : null}
        </div>
        <Input accept={PICTURE_TYPES} className="sr-only" onChange={(event) => pick(event.target.files)} ref={picker} tabIndex={-1} type="file" />
        <p className={cn("text-sm", errors.picture ? "text-destructive" : "text-muted-foreground")} role={errors.picture ? "alert" : undefined}>
          {errors.picture ?? t("packagePictureHint")}
        </p>
      </div>
      <TextField error={errors.name} id="package-name" label={t("nameLabel")} onChange={setName} placeholder={t("packageNamePlaceholder")} value={name} />
      <TextAreaField id="package-description" label={t("descriptionLabel")} onChange={setDescription} rows={3} value={description} />
      <div className="grid grid-cols-2 gap-3">
        <FieldWithUnit error={errors.price} id="package-price" label={t("priceLabel")} onChange={setPrice} unit={t("bahtUnit")} value={price} />
        <FieldWithUnit error={errors.minutes} id="package-minutes" label={t("minutesLabel")} onChange={setMinutes} unit={t("minuteUnit")} value={minutes} />
      </div>
    </EntryDialog>
  );
}

function FieldWithUnit({ id, label, value, onChange, unit, error, large = false }: {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly unit: string;
  readonly error?: string;
  readonly large?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-muted-foreground" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <Input
          aria-invalid={error ? true : undefined}
          className={cn(FIELD, "pr-14 font-latin tabular-nums", large && "h-14 text-xl md:h-16 md:text-2xl")}
          id={id}
          inputMode="numeric"
          onChange={(event) => onChange(event.target.value)}
          value={value}
        />
        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-muted-foreground">{unit}</span>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

/* --------------------------------------------------------------- related */

/**
 * Which of the advisor's other services this page shows: their cards, pressed
 * in the order they should appear (the number on each says where), up to
 * three. None chosen leaves the choice to the page (`relatedOf`). A hidden
 * service can be chosen and shows once it is on sale.
 */
function RelatedPicker({ serviceId, chosen, onChange }: {
  readonly serviceId: string;
  readonly chosen: readonly string[];
  readonly onChange: (next: readonly string[]) => void;
}) {
  const t = useTranslations("ownerService");
  const mine = useResource<AdvisorServicesPage>(
    // The services list's own key, so the two share one read.
    "advisors/me/services?page=1&limit=100",
    useCallback((signal: AbortSignal) => listMyAdvisorServices(signal), []),
  );
  const catalogue = useLiveCatalogue();
  const others = (mine.data?.items ?? []).filter((item) => item.id !== serviceId);
  const full = chosen.length >= MAX_RELATED_SERVICES;

  const toggle = (id: string) => onChange(chosen.includes(id) ? chosen.filter((entry) => entry !== id) : [...chosen, id]);

  if (mine.loading && !mine.data) {
    return (
      <div aria-busy className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:gap-5">
        {[0, 1, 2].map((key) => (
          <span className="block aspect-[4/3] w-full animate-pulse rounded-2xl bg-muted" key={key} />
        ))}
      </div>
    );
  }
  if (!mine.data) return <ApiErrorCard error={mine.error ?? new Error(t("loadFailed"))} onRetry={mine.reload} title={t("loadFailed")} />;
  if (others.length === 0) return <p className="text-sm text-muted-foreground lg:text-frame-meta">{t("relatedNone")}</p>;

  return (
    <div className="flex flex-col gap-4">
      {chosen.length > 0 ? (
        <Button className={cn(authPill(false), PILL, "self-start")} onClick={() => onChange([])} type="button" variant="outline">
          {t("relatedAuto")}
        </Button>
      ) : null}
      <ul className="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-3 lg:gap-x-5">
        {others.map((item) => {
          const place = chosen.indexOf(item.id);
          const picked = place !== -1;
          const cover = item.coverImage ?? catalogue.items.find((entry) => entry.id === item.id)?.cover.src;
          return (
            <li key={item.id}>
              <button
                aria-label={t("relatedPick", { name: item.name })}
                aria-pressed={picked}
                className="group flex w-full flex-col gap-2.5 rounded-2xl text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!picked && full}
                onClick={() => toggle(item.id)}
                type="button"
              >
                <span
                  className={cn(
                    "relative block aspect-[4/3] w-full overflow-hidden rounded-2xl bg-muted ring-offset-2 ring-offset-card transition-shadow",
                    picked ? "ring-2 ring-hero-action" : "group-hover:ring-1 group-hover:ring-accented",
                  )}
                >
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element -- presigned or catalogue URLs of mixed hosts
                    <img alt="" className="size-full object-cover" src={cover} />
                  ) : null}
                  {picked ? (
                    <span className="absolute top-2.5 left-2.5 flex size-8 items-center justify-center rounded-full bg-hero-action font-latin text-sm font-semibold text-hero-action-foreground tabular-nums">
                      {place + 1}
                    </span>
                  ) : null}
                </span>
                <span className="flex flex-col gap-0.5 px-0.5">
                  <span className="line-clamp-2 text-base font-medium text-foreground lg:text-frame-body">{item.name}</span>
                  {item.isPublished ? null : <span className="text-sm text-muted-foreground lg:text-frame-meta">{t("relatedHidden")}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {full && others.length > MAX_RELATED_SERVICES ? (
        <p className="text-sm text-muted-foreground lg:text-frame-meta">{t("relatedFull", { max: MAX_RELATED_SERVICES })}</p>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------- photos */

/** The photographs: the cover large, the rest as tiles, each with its remove; a tile to add more. They go at once. */
function Photos({ serviceId, images, onChanged }: {
  readonly serviceId: string;
  readonly images: readonly string[];
  readonly onChanged: () => void;
}) {
  const t = useTranslations("ownerService");
  const picker = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  async function add(files: FileList | null) {
    if (!files || files.length === 0) return;
    setProblem(null);
    const room = MAX_SERVICE_IMAGES - images.length;
    const chosen = [...files].slice(0, Math.max(0, room));
    try {
      for (const [index, file] of chosen.entries()) {
        setBusy(t("uploading", { done: index + 1, total: chosen.length }));
        await uploadAdvisorServiceImage(serviceId, file);
      }
      if (files.length > chosen.length) setProblem(t("tooManyImages", { max: MAX_SERVICE_IMAGES }));
    } catch (cause) {
      setProblem(messageOf(cause));
    } finally {
      setBusy(null);
      if (picker.current) picker.current.value = "";
      onChanged();
    }
  }

  async function remove(index: number) {
    setProblem(null);
    setBusy(t("removing"));
    try {
      await removeAdvisorServiceImage(serviceId, index);
    } catch (cause) {
      setProblem(messageOf(cause));
    } finally {
      setBusy(null);
      onChanged();
    }
  }

  const tile = (src: string, index: number): ReactNode => (
    <div className={cn("group relative overflow-hidden rounded-2xl bg-muted", index === 0 ? "col-span-3 aspect-[4/3]" : "aspect-square")} key={src}>
      {/* eslint-disable-next-line @next/next/no-img-element -- presigned storage URLs change per read */}
      <img alt="" className="size-full object-cover" src={src} />
      {index === 0 ? (
        <span className="absolute top-3 left-3 rounded-full bg-card/90 px-3 py-1 text-xs font-medium text-foreground">{t("coverBadge")}</span>
      ) : null}
      <button
        aria-label={t("removeImage", { number: index + 1 })}
        className="absolute top-2 right-2 flex size-9 items-center justify-center rounded-full bg-card/90 text-foreground opacity-100 shadow-hero-card outline-none transition-opacity focus-visible:ring-3 focus-visible:ring-ring/50 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
        disabled={busy !== null}
        onClick={() => void remove(index)}
        type="button"
      >
        <X aria-hidden className="size-4" />
      </button>
    </div>
  );

  return (
    <Pane
      hint={
        <span className={cn(problem && "text-destructive")} role={problem ? "alert" : undefined}>
          {problem ?? t("photosHint")}
        </span>
      }
      title={t("photosSection")}
    >
      <div className="grid max-w-3xl grid-cols-3 gap-2 lg:gap-3">
        {images.map((src, index) => tile(src, index))}
        {images.length < MAX_SERVICE_IMAGES ? (
          <button
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-accented text-sm font-medium text-foreground outline-none transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60",
              images.length === 0 ? "col-span-3 aspect-[4/3]" : "aspect-square",
            )}
            disabled={busy !== null}
            onClick={() => picker.current?.click()}
            type="button"
          >
            {busy ? <LoaderCircle aria-hidden className="size-6 animate-spin motion-reduce:animate-none" /> : <ImagePlus aria-hidden className="size-6" />}
            <span className="px-2 text-center text-xs lg:text-frame-label">{busy ?? t("addImage")}</span>
          </button>
        ) : null}
      </div>
      <Input accept={PICTURE_TYPES} className="sr-only" multiple onChange={(event) => void add(event.target.files)} ref={picker} tabIndex={-1} type="file" />
      <p className="text-xs text-muted-foreground lg:text-frame-label">{t("photosCount", { count: images.length, max: MAX_SERVICE_IMAGES })}</p>
    </Pane>
  );
}
