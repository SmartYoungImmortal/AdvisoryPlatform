"use client";

import { ArrowDown, ArrowUp, CalendarRange, ImagePlus, Pencil, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { EntryDialog, TextAreaField, TextField } from "@/components/advisor/edit-fields";
import { authPill } from "@/components/auth/auth-split";
import { useWeekLine } from "@/components/availability/profiles-screen";
import { SETTINGS_DIALOG_ACTIONS, SettingsDialog, settingsPill } from "@/components/profile/settings-dialog";
import { ApiErrorCard } from "@/components/service/parts";
import { ServiceFrame, ServiceView, type DeskHead } from "@/components/service/service-detail-live";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  MAX_RELATED_SERVICES,
  MAX_SERVICE_IMAGES,
  MAX_SERVICE_PACKAGES,
  createAdvisorService,
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
} from "@/lib/advisor-services/api";
import type { Paginated } from "@/lib/api/client";
import type { ApiPublicService, ApiServicePackage } from "@/lib/api/types";
import { invalidate, useResource } from "@/lib/api/use-resource";
import { CUSTOM_BOUNDS } from "@/lib/availability";
import { availabilityApi, type AvailabilityProfile, type GlobalAvailability } from "@/lib/availability/api";
import { useLiveCatalogue } from "@/lib/catalogue/live";
import { cn } from "@/lib/utils";

/**
 * The advisor's service editor, one page for making a service and for
 * changing one: every part one under the other on hairlines, read from the
 * top down to the save at the foot. Everything — photographs,
 * words, packages and their pictures, categories, schedule, booking rules,
 * the other services shown, and whether it is on sale — is held on the page
 * as it is changed, and nothing reaches the API until the bar at the foot
 * says so: for a new service that makes it (then its photos, packages and
 * their pictures follow); for one that exists, its changes, the photos added
 * and taken out, the packages as they now stand, and its sale switch. The
 * client's view shows the page as it is being edited, not as it was saved.
 */

export type Part = "photos" | "text" | "packages" | "category" | "schedule" | "booking" | "related";

const PILL = "h-10 w-auto px-4 text-sm md:h-10 md:px-5 md:text-sm lg:h-12 lg:px-6 lg:text-frame-body";
const FIELD = "h-11 rounded-xl border-accented bg-card px-4 text-base shadow-none md:h-12 md:text-base";
const PICTURE_TYPES = "image/jpeg,image/png,image/webp";
const PICTURE_BYTES = 5 * 1024 * 1024;
/** The main category and up to two more (`MAX_EXTRA_CATEGORIES`). */
const MAX_CATEGORIES = 3;

function messageOf(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

/** Whole baht from a typed string, or `null` when it is not one. */
function bahtOf(typed: string): number | null {
  const value = Number(typed.replace(/[,\s]/g, ""));
  return typed.trim() !== "" && Number.isFinite(value) && value >= 0 && Number.isInteger(value) ? value : null;
}

/** Minutes from a typed string: a positive whole number, or `null`. */
function minutesOf(typed: string): number | null {
  const value = Number(typed.trim());
  return Number.isInteger(value) && value >= 1 ? value : null;
}

/* ------------------------------------------------------------------ draft */

/** A photograph as the page holds it: one stored (its place in the carousel) or a file not yet uploaded. */
type DraftPhoto = { readonly key: string; readonly src: string; readonly index?: number; readonly file?: File };

/** A package as the page holds it; its picture stored (no `file`), new (a `file`), or none. */
type DraftPackage = {
  readonly key: string;
  readonly id?: string;
  readonly name: string;
  readonly description: string;
  readonly durationMinutes: number;
  readonly priceSatang: number;
  readonly picture: { readonly src: string; readonly file?: File } | null;
  readonly hadImage: boolean;
};

type Draft = {
  readonly photos: readonly DraftPhoto[];
  readonly name: string;
  readonly description: string;
  readonly price: string;
  readonly minutes: string;
  readonly packages: readonly DraftPackage[];
  readonly categories: readonly string[];
  readonly profileId: string;
  readonly limit: number | null;
  readonly screening: boolean;
  readonly trial: number | null;
  readonly related: readonly string[];
  readonly published: boolean;
};

let keys = 0;
const nextKey = () => `k${(keys += 1)}`;

function draftOf(record: AdvisorService | null, images: readonly string[], packages: readonly ApiServicePackage[]): Draft {
  return {
    photos: images.map((src, index) => ({ key: src, src, index })),
    name: record?.name ?? "",
    description: record?.description ?? "",
    price: record ? String(record.priceSatang / 100) : "",
    minutes: record ? String(record.durationMinutes) : "60",
    packages: packages.map((item) => ({
      key: item.id,
      id: item.id,
      name: item.name,
      description: item.description ?? "",
      durationMinutes: item.durationMinutes,
      priceSatang: item.priceSatang,
      picture: item.image ? { src: item.image } : null,
      hadImage: Boolean(item.image),
    })),
    categories: record ? [record.categoryId, ...(record.extraCategoryIds ?? [])] : [],
    profileId: record?.availabilityProfileId ?? "",
    limit: record?.dailyConsultationLimitMinutes ?? null,
    screening: record?.screeningRequired ?? false,
    trial: record?.trialEnabled ? record.trialDurationMinutes : null,
    related: record?.relatedServiceIds ?? [],
    published: record?.isPublished ?? false,
  };
}

/** A draft's packages as one string: two that read the same hold the same. */
function packagesOf(draft: Draft): string {
  return JSON.stringify(draft.packages.map((item) => ({ ...item, picture: item.picture?.src ?? null })));
}

/** What a draft holds, as one string, so a change and its undoing compare equal. */
function signature(draft: Draft): string {
  return JSON.stringify({ ...draft, photos: draft.photos.map((photo) => photo.key), packages: packagesOf(draft) });
}

/* ----------------------------------------------------------------- editor */

export function ServiceEditor({
  record = null,
  images = [],
  packages = [],
  initialPart = null,
  onSaved,
}: {
  /** The service as stored; none for a new one. */
  readonly record?: AdvisorService | null;
  readonly images?: readonly string[];
  readonly packages?: readonly ApiServicePackage[];
  /** The part to open with; the old settings route opens on the booking rules. */
  readonly initialPart?: Part | null;
  /** After a save of a service that exists: read it again. */
  readonly onSaved?: () => void;
}) {
  const t = useTranslations("ownerService");
  const e = useTranslations("serviceEditor");
  const router = useRouter();
  const categories = useResource<Paginated<ServiceCategory>>("service-categories", listServiceCategories);
  const profiles = useResource<AvailabilityProfile[]>("advisors/me/availability/profiles", availabilityApi.getProfiles);

  const creating = record === null;
  const [initial, setInitial] = useState<Draft>(() => draftOf(record, images, packages));
  const [draft, setDraft] = useState<Draft>(initial);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Opened on a part (the old settings address opens on the booking rules): the page starts there.
  useEffect(() => {
    if (initialPart) document.getElementById(`part-${initialPart}`)?.scrollIntoView({ block: "start" });
  }, [initialPart]);

  const set =<K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((now) => ({ ...now, [key]: value }));
    setSaved(false);
    setProblem(null);
  };

  // What is stored again, once the page reads the service anew after a save: the draft starts over from it.
  const stamp = record ? `${record.modifiedAt}|${images.join(",")}|${packages.map((item) => `${item.id}:${item.image ?? ""}`).join(",")}` : "new";
  const [seen, setSeen] = useState(stamp);
  if (stamp !== seen) {
    setSeen(stamp);
    const fresh = draftOf(record, images, packages);
    setInitial(fresh);
    setDraft(fresh);
  }

  // Previews of files not yet uploaded are object URLs; all of them go with the page.
  const previews = useRef(new Set<string>());
  useEffect(() => {
    const live = previews.current;
    return () => {
      for (const url of live) URL.revokeObjectURL(url);
    };
  }, []);
  const preview = (file: File) => {
    const src = URL.createObjectURL(file);
    previews.current.add(src);
    return { key: src, src, file };
  };

  const dirty = signature(draft) !== signature(initial);
  const baht = bahtOf(draft.price);
  const length = minutesOf(draft.minutes);
  const cheapest = draft.packages.length > 0 ? draft.packages.reduce((low, item) => (item.priceSatang < low.priceSatang ? item : low)) : null;
  // With packages the service's own price is the cheapest's, as the page shows it; without, the one typed.
  const basePrice = cheapest ? cheapest.priceSatang : baht === null ? null : baht * 100;
  const baseMinutes = cheapest ? cheapest.durationMinutes : length;

  const missing = [
    { label: e("checkName"), done: draft.name.trim().length > 0 },
    { label: e("checkPrice"), done: basePrice !== null && baseMinutes !== null },
    { label: e("checkCategory"), done: draft.categories.length > 0 },
    { label: e("checkSchedule"), done: Boolean(draft.profileId) },
    // A service on sale shows a photograph: the API refuses one without.
    { label: e("checkPhotoToSell"), done: !draft.published || draft.photos.length > 0 },
  ].filter((item) => !item.done);

  async function writePackages(serviceId: string) {
    const stored = await replaceMyServicePackages(
      serviceId,
      draft.packages.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description || undefined,
        durationMinutes: item.durationMinutes,
        priceSatang: item.priceSatang,
      })),
    );
    // The list comes back in the order sent, so a new package is the one at its place.
    for (const [at, item] of draft.packages.entries()) {
      const id = item.id ?? stored[at]?.id;
      if (!id) continue;
      if (item.picture?.file) await uploadServicePackageImage(serviceId, id, item.picture.file);
      else if (item.hadImage && !item.picture) await removeServicePackageImage(serviceId, id);
    }
  }

  const save = (publishNew: boolean) => {
    if (missing.length > 0 || basePrice === null || baseMinutes === null) return;
    setSaving(true);
    setProblem(null);
    const fields = {
      categoryId: draft.categories[0],
      extraCategoryIds: draft.categories.slice(1),
      availabilityProfileId: draft.profileId,
      name: draft.name.trim(),
      description: draft.description.trim(),
      priceSatang: basePrice,
      durationMinutes: baseMinutes,
      dailyConsultationLimitMinutes: draft.limit,
      screeningRequired: draft.screening,
      trialEnabled: draft.trial !== null,
      ...(draft.trial === null ? {} : { trialDurationMinutes: draft.trial }),
      relatedServiceIds: draft.related,
    };
    void (async () => {
      try {
        if (!record) {
          const made = await createAdvisorService({ ...fields, isPublished: false });
          for (const photo of draft.photos) if (photo.file) await uploadAdvisorServiceImage(made.id, photo.file);
          if (draft.packages.length > 0) await writePackages(made.id);
          if (publishNew) await updateAdvisorService(made.id, { isPublished: true });
          invalidate("advisors/me/services");
          invalidate("services");
          router.push(`/advisor/services/view?serviceId=${encodeURIComponent(made.id)}`);
          return;
        }
        // Taken off sale first and put on sale last, so the photos in between never leave it bare.
        if (initial.published && !draft.published) await updateAdvisorService(record.id, { isPublished: false });
        await updateAdvisorService(record.id, fields);
        // New photos first, then the ones taken out, highest place first: the places still to go do not move.
        for (const photo of draft.photos) if (photo.file) await uploadAdvisorServiceImage(record.id, photo.file);
        const kept = new Set(draft.photos.flatMap((photo) => (photo.index === undefined ? [] : [photo.index])));
        const gone = initial.photos.flatMap((photo) => (photo.index !== undefined && !kept.has(photo.index) ? [photo.index] : []));
        for (const index of gone.toSorted((a, b) => b - a)) await removeAdvisorServiceImage(record.id, index);
        if (packagesOf(draft) !== packagesOf(initial)) await writePackages(record.id);
        if (!initial.published && draft.published) await updateAdvisorService(record.id, { isPublished: true });
        setSaved(true);
        onSaved?.();
      } catch (cause: unknown) {
        setProblem(`${e("saveFailed")}: ${messageOf(cause)}`);
      } finally {
        setSaving(false);
      }
    })();
  };

  /** The service as the page now holds it, for the client's view. */
  const previewed: ApiPublicService | null = record
    ? {
        id: record.id,
        advisorId: record.advisorId,
        categoryId: draft.categories[0] ?? record.categoryId,
        extraCategoryIds: draft.categories.slice(1),
        name: draft.name,
        description: draft.description,
        priceSatang: basePrice ?? record.priceSatang,
        durationMinutes: baseMinutes ?? record.durationMinutes,
        screeningRequired: draft.screening,
        trialEnabled: draft.trial !== null,
        trialDurationMinutes: draft.trial,
        relatedServiceIds: draft.related,
        createdAt: record.createdAt,
        images: draft.photos.map((photo) => photo.src),
        packages: draft.packages.map((item) => ({
          id: item.id ?? item.key,
          name: item.name,
          description: item.description || null,
          durationMinutes: item.durationMinutes,
          priceSatang: item.priceSatang,
          image: item.picture?.src ?? null,
        })),
      }
    : null;

  // The desk's band over both modes: back to the services, the service's name (as it is being typed), what it does.
  const head: DeskHead = record
    ? {
        title: draft.name.trim() || record.name,
        backHref: "/advisor/services",
        action: (
          <div className="flex flex-wrap items-center gap-2 lg:shrink-0 lg:gap-3">
            <OwnerControls mode={mode} onMode={setMode} onPublished={(next) => set("published", next)} published={draft.published} serviceId={record.id} />
          </div>
        ),
      }
    : { title: e("createTitle"), backHref: "/advisor/services" };

  // The one save: for a new service always there; for one that exists once something changed (or just saved).
  const footer =
    creating || dirty || saved || problem ? (
      // At the foot of the panel's scroller, the width of the panel; its row on the page's column, clear of the desk's 320 menu.
      <div className="sticky bottom-0 z-40 mt-auto w-full shrink-0 border-t border-border bg-card">
        <div className="app-scale flex w-full flex-wrap items-center justify-between gap-3 px-5 py-3 md:px-10 lg:py-4 lg:pr-12 lg:pl-92">
          <p
            className={cn("text-sm lg:text-frame-meta", problem ? "text-destructive" : saved && !dirty ? "text-success" : "text-muted-foreground")}
            role={problem ? "alert" : "status"}
          >
            {problem ??
              (missing.length > 0
                ? e("missing", { items: missing.map((item) => item.label).join(", ") })
                : saved && !dirty
                  ? t("savedNote")
                  : creating
                    ? e("readyToCreate")
                    : t("unsavedNote"))}
          </p>
          {creating ? (
            <div className="flex gap-2">
              <Button className={cn(authPill(false), PILL)} disabled={saving || missing.length > 0} onClick={() => save(false)} type="button" variant="outline">
                {e("createDraft")}
              </Button>
              <Button className={cn(authPill(true), PILL)} disabled={saving || missing.length > 0 || draft.photos.length === 0} onClick={() => save(true)} type="button">
                {saving ? t("saving") : e("createPublish")}
              </Button>
            </div>
          ) : dirty ? (
            <div className="flex gap-2">
              <Button
                className={cn(authPill(false), PILL)}
                disabled={saving}
                onClick={() => {
                  setDraft(initial);
                  setProblem(null);
                }}
                type="button"
                variant="outline"
              >
                {t("discard")}
              </Button>
              <Button className={cn(authPill(true), PILL)} disabled={saving || missing.length > 0} onClick={() => save(false)} type="button">
                {saving ? t("saving") : t("save")}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    ) : null;

  if (mode === "preview" && previewed) {
    return (
      <ServiceView owner={{ head, intro: null, packages: null, footer }} service={previewed} />
    );
  }

  return (
    <ServiceFrame desk={head} footer={footer}>
      <div className={EDITOR_COLUMN}>
        <Pane part="photos" title={t("photosSection")}>
          <PhotoGrid
            onAdd={(files) => set("photos", [...draft.photos, ...files.map(preview)])}
            onRemove={(key) => set("photos", draft.photos.filter((photo) => photo.key !== key))}
            photos={draft.photos}
          />
        </Pane>
        <Pane part="text" title={t("textSection")}>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground" htmlFor="service-name">
                {t("titleSection")}
              </label>
              <Textarea
                className="min-h-0 resize-none rounded-xl border-accented bg-card px-4 py-3 text-lg font-semibold text-foreground shadow-none md:text-lg lg:text-frame-body"
                id="service-name"
                maxLength={150}
                onChange={(event) => set("name", event.target.value)}
                placeholder={t("namePlaceholder")}
                rows={2}
                value={draft.name}
              />
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-muted-foreground">{t("titleHint")}</p>
                <Counter count={draft.name.length} max={150} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground" htmlFor="service-description">
                {t("descriptionLabel")}
              </label>
              <Textarea
                className="min-h-56 resize-y rounded-xl border-accented bg-card px-4 py-3 text-base leading-relaxed text-foreground shadow-none md:text-base"
                id="service-description"
                maxLength={5000}
                onChange={(event) => set("description", event.target.value)}
                placeholder={t("descriptionPlaceholder")}
                value={draft.description}
              />
              <Counter count={draft.description.length} max={5000} />
            </div>
        </Pane>
        <Pane part="packages" title={t("pricingSection")}>
          {draft.packages.length === 0 ? (
            <div className="grid grid-cols-2 gap-3">
              <FieldWithUnit id="service-price" label={t("priceLabel")} onChange={(value) => set("price", value)} unit={t("bahtUnit")} value={draft.price} />
              <FieldWithUnit id="service-minutes" label={t("minutesLabel")} onChange={(value) => set("minutes", value)} unit={t("minuteUnit")} value={draft.minutes} />
            </div>
          ) : null}
          <PackageList onChange={(next) => set("packages", next)} packages={draft.packages} preview={preview} />
        </Pane>
        <Pane part="category" title={t("categorySection")}>
          <CategoryChoices categories={categories.data?.items ?? null} chosen={draft.categories} onChange={(next) => set("categories", next)} />
        </Pane>
        <Pane part="schedule" title={t("scheduleProfileSection")}>
          <ScheduleChoices
            back={record ? `/advisor/services/view?serviceId=${encodeURIComponent(record.id)}` : "/advisor/services/new"}
            chosen={draft.profileId}
            onChange={(next) => set("profileId", next)}
            profiles={profiles.data ?? null}
          />
        </Pane>
        <Pane part="booking" title={t("bookingSection")}>
          <BookingRules
            limit={draft.limit}
            onLimit={(next) => set("limit", next)}
            onScreening={(next) => set("screening", next)}
            onTrial={(next) => set("trial", next)}
            screening={draft.screening}
            trial={draft.trial}
          />
        </Pane>
        <Pane part="related" title={t("relatedTitle")}>
          <RelatedPicker chosen={draft.related} onChange={(next) => set("related", next)} serviceId={record?.id ?? ""} />
        </Pane>
        {record ? (
          <div className="py-6 lg:py-8">
            <Button
              className="h-10 px-2 text-sm font-medium text-muted-foreground hover:bg-transparent hover:text-destructive lg:text-frame-meta"
              onClick={() => setDeleting(true)}
              type="button"
              variant="ghost"
            >
              <Trash2 aria-hidden className="size-4" />
              {t("deleteService")}
            </Button>
          </div>
        ) : null}
      </div>
      {deleting && record ? <DeleteServiceConfirm onClose={() => setDeleting(false)} record={record} /> : null}
    </ServiceFrame>
  );
}

/** `/advisor/services/new`: the editor with nothing in it yet. */
export function NewServiceScreen() {
  return <ServiceEditor />;
}

/* ------------------------------------------------------------------ frame */

/**
 * What a service that exists adds to the head: the two ways to see it as
 * the desk's capsules, its sale switch (held with the rest until the save),
 * and its schedule.
 */
function OwnerControls({ serviceId, mode, onMode, published, onPublished }: {
  readonly serviceId: string;
  readonly mode: "edit" | "preview";
  readonly onMode: (next: "edit" | "preview") => void;
  readonly published: boolean;
  readonly onPublished: (next: boolean) => void;
}) {
  const t = useTranslations("ownerService");
  return (
    <>
      <div aria-label={t("modeLabel")} className="flex gap-2 lg:gap-3" role="group">
        {(["edit", "preview"] as const).map((option) => (
          <button
            aria-pressed={mode === option}
            className={cn(
              "flex h-9 shrink-0 items-center rounded-full border px-3.5 text-sm font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 lg:h-12 lg:px-5 lg:text-frame-meta",
              mode === option
                ? "border-hero-action bg-hero-action text-hero-action-foreground hover:bg-hero-action/90"
                : "border-border bg-card text-foreground hover:bg-muted",
            )}
            key={option}
            onClick={() => onMode(option)}
            type="button"
          >
            {t(option === "edit" ? "modeEdit" : "modePreview")}
          </button>
        ))}
      </div>
      <label className="flex h-9 items-center gap-2.5 px-1 text-sm text-foreground lg:h-12 lg:text-frame-meta">
        <span className={published ? "text-success" : "text-muted-foreground"}>{published ? t("onSale") : t("hiddenShort")}</span>
        <Switch aria-label={t("publishSwitch")} checked={published} onCheckedChange={onPublished} />
      </label>
      <Button
        className={cn(authPill(false), PILL)}
        nativeButton={false}
        render={<Link href={`/advisor/services/schedule?serviceId=${encodeURIComponent(serviceId)}`} />}
        variant="outline"
      >
        <CalendarRange aria-hidden />
        {t("schedule")}
      </Button>
    </>
  );
}

/** The parts' column: one measure for all of them, so every part ends on the same right edge. */
const EDITOR_COLUMN = "flex w-full max-w-220 flex-col divide-y divide-border";

/**
 * The editor's own shape while the service is read, so nothing shifts when
 * it lands: the band (the way back, the tile, the name), then the first
 * parts as they stand — the photographs' cover and tiles, the name's field,
 * the description's box — each under its name.
 */
export function ServiceEditorSkeleton() {
  const t = useTranslations("ownerService");
  const bone = "animate-pulse bg-muted motion-reduce:animate-none";
  return (
    <ServiceFrame desk={{ backHref: "/advisor/services", title: <span aria-hidden className={cn(bone, "block h-6 w-56 rounded-md lg:h-7")} /> }}>
      <div aria-busy className={EDITOR_COLUMN}>
        <section aria-hidden className="flex flex-col gap-4 py-8 first:pt-0 lg:gap-5 lg:py-10">
          <span className="flex h-lh items-center text-base lg:text-frame-body">
            <span className={cn(bone, "h-4 w-16 rounded")} />
          </span>
          <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,1fr)_minmax(0,1fr)] grid-rows-3 gap-2 lg:gap-3">
            <span className={cn(bone, "row-span-3 rounded-2xl")} />
            {[0, 1, 2, 3, 4].map((tile) => (
              <span className={cn(bone, "aspect-[4/3] rounded-2xl")} key={tile} />
            ))}
          </div>
          <span className="flex h-lh items-center text-xs lg:text-frame-label">
            <span className={cn(bone, "h-3 w-12 rounded")} />
          </span>
        </section>
        {/* The name's field and the description's box, line for line as `TextPart` draws them. */}
        <section aria-hidden className="flex flex-col gap-4 py-8 lg:gap-5 lg:py-10">
          <span className="flex h-lh items-center text-base lg:text-frame-body">
            <span className={cn(bone, "h-4 w-32 rounded")} />
          </span>
          <div className="flex flex-col gap-1.5">
            <span className="flex h-lh items-center text-sm">
              <span className={cn(bone, "h-3 w-16 rounded")} />
            </span>
            <span className={cn(bone, "h-13.5 w-full rounded-xl")} />
            <span className="flex h-lh items-center text-sm">
              <span className={cn(bone, "h-3 w-56 rounded")} />
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="flex h-lh items-center text-sm">
              <span className={cn(bone, "h-3 w-16 rounded")} />
            </span>
            <span className={cn(bone, "h-56 w-full rounded-xl")} />
            <span className="flex h-lh items-center justify-end text-xs lg:text-frame-label">
              <span className={cn(bone, "h-3 w-12 rounded")} />
            </span>
          </div>
        </section>
        {/* Last, so the first part is still the column's first child (its `first:pt-0`). */}
        <span className="sr-only">{t("loading")}</span>
      </div>
    </ServiceFrame>
  );
}

/**
 * One part of the page, one under the other on hairlines: its name a step
 * under the band's title, then what it holds. Its anchor (`part-…`) is where
 * an address that names the part starts the page, clear of the band.
 */
function Pane({ part, title, children }: { readonly part: Part; readonly title: string; readonly children: ReactNode }) {
  return (
    <section aria-labelledby={`part-${part}-title`} className="flex scroll-mt-28 flex-col gap-4 py-8 first:pt-0 lg:gap-5 lg:py-10" id={`part-${part}`}>
      <h2 className="text-base font-semibold text-foreground lg:text-frame-body" id={`part-${part}-title`}>
        {title}
      </h2>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ parts */

function Counter({ count, max }: { readonly count: number; readonly max: number }) {
  return (
    <span className={cn("self-end font-latin text-xs tabular-nums lg:text-frame-label", count > max ? "text-destructive" : "text-muted-foreground")}>
      {count}/{max}
    </span>
  );
}

function FieldWithUnit({ id, label, value, onChange, unit, error }: {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly unit: string;
  readonly error?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-muted-foreground" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <Input
          aria-invalid={error ? true : undefined}
          className={cn(FIELD, "pr-14 font-latin tabular-nums")}
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

/** The photographs: the cover large, the rest as tiles, each with its remove; a tile to add more. */
function PhotoGrid({ photos, onAdd, onRemove }: {
  readonly photos: readonly DraftPhoto[];
  readonly onAdd: (files: File[]) => void;
  readonly onRemove: (key: string) => void;
}) {
  const t = useTranslations("ownerService");
  const picker = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const pick = (files: FileList | null) => {
    // Read before the field is cleared: clearing it empties the list it hands over.
    const chosen = files ? [...files] : [];
    if (picker.current) picker.current.value = "";
    if (chosen.length === 0) return;
    const room = MAX_SERVICE_IMAGES - photos.length;
    const good = chosen.filter((file) => PICTURE_TYPES.split(",").includes(file.type) && file.size <= PICTURE_BYTES);
    if (good.length < chosen.length) setProblem(t("pictureWrongType"));
    else if (good.length > room) setProblem(t("tooManyImages", { max: MAX_SERVICE_IMAGES }));
    else setProblem(null);
    onAdd(good.slice(0, Math.max(0, room)));
  };

  return (
    <>
      {/*
        The cover large at the left over three rows, the rest two to a row
        beside it. The rows take the small tiles' height (the cover is laid
        absolutely, so it adds none), which keeps the cover as tall as the
        three rows whatever few photos are there.
      */}
      <div className={cn("grid gap-2 lg:gap-3", photos.length > 0 && "grid-cols-[minmax(0,3fr)_minmax(0,1fr)_minmax(0,1fr)] grid-rows-3")}>
        {photos.map((photo, index) => (
          <div
            className={cn("group relative overflow-hidden rounded-2xl bg-muted", index === 0 ? "row-span-3" : "aspect-[4/3]")}
            key={photo.key}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- a stored URL or a local preview */}
            <img alt="" className="absolute inset-0 size-full object-cover" src={photo.src} />
            {index === 0 ? (
              <span className="absolute top-3 left-3 rounded-full bg-card/90 px-3 py-1 text-xs font-medium text-foreground">{t("coverBadge")}</span>
            ) : null}
            <button
              aria-label={t("removeImage", { number: index + 1 })}
              className={cn(
                "absolute flex items-center justify-center rounded-full bg-card/90 text-foreground shadow-hero-card outline-none transition-opacity focus-visible:ring-3 focus-visible:ring-ring/50 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100",
                // A small tile's is smaller on the phone, where it always shows; the ring round it keeps it easy to press.
                index === 0
                  ? "top-2.5 right-2.5 size-9"
                  : "top-1 right-1 size-6 before:absolute before:-inset-2 before:content-[''] md:top-1.5 md:right-1.5 md:size-8",
              )}
              onClick={() => onRemove(photo.key)}
              type="button"
            >
              <X aria-hidden className={index === 0 ? "size-4" : "size-3.5 md:size-4"} />
            </button>
          </div>
        ))}
        {photos.length < MAX_SERVICE_IMAGES ? (
          <button
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-accented text-sm font-medium text-foreground outline-none transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50",
              photos.length === 0 ? "aspect-[16/7]" : "aspect-[4/3]",
            )}
            onClick={() => picker.current?.click()}
            type="button"
          >
            <ImagePlus aria-hidden className="size-6" />
            <span className="px-2 text-center text-xs lg:text-frame-label">{t("addImage")}</span>
          </button>
        ) : null}
      </div>
      <Input accept={PICTURE_TYPES} className="sr-only" multiple onChange={(event) => pick(event.target.files)} ref={picker} tabIndex={-1} type="file" />
      <p className={cn("text-xs lg:text-frame-label", problem ? "text-destructive" : "text-muted-foreground")} role={problem ? "alert" : undefined}>
        {problem ?? t("photosCount", { count: photos.length, max: MAX_SERVICE_IMAGES })}
      </p>
    </>
  );
}

/** The packages as cards (picture, name, line, price and length), moved by arrows, opened in a dialog, taken out, or added. */
function PackageList({ packages, onChange, preview }: {
  readonly packages: readonly DraftPackage[];
  readonly onChange: (next: readonly DraftPackage[]) => void;
  readonly preview: (file: File) => { readonly src: string; readonly file: File };
}) {
  const t = useTranslations("ownerService");
  const format = useFormatter();
  const [editing, setEditing] = useState<{ readonly key: string | null } | null>(null);

  const move = (index: number, offset: number) => {
    const next = [...packages];
    const [item] = next.splice(index, 1);
    next.splice(index + offset, 0, item);
    onChange(next);
  };

  return (
    <>
      {packages.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {packages.map((item, index) => (
            <li className="flex items-center gap-4 rounded-2xl border border-border p-3 lg:gap-5 lg:p-4" key={item.key}>
              <span className="block aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-xl bg-muted lg:w-32">
                {item.picture ? (
                  // eslint-disable-next-line @next/next/no-img-element -- a stored URL or a local preview
                  <img alt="" className="size-full object-cover" src={item.picture.src} />
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
                <Button aria-label={t("moveUp", { name: item.name })} className="size-9 rounded-full" disabled={index === 0} onClick={() => move(index, -1)} size="icon" type="button" variant="ghost">
                  <ArrowUp aria-hidden className="size-4" />
                </Button>
                <Button aria-label={t("moveDown", { name: item.name })} className="size-9 rounded-full" disabled={index === packages.length - 1} onClick={() => move(index, 1)} size="icon" type="button" variant="ghost">
                  <ArrowDown aria-hidden className="size-4" />
                </Button>
                <Button aria-label={t("editPackageNamed", { name: item.name })} className="size-9 rounded-full" onClick={() => setEditing({ key: item.key })} size="icon" type="button" variant="ghost">
                  <Pencil aria-hidden className="size-4" />
                </Button>
                <Button
                  aria-label={t("removePackage", { number: index + 1 })}
                  className="size-9 rounded-full text-muted-foreground hover:text-destructive"
                  onClick={() => onChange(packages.filter((entry) => entry.key !== item.key))}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <Trash2 aria-hidden className="size-4" />
                </Button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {packages.length < MAX_SERVICE_PACKAGES ? (
        <Button className={cn(authPill(false), PILL, "self-start")} onClick={() => setEditing({ key: null })} type="button" variant="outline">
          <Plus aria-hidden />
          {t("addPackage")}
        </Button>
      ) : null}
      {editing ? (
        <PackageDialog
          entry={editing.key ? (packages.find((item) => item.key === editing.key) ?? null) : null}
          key={editing.key ?? "new"}
          onClose={() => setEditing(null)}
          onSubmit={(item) => {
            onChange(packages.some((entry) => entry.key === item.key) ? packages.map((entry) => (entry.key === item.key ? item : entry)) : [...packages, item]);
            setEditing(null);
          }}
          preview={preview}
        />
      ) : null}
    </>
  );
}

/** One package's dialog: its own picture (or none, to wear the service's), its name and line, its price and length. */
function PackageDialog({ entry, onClose, onSubmit, preview }: {
  readonly entry: DraftPackage | null;
  readonly onClose: () => void;
  readonly onSubmit: (item: DraftPackage) => void;
  readonly preview: (file: File) => { readonly src: string; readonly file: File };
}) {
  const t = useTranslations("ownerService");
  const picker = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(entry?.name ?? "");
  const [description, setDescription] = useState(entry?.description ?? "");
  const [price, setPrice] = useState(entry ? String(entry.priceSatang / 100) : "");
  const [minutes, setMinutes] = useState(entry ? String(entry.durationMinutes) : "60");
  const [picture, setPicture] = useState(entry?.picture ?? null);
  const [errors, setErrors] = useState<{ name?: string; price?: string; minutes?: string; picture?: string }>({});

  const pick = (files: FileList | null) => {
    const file = files?.[0];
    if (picker.current) picker.current.value = "";
    if (!file) return;
    if (!PICTURE_TYPES.split(",").includes(file.type)) return setErrors((now) => ({ ...now, picture: t("pictureWrongType") }));
    if (file.size > PICTURE_BYTES) return setErrors((now) => ({ ...now, picture: t("pictureTooBig") }));
    setErrors((now) => ({ ...now, picture: undefined }));
    setPicture(preview(file));
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
    onSubmit({
      key: entry?.key ?? nextKey(),
      id: entry?.id,
      name: name.trim(),
      description: description.trim(),
      durationMinutes: length,
      priceSatang: baht * 100,
      picture,
      hadImage: entry?.hadImage ?? false,
    });
  };

  return (
    <EntryDialog
      focusId="package-name"
      onOpenChange={(next) => (next ? null : onClose())}
      onSubmit={submit}
      open
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
              <Button className="h-9 px-3 text-sm" onClick={() => picker.current?.click()} type="button" variant="ghost">
                {t("changePicture")}
              </Button>
              <Button className="h-9 px-3 text-sm text-muted-foreground hover:text-destructive" onClick={() => setPicture(null)} type="button" variant="ghost">
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

/**
 * The categories as capsules, up to three pressed in order: the first is the
 * one the service is shown as (marked so), the rest where it is also found.
 * Once one is chosen one always stays: a service has its main category.
 */
function CategoryChoices({ categories, chosen, onChange }: {
  readonly categories: readonly ServiceCategory[] | null;
  readonly chosen: readonly string[];
  readonly onChange: (next: readonly string[]) => void;
}) {
  const t = useTranslations("ownerService");
  const full = chosen.length >= MAX_CATEGORIES;
  const toggle = (id: string) => {
    if (chosen.includes(id)) {
      if (chosen.length > 1) onChange(chosen.filter((entry) => entry !== id));
    } else if (!full) onChange([...chosen, id]);
  };
  if (!categories) {
    return (
      <div aria-busy className="flex flex-wrap gap-2">
        {[0, 1, 2, 3].map((key) => (
          <span className="block h-10 w-28 animate-pulse rounded-full bg-muted" key={key} />
        ))}
      </div>
    );
  }
  return (
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
  );
}

/** The schedules as rows on hairlines, each its name over its week, one chosen; and the way to make another. */
function ScheduleChoices({ profiles, chosen, onChange, back }: {
  readonly profiles: readonly AvailabilityProfile[] | null;
  readonly chosen: string;
  readonly onChange: (next: string) => void;
  /** This page, where the new schedule's editor comes back to once saved. */
  readonly back: string;
}) {
  const t = useTranslations("ownerService");
  const weekLine = useWeekLine();
  if (profiles === null) return <span aria-busy className="block h-32 w-full animate-pulse rounded-2xl bg-muted" />;
  return (
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
                onClick={() => onChange(item.id)}
                role="radio"
                type="button"
              >
                <span
                  aria-hidden
                  className={cn("flex size-5 shrink-0 items-center justify-center rounded-full border", chosen === item.id ? "border-hero-action" : "border-accented")}
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
      <Button className={cn(authPill(false), PILL, "self-start")} nativeButton={false} render={<Link href={`/availability/profiles/new?back=${encodeURIComponent(back)}`} />} variant="outline">
        <Plus aria-hidden />
        {t("newSchedule")}
      </Button>
    </div>
  );
}

/** The booking rules as switch rows on hairlines: a daily ceiling, questions before booking, a free trial. */
function BookingRules({ limit, screening, trial, onLimit, onScreening, onTrial }: {
  readonly limit: number | null;
  readonly screening: boolean;
  readonly trial: number | null;
  readonly onLimit: (next: number | null) => void;
  readonly onScreening: (next: boolean) => void;
  readonly onTrial: (next: number | null) => void;
}) {
  const t = useTranslations("ownerService");
  const global = useResource<GlobalAvailability>("availability/global", availabilityApi.getGlobal);
  const ceilingHours = Math.floor((global.data?.dailyConsultationLimitMinutes ?? CUSTOM_BOUNDS.dailyLimitHours.max * 60) / 60);
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
    <ul className="flex flex-col divide-y divide-border">
      {row(
        t("limitTitle"),
        t("limitBody"),
        <Switch aria-label={t("limitTitle")} checked={limit !== null} onCheckedChange={(on) => onLimit(on ? Math.min(4, ceilingHours) * 60 : null)} />,
        limit === null ? null : (
          <Choice
            label={t("limitTitle")}
            onChange={(value) => onLimit(Number(value) * 60)}
            options={hours.map((count) => ({ value: String(count), label: t("limitHours", { count }) }))}
            value={String(limit / 60)}
          />
        ),
      )}
      {row(
        t("screeningTitle"),
        t("screeningBody"),
        <Switch aria-label={t("screeningTitle")} checked={screening} onCheckedChange={onScreening} />,
        screening ? (
          <Link className="self-start text-sm font-medium text-foreground underline underline-offset-4 lg:text-frame-meta" href="/screening/setup">
            {t("screeningSetup")}
          </Link>
        ) : null,
      )}
      {row(
        t("trialTitle"),
        t("trialBody"),
        <Switch aria-label={t("trialTitle")} checked={trial !== null} onCheckedChange={(on) => onTrial(on ? 15 : null)} />,
        trial === null ? null : (
          <Choice
            label={t("trialTitle")}
            onChange={(value) => onTrial(Number(value))}
            options={[15, 30].map((count) => ({ value: String(count), label: t("trialMinutes", { count }) }))}
            value={String(trial)}
          />
        ),
      )}
    </ul>
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
