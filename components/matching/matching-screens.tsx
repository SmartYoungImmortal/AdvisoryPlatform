"use client";

import { ArrowUp, Check, ChevronDown, RotateCw, SearchX, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";

import { authPill } from "@/components/auth/auth-split";
import { useMountTime, useQueryValue } from "@/components/bookings/booking-flow";
import { BottomBar } from "@/components/bottombar";
import { SiteFooter } from "@/components/marketing/site-footer";
import { MobileScreen, ScreenBody } from "@/components/mobile/screen";
import { ResultCard } from "@/components/search/search-screen";
import { TopBar } from "@/components/topbar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { getMatchingStatus, matchServices, type ApiMatching } from "@/lib/api/matching";
import { listServiceSlots } from "@/lib/api/resources";
import { useResource } from "@/lib/api/use-resource";
import { useLiveCatalogue, type LiveService } from "@/lib/catalogue/live";
import { cn } from "@/lib/utils";

/**
 * Matching: ask in your own words, the way you would ask a person. The first
 * step is one composer — the problem, and optionally a topic, a budget and how
 * soon — and the second the services that fit, each with why it fits and when
 * it is first free.
 *
 * `POST /matching` does the choosing. With a model key on the API, Claude
 * reads the problem against the published catalogue and says why each service
 * fits; without one the API matches the problem's words, and if the route
 * cannot be reached at all the same word matching runs here (`rank`). The
 * page only says "AI" when `GET /matching/status` says a model is reading.
 *
 * ## Where the answers live
 *
 * In `sessionStorage`, not the address: a problem can be private, and a URL
 * ends up in history, in referrers and in shared links. The request is a POST
 * for the same reason.
 */

const STORE_KEY = "advisory.matching";

const BUDGETS = ["any", "500", "1000", "2000"] as const;
const WHENS = ["any", "soon", "week"] as const;
type Budget = (typeof BUDGETS)[number];
type When = (typeof WHENS)[number];

type Answers = {
  readonly categoryId: string | null;
  readonly problem: string;
  readonly budget: Budget;
  readonly when: When;
};

/** How many days ahead each answer to "when" looks for an open time. */
const WINDOW_DAYS: Record<When, number> = { soon: 3, week: 7, any: 30 };

/** How many candidates have their open times read. */
const CANDIDATES = 12;

const PROBLEM_MAX = 1000;

/* ------------------------------------------------------------- the answers */

const SERVER = "\u0000server";
const answerListeners = new Set<() => void>();

function readStored(): string | null {
  try {
    return window.sessionStorage.getItem(STORE_KEY);
  } catch {
    return null;
  }
}

function subscribeStored(listener: () => void): () => void {
  answerListeners.add(listener);
  return () => answerListeners.delete(listener);
}

function saveAnswers(answers: Answers): void {
  try {
    window.sessionStorage.setItem(STORE_KEY, JSON.stringify(answers));
  } catch {
    // A private window can refuse storage; the results page then asks again.
  }
  for (const listener of answerListeners) listener();
}

function parseAnswers(raw: string | null): Answers | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<Answers>;
    return {
      categoryId: typeof value.categoryId === "string" ? value.categoryId : null,
      problem: typeof value.problem === "string" ? value.problem : "",
      budget: BUDGETS.includes(value.budget as Budget) ? (value.budget as Budget) : "any",
      when: WHENS.includes(value.when as When) ? (value.when as When) : "any",
    };
  } catch {
    return null;
  }
}

/** The stored answers: `undefined` until the browser has been asked, `null` when there are none. */
function useAnswers(): Answers | null | undefined {
  const raw = useSyncExternalStore(subscribeStored, readStored, () => SERVER);
  return useMemo(() => (raw === SERVER ? undefined : parseAnswers(raw)), [raw]);
}

/** Whether a model reads problems; false until the API says otherwise. */
function useAiOn(): boolean {
  const status = useResource<{ readonly ai: boolean }>(
    "matching/status",
    useCallback((signal: AbortSignal) => getMatchingStatus(signal), []),
  );
  return status.data?.ai ?? false;
}

/* -------------------------------------------------- matching, done locally */

/** Words that say nothing about the problem, in either language. */
const STOPWORDS = new Set([
  "ผม", "ฉัน", "ดิฉัน", "เรา", "หนู", "อยาก", "ต้องการ", "ให้", "ช่วย", "เรื่อง", "เกี่ยวกับ", "คือ", "และ", "หรือ",
  "ที่", "ของ", "ได้", "ไม่", "มี", "เป็น", "จะ", "ครับ", "ค่ะ", "คะ", "นะ", "ด้วย", "ยังไง", "อย่างไร", "แบบ", "ไหน",
  "อะไร", "กับ", "ใน", "แล้ว", "ก็", "ว่า", "การ", "ความ", "ต้อง", "เพิ่ง", "เริ่ม", "แน่ใจ", "ไม่แน่ใจ", "ยัง", "จาก", "กำลัง",
  "ตอนนี้", "รับ", "ทำ", "ไป", "มา", "อยู่", "ตัว", "คน", "เท่า", "the", "and", "for", "with", "how", "what", "need",
  "want",
]);

/**
 * The problem's word-like pieces, split the way the language splits them —
 * Thai has no spaces between words, so `Intl.Segmenter` does it, and it cuts
 * a loanword such as "ฟรีแลนซ์" into pieces ("ฟรี", "แลน", "ซ์").
 */
function piecesOf(text: string): readonly string[] {
  const lower = text.toLowerCase();
  if (typeof Intl.Segmenter !== "function") return lower.split(/[\s,.;:!?()"'/\\-]+/).filter(Boolean);
  const segmenter = new Intl.Segmenter("th", { granularity: "word" });
  return [...segmenter.segment(lower)].filter((part) => part.isWordLike).map((part) => part.segment.trim());
}

/**
 * The problem's words found in a service's words: runs of one to three
 * neighbouring pieces, rejoined, so "ฟรีแลนซ์" is found whole; a run is kept
 * only if no longer found run contains it, and none is filler or shorter than
 * three characters. The API matches the same way.
 */
function matchedIn(pieces: readonly string[], haystack: string): readonly string[] {
  const found = new Set<string>();
  for (let start = 0; start < pieces.length; start++) {
    for (let length = 1; length <= 3 && start + length <= pieces.length; length++) {
      const parts = pieces.slice(start, start + length);
      const run = parts.join("");
      // A run of nothing but filler ("แบบ" + "ไหน") says no more than its pieces.
      const filler = parts.every((part) => STOPWORDS.has(part));
      if (run.length >= 3 && !filler && !STOPWORDS.has(run) && haystack.includes(run)) found.add(run);
    }
  }
  const runs = [...found];
  return runs.filter((run) => !runs.some((other) => other !== run && other.includes(run)));
}

type Candidate = {
  readonly item: LiveService;
  readonly reason: string | null;
  readonly matched: readonly string[];
};

/** Done here only when the API cannot be reached: the topic and budget filter, the problem's words rank. */
function rank(items: readonly LiveService[], answers: Answers): readonly Candidate[] {
  const pieces = piecesOf(answers.problem);
  const ceiling = answers.budget === "any" ? Infinity : Number(answers.budget);
  return items
    .filter((item) => (answers.categoryId ? item.categoryId === answers.categoryId : true))
    .filter((item) => item.price <= ceiling)
    .map((item) => {
      const haystack = `${item.title} ${item.description} ${item.category} ${item.advisorHeadline}`.toLowerCase();
      const matched = matchedIn(pieces, haystack);
      const weight = matched.reduce((sum, word) => sum + Math.min(word.length, 8), 0);
      return { item, matched, reason: null, weight: weight + (item.rating ?? 0) / 5 };
    })
    .filter((candidate) => pieces.length === 0 || answers.categoryId !== null || candidate.matched.length > 0)
    .toSorted((a, b) => b.weight - a.weight)
    .map(({ item, matched, reason }) => ({ item, matched, reason }));
}

/** `YYYY-MM-DD` in the reader's own zone. */
function localDay(date: Date): string {
  return new Intl.DateTimeFormat("sv-SE").format(date);
}

/* ------------------------------------------------------------------- frame */

/** The search page's frame: the app bar, the 1200 column on white, the footer from `lg`, the tab bar on the phone. */
function MatchingFrame({ children }: { readonly children: ReactNode }) {
  return (
    <MobileScreen className="pb-0" wide="md">
      <ScreenBody className="bg-card pb-18 lg:pb-0">
        <TopBar dock unreadNotifications />
        <div className="doc-scale mx-auto flex w-full max-w-300 flex-1 flex-col px-5 pt-3 pb-14 md:px-20 md:pt-4 lg:px-8 lg:pt-6 lg:pb-24">
          {children}
        </div>
        <SiteFooter className="hidden lg:flex" />
      </ScreenBody>
      <BottomBar className="lg:hidden" role="user" selected="home" />
    </MobileScreen>
  );
}

/** "AI ช่วยหา" — only while a model is actually reading problems. */
function AiBadge() {
  const t = useTranslations("matching");
  return (
    <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-muted px-3 text-xs font-medium text-foreground md:h-9 md:px-4 md:text-sm">
      <Sparkles aria-hidden className="size-3.5 md:size-4" />
      {t("aiBadge")}
    </span>
  );
}

/** A small choice in the composer: its value in a capsule, the options in a menu. */
function Choice<T extends string>({ label, value, options, onChange }: {
  readonly label: string;
  readonly value: T;
  readonly options: readonly { readonly value: T; readonly label: string }[];
  readonly onChange: (next: T) => void;
}) {
  const current = options.find((option) => option.value === value)?.label ?? "";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`${label}: ${current}`}
        className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-sm text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="text-muted-foreground">{label}</span>
        <span className="max-w-40 truncate font-medium">{current}</span>
        <ChevronDown aria-hidden className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 min-w-48 overflow-y-auto rounded-2xl p-1.5">
        {options.map((option) => (
          <DropdownMenuItem className="h-10 gap-2 rounded-xl px-3 text-sm" key={option.value} onClick={() => onChange(option.value)}>
            <Check aria-hidden className={cn("size-4", option.value === value ? "opacity-100" : "opacity-0")} />
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* --------------------------------------------------------------- step one */

/**
 * `/matching`: one composer, as a chat asks — the problem in your own words,
 * with the topic, budget and how soon as small choices under it, and examples
 * to start from. Opened from the search's empty result it starts with what was
 * searched for (`?q=`).
 */
export function ProblemDescriptionScreen() {
  const answers = useAnswers();
  const query = useQueryValue("q");
  const aiOn = useAiOn();
  const t = useTranslations("matching");

  return (
    <MatchingFrame>
      <header className="mx-auto flex w-full max-w-200 flex-col items-center gap-4 pt-4 text-center md:pt-10 lg:pt-14">
        {aiOn ? <AiBadge /> : null}
        <h1 className="font-hero text-3xl font-normal tracking-tight text-balance text-hero-ink md:text-hero">{t("problemTitle")}</h1>
        <p className="max-w-xl text-sm text-balance text-muted-foreground md:text-base">{aiOn ? t("problemSubtitleAi") : t("problemSubtitle")}</p>
      </header>
      {answers === undefined ? (
        <div aria-hidden className="mx-auto mt-8 h-48 w-full max-w-200 animate-pulse rounded-3xl bg-muted motion-reduce:animate-none md:mt-10" />
      ) : (
        <Composer initial={answers ?? { categoryId: null, problem: query ?? "", budget: "any", when: "any" }} />
      )}
    </MatchingFrame>
  );
}

function Composer({ initial }: { readonly initial: Answers }) {
  const t = useTranslations("matching");
  const format = useFormatter();
  const router = useRouter();
  const catalogue = useLiveCatalogue();
  const [problem, setProblem] = useState(initial.problem);
  const [categoryId, setCategoryId] = useState(initial.categoryId ?? "all");
  const [budget, setBudget] = useState<Budget>(initial.budget);
  const [when, setWhen] = useState<When>(initial.when);
  const [missing, setMissing] = useState(false);

  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    for (const item of catalogue.items) if (!seen.has(item.categoryId)) seen.set(item.categoryId, item.category);
    return [...seen].map(([id, name]) => ({ value: id, label: name })).toSorted((a, b) => a.label.localeCompare(b.label));
  }, [catalogue.items]);
  const baht = (amount: number) => format.number(amount, { style: "currency", currency: "THB", maximumFractionDigits: 0 });
  const examples = [t("example1"), t("example2"), t("example3")];

  const submit = () => {
    if (problem.trim().length < 3 && categoryId === "all") {
      setMissing(true);
      return;
    }
    saveAnswers({ categoryId: categoryId === "all" ? null : categoryId, problem: problem.trim(), budget, when });
    router.push("/matching/results");
  };

  return (
    <div className="mx-auto mt-8 flex w-full max-w-200 flex-col gap-6 md:mt-10">
      <form
        className="flex flex-col gap-2 rounded-3xl bg-card p-3 shadow-hero-card ring-1 ring-hero-card-border transition-shadow focus-within:shadow-hero-card-hover md:p-4"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <label className="sr-only" htmlFor="matching-problem">
          {t("detailLabel")}
        </label>
        <Textarea
          aria-describedby="matching-problem-hint"
          aria-invalid={missing || undefined}
          className="min-h-28 resize-none border-0 bg-transparent px-2 py-2 text-base shadow-none focus-visible:ring-0 md:min-h-32 md:px-3 md:text-lg"
          id="matching-problem"
          maxLength={PROBLEM_MAX}
          onChange={(event) => {
            setProblem(event.target.value);
            setMissing(false);
          }}
          onKeyDown={(event) => {
            // Enter sends, as a chat does; Shift+Enter starts a new line.
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder={t("detailPlaceholder")}
          value={problem}
        />
        <div className="flex items-end justify-between gap-3">
          <div className="flex min-w-0 flex-wrap gap-2">
            <Choice
              label={t("topicLabel")}
              onChange={setCategoryId}
              options={[{ value: "all", label: t("topicAny") }, ...categories]}
              value={categoryId}
            />
            <Choice
              label={t("budgetLabel")}
              onChange={setBudget}
              options={BUDGETS.map((option) => ({
                value: option,
                label: option === "any" ? t("budgetAny") : t("budgetUpTo", { amount: baht(Number(option)) }),
              }))}
              value={budget}
            />
            <Choice
              label={t("whenLabel")}
              onChange={setWhen}
              options={WHENS.map((option) => ({
                value: option,
                label: t(option === "soon" ? "whenSoon" : option === "week" ? "whenWeek" : "whenAny"),
              }))}
              value={when}
            />
          </div>
          <Button
            aria-label={t("search")}
            className="size-11 shrink-0 rounded-full bg-hero-action p-0 text-hero-action-foreground hover:bg-hero-action/85 md:size-12"
            type="submit"
          >
            <ArrowUp aria-hidden className="size-5" />
          </Button>
        </div>
      </form>

      <p className={cn("px-2 text-xs md:text-sm", missing ? "text-destructive" : "text-muted-foreground")} id="matching-problem-hint" role={missing ? "alert" : undefined}>
        {missing ? t("needSomething") : t("detailHint")}
      </p>

      <div className="flex flex-col gap-3">
        <p className="px-2 text-sm font-medium text-foreground">{t("examplesTitle")}</p>
        <div className="flex flex-col gap-2 md:flex-row md:flex-wrap">
          {examples.map((example) => (
            <button
              className="rounded-2xl border border-border px-4 py-3 text-start text-sm text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 md:max-w-[calc(50%-0.25rem)]"
              key={example}
              onClick={() => {
                setProblem(example);
                setMissing(false);
                document.getElementById("matching-problem")?.focus();
              }}
              type="button"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- step two */

const GRID =
  "grid grid-cols-2 gap-x-4 gap-y-8 md:gap-x-8 md:gap-y-12 lg:grid-cols-4 lg:gap-x-10 lg:gap-y-14";

/**
 * `/matching/results`: the question as asked, what was understood of it, and
 * the services that fit, best first — each the search page's card with why it
 * fits (or the words it matched) and its earliest open time under it.
 */
export function MatchedAdvisorsScreen() {
  const answers = useAnswers();
  const t = useTranslations("matching");

  if (answers === null) {
    return (
      <MatchingFrame>
        <Notice
          action={{ href: "/matching", label: t("noAnswersAction") }}
          body={t("noAnswersBody")}
          title={t("noAnswersTitle")}
        />
      </MatchingFrame>
    );
  }
  return <MatchingFrame>{answers ? <Results answers={answers} /> : <ResultsBones />}</MatchingFrame>;
}

function Results({ answers }: { readonly answers: Answers }) {
  const t = useTranslations("matching");
  const s = useTranslations("search");
  const format = useFormatter();
  const now = useMountTime();
  const catalogue = useLiveCatalogue();

  const request = useMemo(
    () => ({
      problem: answers.problem || catalogue.items.find((item) => item.categoryId === answers.categoryId)?.category || "-",
      categoryId: answers.categoryId ?? undefined,
      maxPriceSatang: answers.budget === "any" ? undefined : Number(answers.budget) * 100,
    }),
    [answers, catalogue.items],
  );
  const requestKey = JSON.stringify(request);
  const matching = useResource<ApiMatching>(
    `matching:${requestKey}`,
    useCallback((signal: AbortSignal) => matchServices(JSON.parse(requestKey) as typeof request, signal), [requestKey]),
  );

  // The API's choice, held to the catalogue the cards are drawn from; the
  // local ranking only when the API could not be reached.
  const candidates: readonly Candidate[] = useMemo(() => {
    if (matching.data) {
      const byId = new Map(catalogue.items.map((item) => [item.id, item]));
      return matching.data.matches.flatMap((match) => {
        const item = byId.get(match.serviceId);
        return item ? [{ item, reason: match.reason, matched: match.matched }] : [];
      });
    }
    if (matching.error) return rank(catalogue.items, answers).slice(0, CANDIDATES);
    return [];
  }, [matching.data, matching.error, catalogue.items, answers]);

  const days = WINDOW_DAYS[answers.when];
  const from = localDay(new Date(now));
  const to = localDay(new Date(now + (days - 1) * 86_400_000));
  const idKey = candidates.map((candidate) => candidate.item.id).join(",");
  const slots = useResource<ReadonlyMap<string, string | null>>(
    idKey ? `matching/slots?ids=${idKey}&from=${from}&to=${to}` : "matching/slots:none",
    useCallback(
      async (signal: AbortSignal) => {
        // One service whose times cannot be read (a screened one, say) is
        // "no time shown", not a page that fails.
        const settled = await Promise.allSettled(
          idKey.split(",").filter(Boolean).map((id) => listServiceSlots(id, { from, to }, signal)),
        );
        const earliest = new Map<string, string | null>();
        idKey.split(",").filter(Boolean).forEach((id, index) => {
          const answer = settled[index];
          const list = answer?.status === "fulfilled" ? answer.value : [];
          earliest.set(id, list.map((slot) => slot.startTime).toSorted((a, b) => a.localeCompare(b))[0] ?? null);
        });
        return earliest;
      },
      [idKey, from, to],
    ),
  );

  const ordered = useMemo(() => {
    if (!slots.data || answers.when === "any") return candidates;
    const open = (id: string) => (slots.data?.get(id) ? 1 : 0);
    return candidates.toSorted((a, b) => open(b.item.id) - open(a.item.id));
  }, [candidates, slots.data, answers.when]);

  const today = localDay(new Date(now));
  const tomorrow = localDay(new Date(now + 86_400_000));
  const timeLabel = (iso: string) => {
    const date = new Date(iso);
    const time = format.dateTime(date, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    const day = localDay(date);
    if (day === today) return t("today", { time });
    if (day === tomorrow) return t("tomorrow", { time });
    return format.dateTime(date, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  };

  const thinking = matching.loading || catalogue.loading;
  const ai = matching.data?.mode === "ai";

  return (
    <>
      <header className="mx-auto flex w-full max-w-200 flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-muted-foreground">{t("yourQuestion")}</p>
          <Button
            className={cn(authPill(false), "h-9 w-auto px-4 text-sm md:h-10 md:px-4 md:text-sm")}
            nativeButton={false}
            render={<Link href="/matching" />}
            variant="outline"
          >
            {t("editAnswers")}
          </Button>
        </div>
        <blockquote className="line-clamp-4 rounded-3xl rounded-tl-lg bg-muted px-5 py-4 text-base text-foreground md:text-lg">
          {answers.problem || request.problem}
        </blockquote>

        {/* What was understood, or the word matching it fell back to. */}
        {thinking ? (
          <div aria-live="polite" className="flex items-start gap-3 rounded-2xl border border-border p-4 md:p-5">
            <Sparkles aria-hidden className="mt-0.5 size-5 shrink-0 animate-pulse text-foreground motion-reduce:animate-none" />
            <div className="flex w-full flex-col gap-2">
              <p className="text-sm font-medium text-foreground md:text-base">{t("thinking")}</p>
              <span aria-hidden className="h-3 w-4/5 animate-pulse rounded bg-muted motion-reduce:animate-none" />
              <span aria-hidden className="h-3 w-3/5 animate-pulse rounded bg-muted motion-reduce:animate-none" />
            </div>
          </div>
        ) : ai && matching.data?.understanding ? (
          <div className="flex items-start gap-3 rounded-2xl border border-border p-4 md:p-5">
            <Sparkles aria-hidden className="mt-0.5 size-5 shrink-0 text-foreground" />
            <div className="flex flex-col gap-3">
              <p className="text-sm text-foreground md:text-base">{matching.data.understanding}</p>
              {matching.data.topics.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {matching.data.topics.map((topic) => (
                    <span className="flex h-8 items-center rounded-full bg-muted px-3 text-xs font-medium text-foreground md:text-sm" key={topic}>
                      {topic}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </header>

      <section aria-live="polite" className="mt-10 flex flex-col gap-4 md:mt-12">
        {catalogue.error ? (
          <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
            <h2 className="text-xl font-bold text-foreground">{t("loadFailed")}</h2>
            <p className="max-w-md text-sm text-muted-foreground">{catalogue.error.message}</p>
            <Button className={cn(authPill(true), "w-auto")} onClick={catalogue.reload} type="button">
              <RotateCw aria-hidden />
              {s("retry")}
            </Button>
          </div>
        ) : thinking ? (
          <ResultsBones />
        ) : ordered.length === 0 ? (
          <Notice
            action={{ href: "/matching", label: t("editAnswers") }}
            body={t("noResultsBody")}
            secondary={{ href: "/search", label: t("browseAll") }}
            title={t("noResultsTitle")}
          />
        ) : (
          <>
            <h2 className="text-lg font-semibold text-foreground md:text-xl">{t("resultsTitle")}</h2>
            <div className={GRID}>
              {ordered.map(({ item, matched, reason }) => {
                const earliest = slots.data?.get(item.id);
                return (
                  <div className="flex flex-col gap-2.5" key={item.id}>
                    <ResultCard item={item} />
                    {reason ? (
                      <p className="flex gap-1.5 rounded-xl bg-muted/70 px-3 py-2 text-xs text-foreground md:text-sm">
                        <Sparkles aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                        <span>{reason}</span>
                      </p>
                    ) : matched.length > 0 ? (
                      <p className="truncate px-0.5 text-xs text-muted-foreground">{t("matchedOn", { words: matched.slice(0, 3).join(", ") })}</p>
                    ) : null}
                    <p className="px-0.5 text-xs md:text-sm">
                      {slots.data === undefined ? (
                        <span className="text-muted-foreground">{t("checkingSlots")}</span>
                      ) : earliest ? (
                        <span className="font-medium text-success">{t("earliest", { when: timeLabel(earliest) })}</span>
                      ) : (
                        <span className="text-muted-foreground">{t("noSlotInWindow")}</span>
                      )}
                    </p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </>
  );
}

/** The grid's own shape while the answer is on its way. */
function ResultsBones() {
  return (
    <div aria-hidden className={GRID}>
      {Array.from({ length: 4 }, (_, i) => (
        <div className="flex flex-col gap-3" key={i}>
          <span className="aspect-[4/3] w-full animate-pulse rounded-2xl bg-muted motion-reduce:animate-none" />
          <span className="h-4 w-1/2 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
          <span className="h-4 w-4/5 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
        </div>
      ))}
    </div>
  );
}

/** Nothing to show: a plain glyph, what happened, and the ways on — the search page's empty result. */
function Notice({ title, body, action, secondary }: {
  readonly title: string;
  readonly body: string;
  readonly action: { readonly href: string; readonly label: string };
  readonly secondary?: { readonly href: string; readonly label: string };
}) {
  return (
    <div className="flex flex-col items-center gap-5 px-6 py-16 text-center lg:py-32">
      <span className="flex size-14 items-center justify-center rounded-full bg-muted">
        <SearchX aria-hidden className="size-6 text-muted-foreground" />
      </span>
      <div className="flex max-w-md flex-col gap-1.5">
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{body}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button className={cn(authPill(true), "w-auto")} nativeButton={false} render={<Link href={action.href} />}>
          {action.label}
        </Button>
        {secondary ? (
          <Button className={cn(authPill(false), "w-auto")} nativeButton={false} render={<Link href={secondary.href} />} variant="outline">
            {secondary.label}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
