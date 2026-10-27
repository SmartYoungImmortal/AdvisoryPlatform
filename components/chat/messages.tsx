"use client";

import {
  FileImage,
  FileText,
  LoaderCircle,
  RotateCw,
  ShieldAlert,
  TriangleAlert,
  X,
} from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { CHAT_IMAGE_TYPES, getChatFileUrl, type ApiChatFile } from "@/components/chat/chat-data";
import {
  findOffPlatform,
  offPlatformKinds,
  splitByMatches,
  type OffPlatformKind,
} from "@/components/chat/chat-logic";
import { cn } from "@/lib/utils";

/**
 * The pieces a thread is drawn with.
 *
 * Bubbles sit on the card ground: the other person's on the muted step, mine
 * in the home hero's near-black, the one dark object on the page, so the eye
 * finds its own side without reading. A run of one author opens on a bubble
 * whose top corner tucks in towards the author (the face sits there, for the
 * other person), and the bubbles after it sit close and fully round, which is
 * what makes three lines read as one turn rather than three.
 */

/** The bubble's corners, from its place in a run. */
function corners(mine: boolean, first: boolean): string {
  return cn("rounded-2xl", first && (mine ? "rounded-tr-md" : "rounded-tl-md"));
}

/**
 * Type for a line people read: the account pages' body step, 14 on a phone
 * and the frame's meta step (14 rendered at 1440) on a desktop.
 */
const READING = "text-sm lg:text-frame-meta";

/** The width a bubble may take: most of a phone, a comfortable measure on a desktop. */
const MEASURE = "max-w-[min(80%,34rem)] lg:max-w-[min(72%,36rem)]";

/* --------------------------------------------------------------------- day */

/** A day break: the date, quietly, in the middle of the column. */
export function DayDivider({ children }: { readonly children: ReactNode }) {
  return (
    <div className="flex w-full shrink-0 justify-center pt-4 pb-2" role="separator">
      <span className="text-xs text-muted-foreground lg:text-frame-label">
        {children}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------- text */

/**
 * A line, with anything that leaves the platform marked where it stands. The
 * parts are a fixed split of one string, so their position is their identity.
 */
function MarkedText({ text }: { readonly text: string }) {
  const matches = findOffPlatform(text);
  if (matches.length === 0) return <>{text}</>;
  return (
    <>
      {splitByMatches(text, matches).map((part) =>
        part.kind ? (
          <span
            className="underline decoration-warning decoration-wavy decoration-2 underline-offset-4"
            key={part.start}
          >
            {part.text}
          </span>
        ) : (
          <span key={part.start}>{part.text}</span>
        ),
      )}
    </>
  );
}

export function TextBubble({
  text,
  mine,
  first,
}: {
  readonly text: string;
  readonly mine: boolean;
  readonly first: boolean;
}) {
  return (
    <p
      className={cn(
        MEASURE,
        corners(mine, first),
        READING,
        "px-4 py-2.5 whitespace-pre-wrap wrap-break-word",
        mine ? "bg-hero-action text-hero-action-foreground" : "bg-muted text-foreground",
      )}
    >
      <MarkedText text={text} />
    </p>
  );
}

/**
 * Under a line that carries a phone number, a LINE id, an email, an account
 * number or an outside link: what it is and why it matters, in the reader's
 * terms. The other person's gets a way to report; my own gets the rule.
 */
export function OffPlatformNotice({
  text,
  mine,
  reportHref,
  onReport,
}: {
  readonly text: string;
  readonly mine: boolean;
  readonly reportHref?: string;
  /** Opens the report over the conversation, in place of `reportHref`'s page. */
  readonly onReport?: () => void;
}) {
  const t = useTranslations("chat");
  const format = useFormatter();
  const kinds = offPlatformKinds(findOffPlatform(text));
  if (kinds.length === 0) return null;
  const listed = format.list(
    kinds.map((kind: OffPlatformKind) => t(`flag.${kind}`)),
    { type: "conjunction" },
  );

  return (
    <div
      className={cn(
        MEASURE,
        "mt-1 flex items-start gap-2 rounded-xl bg-warning/10 px-3 py-2 text-xs text-foreground lg:gap-2.5 lg:px-4 lg:py-2.5 lg:text-frame-label",
        mine && "self-end",
      )}
    >
      <ShieldAlert aria-hidden className="mt-px size-4 shrink-0 text-warning" />
      <p className="min-w-0 flex-1">
        {mine ? t("flagMine", { kinds: listed }) : t("flagTheirs", { kinds: listed })}
        {!mine && onReport ? (
          <>
            {" "}
            {/* A link in the sentence, as the page's link was; it opens the popup. */}
            <Button
              className="h-auto rounded-none p-0 align-baseline text-xs font-semibold whitespace-nowrap text-inherit underline underline-offset-2 hover:underline lg:text-frame-label"
              onClick={onReport}
              type="button"
              variant="link"
            >
              {t("flagReport")}
            </Button>
          </>
        ) : null}
        {!mine && !onReport && reportHref ? (
          <>
            {" "}
            <Link
              className="font-semibold whitespace-nowrap underline underline-offset-2"
              href={reportHref}
            >
              {t("flagReport")}
            </Link>
          </>
        ) : null}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------- files */

/** `kB` / `MB` with no decimals: a file size is a magnitude, not a measurement. */
export function fileSize(size: number): string {
  if (size >= 1024 * 1024) return `${Math.round(size / (1024 * 1024))} MB`;
  if (size >= 1024) return `${Math.round(size / 1024)} kB`;
  return `${size} B`;
}

/** The glyph tile a file leads with. */
function FileTile({ image, mine }: { readonly image: boolean; readonly mine: boolean }) {
  const Icon = image ? FileImage : FileText;
  return (
    <span
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-xl",
        mine ? "bg-hero-action-foreground/12" : "bg-card",
      )}
    >
      <Icon aria-hidden className={cn("size-5", mine ? "text-hero-action-foreground" : "text-primary")} />
    </span>
  );
}

/**
 * A file in the thread. It opens through a fresh presigned URL fetched at the
 * press (`GET .../files/:id`), since the link expires in minutes and is never
 * stored. The tab is opened first and pointed at the file once the URL lands,
 * so the press still counts as the gesture a popup blocker wants.
 */
export function FileBubble({
  file,
  mine,
  first,
  now,
}: {
  readonly file: ApiChatFile;
  readonly mine: boolean;
  readonly first: boolean;
  readonly now: number;
}) {
  const t = useTranslations("chat");
  const format = useFormatter();
  const [opening, setOpening] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const expired = file.expiryDate !== null && Date.parse(file.expiryDate) <= now;
  const image = CHAT_IMAGE_TYPES.includes(file.mimeType);
  let expiry: string | null = null;
  if (expired) {
    expiry = t("fileExpired");
  } else if (file.expiryDate) {
    expiry = t("fileAvailableUntil", {
      date: format.dateTime(new Date(file.expiryDate), { day: "numeric", month: "short" }),
    });
  }
  const meta = [fileSize(file.fileSizeBytes), expiry].filter(Boolean).join(" · ");

  async function open() {
    setFailed(null);
    setOpening(true);
    const tab = window.open("about:blank", "_blank");
    try {
      const { url } = await getChatFileUrl(file.chatRoomId, file.id);
      if (tab) {
        tab.opener = null;
        tab.location.replace(url);
      } else {
        window.location.assign(url);
      }
    } catch (cause) {
      tab?.close();
      setFailed(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setOpening(false);
    }
  }

  return (
    <div className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
      <Button
        aria-label={`${t("fileDownload")} ${file.originalFileName}`}
        className={cn(
          MEASURE,
          corners(mine, first),
          "h-auto w-72 justify-start gap-3 px-3 py-3 text-left whitespace-normal",
          mine
            ? "bg-hero-action text-hero-action-foreground hover:bg-hero-action/90"
            : "bg-muted text-foreground hover:bg-accented/60",
        )}
        disabled={expired || opening}
        onClick={() => void open()}
        type="button"
        variant="ghost"
      >
        <FileTile image={image} mine={mine} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="line-clamp-2 text-sm font-medium wrap-break-word lg:text-frame-meta">
            {file.originalFileName}
          </span>
          <span
            className={cn(
              "font-latin text-xs tabular-nums lg:text-frame-label",
              mine ? "text-hero-action-foreground/70" : "text-muted-foreground",
            )}
          >
            {meta}
          </span>
        </span>
        {opening ? <LoaderCircle aria-hidden className="size-4 shrink-0 animate-spin motion-reduce:animate-none" /> : null}
      </Button>
      {failed ? (
        <p className="mt-1 text-xs text-destructive lg:text-frame-label" role="alert">
          {t("fileOpenFailed")} · {failed}
        </p>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------- outgoing */

/**
 * Something of mine that has not reached the room: a file on its way up, or
 * one the API turned down. A failed one says why in the API's own sentence
 * and offers the two ways on, trying again or letting it go.
 */
export function OutgoingBubble({
  name,
  meta,
  status,
  reason,
  onRetry,
  onDismiss,
  image = false,
}: {
  readonly name: string;
  readonly meta?: string;
  readonly status: "sending" | "failed";
  readonly reason?: string | null;
  readonly onRetry?: () => void;
  readonly onDismiss?: () => void;
  /** A picture rather than a document, for the glyph. */
  readonly image?: boolean;
}) {
  const t = useTranslations("chat");
  const failed = status === "failed";

  return (
    <div className="flex w-full flex-col items-end gap-1.5">
      <div
        className={cn(
          MEASURE,
          corners(true, true),
          "flex w-72 items-center gap-3 px-3 py-3",
          failed
            ? "border border-destructive/40 bg-destructive/8 text-foreground"
            : "bg-hero-action/75 text-hero-action-foreground",
        )}
      >
        {failed ? (
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-card">
            <TriangleAlert aria-hidden className="size-5 text-destructive" />
          </span>
        ) : (
          <FileTile image={image} mine />
        )}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="line-clamp-2 text-sm font-medium wrap-break-word lg:text-frame-meta">{name}</span>
          {meta ? (
            <span
              className={cn(
                "font-latin text-xs tabular-nums lg:text-frame-label",
                failed ? "text-muted-foreground" : "text-hero-action-foreground/70",
              )}
            >
              {meta}
            </span>
          ) : null}
        </span>
        {failed ? null : <LoaderCircle aria-hidden className="size-4 shrink-0 animate-spin motion-reduce:animate-none" />}
      </div>

      {failed ? (
        <UploadFailedRow onDismiss={onDismiss} onRetry={onRetry} />
      ) : (
        <output className="flex max-w-full flex-wrap items-center justify-end gap-x-2 gap-y-1">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground lg:text-frame-label">{t("uploading")}</span>
        </output>
      )}
      {failed && reason ? <Reason>{reason}</Reason> : null}
    </div>
  );
}

/** Under a file that did not go: "not sent", then trying again and letting it go. */
function UploadFailedRow({ onRetry, onDismiss }: { readonly onRetry?: () => void; readonly onDismiss?: () => void }) {
  const t = useTranslations("chat");
  return (
    <div className="flex max-w-full flex-wrap items-center justify-end gap-x-2 gap-y-1" role="alert">
      <span className="flex items-center gap-1.5 text-xs font-medium text-destructive lg:text-frame-label">
        <TriangleAlert aria-hidden className="size-3.5" />
        {t("notSent")}
      </span>
      {onRetry ? (
        <Button
          className="h-11 gap-1.5 rounded-full px-4 text-sm font-medium lg:h-12 lg:px-5 lg:text-frame-meta"
          onClick={onRetry}
          type="button"
          variant="outline"
        >
          <RotateCw aria-hidden className="size-4" />
          {t("retry")}
        </Button>
      ) : null}
      {onDismiss ? (
        <Button
          className="h-11 gap-1.5 rounded-full px-3 text-sm font-medium text-muted-foreground lg:h-12 lg:px-4 lg:text-frame-meta"
          onClick={onDismiss}
          type="button"
          variant="ghost"
        >
          <X aria-hidden className="size-4" />
          {t("dismiss")}
        </Button>
      ) : null}
    </div>
  );
}

/** Why something of mine did not go: the API's own sentence, on a line of its own. */
function Reason({ children }: { readonly children: ReactNode }) {
  return <p className={cn(MEASURE, "text-right text-xs text-muted-foreground lg:text-frame-label")}>{children}</p>;
}

/**
 * A line of mine that the server has not stored yet: on its way (the bubble in
 * my colour, lighter, with "sending" under it), or not sent, with why and the two
 * ways on, trying again or letting it go, as a file that failed offers.
 */
export function PendingTextBubble({
  text,
  status,
  reason,
  onRetry,
  onDismiss,
}: {
  readonly text: string;
  readonly status: "sending" | "failed";
  readonly reason?: string | null;
  readonly onRetry?: () => void;
  readonly onDismiss?: () => void;
}) {
  const t = useTranslations("chat");
  const failed = status === "failed";
  return (
    <div className="flex w-full flex-col items-end gap-1.5">
      <p
        className={cn(
          MEASURE,
          corners(true, true),
          READING,
          "px-4 py-2.5 whitespace-pre-wrap wrap-break-word",
          failed
            ? "border border-destructive/40 bg-destructive/8 text-foreground"
            : "bg-hero-action/75 text-hero-action-foreground",
        )}
      >
        <MarkedText text={text} />
      </p>
      <div className="flex max-w-full flex-wrap items-center justify-end gap-x-2 gap-y-1" role={failed ? "alert" : "status"}>
        <span
          className={cn(
            "flex items-center gap-1.5 text-xs lg:text-frame-label",
            failed ? "font-medium text-destructive" : "text-muted-foreground",
          )}
        >
          {failed ? <TriangleAlert aria-hidden className="size-3.5 lg:size-4" /> : null}
          {failed ? t("notSent") : t("uploading")}
        </span>
        {failed && onRetry ? (
          <Button
            className="h-11 gap-1.5 rounded-full px-4 text-sm font-medium lg:h-12 lg:px-5 lg:text-frame-meta"
            onClick={onRetry}
            type="button"
            variant="outline"
          >
            <RotateCw aria-hidden className="size-4" />
            {t("retry")}
          </Button>
        ) : null}
        {failed && onDismiss ? (
          <Button
            className="h-11 gap-1.5 rounded-full px-3 text-sm font-medium text-muted-foreground lg:h-12 lg:px-4 lg:text-frame-meta"
            onClick={onDismiss}
            type="button"
            variant="ghost"
          >
            <X aria-hidden className="size-4" />
            {t("dismiss")}
          </Button>
        ) : null}
      </div>
      {failed && reason ? <Reason>{reason}</Reason> : null}
    </div>
  );
}


/* ---------------------------------------------------------------- skeleton */

/** The thread's shape while it loads, so nothing jumps when it lands. */
export function ThreadSkeleton() {
  const bar = "bg-muted";
  return (
    <div aria-hidden className="flex w-full flex-col gap-3 py-4">
      <div className="flex items-start gap-2">
        <span className={cn(bar, "size-8 rounded-full")} />
        <span className={cn(bar, "h-11 w-52 rounded-2xl rounded-tl-md")} />
      </div>
      <div className="flex justify-end">
        <span className={cn(bar, "h-11 w-40 rounded-2xl rounded-tr-md")} />
      </div>
      <div className="flex justify-end">
        <span className={cn(bar, "h-16 w-60 rounded-2xl")} />
      </div>
      <div className="flex items-start gap-2">
        <span className={cn(bar, "size-8 rounded-full")} />
        <span className={cn(bar, "h-16 w-64 rounded-2xl rounded-tl-md")} />
      </div>
    </div>
  );
}
