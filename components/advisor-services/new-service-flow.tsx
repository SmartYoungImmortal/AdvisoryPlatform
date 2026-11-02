"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useState, type ReactNode } from "react";

import { TextAreaField } from "@/components/advisor/edit-fields";
import {
  CategoryChoices,
  Counter,
  FieldWithUnit,
  Photos,
  ScheduleChoices,
} from "@/components/advisor-services/listing-editor";
import { authPill } from "@/components/auth/auth-split";
import { ServiceFrame } from "@/components/service/service-detail-live";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  createAdvisorService,
  getAdvisorServiceImages,
  listServiceCategories,
  updateAdvisorService,
  type ServiceCategory,
} from "@/lib/advisor-services/api";
import type { Paginated } from "@/lib/api/client";
import { invalidate, useResource } from "@/lib/api/use-resource";
import { availabilityApi, type AvailabilityProfile } from "@/lib/availability/api";
import { cn } from "@/lib/utils";

/**
 * `/advisor/services/new`: a service made a question at a time — its
 * categories, its name and what it covers, its length and price, the
 * schedule it is booked against, its photographs — then put on sale or kept
 * as a draft. Each step is one question large in the middle of the page with
 * its answer under it, and a foot that shows how far along it is with the
 * way back and the way on.
 *
 * The service is written as a draft when the schedule is chosen (the API
 * needs every one of those to make it), so its photographs, which are
 * uploaded to it, can follow; going back after that changes the draft.
 * Packages, the booking rules and the rest are set in the editor after.
 */

const STEPS = ["category", "text", "price", "schedule", "photos", "done"] as const;
type Step = (typeof STEPS)[number];

const PILL = "h-11 w-auto px-6 text-sm md:h-11 md:text-sm lg:h-[57px] lg:px-9.5 lg:text-frame-body";

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

export function NewServiceFlow() {
  const t = useTranslations("newService");
  const o = useTranslations("ownerService");
  const format = useFormatter();
  const router = useRouter();
  const categories = useResource<Paginated<ServiceCategory>>("service-categories", listServiceCategories);
  const profiles = useResource<AvailabilityProfile[]>("advisors/me/availability/profiles", availabilityApi.getProfiles);

  const [step, setStep] = useState<Step>("category");
  const [chosenCategories, setChosenCategories] = useState<readonly string[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [minutes, setMinutes] = useState("60");
  const [profileId, setProfileId] = useState("");
  /** The draft once it is written. */
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const images = useResource<{ images: string[] }>(
    `advisors/me/services/${serviceId ?? "new"}/images`,
    useCallback(
      (signal: AbortSignal) => (serviceId ? getAdvisorServiceImages(serviceId, signal) : Promise.resolve({ images: [] })),
      [serviceId],
    ),
  );
  const photoCount = images.data?.images.length ?? 0;
  const index = STEPS.indexOf(step);
  const baht = bahtOf(price);
  const length = minutesOf(minutes);
  const profile = profiles.data?.find((item) => item.id === profileId);

  const ready: Record<Step, boolean> = {
    category: chosenCategories.length > 0,
    text: name.trim().length > 0,
    price: baht !== null && length !== null,
    schedule: Boolean(profileId),
    photos: true,
    done: true,
  };

  /** Writes the draft (or the changes to it) from what has been answered. */
  async function writeDraft(): Promise<string> {
    if (baht === null || length === null) throw new Error(t("priceInvalid"));
    const fields = {
      categoryId: chosenCategories[0],
      extraCategoryIds: chosenCategories.slice(1),
      availabilityProfileId: profileId,
      name: name.trim(),
      description: description.trim(),
      priceSatang: baht * 100,
      durationMinutes: length,
    };
    if (serviceId) {
      await updateAdvisorService(serviceId, fields);
      return serviceId;
    }
    const created = await createAdvisorService({ ...fields, isPublished: false });
    setServiceId(created.id);
    return created.id;
  }

  const next = () => {
    if (!ready[step]) return;
    setProblem(null);
    // Leaving the schedule writes the draft: from here on the steps act on it.
    if (step === "schedule" || (serviceId && index < STEPS.indexOf("photos"))) {
      setBusy(true);
      void (async () => {
        try {
          await writeDraft();
          invalidate("advisors/me/services");
          setStep(STEPS[index + 1]);
        } catch (cause: unknown) {
          setProblem(`${t("saveFailed")}: ${cause instanceof Error ? cause.message : String(cause)}`);
        } finally {
          setBusy(false);
        }
      })();
      return;
    }
    setStep(STEPS[index + 1]);
  };

  const finish = (publish: boolean) => {
    if (!serviceId) return;
    setBusy(true);
    setProblem(null);
    void (async () => {
      try {
        if (publish) await updateAdvisorService(serviceId, { isPublished: true });
        invalidate("advisors/me/services");
        invalidate("services");
        router.push(`/advisor/services/view?serviceId=${encodeURIComponent(serviceId)}`);
      } catch (cause: unknown) {
        setProblem(`${t("saveFailed")}: ${cause instanceof Error ? cause.message : String(cause)}`);
        setBusy(false);
      }
    })();
  };

  let body: ReactNode = null;
  if (step === "category") {
    body = (
      <Question hint={o("categoryHint", { max: 3 })} title={t("categoryQ")}>
        <CategoryChoices categories={categories.data?.items ?? null} chosen={chosenCategories} onChange={setChosenCategories} />
      </Question>
    );
  } else if (step === "text") {
    body = (
      <Question hint={t("textHint")} title={t("textQ")}>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-muted-foreground" htmlFor="new-title">
            {o("titleSection")}
          </label>
          <Textarea
            className="min-h-0 resize-none rounded-xl border-accented bg-card px-4 py-3 text-lg font-semibold text-foreground shadow-none md:text-lg lg:text-frame-body"
            id="new-title"
            maxLength={150}
            onChange={(event) => setName(event.target.value)}
            placeholder={o("namePlaceholder")}
            rows={2}
            value={name}
          />
          <Counter count={name.length} max={150} />
        </div>
        <TextAreaField hint={o("descriptionPlaceholder")} id="new-description" label={o("descriptionLabel")} onChange={setDescription} rows={6} value={description} />
      </Question>
    );
  } else if (step === "price") {
    body = (
      <Question hint={t("priceHint")} title={t("priceQ")}>
        <div className="grid grid-cols-2 gap-3">
          <FieldWithUnit id="new-price" label={o("priceLabel")} onChange={setPrice} unit={o("bahtUnit")} value={price} />
          <FieldWithUnit id="new-minutes" label={o("minutesLabel")} onChange={setMinutes} unit={o("minuteUnit")} value={minutes} />
        </div>
      </Question>
    );
  } else if (step === "schedule") {
    body = (
      <Question hint={o("scheduleProfileHint")} title={t("scheduleQ")}>
        <ScheduleChoices chosen={profileId} onChange={setProfileId} profiles={profiles.data ?? null} />
      </Question>
    );
  } else if (step === "photos" && serviceId) {
    body = <Photos images={images.data?.images ?? []} onChanged={images.reload} serviceId={serviceId} />;
  } else if (step === "done") {
    body = (
      <Question hint={t("doneHint")} title={t("doneQ")}>
        <dl className="flex flex-col divide-y divide-border border-y border-border">
          {[
            { label: o("titleSection"), value: name.trim() },
            {
              label: o("pricingSection"),
              value: baht !== null && length !== null ? o("priceSummary", { price: format.number(baht, "baht"), minutes: length }) : "—",
            },
            { label: o("scheduleProfileSection"), value: profile?.name ?? "—" },
            { label: o("photosSection"), value: o("photosCount", { count: photoCount, max: 6 }) },
          ].map((row) => (
            <div className="flex items-center justify-between gap-4 py-3" key={row.label}>
              <dt className="text-sm text-muted-foreground lg:text-frame-meta">{row.label}</dt>
              <dd className="text-right text-sm font-medium text-foreground lg:text-frame-meta">{row.value}</dd>
            </div>
          ))}
        </dl>
        {photoCount === 0 ? <p className="text-sm text-muted-foreground lg:text-frame-meta">{t("publishNeedsPhoto")}</p> : null}
      </Question>
    );
  }

  const total = STEPS.length - 1;

  return (
    <ServiceFrame
      bar={
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card">
          {/* How far along: a segment per question, filled as they are answered. */}
          <div aria-hidden className="grid grid-cols-5 gap-1 px-0">
            {STEPS.slice(0, total).map((item, at) => (
              <span className={cn("h-1", at < index ? "bg-hero-action" : "bg-muted")} key={item} />
            ))}
          </div>
          <div className="app-scale mx-auto flex w-full max-w-[1658px] items-center justify-between gap-3 px-6 py-3 md:px-12 lg:px-8 lg:py-4">
            {index === 0 ? (
              <Button className="h-11 px-2 text-sm font-medium underline underline-offset-4 lg:text-frame-body" nativeButton={false} render={<Link href="/advisor/services" />} variant="ghost">
                {t("exit")}
              </Button>
            ) : (
              <Button
                className="h-11 px-2 text-sm font-medium underline underline-offset-4 lg:text-frame-body"
                disabled={busy}
                onClick={() => setStep(STEPS[index - 1])}
                type="button"
                variant="ghost"
              >
                {t("back")}
              </Button>
            )}
            {step === "done" ? (
              <div className="flex gap-2">
                <Button className={cn(authPill(false), PILL)} disabled={busy} onClick={() => finish(false)} type="button" variant="outline">
                  {t("keepDraft")}
                </Button>
                <Button className={cn(authPill(true), PILL)} disabled={busy || photoCount === 0} onClick={() => finish(true)} type="button">
                  {t("publish")}
                </Button>
              </div>
            ) : (
              <Button className={cn(authPill(true), PILL)} disabled={busy || !ready[step]} onClick={next} type="button">
                {busy ? t("saving") : t("next")}
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 pt-2 pb-16 lg:gap-8 lg:pt-8">
        <Link
          aria-label={t("exit")}
          className="-ml-2 flex size-10 items-center justify-center rounded-full outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 lg:hidden"
          href="/advisor/services"
        >
          <ArrowLeft aria-hidden className="size-5" />
        </Link>
        <p className="text-sm font-medium text-muted-foreground lg:text-frame-meta">{t("stepOf", { n: Math.min(index + 1, total), total })}</p>
        {body}
        {problem ? (
          <p className="text-sm text-destructive" role="alert">
            {problem}
          </p>
        ) : null}
      </div>
    </ServiceFrame>
  );
}

/** One question: large, a line under it, then its answer. */
function Question({ title, hint, children }: { readonly title: string; readonly hint?: string; readonly children: ReactNode }) {
  return (
    <section className="flex flex-col gap-6 lg:gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-hero text-2xl font-normal tracking-tight text-hero-ink md:text-3xl lg:text-frame-headline">{title}</h1>
        {hint ? <p className="text-sm text-muted-foreground lg:text-frame-meta">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}
