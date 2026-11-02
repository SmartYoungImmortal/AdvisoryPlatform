"use client";

import { ArrowDown, ArrowLeft, ArrowUp, ImagePlus, Pencil, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { EntryDialog, TextAreaField, TextField } from "@/components/advisor/edit-fields";
import {
  BookingRules,
  CategoryChoices,
  ClientCard,
  Counter,
  FieldWithUnit,
  Pane,
  PartsLayout,
  RelatedPicker,
  ScheduleChoices,
  type Part,
  type PartRow,
} from "@/components/advisor-services/listing-editor";
import { authPill } from "@/components/auth/auth-split";
import { useWeekLine } from "@/components/availability/profiles-screen";
import { ServiceFrame } from "@/components/service/service-detail-live";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  MAX_RELATED_SERVICES,
  MAX_SERVICE_IMAGES,
  MAX_SERVICE_PACKAGES,
  createAdvisorService,
  listServiceCategories,
  replaceMyServicePackages,
  updateAdvisorService,
  uploadAdvisorServiceImage,
  uploadServicePackageImage,
  type ServiceCategory,
} from "@/lib/advisor-services/api";
import type { Paginated } from "@/lib/api/client";
import { invalidate, useResource } from "@/lib/api/use-resource";
import { availabilityApi, type AvailabilityProfile } from "@/lib/availability/api";
import { cn } from "@/lib/utils";

/**
 * `/advisor/services/new`: a service made on the editor's own frame
 * (`PartsLayout`, the same list at the left and part at the right as a
 * service that exists), with the same parts, held on the page until the bar
 * at the foot makes it — then its photos, packages and their pictures follow
 * and the editor opens on it. Nothing is written before that, so leaving
 * the page leaves nothing behind.
 */

const PILL = "h-10 w-auto px-4 text-sm md:h-10 md:px-5 md:text-sm lg:h-12 lg:px-6 lg:text-frame-body";
const PICTURE_TYPES = "image/jpeg,image/png,image/webp";
const PICTURE_BYTES = 5 * 1024 * 1024;
const MAX_CATEGORIES = 3;

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

/** A photograph chosen and not yet uploaded, with its local preview. */
type NewPhoto = { readonly src: string; readonly file: File };

/** A package as the page holds it, its picture a file not yet uploaded (or none). */
type NewPackage = {
  readonly key: string;
  readonly name: string;
  readonly description: string;
  readonly durationMinutes: number;
  readonly priceSatang: number;
  readonly picture: NewPhoto | null;
};

let keys = 0;
const nextKey = () => `p${(keys += 1)}`;

export function NewServiceScreen() {
  const t = useTranslations("ownerService");
  const e = useTranslations("serviceEditor");
  const format = useFormatter();
  const router = useRouter();
  const weekLine = useWeekLine();
  const categories = useResource<Paginated<ServiceCategory>>("service-categories", listServiceCategories);
  const profiles = useResource<AvailabilityProfile[]>("advisors/me/availability/profiles", availabilityApi.getProfiles);

  const [open, setOpen] = useState<Part | null>(null);
  const shown: Part = open ?? "photos";
  const [photos, setPhotos] = useState<readonly NewPhoto[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [minutes, setMinutes] = useState("60");
  const [packages, setPackages] = useState<readonly NewPackage[]>([]);
  const [chosenCategories, setChosenCategories] = useState<readonly string[]>([]);
  const [profileId, setProfileId] = useState("");
  const [limit, setLimit] = useState<number | null>(null);
  const [screening, setScreening] = useState(false);
  const [trial, setTrial] = useState<number | null>(null);
  const [related, setRelated] = useState<readonly string[]>([]);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  // Previews are object URLs; all of them go with the page.
  const previews = useRef(new Set<string>());
  useEffect(() => {
    const live = previews.current;
    return () => {
      for (const url of live) URL.revokeObjectURL(url);
    };
  }, []);
  const preview = (file: File): NewPhoto => {
    const src = URL.createObjectURL(file);
    previews.current.add(src);
    return { src, file };
  };

  const money = (satang: number) => format.number(satang / 100, "baht");
  const baht = bahtOf(price);
  const length = minutesOf(minutes);
  const cheapest = packages.length > 0 ? packages.reduce((low, item) => (item.priceSatang < low.priceSatang ? item : low)) : null;
  // With packages the service's own price is the cheapest's, as the page shows it; without, the one typed.
  const basePrice = cheapest ? cheapest.priceSatang : baht === null ? null : baht * 100;
  const baseMinutes = cheapest ? cheapest.durationMinutes : length;
  const profile = profiles.data?.find((item) => item.id === profileId);
  const packagePrices = packages.map((item) => item.priceSatang);

  const needed = [
    { label: e("checkName"), done: name.trim().length > 0 },
    { label: e("checkPrice"), done: basePrice !== null && baseMinutes !== null },
    { label: e("checkCategory"), done: chosenCategories.length > 0 },
    { label: e("checkSchedule"), done: Boolean(profileId) },
  ];
  const missing = needed.filter((item) => !item.done);
  const notYet = <span className="text-foreground">{e("notYet")}</span>;

  const rows: PartRow[] = [
    { part: "photos", title: t("photosSection"), value: photos.length > 0 ? t("photosCount", { count: photos.length, max: MAX_SERVICE_IMAGES }) : t("photosNoneShort"), thumbs: photos.slice(0, 3).map((photo) => photo.src) },
    { part: "text", title: t("textSection"), value: name.trim() || notYet },
    {
      part: "packages",
      title: t("pricingSection"),
      value:
        packages.length > 0
          ? t("packagesSummary", { count: packages.length, from: money(Math.min(...packagePrices)), to: money(Math.max(...packagePrices)) })
          : baht !== null && length !== null
            ? t("priceSummary", { price: money(baht * 100), minutes: length })
            : notYet,
      thumbs: packages.flatMap((item) => (item.picture ? [item.picture.src] : [])).slice(0, 3),
    },
    {
      part: "category",
      title: t("categorySection"),
      value:
        chosenCategories.length > 0
          ? chosenCategories.map((id) => categories.data?.items.find((item) => item.id === id)?.name).filter(Boolean).join(" · ")
          : notYet,
    },
    { part: "schedule", title: t("scheduleProfileSection"), value: profile ? `${profile.name} · ${weekLine(profile)}` : notYet },
    {
      part: "booking",
      title: t("bookingSection"),
      value: [
        limit ? t("limitHours", { count: limit / 60 }) : t("limitNone"),
        screening ? t("screeningOn") : null,
        trial ? t("trialOn", { count: trial }) : null,
      ]
        .filter(Boolean)
        .join(" · "),
    },
    { part: "related", title: t("relatedTitle"), value: related.length > 0 ? e("relatedChosen", { count: related.length }) : t("relatedAutoShort") },
  ];

  const create = (publish: boolean) => {
    if (missing.length > 0 || basePrice === null || baseMinutes === null) return;
    setSaving(true);
    setProblem(null);
    void (async () => {
      try {
        const made = await createAdvisorService({
          categoryId: chosenCategories[0],
          extraCategoryIds: chosenCategories.slice(1),
          availabilityProfileId: profileId,
          name: name.trim(),
          description: description.trim(),
          priceSatang: basePrice,
          durationMinutes: baseMinutes,
          dailyConsultationLimitMinutes: limit,
          screeningRequired: screening,
          trialEnabled: trial !== null,
          ...(trial === null ? {} : { trialDurationMinutes: trial }),
          relatedServiceIds: related,
          isPublished: false,
        });
        for (const photo of photos) await uploadAdvisorServiceImage(made.id, photo.file);
        if (packages.length > 0) {
          const stored = await replaceMyServicePackages(
            made.id,
            packages.map((item) => ({
              name: item.name,
              description: item.description || undefined,
              durationMinutes: item.durationMinutes,
              priceSatang: item.priceSatang,
            })),
          );
          // The list comes back in the order sent.
          for (const [at, item] of packages.entries()) {
            const id = stored[at]?.id;
            if (id && item.picture) await uploadServicePackageImage(made.id, id, item.picture.file);
          }
        }
        if (publish) await updateAdvisorService(made.id, { isPublished: true });
        invalidate("advisors/me/services");
        invalidate("services");
        router.push(`/advisor/services/view?serviceId=${encodeURIComponent(made.id)}`);
      } catch (cause: unknown) {
        setProblem(`${e("saveFailed")}: ${cause instanceof Error ? cause.message : String(cause)}`);
        setSaving(false);
      }
    })();
  };

  return (
    <ServiceFrame>
      <div className="mb-6 flex items-center gap-3 lg:mb-9">
        <Link
          aria-label={t("back")}
          className="flex size-10 shrink-0 items-center justify-center rounded-full outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
          href="/advisor/services"
        >
          <ArrowLeft aria-hidden className="size-5" />
        </Link>
        <h1 className="text-xl font-semibold text-foreground lg:text-frame-heading">{e("createTitle")}</h1>
      </div>

      <PartsLayout
        aside={
          <ClientCard
            category={categories.data?.items.find((item) => item.id === chosenCategories[0])?.name ?? null}
            cover={photos[0]?.src ?? null}
            name={name}
            price={
              packages.length > 0
                ? t("fromPrice", { price: money(Math.min(...packagePrices)) })
                : basePrice !== null && baseMinutes !== null
                  ? t("priceSummary", { price: money(basePrice), minutes: baseMinutes })
                  : null
            }
          />
        }
        onOpen={setOpen}
        open={open}
        rows={rows}
        shown={shown}
      >
        {shown === "photos" ? (
          <Pane hint={t("photosHint")} title={t("photosSection")}>
            <PhotoGrid
              onAdd={(files) => setPhotos((now) => [...now, ...files.map(preview)])}
              onRemove={(src) => setPhotos((now) => now.filter((photo) => photo.src !== src))}
              photos={photos}
            />
          </Pane>
        ) : null}
        {shown === "text" ? (
          <Pane title={t("textSection")}>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground" htmlFor="new-title">
                {t("titleSection")}
              </label>
              <Textarea
                className="min-h-0 resize-none rounded-xl border-accented bg-card px-4 py-3 text-lg font-semibold text-foreground shadow-none md:text-lg lg:text-frame-body"
                id="new-title"
                maxLength={150}
                onChange={(event) => setName(event.target.value)}
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
              <label className="text-sm font-medium text-muted-foreground" htmlFor="new-description">
                {t("descriptionLabel")}
              </label>
              <Textarea
                className="min-h-56 resize-y rounded-xl border-accented bg-card px-4 py-3 text-base leading-relaxed text-foreground shadow-none md:text-base"
                id="new-description"
                maxLength={5000}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={t("descriptionPlaceholder")}
                value={description}
              />
              <Counter count={description.length} max={5000} />
            </div>
          </Pane>
        ) : null}
        {shown === "packages" ? (
          <Pane hint={packages.length > 0 ? t("packagesHint") : t("pricingHintNone")} title={t("pricingSection")}>
            {packages.length === 0 ? (
              <div className="grid grid-cols-2 gap-3">
                <FieldWithUnit id="new-price" label={t("priceLabel")} onChange={setPrice} unit={t("bahtUnit")} value={price} />
                <FieldWithUnit id="new-minutes" label={t("minutesLabel")} onChange={setMinutes} unit={t("minuteUnit")} value={minutes} />
              </div>
            ) : null}
            <PackageList onChange={setPackages} packages={packages} preview={preview} />
          </Pane>
        ) : null}
        {shown === "category" ? (
          <Pane hint={t("categoryHint", { max: MAX_CATEGORIES })} title={t("categorySection")}>
            <CategoryChoices categories={categories.data?.items ?? null} chosen={chosenCategories} onChange={setChosenCategories} />
          </Pane>
        ) : null}
        {shown === "schedule" ? (
          <Pane hint={t("scheduleProfileHint")} title={t("scheduleProfileSection")}>
            <ScheduleChoices chosen={profileId} onChange={setProfileId} profiles={profiles.data ?? null} />
          </Pane>
        ) : null}
        {shown === "booking" ? (
          <Pane hint={t("bookingHint")} title={t("bookingSection")}>
            <BookingRules limit={limit} onLimit={setLimit} onScreening={setScreening} onTrial={setTrial} screening={screening} trial={trial} />
          </Pane>
        ) : null}
        {shown === "related" ? (
          <Pane hint={t("relatedBody", { max: MAX_RELATED_SERVICES })} title={t("relatedTitle")}>
            <RelatedPicker chosen={related} onChange={setRelated} serviceId="" />
          </Pane>
        ) : null}
      </PartsLayout>

      {/* The one save: what is still missing, or the two ways to make it. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card">
        <div className="app-scale mx-auto flex w-full max-w-[1658px] flex-wrap items-center justify-between gap-3 px-6 py-3 md:px-12 lg:px-8 lg:py-4">
          <p className={cn("text-sm lg:text-frame-meta", problem ? "text-destructive" : "text-muted-foreground")} role={problem ? "alert" : "status"}>
            {problem ?? (missing.length > 0 ? e("missing", { items: missing.map((item) => item.label).join(", ") }) : e("readyToCreate"))}
          </p>
          <div className="flex gap-2">
            <Button className={cn(authPill(false), PILL)} disabled={saving || missing.length > 0} onClick={() => create(false)} type="button" variant="outline">
              {e("createDraft")}
            </Button>
            <Button className={cn(authPill(true), PILL)} disabled={saving || missing.length > 0 || photos.length === 0} onClick={() => create(true)} type="button">
              {saving ? t("saving") : e("createPublish")}
            </Button>
          </div>
        </div>
      </div>
    </ServiceFrame>
  );
}

/* ------------------------------------------------------------------ parts */

/** The photographs chosen: the cover large, the rest as tiles, each with its remove; a tile to add more. */
function PhotoGrid({ photos, onAdd, onRemove }: {
  readonly photos: readonly NewPhoto[];
  readonly onAdd: (files: File[]) => void;
  readonly onRemove: (src: string) => void;
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
      <div className="grid max-w-3xl grid-cols-3 gap-2 lg:gap-3">
        {photos.map((photo, index) => (
          <div className={cn("group relative overflow-hidden rounded-2xl bg-muted", index === 0 ? "col-span-3 aspect-[4/3]" : "aspect-square")} key={photo.src}>
            {/* eslint-disable-next-line @next/next/no-img-element -- a local preview of a file not yet uploaded */}
            <img alt="" className="size-full object-cover" src={photo.src} />
            {index === 0 ? (
              <span className="absolute top-3 left-3 rounded-full bg-card/90 px-3 py-1 text-xs font-medium text-foreground">{t("coverBadge")}</span>
            ) : null}
            <button
              aria-label={t("removeImage", { number: index + 1 })}
              className="absolute top-2 right-2 flex size-9 items-center justify-center rounded-full bg-card/90 text-foreground shadow-hero-card outline-none transition-opacity focus-visible:ring-3 focus-visible:ring-ring/50 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
              onClick={() => onRemove(photo.src)}
              type="button"
            >
              <X aria-hidden className="size-4" />
            </button>
          </div>
        ))}
        {photos.length < MAX_SERVICE_IMAGES ? (
          <button
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-accented text-sm font-medium text-foreground outline-none transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50",
              photos.length === 0 ? "col-span-3 aspect-[4/3]" : "aspect-square",
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
  readonly packages: readonly NewPackage[];
  readonly onChange: (next: readonly NewPackage[]) => void;
  readonly preview: (file: File) => NewPhoto;
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
                  // eslint-disable-next-line @next/next/no-img-element -- a local preview of a file not yet uploaded
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
  readonly entry: NewPackage | null;
  readonly onClose: () => void;
  readonly onSubmit: (item: NewPackage) => void;
  readonly preview: (file: File) => NewPhoto;
}) {
  const t = useTranslations("ownerService");
  const picker = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(entry?.name ?? "");
  const [description, setDescription] = useState(entry?.description ?? "");
  const [price, setPrice] = useState(entry ? String(entry.priceSatang / 100) : "");
  const [minutes, setMinutes] = useState(entry ? String(entry.durationMinutes) : "60");
  const [picture, setPicture] = useState<NewPhoto | null>(entry?.picture ?? null);
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
    onSubmit({ key: entry?.key ?? nextKey(), name: name.trim(), description: description.trim(), durationMinutes: length, priceSatang: baht * 100, picture });
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
              // eslint-disable-next-line @next/next/no-img-element -- a local preview of a file not yet uploaded
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
