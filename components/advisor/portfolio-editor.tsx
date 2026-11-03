"use client";

import { ImageIcon, ImagePlus, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { EntryDialog, TextAreaField, TextField } from "@/components/advisor/edit-fields";
import { ApiErrorCard } from "@/components/service/parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createPortfolioItem,
  deletePortfolioItem,
  listOwnPortfolio,
  MAX_PORTFOLIO_IMAGES,
  MAX_PORTFOLIO_ITEMS,
  removePortfolioImage,
  updatePortfolioItem,
  uploadPortfolioImage,
} from "@/lib/api/onboarding";
import type { ApiPortfolioItem } from "@/lib/api/types";
import { invalidate, useResource } from "@/lib/api/use-resource";
import { cn } from "@/lib/utils";

/**
 * The portfolio on `/advisor/edit`: the pieces of work a client sees first
 * on the advisor's profile, as cards, and a dialog to add or change one.
 *
 * Unlike the rest of the page a piece is saved from its dialog: its pictures
 * are uploaded to it, so it has to exist first. The dialog holds everything
 * until "save", then writes the words, takes out the pictures removed and
 * uploads the ones added, in that order, and answers the piece as stored.
 */

const PICTURE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PICTURE_BYTES = 5 * 1024 * 1024;

/** A link as typed, with `https://` put in front when no scheme was. */
function normalizedLink(typed: string): string {
  const trimmed = typed.trim();
  if (!trimmed) return "";
  return /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** Whether a link is one the API takes: http or https, to a named host. */
function linkIsValid(link: string): boolean {
  try {
    const url = new URL(link);
    return (url.protocol === "https:" || url.protocol === "http:") && url.hostname.includes(".");
  } catch {
    return false;
  }
}

/** A picture added in the dialog and not yet uploaded. */
type Added = { readonly key: string; readonly file: File; readonly preview: string };

function messageOf(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

/* ----------------------------------------------------------------- dialog */

function PortfolioDialog({
  entry,
  onClose,
  onSaved,
  onDeleted,
}: {
  readonly entry: ApiPortfolioItem | null;
  /** Closed without a finished save; `latest` is the piece if a part of the save did land. */
  readonly onClose: (latest: ApiPortfolioItem | null) => void;
  readonly onSaved: (item: ApiPortfolioItem) => void;
  readonly onDeleted: (left: ApiPortfolioItem[]) => void;
}) {
  const t = useTranslations("advisorEdit");
  const picker = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(entry?.title ?? "");
  const [description, setDescription] = useState(entry?.description ?? "");
  const [link, setLink] = useState(entry?.link ?? "");
  /** The piece as the API last answered it; set once a new piece is first stored, so a retry does not add it twice. */
  const [stored, setStored] = useState<ApiPortfolioItem | null>(entry);
  const [removed, setRemoved] = useState<ReadonlySet<number>>(() => new Set());
  const [added, setAdded] = useState<readonly Added[]>([]);
  const [errors, setErrors] = useState<{ title?: string; link?: string }>({});
  const [pictureNote, setPictureNote] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // The previews are object URLs; each goes when its picture does, and all of them with the dialog.
  const previews = useRef(new Set<string>());
  useEffect(() => {
    const open = previews.current;
    return () => {
      for (const url of open) URL.revokeObjectURL(url);
    };
  }, []);

  const kept = (stored?.images ?? []).map((url, index) => ({ url, index })).filter(({ index }) => !removed.has(index));
  const count = kept.length + added.length;

  const pick = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const room = MAX_PORTFOLIO_IMAGES - count;
    const notes: string[] = [];
    const next: Added[] = [];
    for (const file of files) {
      if (!PICTURE_TYPES.includes(file.type)) notes.push(t("pictureWrongType", { name: file.name }));
      else if (file.size > PICTURE_BYTES) notes.push(t("pictureTooBig", { name: file.name }));
      else if (next.length < room) {
        const preview = URL.createObjectURL(file);
        previews.current.add(preview);
        next.push({ key: preview, file, preview });
      } else {
        notes.push(t("picturesLeftOut", { count: room }));
        break;
      }
    }
    setAdded((now) => [...now, ...next]);
    setPictureNote(notes[0] ?? null);
    if (picker.current) picker.current.value = "";
  };

  const dropAdded = (key: string) => {
    URL.revokeObjectURL(key);
    previews.current.delete(key);
    setAdded((now) => now.filter((picture) => picture.key !== key));
  };

  const save = () => {
    const typedLink = normalizedLink(link);
    const found: typeof errors = {};
    if (!title.trim()) found.title = t("required");
    if (typedLink && !linkIsValid(typedLink)) found.link = t("linkInvalid");
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    setProblem(null);
    void (async () => {
      try {
        const words = { title: title.trim(), description: description.trim(), link: typedLink };
        let item = stored ? await updatePortfolioItem(stored.id, words) : await createPortfolioItem(words);
        setStored(item);
        // Highest first, so the places of the ones still to go do not move.
        for (const index of [...removed].sort((a, b) => b - a)) {
          item = await removePortfolioImage(item.id, index);
          setStored(item);
          setRemoved((now) => new Set([...now].filter((at) => at !== index)));
        }
        for (const picture of added) {
          item = await uploadPortfolioImage(item.id, picture.file);
          setStored(item);
          dropAdded(picture.key);
        }
        onSaved(item);
      } catch (cause: unknown) {
        setProblem(`${t("portfolioSaveFailed")}: ${messageOf(cause)}`);
      } finally {
        setBusy(false);
      }
    })();
  };

  const remove = () => {
    if (!stored) return;
    setBusy(true);
    setProblem(null);
    void (async () => {
      try {
        onDeleted(await deletePortfolioItem(stored.id));
      } catch (cause: unknown) {
        setProblem(`${t("portfolioDeleteFailed")}: ${messageOf(cause)}`);
        setBusy(false);
      }
    })();
  };

  const tile = "group relative aspect-square overflow-hidden rounded-2xl bg-muted";
  const removeButton =
    "absolute top-2 right-2 flex size-8 items-center justify-center rounded-full bg-card/90 text-foreground shadow-hero-card outline-none transition-opacity focus-visible:ring-3 focus-visible:ring-ring/50 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100";

  if (confirming && stored) {
    return (
      <EntryDialog
        busy={busy}
        onOpenChange={(open) => (open ? null : setConfirming(false))}
        onSubmit={remove}
        open
        problem={problem}
        submitLabel={t("confirmDeleteYes")}
        title={t("deletePortfolio")}
      >
        <p className="text-base text-muted-foreground">{t("confirmDelete", { name: stored.title })}</p>
      </EntryDialog>
    );
  }

  return (
    <EntryDialog
      aside={
        stored ? (
          <Button
            className="h-11 px-0 text-sm font-medium text-muted-foreground hover:bg-transparent hover:text-destructive"
            disabled={busy}
            onClick={() => setConfirming(true)}
            type="button"
            variant="ghost"
          >
            {t("deletePortfolio")}
          </Button>
        ) : null
      }
      busy={busy}
      focusId="work-title"
      onOpenChange={(open) => (open ? null : onClose(stored === entry ? null : stored))}
      onSubmit={save}
      open
      problem={problem}
      submitLabel={t("savePortfolio")}
      title={entry ? t("editPortfolio") : t("addPortfolio")}
      wide
    >
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-muted-foreground">{t("workPictures")}</span>
        <div className="grid grid-cols-4 gap-2">
          {kept.map(({ url, index }, at) => (
            <div className={tile} key={url}>
              {/* eslint-disable-next-line @next/next/no-img-element -- presigned storage URLs change per read */}
              <img alt="" className="size-full object-cover" src={url} />
              <button
                aria-label={t("removePicture", { n: at + 1 })}
                className={removeButton}
                disabled={busy}
                onClick={() => setRemoved((now) => new Set(now).add(index))}
                type="button"
              >
                <X aria-hidden className="size-4" />
              </button>
            </div>
          ))}
          {added.map((picture, at) => (
            <div className={tile} key={picture.key}>
              {/* eslint-disable-next-line @next/next/no-img-element -- a local preview of a file not yet uploaded */}
              <img alt="" className="size-full object-cover" src={picture.preview} />
              <button
                aria-label={t("removePicture", { n: kept.length + at + 1 })}
                className={removeButton}
                disabled={busy}
                onClick={() => dropAdded(picture.key)}
                type="button"
              >
                <X aria-hidden className="size-4" />
              </button>
            </div>
          ))}
          {count < MAX_PORTFOLIO_IMAGES ? (
            <button
              className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-accented text-xs font-medium text-foreground outline-none transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
              disabled={busy}
              onClick={() => picker.current?.click()}
              type="button"
            >
              <ImagePlus aria-hidden className="size-5" />
              {t("addPicture")}
            </button>
          ) : null}
        </div>
        <Input
          accept={PICTURE_TYPES.join(",")}
          className="sr-only"
          multiple
          onChange={(event) => pick(event.target.files)}
          ref={picker}
          tabIndex={-1}
          type="file"
        />
        <p className={cn("text-sm", pictureNote ? "text-destructive" : "text-muted-foreground")} role={pictureNote ? "alert" : undefined}>
          {pictureNote ?? t("workPicturesHint", { max: MAX_PORTFOLIO_IMAGES })}
        </p>
      </div>
      <TextField
        error={errors.title}
        hint={t("workTitleHint")}
        id="work-title"
        label={t("workTitle")}
        onChange={(value) => {
          setTitle(value);
          setErrors((now) => ({ ...now, title: undefined }));
        }}
        value={title}
      />
      <TextAreaField hint={t("workDescriptionHint")} id="work-description" label={t("description")} onChange={setDescription} rows={3} value={description} />
      <TextField
        error={errors.link}
        hint={t("workLinkHint")}
        id="work-link"
        inputMode="url"
        label={t("workLink")}
        onChange={(value) => {
          setLink(value);
          setErrors((now) => ({ ...now, link: undefined }));
        }}
        placeholder="https://"
        value={link}
      />
    </EntryDialog>
  );
}

/* ---------------------------------------------------------------- section */

/** A piece as the grid shows it: its cover (or a quiet tile without one), its title and a line of it. */
function PortfolioCard({ item, onOpen }: { readonly item: ApiPortfolioItem; readonly onOpen: () => void }) {
  const t = useTranslations("advisorEdit");
  const cover = item.images[0];
  return (
    <li>
      <button
        aria-label={t("openPortfolio", { name: item.title })}
        className="group flex w-full flex-col gap-2.5 rounded-2xl text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        onClick={onOpen}
        type="button"
      >
        <span className="relative block aspect-[4/3] w-full overflow-hidden rounded-2xl bg-muted">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element -- presigned storage URLs change per read
            <img alt="" className="size-full object-cover transition-opacity group-hover:opacity-90" src={cover} />
          ) : (
            <span className="flex size-full items-center justify-center text-muted-foreground">
              <ImageIcon aria-hidden className="size-6" />
            </span>
          )}
          {item.images.length > 1 ? (
            <span className="absolute right-2 bottom-2 rounded-full bg-card/90 px-2.5 py-0.5 text-xs font-medium text-foreground">
              {t("pictureCount", { count: item.images.length })}
            </span>
          ) : null}
        </span>
        <span className="flex flex-col gap-0.5 px-0.5">
          <span className="line-clamp-1 text-base font-medium text-foreground lg:text-frame-body">{item.title}</span>
          {item.description ? (
            <span className="line-clamp-2 text-sm text-muted-foreground lg:text-frame-meta">{item.description}</span>
          ) : null}
        </span>
      </button>
    </li>
  );
}

/** Which piece's dialog is open: one of the pieces, a new one, or none. */
type Opened = { readonly id: string | null } | null;

export function PortfolioSection({
  advisorId,
  onStatus,
}: {
  readonly advisorId: string;
  readonly onStatus: (text: string, ok: boolean) => void;
}) {
  const t = useTranslations("advisorEdit");
  const p = useTranslations("advisorProfile");
  const resource = useResource<ApiPortfolioItem[]>(
    "advisors/me/portfolio",
    useCallback((signal: AbortSignal) => listOwnPortfolio(signal), []),
  );
  // What the dialogs answered since the page opened; the list read once before that.
  const [changed, setChanged] = useState<ApiPortfolioItem[] | null>(null);
  const [opened, setOpened] = useState<Opened>(null);
  const items = changed ?? resource.data;

  const settle = (next: ApiPortfolioItem[], text: string | null) => {
    setChanged(next);
    setOpened(null);
    // This page's list and the public profile's both read again next time.
    invalidate("advisors/me/portfolio");
    invalidate(`advisors/${advisorId}/portfolio`);
    if (text) onStatus(text, true);
  };
  /** The pieces with one put in its place, or added last when it is new. */
  const withItem = (list: readonly ApiPortfolioItem[], item: ApiPortfolioItem) =>
    list.some((existing) => existing.id === item.id)
      ? list.map((existing) => (existing.id === item.id ? item : existing))
      : [...list, item];

  let body;
  if (!items && resource.loading) {
    body = (
      <ul aria-busy className="grid grid-cols-2 gap-4 lg:grid-cols-3 lg:gap-5">
        {[0, 1, 2].map((key) => (
          <li className="flex flex-col gap-2.5" key={key}>
            <span className="block aspect-[4/3] w-full animate-pulse rounded-2xl bg-muted" />
            <span className="block h-4 w-2/3 animate-pulse rounded-full bg-muted" />
          </li>
        ))}
      </ul>
    );
  } else if (!items) {
    body = <ApiErrorCard error={resource.error ?? new Error(t("loadFailed"))} onRetry={resource.reload} title={t("loadFailed")} />;
  } else if (items.length === 0) {
    body = <p className="text-sm text-muted-foreground lg:text-frame-meta">{t("emptyPortfolio")}</p>;
  } else {
    body = (
      <ul className="grid grid-cols-2 gap-x-4 gap-y-6 lg:grid-cols-3 lg:gap-x-5 lg:gap-y-7">
        {items.map((item) => (
          <PortfolioCard item={item} key={item.id} onOpen={() => setOpened({ id: item.id })} />
        ))}
      </ul>
    );
  }

  const full = (items?.length ?? 0) >= MAX_PORTFOLIO_ITEMS;
  const entry = opened?.id ? (items?.find((item) => item.id === opened.id) ?? null) : null;

  return (
    <section className="flex flex-col gap-4 lg:gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-foreground lg:text-frame-heading">{p("portfolioTitle")}</h2>
        <p className="text-sm text-muted-foreground lg:text-frame-meta">{t("portfolioLead")}</p>
      </div>
      {body}
      {items && full ? <p className="text-sm text-muted-foreground lg:text-frame-meta">{t("portfolioFull", { max: MAX_PORTFOLIO_ITEMS })}</p> : null}
      {items && !full ? (
        <Button
          className="h-10 self-start rounded-full border-border px-4 text-sm font-medium lg:h-12 lg:px-5 lg:text-frame-meta"
          onClick={() => setOpened({ id: null })}
          type="button"
          variant="outline"
        >
          <Plus aria-hidden className="size-4" />
          {t("addPortfolio")}
        </Button>
      ) : null}

      {opened && items ? (
        <PortfolioDialog
          entry={entry}
          key={opened.id ?? "new"}
          onClose={(latest) => (latest ? settle(withItem(items, latest), null) : setOpened(null))}
          onDeleted={(left) => settle(left, t("portfolioDeleted"))}
          onSaved={(item) => settle(withItem(items, item), t("portfolioSaved"))}
        />
      ) : null}
    </section>
  );
}
