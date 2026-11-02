"use client";

import { ArrowLeft, CalendarRange, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback, useState, type ReactNode } from "react";

import { authPill } from "@/components/auth/auth-split";
import { SETTINGS_DIALOG_ACTIONS, SettingsDialog, settingsPill } from "@/components/profile/settings-dialog";
import { LiveServiceDetailSkeleton, ServiceView } from "@/components/service/service-detail-live";
import { ApiErrorCard } from "@/components/service/parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  MAX_SERVICE_PACKAGES,
  getAdvisorServiceImages,
  getMyAdvisorService,
  listMyServicePackages,
  replaceMyServicePackages,
  updateAdvisorService,
  type AdvisorService,
} from "@/lib/advisor-services/api";
import type { ApiPublicService, ApiServicePackage } from "@/lib/api/types";
import { invalidate, useResource } from "@/lib/api/use-resource";
import { cn } from "@/lib/utils";

/**
 * `/advisor/services/view`: the advisor's own service shown as the page a
 * customer sees — the same `ServiceView`, photographs, packages, reviews and
 * all — with the owner's bar above it and the way to change it where it
 * stands: the details (name, what it covers, price and length) and the
 * packages each open their own popup, and the bar puts it on sale or takes it
 * off. Everything else (photos, screening, the availability profile) is the
 * full form's.
 *
 * It reads the owner's routes rather than the public one, so a hidden service
 * shows too, exactly as it would look once on sale.
 */

const FIELD = "h-11 rounded-xl border-accented bg-card px-4 text-base shadow-none md:h-12 md:text-base";
const PILL = "h-10 w-auto px-4 text-sm md:h-10 md:px-5 md:text-sm lg:h-12 lg:px-6 lg:text-frame-body";

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
  const service: ApiPublicService | undefined = record.data
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
        createdAt: record.data.createdAt,
        images: images.data?.images ?? [],
        packages: packages.data ?? [],
      }
    : undefined;
  return { record, packages, service, reload, error: record.error };
}

export function OwnerServiceScreen({ serviceId }: { readonly serviceId: string }) {
  const t = useTranslations("ownerService");
  const owned = useOwnedService(serviceId);
  const [editing, setEditing] = useState<"details" | "packages" | null>(null);

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
  if (!owned.service || !owned.record.data) return <LiveServiceDetailSkeleton />;
  const record = owned.record.data;

  const editButton = (label: string, onClick: () => void, icon: ReactNode = <Pencil aria-hidden />) => (
    <Button className={cn(authPill(false), PILL)} onClick={onClick} type="button" variant="outline">
      {icon}
      {label}
    </Button>
  );

  return (
    <>
      <ServiceView
        owner={{
          bar: <OwnerBar onChanged={owned.reload} record={record} />,
          intro: editButton(t("editDetails"), () => setEditing("details")),
          packages:
            (owned.packages.data?.length ?? 0) > 0 ? (
              editButton(t("editPackages"), () => setEditing("packages"))
            ) : (
              <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border p-5 lg:p-7">
                <p className="text-sm text-muted-foreground lg:text-frame-meta">{t("noPackages")}</p>
                {editButton(t("addPackages"), () => setEditing("packages"), <Plus aria-hidden />)}
              </div>
            ),
        }}
        service={owned.service}
      />
      {editing === "details" ? (
        <DetailsDialog
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            owned.reload();
          }}
          record={record}
        />
      ) : null}
      {editing === "packages" ? (
        <PackagesDialog
          initial={owned.packages.data ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            owned.reload();
          }}
          serviceId={record.id}
        />
      ) : null}
    </>
  );
}

/* ------------------------------------------------------------------- bar */

/**
 * Above the page: the way back, that this is the page as customers see it,
 * whether it is on sale (and the switch that changes it), and the service's
 * calendar and full form.
 */
function OwnerBar({ record, onChanged }: { readonly record: AdvisorService; readonly onChanged: () => void }) {
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
        <div className="flex min-w-0 flex-col">
          <p className="text-sm font-semibold text-foreground lg:text-frame-body">{t("previewTitle")}</p>
          <p className={cn("text-xs lg:text-frame-label", record.isPublished ? "text-success" : "text-muted-foreground")}>
            {record.isPublished ? t("onSale") : t("hidden")}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 md:justify-end lg:gap-3">
        <label className="flex h-10 items-center gap-2.5 rounded-full border border-border px-4 text-sm text-foreground lg:h-12 lg:px-5 lg:text-frame-meta">
          {t("publishSwitch")}
          <Switch checked={record.isPublished} disabled={saving} onCheckedChange={(next) => void setPublished(next)} />
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
          className={cn(authPill(true), PILL)}
          nativeButton={false}
          render={<Link href={`/advisor/services/manage?serviceId=${encodeURIComponent(record.id)}`} />}
        >
          {t("fullForm")}
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

/* --------------------------------------------------------------- details */

function Field({ id, label, children, hint }: { readonly id: string; readonly label: string; readonly children: ReactNode; readonly hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-muted-foreground" htmlFor={id}>
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
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

/** The service's own words and price, as the page's head and price card show them. */
function DetailsDialog({ record, onClose, onSaved }: {
  readonly record: AdvisorService;
  readonly onClose: () => void;
  readonly onSaved: () => void;
}) {
  const t = useTranslations("ownerService");
  const c = useTranslations("common");
  const [name, setName] = useState(record.name);
  const [description, setDescription] = useState(record.description ?? "");
  const [price, setPrice] = useState(String(record.priceSatang / 100));
  const [minutes, setMinutes] = useState(String(record.durationMinutes));
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    const baht = bahtOf(price);
    const length = minutesOf(minutes);
    if (!name.trim()) return setProblem(t("nameRequired"));
    if (baht === null) return setProblem(t("priceInvalid"));
    if (length === null) return setProblem(t("minutesInvalid"));
    setSaving(true);
    setProblem(null);
    try {
      await updateAdvisorService(record.id, {
        name: name.trim(),
        description: description.trim(),
        priceSatang: baht * 100,
        durationMinutes: length,
      });
      onSaved();
    } catch (cause) {
      setProblem(cause instanceof Error ? cause.message : String(cause));
      setSaving(false);
    }
  }

  return (
    <SettingsDialog description={t("detailsBody")} onOpenChange={(open) => (open ? null : onClose())} open title={t("editDetails")}>
      <form
        className="flex w-full flex-col gap-4 lg:w-120"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <Field id="owner-name" label={t("nameLabel")}>
          <Input className={FIELD} id="owner-name" maxLength={120} onChange={(event) => setName(event.target.value)} value={name} />
        </Field>
        <Field id="owner-description" label={t("descriptionLabel")}>
          <Textarea
            className="min-h-28 resize-y rounded-xl border-accented bg-card px-4 py-3 text-base shadow-none"
            id="owner-description"
            onChange={(event) => setDescription(event.target.value)}
            value={description}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field id="owner-price" label={t("priceLabel")}>
            <Input className={cn(FIELD, "font-latin")} id="owner-price" inputMode="numeric" onChange={(event) => setPrice(event.target.value)} value={price} />
          </Field>
          <Field id="owner-minutes" label={t("minutesLabel")}>
            <Input className={cn(FIELD, "font-latin")} id="owner-minutes" inputMode="numeric" onChange={(event) => setMinutes(event.target.value)} value={minutes} />
          </Field>
        </div>
        {problem ? (
          <p className="text-sm text-destructive" role="alert">
            {problem}
          </p>
        ) : null}
        <div className={cn(SETTINGS_DIALOG_ACTIONS, "mt-2 md:mt-2")}>
          <Button className={settingsPill("ghost")} onClick={onClose} type="button" variant="ghost">
            {c("cancel")}
          </Button>
          <Button className={settingsPill("solid")} disabled={saving} type="submit">
            {saving ? t("saving") : t("save")}
          </Button>
        </div>
      </form>
    </SettingsDialog>
  );
}

/* -------------------------------------------------------------- packages */

type Draft = { readonly key: string; readonly id?: string; name: string; description: string; minutes: string; price: string };

let draftKeys = 0;
function draftOf(item?: ApiServicePackage): Draft {
  draftKeys += 1;
  return {
    key: `draft-${draftKeys}`,
    id: item?.id,
    name: item?.name ?? "",
    description: item?.description ?? "",
    minutes: item ? String(item.durationMinutes) : "60",
    price: item ? String(item.priceSatang / 100) : "",
  };
}

/** The packages the service is sold in, in order: each its name, what it covers, its length and price. */
function PackagesDialog({ serviceId, initial, onClose, onSaved }: {
  readonly serviceId: string;
  readonly initial: readonly ApiServicePackage[];
  readonly onClose: () => void;
  readonly onSaved: () => void;
}) {
  const t = useTranslations("ownerService");
  const c = useTranslations("common");
  const [rows, setRows] = useState<Draft[]>(() => (initial.length > 0 ? initial.map((item) => draftOf(item)) : [draftOf()]));
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const change = (key: string, patch: Partial<Draft>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  async function save() {
    const packages = [];
    for (const row of rows) {
      const baht = bahtOf(row.price);
      const length = minutesOf(row.minutes);
      if (!row.name.trim()) return setProblem(t("packageNameRequired"));
      if (baht === null) return setProblem(t("priceInvalid"));
      if (length === null) return setProblem(t("minutesInvalid"));
      packages.push({
        id: row.id,
        name: row.name.trim(),
        description: row.description.trim() || undefined,
        durationMinutes: length,
        priceSatang: baht * 100,
      });
    }
    setSaving(true);
    setProblem(null);
    try {
      await replaceMyServicePackages(serviceId, packages);
      onSaved();
    } catch (cause) {
      setProblem(cause instanceof Error ? cause.message : String(cause));
      setSaving(false);
    }
  }

  return (
    <SettingsDialog description={t("packagesBody")} onOpenChange={(open) => (open ? null : onClose())} open title={t("editPackages")}>
      <form
        className="flex w-full flex-col gap-5 lg:w-140"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <ol className="flex flex-col divide-y divide-border">
          {rows.map((row, index) => (
            <li className="flex flex-col gap-3 py-4 first:pt-0" key={row.key}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">{t("packageNumber", { number: index + 1 })}</p>
                <Button
                  aria-label={t("removePackage", { number: index + 1 })}
                  className="size-10 rounded-full text-muted-foreground hover:text-destructive"
                  onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <Trash2 aria-hidden className="size-4" />
                </Button>
              </div>
              <Field id={`${row.key}-name`} label={t("nameLabel")}>
                <Input className={FIELD} id={`${row.key}-name`} maxLength={80} onChange={(event) => change(row.key, { name: event.target.value })} value={row.name} />
              </Field>
              <Field id={`${row.key}-description`} label={t("descriptionLabel")}>
                <Input className={FIELD} id={`${row.key}-description`} maxLength={300} onChange={(event) => change(row.key, { description: event.target.value })} value={row.description} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field id={`${row.key}-price`} label={t("priceLabel")}>
                  <Input className={cn(FIELD, "font-latin")} id={`${row.key}-price`} inputMode="numeric" onChange={(event) => change(row.key, { price: event.target.value })} value={row.price} />
                </Field>
                <Field id={`${row.key}-minutes`} label={t("minutesLabel")}>
                  <Input className={cn(FIELD, "font-latin")} id={`${row.key}-minutes`} inputMode="numeric" onChange={(event) => change(row.key, { minutes: event.target.value })} value={row.minutes} />
                </Field>
              </div>
            </li>
          ))}
        </ol>
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">{t("packagesEmptyNote")}</p> : null}
        {rows.length < MAX_SERVICE_PACKAGES ? (
          <Button
            className="h-10 self-start rounded-full border-border px-4 text-sm font-medium"
            onClick={() => setRows((current) => [...current, draftOf()])}
            type="button"
            variant="outline"
          >
            <Plus aria-hidden className="size-4" />
            {t("addPackage")}
          </Button>
        ) : null}
        {problem ? (
          <p className="text-sm text-destructive" role="alert">
            {problem}
          </p>
        ) : null}
        <div className={cn(SETTINGS_DIALOG_ACTIONS, "mt-0 md:mt-0")}>
          <Button className={settingsPill("ghost")} onClick={onClose} type="button" variant="ghost">
            {c("cancel")}
          </Button>
          <Button className={settingsPill("solid")} disabled={saving} type="submit">
            {saving ? t("saving") : t("save")}
          </Button>
        </div>
      </form>
    </SettingsDialog>
  );
}
