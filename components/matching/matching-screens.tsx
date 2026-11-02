"use client";

import { RotateCw, SearchX, Sparkles } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { listServiceSlots } from "@/lib/api/resources";
import { useResource } from "@/lib/api/use-resource";
import { useLiveCatalogue, type LiveService } from "@/lib/catalogue/live";
import { cn } from "@/lib/utils";

/**
 * Matching: a guided search for someone who does not know what to type. Two
 * steps — say what it is about, in a sentence or a topic, with a budget and
 * how soon — then the services that fit, each with its earliest open time.
 *
 * It runs on what the catalogue already offers: every listed service with its
 * advisor and rating (`useLiveCatalogue`, the search page's read), and each
 * candidate's open times (`GET /services/:id/slots`, public). There is no
 * matching route on the API and none is needed for this: the ranking is done
 * here, from the words of the problem against each service's own words.
 *
 * ## Where the answers live
 *
 * In `sessionStorage`, not the address: a problem can be private ("my
 * divorce", "my debts"), and a URL ends up in history, in referrers and in
 * shared links. The answers stay on the device for the tab's life and nothing
 * sends them anywhere; the results page reads them back.
 */

const STORE_KEY = "advisory.matching";

const BUDGETS = ["any", "500", "1000", "2000"] as const;
const WHENS = ["soon", "week", "any"] as const;
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

/** How many of the best candidates have their open times read. */
const CANDIDATES = 12;

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

/* ---------------------------------------------------------------- matching */

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
 * only if no longer found run contains it, and none is a stopword or shorter
 * than three characters.
 */
function matchedIn(pieces: readonly string[], haystack: string): readonly string[] {
  const found = new Set<string>();
  for (let start = 0; start < pieces.length; start++) {
    for (let length = 1; length <= 3 && start + length <= pieces.length; length++) {
      const run = pieces.slice(start, start + length).join("");
      if (run.length >= 3 && !STOPWORDS.has(run) && haystack.includes(run)) found.add(run);
    }
  }
  const runs = [...found];
  return runs.filter((run) => !runs.some((other) => other !== run && other.includes(run)));
}

type Candidate = {
  readonly item: LiveService;
  readonly score: number;
  readonly matched: readonly string[];
};

/**
 * The services that fit, best first: the chosen topic and budget filter;
 * the problem's words found in a service's title, description, topic and its
 * advisor's line of work score it, and its rating breaks ties.
 */
function rank(items: readonly LiveService[], answers: Answers): readonly Candidate[] {
  const pieces = piecesOf(answers.problem);
  const ceiling = answers.budget === "any" ? Infinity : Number(answers.budget);
  return items
    .filter((item) => (answers.categoryId ? item.categoryId === answers.categoryId : true))
    .filter((item) => item.price <= ceiling)
    .map((item) => {
      const haystack = `${item.title} ${item.description} ${item.category} ${item.advisorHeadline}`.toLowerCase();
      const matched = matchedIn(pieces, haystack);
      const rating = item.rating ?? 0;
      // A longer word found is a stronger sign than a short one.
      const weight = matched.reduce((sum, word) => sum + Math.min(word.length, 8), 0);
      return { item, matched, score: weight + rating / 5 + Math.min(item.reviews, 50) / 100 };
    })
    .filter((candidate) => pieces.length === 0 || answers.categoryId !== null || candidate.matched.length > 0)
    .toSorted((a, b) => b.score - a.score);
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

/** A choice as a capsule, the chosen one filled in ink. */
function Capsule({ selected, onClick, children }: {
  readonly selected: boolean;
  readonly onClick: () => void;
  readonly children: ReactNode;
}) {
  return (
    <Button
      aria-pressed={selected}
      className={cn(
        "h-10 shrink-0 rounded-full border px-4 text-sm font-medium whitespace-nowrap md:h-11 md:px-5 md:text-base",
        selected
          ? "border-hero-action bg-hero-action text-hero-action-foreground hover:bg-hero-action/90 hover:text-hero-action-foreground"
          : "border-border bg-card text-foreground hover:bg-muted",
      )}
      onClick={onClick}
      type="button"
      variant="ghost"
    >
      {children}
    </Button>
  );
}

/** A question: its label, and its answers under it. */
function Question({ label, children, htmlFor }: { readonly label: string; readonly children: ReactNode; readonly htmlFor?: string }) {
  return (
    <div className="flex flex-col gap-3">
      {htmlFor ? (
        <label className="text-base font-semibold text-foreground md:text-lg" htmlFor={htmlFor}>
          {label}
        </label>
      ) : (
        <p className="text-base font-semibold text-foreground md:text-lg">{label}</p>
      )}
      {children}
    </div>
  );
}

/* --------------------------------------------------------------- step one */

/**
 * `/matching`: the problem, in a topic or a sentence (either is enough), the
 * budget and how soon. Opened from the search's empty result it starts with
 * what was searched for (`?q=`).
 */
export function ProblemDescriptionScreen() {
  const answers = useAnswers();
  const query = useQueryValue("q");
  const t = useTranslations("matching");

  return (
    <MatchingFrame>
      <header className="mx-auto flex w-full max-w-170 flex-col items-center gap-3 text-center">
        <h1 className="font-hero text-2xl font-normal tracking-tight text-hero-ink md:text-hero">{t("problemTitle")}</h1>
        <p className="max-w-xl text-sm text-balance text-muted-foreground md:text-base">{t("problemSubtitle")}</p>
      </header>
      {answers === undefined ? (
        <div aria-hidden className="mx-auto mt-10 flex w-full max-w-170 flex-col gap-6">
          <span className="h-10 w-2/3 animate-pulse rounded-full bg-muted motion-reduce:animate-none" />
          <span className="h-32 w-full animate-pulse rounded-2xl bg-muted motion-reduce:animate-none" />
        </div>
      ) : (
        <ProblemForm initial={answers ?? { categoryId: null, problem: query ?? "", budget: "any", when: "any" }} />
      )}
    </MatchingFrame>
  );
}

function ProblemForm({ initial }: { readonly initial: Answers }) {
  const t = useTranslations("matching");
  const format = useFormatter();
  const router = useRouter();
  const catalogue = useLiveCatalogue();
  const [categoryId, setCategoryId] = useState(initial.categoryId);
  const [problem, setProblem] = useState(initial.problem);
  const [budget, setBudget] = useState<Budget>(initial.budget);
  const [when, setWhen] = useState<When>(initial.when);
  const [missing, setMissing] = useState(false);

  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    for (const item of catalogue.items) if (!seen.has(item.categoryId)) seen.set(item.categoryId, item.category);
    return [...seen].map(([id, name]) => ({ id, name })).toSorted((a, b) => a.name.localeCompare(b.name));
  }, [catalogue.items]);

  const baht = (amount: number) => format.number(amount, { style: "currency", currency: "THB", maximumFractionDigits: 0 });

  return (
    <form
      className="mx-auto mt-10 flex w-full max-w-170 flex-col gap-8 md:mt-12 md:gap-10"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (!categoryId && problem.trim().length < 3) {
          setMissing(true);
          return;
        }
        saveAnswers({ categoryId, problem: problem.trim(), budget, when });
        router.push("/matching/results");
      }}
    >
      <Question label={t("topicLabel")}>
        <div className="flex flex-wrap gap-2 md:gap-2.5">
          <Capsule onClick={() => setCategoryId(null)} selected={categoryId === null}>
            {t("topicAny")}
          </Capsule>
          {catalogue.loading && categories.length === 0
            ? [0, 1, 2, 3].map((i) => (
                <span aria-hidden className="h-10 w-24 animate-pulse rounded-full bg-muted motion-reduce:animate-none md:h-11" key={i} />
              ))
            : categories.map((category) => (
                <Capsule
                  key={category.id}
                  onClick={() => {
                    setCategoryId(category.id);
                    setMissing(false);
                  }}
                  selected={categoryId === category.id}
                >
                  {category.name}
                </Capsule>
              ))}
        </div>
      </Question>

      <Question htmlFor="matching-problem" label={t("detailLabel")}>
        <Textarea
          aria-describedby="matching-problem-hint"
          className="min-h-32 resize-y rounded-2xl border-accented bg-card px-4 py-3 text-base shadow-none md:min-h-36"
          id="matching-problem"
          maxLength={1000}
          onChange={(event) => {
            setProblem(event.target.value);
            setMissing(false);
          }}
          placeholder={t("detailPlaceholder")}
          value={problem}
        />
        <p className="text-xs text-muted-foreground md:text-sm" id="matching-problem-hint">
          {t("detailHint")}
        </p>
      </Question>

      <Question label={t("budgetLabel")}>
        <div className="flex flex-wrap gap-2 md:gap-2.5">
          {BUDGETS.map((option) => (
            <Capsule key={option} onClick={() => setBudget(option)} selected={budget === option}>
              {option === "any" ? t("budgetAny") : t("budgetUpTo", { amount: baht(Number(option)) })}
            </Capsule>
          ))}
        </div>
      </Question>

      <Question label={t("whenLabel")}>
        <div className="flex flex-wrap gap-2 md:gap-2.5">
          {WHENS.map((option) => (
            <Capsule key={option} onClick={() => setWhen(option)} selected={when === option}>
              {t(option === "soon" ? "whenSoon" : option === "week" ? "whenWeek" : "whenAny")}
            </Capsule>
          ))}
        </div>
      </Question>

      <div className="flex flex-col items-stretch gap-3 md:items-start">
        {missing ? (
          <p className="text-sm text-destructive" role="alert">
            {t("needSomething")}
          </p>
        ) : null}
        <Button className={cn(authPill(true), "md:w-auto md:px-8")} type="submit">
          <Sparkles aria-hidden />
          {t("search")}
        </Button>
      </div>
    </form>
  );
}

/* --------------------------------------------------------------- step two */

const GRID =
  "grid grid-cols-2 gap-x-4 gap-y-8 md:gap-x-8 md:gap-y-12 lg:grid-cols-4 lg:gap-x-10 lg:gap-y-14";

/**
 * `/matching/results`: the services that fit the stored answers, best first,
 * each the search page's card with its earliest open time under it. A topic
 * or budget that leaves nothing says so, with the way back to the answers and
 * to everything.
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
  const ranked = useMemo(() => rank(catalogue.items, answers), [catalogue.items, answers]);
  const top = ranked.slice(0, CANDIDATES);

  const days = WINDOW_DAYS[answers.when];
  const from = localDay(new Date(now));
  const to = localDay(new Date(now + (days - 1) * 86_400_000));
  const ids = top.map((candidate) => candidate.item.id);
  const idKey = ids.join(",");
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
          const first = list.map((slot) => slot.startTime).toSorted()[0];
          earliest.set(id, first ?? null);
        });
        return earliest;
      },
      [idKey, from, to],
    ),
  );

  const ordered = useMemo(() => {
    if (!slots.data) return top;
    const at = (id: string) => slots.data?.get(id) ?? null;
    return top.toSorted((a, b) => {
      if (answers.when !== "any") {
        const open = Number(at(b.item.id) !== null) - Number(at(a.item.id) !== null);
        if (open !== 0) return open;
      }
      if (b.score !== a.score) return b.score - a.score;
      return (at(a.item.id) ?? "~").localeCompare(at(b.item.id) ?? "~");
    });
  }, [top, slots.data, answers.when]);

  const category = catalogue.items.find((item) => item.categoryId === answers.categoryId)?.category;
  const summary = [
    category ?? t("topicAny"),
    answers.budget === "any"
      ? t("budgetAny")
      : t("budgetUpTo", { amount: format.number(Number(answers.budget), { style: "currency", currency: "THB", maximumFractionDigits: 0 }) }),
    t(answers.when === "soon" ? "whenSoon" : answers.when === "week" ? "whenWeek" : "whenAny"),
  ];

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

  return (
    <>
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="font-hero text-2xl font-normal tracking-tight text-hero-ink md:text-4xl">{t("resultsTitle")}</h1>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground md:text-base">
            {summary.map((part, index) => (
              <span className="flex items-center gap-2" key={part}>
                {index > 0 ? <span aria-hidden>·</span> : null}
                {part}
              </span>
            ))}
          </p>
        </div>
        <Button
          className={cn(authPill(false), "h-10 w-auto px-4 text-sm md:h-11 md:px-5 md:text-base")}
          nativeButton={false}
          render={<Link href="/matching" />}
          variant="outline"
        >
          {t("editAnswers")}
        </Button>
      </header>

      <section aria-live="polite" className="mt-8 flex flex-col gap-4 md:mt-10">
        {catalogue.error ? (
          <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
            <h2 className="text-xl font-bold text-foreground">{t("loadFailed")}</h2>
            <p className="max-w-md text-sm text-muted-foreground">{catalogue.error.message}</p>
            <Button className={cn(authPill(true), "w-auto")} onClick={catalogue.reload} type="button">
              <RotateCw aria-hidden />
              {s("retry")}
            </Button>
          </div>
        ) : catalogue.loading ? (
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
            <p className="text-sm font-medium text-foreground">{t("resultsCount", { count: ordered.length })}</p>
            <div className={GRID}>
              {ordered.map(({ item, matched }) => {
                const earliest = slots.data?.get(item.id);
                return (
                  <div className="flex flex-col gap-2" key={item.id}>
                    <ResultCard item={item} />
                    <p className="px-0.5 text-xs md:text-sm">
                      {slots.data === undefined ? (
                        <span className="text-muted-foreground">{t("checkingSlots")}</span>
                      ) : earliest ? (
                        <span className="font-medium text-success">{t("earliest", { when: timeLabel(earliest) })}</span>
                      ) : (
                        <span className="text-muted-foreground">{t("noSlotInWindow")}</span>
                      )}
                    </p>
                    {matched.length > 0 ? (
                      <p className="truncate px-0.5 text-xs text-muted-foreground">
                        {t("matchedOn", { words: matched.slice(0, 3).join(", ") })}
                      </p>
                    ) : null}
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

/** The grid's own shape while the catalogue loads. */
function ResultsBones() {
  return (
    <div aria-hidden className={GRID}>
      {Array.from({ length: 8 }, (_, i) => (
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
