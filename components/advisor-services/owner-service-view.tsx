"use client";

import { ArrowLeft, CalendarRange, ImagePlus, LoaderCircle, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback, useRef, useState, type ReactNode } from "react";

import { authPill } from "@/components/auth/auth-split";
import { LiveServiceDetailSkeleton, ServiceFrame, ServiceView } from "@/components/service/service-detail-live";
import { ApiErrorCard } from "@/components/service/parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  MAX_RELATED_SERVICES,
  MAX_SERVICE_IMAGES,
  MAX_SERVICE_PACKAGES,
  getAdvisorServiceImages,
  getMyAdvisorService,
  listMyAdvisorServices,
  listMyServicePackages,
  removeAdvisorServiceImage,
  replaceMyServicePackages,
  updateAdvisorService,
  uploadAdvisorServiceImage,
  type AdvisorService,
  type AdvisorServicesPage,
} from "@/lib/advisor-services/api";
import type { ApiPublicService, ApiServicePackage } from "@/lib/api/types";
import { invalidate, useResource } from "@/lib/api/use-resource";
import { useLiveCatalogue } from "@/lib/catalogue/live";
import { cn } from "@/lib/utils";

/**
 * `/advisor/services/view`: the advisor's own service, edited on the page
 * itself. Two modes under the owner's bar: **edit**, where the page's parts
 * are the controls — the photographs (add, remove), the name in the title's
 * face, what it covers, the price and length, and the packages as cards —
 * saved together from a bar that appears once something changed; and
 * **preview**, the page exactly as a customer sees it (`ServiceView`).
 *
 * Photographs go up and come out at once (they are files, not fields); the
 * words, packages and the other services the page shows wait for the save.
 * A hidden service shows too, as it will look once on sale.
 */

const PILL = "h-10 w-auto px-4 text-sm md:h-10 md:px-5 md:text-sm lg:h-12 lg:px-6 lg:text-frame-body";

/** A field that reads as the page until it is pointed at or typed in. */
const INLINE =
  "rounded-xl border border-transparent bg-transparent shadow-none transition-colors hover:border-dashed hover:border-accented focus-visible:border-solid focus-visible:border-accented focus-visible:bg-card focus-visible:ring-3 focus-visible:ring-ring/50";

const FIELD = "h-11 rounded-xl border-accented bg-card px-4 text-base shadow-none md:h-12 md:text-base";

/** The owner's records for one service, put together as the public page reads one. */
function useOwnedService(serviceId: string) {
  const record = useResource<AdvisorService>(
    `advisors/me/services/${serviceId}`,
    useCallback((signal: AbortSignal) => getMyAdvisorService(serviceId, signal), [serviceId]),
  );
  const images = useResource<{ images: string[] }>(
    `advisors/me/services/${serviceId}/images`,
    useCallback((signal: AbortSignal) => getAdvisorServiceImages(serviceId, signal), [serviceId]),
  );
  const packages = useResource<ApiServicePackage[]>(
    `advisors/me/services/${serviceId}/packages`,
    useCallback((signal: AbortSignal) => listMyServicePackages(serviceId, signal), [serviceId]),
  );
  const reload = () => {
    // The public page and the lists read the same service under their own keys.
    invalidate(`services/${serviceId}`);
    invalidate("advisors/me/services");
    invalidate("services?");
    record.reload();
    images.reload();
    packages.reload();
  };
  const service: ApiPublicService | undefined =
    record.data && images.data && packages.data
      ? {
          id: record.data.id,
          advisorId: record.data.advisorId,
          categoryId: record.data.categoryId,
          name: record.data.name,
          description: record.data.description ?? "",
          priceSatang: record.data.priceSatang,
          durationMinutes: record.data.durationMinutes,
          screeningRequired: record.data.screeningRequired,
          trialEnabled: record.data.trialEnabled,
          trialDurationMinutes: record.data.trialDurationMinutes,
          relatedServiceIds: record.data.relatedServiceIds,
          createdAt: record.data.createdAt,
          images: images.data.images,
          packages: packages.data,
        }
      : undefined;
  return { record, images, packages, service, reload, error: record.error ?? images.error ?? packages.error };
}

export function OwnerServiceScreen({ serviceId }: { readonly serviceId: string }) {
  const t = useTranslations("ownerService");
  const owned = useOwnedService(serviceId);
  const [mode, setMode] = useState<"edit" | "preview">("edit");

  if (owned.error) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-6 py-16">
        <ApiErrorCard error={owned.error} onRetry={owned.reload} title={t("loadFailed")} />
        <Button className={cn(authPill(false), PILL)} nativeButton={false} render={<Link href="/advisor/services" />} variant="outline">
          {t("back")}
        </Button>
      </div>
    );
  }
  if (!owned.service || !owned.record.data || !owned.images.data || !owned.packages.data) return <LiveServiceDetailSkeleton />;

  const bar = <OwnerBar mode={mode} onChanged={owned.reload} onMode={setMode} record={owned.record.data} />;
  if (mode === "preview") return <ServiceView owner={{ bar, intro: null, packages: null }} service={owned.service} />;
  return (
    <ServiceFrame>
      {bar}
      <Editor
        images={owned.images.data.images}
        key={`${owned.record.data.modifiedAt}-${owned.packages.data.length}`}
        onImages={owned.reload}
        onSaved={owned.reload}
        packages={owned.packages.data}
        record={owned.record.data}
      />
    </ServiceFrame>
  );
}

/* ------------------------------------------------------------------- bar */

/**
 * Above the page: the way back, the two modes, whether it is open for booking
 * (and the switch that changes it), and its schedule.
 */
function OwnerBar({ record, mode, onMode, onChanged }: {
  readonly record: AdvisorService;
  readonly mode: "edit" | "preview";
  readonly onMode: (next: "edit" | "preview") => void;
  readonly onChanged: () => void;
}) {
  const t = useTranslations("ownerService");
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  async function setPublished(next: boolean) {
    setSaving(true);
    setFailure(null);
    try {
      await updateAdvisorService(record.id, { isPublished: next });
      onChanged();
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-border px-4 py-3.5 md:flex-row md:items-center md:justify-between md:gap-5 lg:mb-9 lg:px-6 lg:py-4">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          aria-label={t("back")}
          className="flex size-10 shrink-0 items-center justify-center rounded-full outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
          href="/advisor/services"
        >
          <ArrowLeft aria-hidden className="size-5" />
        </Link>
        <div aria-label={t("modeLabel")} className="flex rounded-full bg-muted p-1" role="group">
          {(["edit", "preview"] as const).map((option) => (
            <button
              aria-pressed={mode === option}
              className={cn(
                "h-9 rounded-full px-4 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 lg:h-10 lg:px-5 lg:text-frame-meta",
                mode === option ? "bg-card text-foreground shadow-hero-card" : "text-muted-foreground hover:text-foreground",
              )}
              key={option}
              onClick={() => onMode(option)}
              type="button"
            >
              {t(option === "edit" ? "modeEdit" : "modePreview")}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 md:justify-end lg:gap-3">
        <label className="flex h-10 items-center gap-2.5 rounded-full border border-border px-4 text-sm text-foreground lg:h-12 lg:px-5 lg:text-frame-meta">
          <span className={record.isPublished ? "text-success" : "text-muted-foreground"}>
            {record.isPublished ? t("onSale") : t("hiddenShort")}
          </span>
          <Switch aria-label={t("publishSwitch")} checked={record.isPublished} disabled={saving} onCheckedChange={(next) => void setPublished(next)} />
        </label>
        <Button
          className={cn(authPill(false), PILL)}
          nativeButton={false}
          render={<Link href={`/advisor/services/schedule?serviceId=${encodeURIComponent(record.id)}`} />}
          variant="outline"
        >
          <CalendarRange aria-hidden />
          {t("schedule")}
        </Button>
        <Button
          className={cn(authPill(false), PILL)}
          nativeButton={false}
          render={<Link href={`/advisor/services/manage?serviceId=${encodeURIComponent(record.id)}`} />}
          variant="outline"
        >
          {t("moreSettings")}
        </Button>
      </div>
      {failure ? (
        <p className="text-sm text-destructive md:basis-full" role="alert">
          {failure}
        </p>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------- editor */

type PackageDraft = { readonly key: string; readonly id?: string; name: string; description: string; minutes: string; price: string };

let draftKeys = 0;
function packageDraft(item?: ApiServicePackage): PackageDraft {
  draftKeys += 1;
  return {
    key: `p${draftKeys}`,
    id: item?.id,
    name: item?.name ?? "",
    description: item?.description ?? "",
    minutes: item ? String(item.durationMinutes) : "60",
    price: item ? String(item.priceSatang / 100) : "",
  };
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

function Editor({ record, images, packages, onImages, onSaved }: {
  readonly record: AdvisorService;
  readonly images: readonly string[];
  readonly packages: readonly ApiServicePackage[];
  readonly onImages: () => void;
  readonly onSaved: () => void;
}) {
  const t = useTranslations("ownerService");
  const [name, setName] = useState(record.name);
  const [description, setDescription] = useState(record.description ?? "");
  const [price, setPrice] = useState(String(record.priceSatang / 100));
  const [minutes, setMinutes] = useState(String(record.durationMinutes));
  const [drafts, setDrafts] = useState<PackageDraft[]>(() => packages.map((item) => packageDraft(item)));
  const [packagesTouched, setPackagesTouched] = useState(false);
  const [related, setRelated] = useState<readonly string[]>(record.relatedServiceIds ?? []);
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const storedRelated = record.relatedServiceIds ?? [];
  const relatedChanged = related.length !== storedRelated.length || related.some((id, at) => id !== storedRelated[at]);
  const detailsChanged =
    name !== record.name ||
    description !== (record.description ?? "") ||
    price !== String(record.priceSatang / 100) ||
    minutes !== String(record.durationMinutes) ||
    relatedChanged;
  const dirty = detailsChanged || packagesTouched;

  const changeDraft = (key: string, patch: Partial<PackageDraft>) => {
    setPackagesTouched(true);
    setSaved(false);
    setDrafts((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  };

  const reset = () => {
    setName(record.name);
    setDescription(record.description ?? "");
    setPrice(String(record.priceSatang / 100));
    setMinutes(String(record.durationMinutes));
    setDrafts(packages.map((item) => packageDraft(item)));
    setPackagesTouched(false);
    setRelated(storedRelated);
    setProblem(null);
  };

  async function save() {
    const baht = bahtOf(price);
    const length = minutesOf(minutes);
    if (!name.trim()) return setProblem(t("nameRequired"));
    if (baht === null) return setProblem(t("priceInvalid"));
    if (length === null) return setProblem(t("minutesInvalid"));
    const nextPackages = [];
    for (const item of drafts) {
      const itemBaht = bahtOf(item.price);
      const itemLength = minutesOf(item.minutes);
      if (!item.name.trim()) return setProblem(t("packageNameRequired"));
      if (itemBaht === null) return setProblem(t("priceInvalid"));
      if (itemLength === null) return setProblem(t("minutesInvalid"));
      nextPackages.push({
        id: item.id,
        name: item.name.trim(),
        description: item.description.trim() || undefined,
        durationMinutes: itemLength,
        priceSatang: itemBaht * 100,
      });
    }
    setSaving(true);
    setProblem(null);
    try {
      if (detailsChanged) {
        await updateAdvisorService(record.id, {
          name: name.trim(),
          description: description.trim(),
          priceSatang: baht * 100,
          durationMinutes: length,
          ...(relatedChanged ? { relatedServiceIds: related } : {}),
        });
      }
      if (packagesTouched) await replaceMyServicePackages(record.id, nextPackages);
      setSaved(true);
      onSaved();
    } catch (cause) {
      setProblem(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="flex flex-col gap-10 pb-36 lg:gap-14"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14">
        <Photos images={images} onChanged={onImages} serviceId={record.id} />

        <div className="flex flex-col gap-4 lg:gap-5">
          <label className="sr-only" htmlFor="owner-name">
            {t("nameLabel")}
          </label>
          <Textarea
            className={cn(INLINE, "min-h-0 resize-none px-3 py-2 font-hero text-3xl leading-tight font-normal tracking-tight text-hero-ink md:text-4xl lg:text-frame-title")}
            id="owner-name"
            maxLength={120}
            onChange={(event) => {
              setName(event.target.value);
              setSaved(false);
            }}
            placeholder={t("namePlaceholder")}
            rows={2}
            value={name}
          />
          <label className="sr-only" htmlFor="owner-description">
            {t("descriptionLabel")}
          </label>
          <Textarea
            className={cn(INLINE, "min-h-36 resize-y px-3 py-2 text-base leading-relaxed text-muted-foreground lg:text-frame-body")}
            id="owner-description"
            onChange={(event) => {
              setDescription(event.target.value);
              setSaved(false);
            }}
            placeholder={t("descriptionPlaceholder")}
            value={description}
          />
          <div className="grid grid-cols-2 gap-3 px-1">
            <FieldWithUnit id="owner-price" label={t("priceLabel")} onChange={(value) => { setPrice(value); setSaved(false); }} unit={t("bahtUnit")} value={price} />
            <FieldWithUnit id="owner-minutes" label={t("minutesLabel")} onChange={(value) => { setMinutes(value); setSaved(false); }} unit={t("minuteUnit")} value={minutes} />
          </div>
          <p className="px-1 text-xs text-muted-foreground lg:text-frame-label">{t("inlineHint")}</p>
        </div>
      </div>

      <section className="flex flex-col gap-4 border-t border-border pt-8 lg:gap-6 lg:pt-12">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-foreground lg:text-frame-heading">{t("packagesTitle")}</h2>
          <p className="text-sm text-muted-foreground lg:text-frame-meta">{t("packagesBody")}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {drafts.map((item, index) => (
            <div className="flex flex-col gap-3 rounded-2xl border border-border p-4 lg:p-5" key={item.key}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground lg:text-frame-label">{t("packageNumber", { number: index + 1 })}</span>
                <Button
                  aria-label={t("removePackage", { number: index + 1 })}
                  className="size-9 rounded-full text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    setPackagesTouched(true);
                    setSaved(false);
                    setDrafts((current) => current.filter((entry) => entry.key !== item.key));
                  }}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <Trash2 aria-hidden className="size-4" />
                </Button>
              </div>
              <Input
                aria-label={t("nameLabel")}
                className={cn(INLINE, "h-auto px-2 py-1 text-base font-semibold text-foreground lg:text-frame-body")}
                maxLength={80}
                onChange={(event) => changeDraft(item.key, { name: event.target.value })}
                placeholder={t("packageNamePlaceholder")}
                value={item.name}
              />
              <Textarea
                aria-label={t("descriptionLabel")}
                className={cn(INLINE, "min-h-20 resize-none px-2 py-1 text-sm text-muted-foreground lg:text-frame-meta")}
                maxLength={300}
                onChange={(event) => changeDraft(item.key, { description: event.target.value })}
                placeholder={t("packageDescriptionPlaceholder")}
                value={item.description}
              />
              <div className="grid grid-cols-2 gap-2">
                <FieldWithUnit compact id={`${item.key}-price`} label={t("priceLabel")} onChange={(value) => changeDraft(item.key, { price: value })} unit={t("bahtUnit")} value={item.price} />
                <FieldWithUnit compact id={`${item.key}-minutes`} label={t("minutesLabel")} onChange={(value) => changeDraft(item.key, { minutes: value })} unit={t("minuteUnit")} value={item.minutes} />
              </div>
            </div>
          ))}
          {drafts.length < MAX_SERVICE_PACKAGES ? (
            <button
              className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-accented p-5 text-sm font-medium text-foreground outline-none transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 lg:text-frame-meta"
              onClick={() => {
                setPackagesTouched(true);
                setSaved(false);
                setDrafts((current) => [...current, packageDraft()]);
              }}
              type="button"
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-muted">
                <Plus aria-hidden className="size-5" />
              </span>
              {t("addPackage")}
            </button>
          ) : null}
        </div>
        {drafts.length === 0 ? <p className="text-sm text-muted-foreground lg:text-frame-meta">{t("noPackages")}</p> : null}
      </section>

      <RelatedPicker
        chosen={related}
        onChange={(next) => {
          setRelated(next);
          setSaved(false);
        }}
        serviceId={record.id}
      />

      {/* The save bar, once something changed (or just saved): fixed to the foot. */}
      {dirty || saved || problem ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <div className="app-scale mx-auto flex w-full max-w-[1658px] flex-wrap items-center justify-between gap-3 px-6 py-3 md:px-12 lg:px-8 lg:py-4">
            <p
              className={cn("text-sm lg:text-frame-meta", problem ? "text-destructive" : saved && !dirty ? "text-success" : "text-foreground")}
              role={problem ? "alert" : "status"}
            >
              {problem ?? (saved && !dirty ? t("savedNote") : t("unsavedNote"))}
            </p>
            {dirty ? (
              <div className="flex gap-2">
                <Button className={cn(authPill(false), PILL)} onClick={reset} type="button" variant="outline">
                  {t("discard")}
                </Button>
                <Button className={cn(authPill(true), PILL)} disabled={saving} type="submit">
                  {saving ? t("saving") : t("save")}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </form>
  );
}

function FieldWithUnit({ id, label, value, onChange, unit, compact = false }: {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly unit: string;
  readonly compact?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-muted-foreground lg:text-frame-label" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <Input
          className={cn(FIELD, "pr-14 font-latin tabular-nums", compact && "h-10 md:h-10")}
          id={id}
          inputMode="numeric"
          onChange={(event) => onChange(event.target.value)}
          value={value}
        />
        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-muted-foreground">{unit}</span>
      </div>
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

  const toggle = (id: string) =>
    onChange(chosen.includes(id) ? chosen.filter((entry) => entry !== id) : [...chosen, id]);

  let body: ReactNode;
  if (mine.loading && !mine.data) {
    body = (
      <div aria-busy className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:gap-5">
        {[0, 1, 2].map((key) => (
          <span className="block aspect-[4/3] w-full animate-pulse rounded-2xl bg-muted" key={key} />
        ))}
      </div>
    );
  } else if (!mine.data) {
    body = <ApiErrorCard error={mine.error ?? new Error(t("loadFailed"))} onRetry={mine.reload} title={t("loadFailed")} />;
  } else if (others.length === 0) {
    body = <p className="text-sm text-muted-foreground lg:text-frame-meta">{t("relatedNone")}</p>;
  } else {
    body = (
      <ul className="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-3 lg:gap-x-5">
        {others.map((item) => {
          const place = chosen.indexOf(item.id);
          const picked = place !== -1;
          const cover = catalogue.items.find((entry) => entry.id === item.id)?.cover.src;
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
                    // eslint-disable-next-line @next/next/no-img-element -- catalogue covers are remote URLs of mixed hosts
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
    );
  }

  return (
    <section className="flex flex-col gap-4 border-t border-border pt-8 lg:gap-6 lg:pt-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-foreground lg:text-frame-heading">{t("relatedTitle")}</h2>
          <p className="text-sm text-muted-foreground lg:text-frame-meta">{t("relatedBody", { max: MAX_RELATED_SERVICES })}</p>
        </div>
        {chosen.length > 0 ? (
          <Button className={cn(authPill(false), PILL)} onClick={() => onChange([])} type="button" variant="outline">
            {t("relatedAuto")}
          </Button>
        ) : null}
      </div>
      {body}
      {full && others.length > MAX_RELATED_SERVICES ? (
        <p className="text-sm text-muted-foreground lg:text-frame-meta">{t("relatedFull", { max: MAX_RELATED_SERVICES })}</p>
      ) : null}
    </section>
  );
}

/* ---------------------------------------------------------------- photos */

/** The photographs: the cover large, the rest as tiles, each with its remove; a tile to add more. */
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
      setProblem(cause instanceof Error ? cause.message : String(cause));
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
      setProblem(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(null);
      onChanged();
    }
  }

  const tile = (src: string, index: number, large: boolean): ReactNode => (
    <div className={cn("group relative overflow-hidden rounded-2xl bg-muted", large ? "col-span-3 aspect-[4/3]" : "aspect-square")} key={src}>
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
    <section aria-labelledby="owner-photos" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium text-foreground lg:text-frame-meta" id="owner-photos">
          {t("photosTitle")}
        </h2>
        <span className="text-xs text-muted-foreground lg:text-frame-label">{t("photosCount", { count: images.length, max: MAX_SERVICE_IMAGES })}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 lg:gap-3">
        {images.map((src, index) => tile(src, index, index === 0))}
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
      <Input
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        multiple
        onChange={(event) => void add(event.target.files)}
        ref={picker}
        tabIndex={-1}
        type="file"
      />
      <p className={cn("text-xs lg:text-frame-label", problem ? "text-destructive" : "text-muted-foreground")} role={problem ? "alert" : undefined}>
        {problem ?? t("photosHint")}
      </p>
    </section>
  );
}
