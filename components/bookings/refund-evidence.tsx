"use client";

import { FileText, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useRef, useState, type ReactNode, type RefObject } from "react";

import { refundPill } from "@/components/bookings/refund-sheet";
import { Figures } from "@/components/figures";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { getRefundEvidenceUrl, listRefundEvidence, uploadRefundEvidence, type RefundEvidence } from "@/lib/api/resources";
import { useLastAnswer, useResource } from "@/lib/api/use-resource";
import { cn } from "@/lib/utils";

/** What the API keeps per request. Its 50 MB is counted in binary megabytes. */
const FILES_MAX = 5;
const BYTES_MAX = 50 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
const ACCEPT = TYPES.join(",");

type FileFault = "wrongType" | "empty" | "tooLarge";

const FILE_RULES: readonly { readonly fault: FileFault; readonly fails: (file: File) => boolean }[] = [
  { fault: "wrongType", fails: (file) => !(TYPES as readonly string[]).includes(file.type) },
  { fault: "empty", fails: (file) => file.size === 0 },
  { fault: "tooLarge", fails: (file) => file.size > BYTES_MAX },
];

/** Why the API did not keep a file. Only `uploadFailed` asks for another try. */
export type UploadFault = "uploadSignIn" | "uploadRefused" | "tooLarge" | "uploadFailed";

/** 400 is a request that takes no more files (resolved, or all five used), or a file the API would not read. */
const UPLOAD_FAULT: Readonly<Partial<Record<number, UploadFault>>> = { 400: "uploadRefused", 401: "uploadSignIn", 413: "tooLarge" };

export function uploadFault(cause: unknown): UploadFault {
  return (cause instanceof ApiError ? UPLOAD_FAULT[cause.status] : undefined) ?? "uploadFailed";
}

type Problem =
  | { readonly key: "tooMany" | "openFailed" | "loadFailed" }
  | { readonly key: FileFault | UploadFault; readonly name: string };

/** The files that may join the `held` ones, and why each of the rest may not. */
function sortPicks(picked: readonly File[], held: number): { kept: File[]; problems: Problem[] } {
  const kept: File[] = [];
  const problems: Problem[] = [];
  let over = false;
  for (const file of picked) {
    const broken = FILE_RULES.find((rule) => rule.fails(file));
    if (broken) problems.push({ key: broken.fault, name: file.name });
    else if (held + kept.length < FILES_MAX) kept.push(file);
    else over = true;
  }
  if (over) problems.push({ key: "tooMany" });
  return { kept, problems };
}

function sameFile(a: File, b: File): boolean {
  return a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;
}

/** The one way this flow says something went wrong next to what it is about. */
export function RefundAlert({
  children,
  className,
  id,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly id?: string;
}) {
  return (
    <p className={cn("text-sm text-destructive lg:text-frame-meta", className)} id={id} role="alert">
      {children}
    </p>
  );
}

function Problems({ problems }: { readonly problems: readonly Problem[] }) {
  const t = useTranslations("bookingRefund");
  const text = (problem: Problem): string => {
    switch (problem.key) {
      case "tooMany":
        return t("attachments.tooMany");
      case "openFailed":
        return t("evidenceFailed");
      case "loadFailed":
        return t("attachments.loadFailed");
      default:
        return t(`attachments.${problem.key}`, { name: problem.name });
    }
  };
  // Two files of one name refused for one reason say it once.
  const lines = [...new Set(problems.map(text))];
  return lines.map((line) => <RefundAlert key={line}>{line}</RefundAlert>);
}

function FileRow({ children, trailing }: { readonly children: ReactNode; readonly trailing?: ReactNode }) {
  return (
    <li className="flex min-h-11 min-w-0 items-center lg:min-h-12">
      {children}
      {trailing}
    </li>
  );
}

function FileName({ name }: { readonly name: string }) {
  return (
    <>
      <FileText aria-hidden className="size-5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 truncate text-sm text-foreground lg:text-frame-meta">{name}</span>
    </>
  );
}

/**
 * The real file input sits inside the capsule, out of sight but in the tab
 * order, so the capsule takes its focus ring. A locked picker keeps its focus
 * and refuses the dialog instead of going `disabled`, which would drop focus.
 * From `lg` the capsule hugs its words: across a cell it would outsize the
 * pills under the card.
 */
function EvidenceShell({
  label,
  busy = false,
  locked,
  onPick,
  inputRef,
  problems,
  children,
}: {
  readonly label: string;
  readonly busy?: boolean;
  readonly locked: boolean;
  readonly onPick: (files: File[]) => void;
  readonly inputRef?: RefObject<HTMLInputElement | null>;
  readonly problems: readonly Problem[];
  readonly children: readonly ReactNode[];
}) {
  const t = useTranslations("bookingRefund");
  const limitsId = useId();

  return (
    <div aria-busy={busy || undefined} className="flex flex-col gap-3">
      {children.length > 0 ? <ul className="-mx-2 flex flex-col">{children}</ul> : null}
      <label
        className={cn(
          refundPill("outline"),
          "relative inline-flex cursor-pointer items-center justify-center has-focus-visible:ring-3 has-focus-visible:ring-ring/50 has-aria-disabled:cursor-not-allowed lg:w-auto lg:self-start",
        )}
      >
        <Plus aria-hidden className="size-4 lg:size-5" />
        {busy ? t("busy.uploading") : label}
        <Input
          accept={ACCEPT}
          aria-describedby={limitsId}
          aria-disabled={locked || undefined}
          className="sr-only"
          multiple
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";
            if (!locked) onPick(files);
          }}
          onClick={(event) => {
            if (locked) event.preventDefault();
          }}
          ref={inputRef}
          type="file"
        />
      </label>
      <p className="text-xs text-muted-foreground lg:text-frame-label" id={limitsId}>
        <Figures>{t("attachments.limits")}</Figures>
      </p>
      <Problems problems={problems} />
    </div>
  );
}

export type DraftEvidenceProps = {
  readonly files: readonly File[];
  readonly onChange: (files: File[]) => void;
  readonly disabled?: boolean;
};

export type LiveEvidenceProps = { readonly refundId: string };

/** Files picked for a request not sent yet. The form holds them; this only checks and lists them. */
function DraftEvidence({ files, onChange, disabled = false }: DraftEvidenceProps) {
  const t = useTranslations("bookingRefund");
  const [problems, setProblems] = useState<readonly Problem[]>([]);
  const input = useRef<HTMLInputElement>(null);

  function pick(picked: readonly File[]) {
    const fresh = picked.filter((file) => !files.some((held) => sameFile(held, file)));
    const sorted = sortPicks(fresh, files.length);
    setProblems(sorted.problems);
    if (sorted.kept.length > 0) onChange([...files, ...sorted.kept]);
  }

  function remove(file: File) {
    setProblems([]);
    onChange(files.filter((held) => held !== file));
    input.current?.focus();
  }

  return (
    <EvidenceShell
      inputRef={input}
      label={files.length === 0 ? t("attachments.add") : t("attachments.addMore")}
      locked={disabled}
      onPick={pick}
      problems={problems}
    >
      {files.map((file) => (
        <FileRow
          key={`${file.name}:${file.size}:${file.lastModified}`}
          trailing={
            <Button
              aria-label={t("attachments.remove", { name: file.name })}
              className="size-11 shrink-0 rounded-full"
              disabled={disabled}
              onClick={() => remove(file)}
              size="icon"
              type="button"
              variant="ghost"
            >
              <X aria-hidden className="size-5" />
            </Button>
          }
        >
          <span className="flex min-w-0 flex-1 items-center gap-3 px-2">
            <FileName name={file.name} />
          </span>
        </FileRow>
      ))}
    </EvidenceShell>
  );
}

function withAdded(saved: readonly RefundEvidence[], added: readonly RefundEvidence[]): RefundEvidence[] {
  const keys = new Set(saved.map((file) => file.objectKey));
  return [...saved, ...added.filter((file) => !keys.has(file.objectKey))];
}

/** The evidence already with an open request: each opens privately, and a pick goes up at once. */
function LiveEvidence({ refundId }: LiveEvidenceProps) {
  const t = useTranslations("bookingRefund");
  const list = useResource(`refunds/${refundId}/evidence`, (signal) => listRefundEvidence(refundId, signal));
  const saved = useLastAnswer(list);
  const [added, setAdded] = useState<readonly RefundEvidence[]>([]);
  const [uploading, setUploading] = useState(false);
  const [problems, setProblems] = useState<readonly Problem[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const lock = useRef(false);

  const rows = withAdded(saved ?? [], added);

  async function pick(picked: readonly File[]) {
    if (lock.current) return;
    const sorted = sortPicks(picked, rows.length);
    setProblems(sorted.problems);
    if (sorted.kept.length === 0) return;
    lock.current = true;
    setUploading(true);
    setAnnouncement("");
    const failed: Problem[] = [];
    let landed = 0;
    for (const file of sorted.kept) {
      try {
        const row = await uploadRefundEvidence(refundId, file);
        landed += 1;
        setAdded((previous) => [...previous, row]);
      } catch (cause) {
        failed.push({ key: uploadFault(cause), name: file.name });
      }
    }
    setProblems([...sorted.problems, ...failed]);
    if (landed > 0) {
      setAnnouncement(t("announce.attached", { count: landed }));
      list.reload();
    }
    lock.current = false;
    setUploading(false);
  }

  async function open(file: RefundEvidence) {
    try {
      const signed = await getRefundEvidenceUrl(refundId, file.objectKey);
      window.open(signed.url, "_blank", "noopener,noreferrer");
    } catch {
      setProblems([{ key: "openFailed" }]);
    }
  }

  const failedToLoad = saved === undefined && list.error !== null;

  return (
    <>
      <EvidenceShell
        busy={uploading}
        label={t("attachments.addMore")}
        locked={uploading || saved === undefined}
        onPick={(files) => void pick(files)}
        problems={failedToLoad ? [...problems, { key: "loadFailed" }] : problems}
      >
        {rows.map((file) => (
          <FileRow key={file.objectKey}>
            <Button
              className="h-auto min-h-11 w-full min-w-0 justify-start gap-3 rounded-xl px-2 py-2 text-left font-normal hover:bg-muted/60 lg:min-h-12"
              onClick={() => void open(file)}
              type="button"
              variant="ghost"
            >
              <FileName name={file.originalFileName} />
            </Button>
          </FileRow>
        ))}
      </EvidenceShell>
      {failedToLoad ? (
        <Button className="mt-1 h-11 px-0" onClick={list.reload} type="button" variant="link">
          {t("actions.retry")}
        </Button>
      ) : null}
      <p className="sr-only" role="status">
        {announcement}
      </p>
    </>
  );
}

export type EvidencePickerProps = DraftEvidenceProps | LiveEvidenceProps;

/** One control for evidence: files held by a form not sent yet, or the files of an open request. */
export function EvidencePicker(props: EvidencePickerProps) {
  return "refundId" in props ? <LiveEvidence refundId={props.refundId} /> : <DraftEvidence {...props} />;
}
