"use client";

import { ArrowUp, RotateCcw, Sparkles, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";

import { useQueryValue } from "@/components/bookings/booking-flow";
import { ServicePrice, VerifiedTick } from "@/components/home/parts";
import { MobileScreen, ScreenBody } from "@/components/mobile/screen";
import { HandwrittenWord } from "@/components/search/handwritten-word";
import { AdvisorFace, Rating as SearchRating, ResultCard } from "@/components/search/search-screen";
import { TopBar } from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";
import { chatMatching, matchServices, type ApiMatching } from "@/lib/api/matching";
import { getService } from "@/lib/api/resources";
import type { ApiPublicService, ApiServicePackage } from "@/lib/api/types";
import { useResource } from "@/lib/api/use-resource";
import { useLiveCatalogue, type LiveService } from "@/lib/catalogue/live";
import { cn } from "@/lib/utils";

/**
 * `/matching`: a chat that finds services.
 *
 * Before the first message: a heading with one hand-written word in the
 * glow's colours, a line under it, and a 672 message box (24 round, frosted
 * white) over a glow of the brand's blues, lavender and peach whose colours
 * turn through each other, a line of the same colours drawn once round its
 * edge, with "try" and "ask" under the text.
 *
 * Once the person asks, on a 1100 band down the middle: the conversation in a
 * 652 column at its left and, from `lg`, a 370 card at its right, 76 apart.
 * The person's words sit in a bubble at the right of the column (24 round, the
 * corner they come from 4); each answer runs plainly under it, with what it
 * found, four at most: a heading, the best fit drawn large, the other three as
 * small cards (192 × 182 photos, 16 apart), all four side by side in a table,
 * and under the latest answer a few short questions to tap. The card at the
 * right lists what the latest answer found, a row each (the advisor, the
 * service on two lines, why it fits, a 68 photo), and stays where it starts
 * while the conversation scrolls under the bar. The message box sits under the
 * column, 20 wider than it each side, over the same glow as the landing's.
 *
 * Each message sends the whole conversation to `POST /matching/chat`, so a
 * follow-up ("ขอที่ถูกกว่านี้") narrows the same need instead of starting
 * over. With a model key on the API, Claude reads it against the published
 * catalogue: it either asks one question or searches, says why each service
 * fits, and offers what to ask next. Without a key the API matches the words.
 * An API without the chat route (404) is asked `POST /matching` with
 * everything said so far instead.
 *
 * The conversation lives in `sessionStorage`, not the address: what someone
 * tells it can be private, and a URL ends up in history and shared links.
 * Opened from the search's empty result (`?q=`), it starts a new conversation
 * with what was searched for.
 */

const STORE_KEY = "advisory.matching.chat";

/** The longest problem `POST /matching` reads; the API holds the same. */
const PROBLEM_MAX = 1000;

/** The most services one answer shows: the best fit and three more. The API sends no more than this either. */
const MAX_RESULTS = 4;

type Match = ApiMatching["matches"][number];

type Result = {
  /** A headline for what was found, or what the person asked. */
  readonly title: string;
  readonly topics: readonly string[];
  readonly matches: readonly Match[];
};

type Turn =
  | { readonly id: string; readonly role: "user"; readonly text: string }
  | {
      readonly id: string;
      readonly role: "assistant";
      readonly text: string;
      readonly result: Result | null;
      /** What the person could ask next; only the latest answer shows them. */
      readonly suggestions?: readonly string[];
      /**
       * Whether Claude wrote the answer, or the API matched the words alone
       * and the page wrote it. Absent on a conversation stored before it was
       * kept, which was matched by words.
       */
      readonly mode?: "ai" | "keyword";
    };

type AssistantTurn = Extract<Turn, { role: "assistant" }>;
type Reply = Omit<AssistantTurn, "id" | "role">;

/* -------------------------------------------------------- the conversation */

const SERVER = "\u0000server";
const listeners = new Set<() => void>();
/** Kept here too, so a window that refuses storage still holds the conversation while it is open. */
let memory: string | null = null;

function readStored(): string | null {
  try {
    return window.sessionStorage.getItem(STORE_KEY) ?? memory;
  } catch {
    return memory;
  }
}

function subscribeStored(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The conversation kept for this tab, and the id the page's address names it by (`?c=`). */
type StoredChat = { readonly id: string; readonly turns: readonly Turn[] };

function saveChat(id: string, turns: readonly Turn[]): void {
  memory = JSON.stringify({ id, turns });
  try {
    window.sessionStorage.setItem(STORE_KEY, memory);
  } catch {
    // A private window can refuse storage; `memory` holds it for this visit.
  }
  for (const listener of listeners) listener();
}

function isTurn(turn: unknown): turn is Turn {
  return (
    typeof turn === "object" &&
    turn !== null &&
    typeof (turn as Turn).id === "string" &&
    typeof (turn as Turn).text === "string" &&
    ((turn as Turn).role === "user" || (turn as Turn).role === "assistant")
  );
}

/** The stored conversation, or null; one kept before conversations had an id is not restored. */
function parseChat(raw: string | null): StoredChat | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
    const { id, turns } = value as { id?: unknown; turns?: unknown };
    if (typeof id !== "string" || !Array.isArray(turns)) return null;
    return { id, turns: turns.filter(isTurn) };
  } catch {
    return null;
  }
}

/**
 * The conversation the page's address names (`?c=<id>`): its turns, an empty
 * list for an address that names none (or another), and `undefined` until the
 * browser has been asked. So `/matching` reached from a link always opens on
 * the landing, while a refresh, or Back from a service, finds the
 * conversation it left.
 */
function useTurns(): readonly Turn[] | undefined {
  const raw = useSyncExternalStore(subscribeStored, readStored, () => SERVER);
  const chat = useQueryValue("c");
  return useMemo(() => {
    if (raw === SERVER) return undefined;
    const stored = parseChat(raw);
    return stored && chat && stored.id === chat ? stored.turns : [];
  }, [raw, chat]);
}

/**
 * Names the conversation in the page's address, `?c=<id>`, in place of the
 * entry it is on (a search's `?q=` handed over goes, so a refresh does not
 * ask it again). Through the history API, which the router follows without
 * loading the page again.
 */
function nameChat(id: string): void {
  const url = new URL(window.location.href);
  url.searchParams.delete("q");
  url.searchParams.set("c", id);
  window.history.replaceState(null, "", url);
}

/**
 * A fresh id for a message or a conversation. `randomUUID` exists only on a
 * secure page; elsewhere (a phone on the LAN's http address) the same
 * generator's bytes, as hex.
 */
function newId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Everything the person has said, latest last, as much as the API reads. */
function problemOf(turns: readonly Turn[]): string {
  const said: string[] = [];
  let length = 0;
  for (const turn of turns.toReversed()) {
    if (turn.role !== "user") continue;
    if (length + turn.text.length > PROBLEM_MAX && said.length > 0) break;
    said.unshift(turn.text);
    length += turn.text.length + 1;
  }
  return said.join("\n").slice(-PROBLEM_MAX);
}


/** A result's matches drawn from the catalogue the cards come from, in the answer's order. */
function useMatched(result: Result) {
  const catalogue = useLiveCatalogue();
  const cards = useMemo(() => {
    const byId = new Map(catalogue.items.map((item) => [item.id, item]));
    return result.matches
      .flatMap((match) => {
        const item = byId.get(match.serviceId);
        return item ? [{ item, match }] : [];
      })
      .slice(0, MAX_RESULTS);
  }, [catalogue.items, result.matches]);
  return { cards, catalogue, count: catalogue.loading ? Math.min(result.matches.length, MAX_RESULTS) : cards.length };
}

/** Where the panel at the right shows (`SIDE`): there a picked service opens in it, below it in its own page. */
const WIDE = "(min-width: 1024px)";

function subscribeWide(listener: () => void): () => void {
  const query = window.matchMedia(WIDE);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

function useWide(): boolean {
  return useSyncExternalStore(subscribeWide, () => window.matchMedia(WIDE).matches, () => false);
}

/**
 * A service's packages, from its detail (the list leaves them out, `useResource`
 * shares it with the service page), and the one to suggest: the one the answer
 * named, or else the one whose name and description hold most of the words the
 * problem was matched on, the first offered on a tie.
 */
function usePackages(serviceId: string, match: Match | undefined) {
  const fetcher = useCallback((signal: AbortSignal) => getService(serviceId, signal), [serviceId]);
  const detail = useResource<ApiPublicService>(`services/${serviceId}`, fetcher);
  const packages = detail.data?.packages ?? [];
  return { packages, suggested: suggestPackage(packages, match) };
}

function suggestPackage(packages: readonly ApiServicePackage[], match: Match | undefined): ApiServicePackage | null {
  const named = match?.packageId ? packages.find((pack) => pack.id === match.packageId) : undefined;
  if (named) return named;
  const words = (match?.matched ?? []).map((word) => word.toLowerCase()).filter(Boolean);
  let best = packages[0] ?? null;
  let most = 0;
  for (const pack of packages) {
    const text = `${pack.name} ${pack.description ?? ""}`.toLowerCase();
    const hits = words.filter((word) => text.includes(word)).length;
    if (hits > most) {
      best = pack;
      most = hits;
    }
  }
  return best;
}

/* ------------------------------------------------------------------ motion */

/** Every entrance on the page: a fade that holds its first frame through its delay, and nothing under reduced motion. */
const ENTER = "animate-in fade-in fill-mode-both motion-reduce:animate-none";

/** `index` steps of `step` ms after `start`, for an entrance that runs down a list. */
function stagger(index: number, step = 60, start = 0): CSSProperties {
  return { animationDelay: `${start + index * step}ms` };
}

/* ------------------------------------------------------------------ layout */

/** The 1100 band (1140 with its 20 sides): the 652 column, 76, the 370 card; 20 in from a phone's edges. */
const BAND = "mx-auto flex w-full max-w-285 justify-center gap-19 px-5 lg:justify-start";
const COLUMN = "w-full max-w-163 min-w-0 lg:w-163 lg:flex-none";
const SIDE = "hidden w-92.5 flex-none lg:block";
/**
 * The message box under the column, as wide as the answers in it: set in from
 * `md` by the assistant's portrait (`AssistantShell`), so its edges are the
 * cards' edges and it stands centred under them.
 */
const UNDER_COLUMN = cn(COLUMN, "md:ps-9.5");

/**
 * The page's boxes in the bar's own glass: white at 55% over a heavy blur, so
 * the page's wash shows through them as it does through the bar, with a
 * hairline that keeps their edge where the wash has faded to white.
 */
const GLASS = "border border-border/70 bg-card/55 backdrop-blur-xl";

/**
 * Holds what it wraps at the height it starts at in the scroll, whatever the
 * bar above it measures at this width (88, or less where the page is zoomed
 * down), so it never moves while the conversation scrolls under the bar.
 */
function HeldInPlace({ children }: { readonly children: ReactNode }) {
  const held = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = held.current;
    const scroller = element?.closest<HTMLElement>('[data-slot="screen-body"]');
    const start = element?.parentElement;
    if (!element || !scroller || !start) return;
    // The wrapper's parent is not sticky, so it stays where the flow put it.
    // Measured on screen, then written in the wrapper's own pixels: inside a
    // zoomed band (`matching-scale`) a `top` is drawn at that zoom.
    const place = () => {
      const zoom = start.offsetHeight > 0 ? start.getBoundingClientRect().height / start.offsetHeight : 1;
      const onScreen = start.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
      element.style.top = `${onScreen / zoom}px`;
    };
    place();
    // Again whenever the screen or the column changes size (the bar's height
    // follows the width; the column grows as answers arrive).
    const observer = new ResizeObserver(place);
    observer.observe(scroller);
    observer.observe(start);
    return () => observer.disconnect();
  }, []);
  return (
    <div className="sticky" ref={held}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ screen */

export function MatchingChatScreen() {
  const t = useTranslations("matching");
  const stored = useTurns();
  const query = useQueryValue("q");
  const chat = useQueryValue("c");
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState<"failed" | "tooMany" | null>(null);
  /** The answer that arrived while the page was open, which writes itself out; one restored from storage does not. */
  const [fresh, setFresh] = useState<string | null>(null);
  /**
   * The service the panel at the right shows, chosen from an answer's list;
   * `at` is the latest answer then, so a newer answer takes the panel back.
   */
  const [picked, setPicked] = useState<{ readonly at: string; readonly turn: string; readonly service: string } | null>(null);
  const wide = useWide();
  const request = useRef<AbortController | null>(null);
  const started = useRef(false);
  const end = useRef<HTMLDivElement>(null);

  const turns = useMemo(() => stored ?? [], [stored]);

  const ask = useCallback(
    async (history: readonly Turn[], chatId: string) => {
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      setPending(true);
      setFailed(null);
      const asked = history.findLast((turn) => turn.role === "user")?.text ?? "";
      // Keyword mode has no words of its own; the page says what it found.
      const plain = (count: number) => (count > 0 ? t("foundKeyword") : t("noneFound"));
      try {
        let reply: Reply;
        try {
          const data = await chatMatching(
            history.slice(-20).map((turn) => ({ role: turn.role, content: turn.text.slice(0, PROBLEM_MAX) })),
            controller.signal,
          );
          const found = (data.search?.matches ?? []).slice(0, MAX_RESULTS);
          const wrote = data.mode === "ai" && data.reply.trim() !== "";
          reply = {
            mode: wrote ? "ai" : "keyword",
            text: wrote ? data.reply.trim() : plain(found.length),
            result:
              data.search && found.length > 0
                ? { title: data.search.title.trim() || asked, topics: data.search.topics, matches: found }
                : null,
            suggestions: data.suggestions.slice(0, 3),
          };
        } catch (error) {
          // An API without the chat route yet: everything said so far, as one problem.
          if (!(error instanceof ApiError && error.status === 404)) throw error;
          const data = await matchServices({ problem: problemOf(history) }, controller.signal);
          const found = data.matches.slice(0, MAX_RESULTS);
          reply = {
            mode: "keyword",
            text: found.length > 0 && data.understanding ? data.understanding : plain(found.length),
            result: found.length > 0 ? { title: asked, topics: data.topics, matches: found } : null,
          };
        }
        const id = newId();
        setFresh(id);
        saveChat(chatId, [...history, { id, role: "assistant", ...reply }]);
      } catch (error) {
        if (controller.signal.aborted) return;
        setFailed(error instanceof ApiError && error.status === 429 ? "tooMany" : "failed");
      } finally {
        if (request.current === controller) {
          request.current = null;
          setPending(false);
        }
      }
    },
    [t],
  );

  const send = useCallback(
    (text: string, from: readonly Turn[] = turns) => {
      const clean = text.trim().slice(0, PROBLEM_MAX);
      if (!clean) return;
      // The first message starts a conversation of its own, named in the address.
      const chatId = from.length > 0 && chat ? chat : newId();
      if (chatId !== chat) nameChat(chatId);
      const history: readonly Turn[] = [...from, { id: newId(), role: "user", text: clean }];
      saveChat(chatId, history);
      void ask(history, chatId);
    },
    [ask, turns, chat],
  );

  // A search that found nothing hands its words over (`?q=`): a new
  // conversation starts with them. Starting it takes `?q=` out of the address,
  // so a refresh finds the conversation rather than asking again.
  useEffect(() => {
    if (started.current || stored === undefined || !query) return;
    // The request is this effect's work; the state it sets belongs to the
    // request, so it starts after this commit (and only once under StrictMode).
    const timer = window.setTimeout(() => {
      started.current = true;
      send(query, []);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [stored, query, send]);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [turns.length, pending, failed]);

  const lastTurn = turns.at(-1);
  const landing = stored !== undefined && turns.length === 0 && !pending;
  const latestFound = turns.findLast((turn): turn is AssistantTurn => turn.role === "assistant" && turn.result !== null);
  // The panel: what was picked, while no newer answer has come; otherwise the latest answer's best fit.
  const shown =
    picked && picked.at === latestFound?.id
      ? { turn: picked.turn, service: picked.service as string | null }
      : latestFound
        ? { turn: latestFound.id, service: null }
        : null;
  const shownResult = shown ? (turns.find((turn): turn is AssistantTurn => turn.id === shown.turn && turn.role === "assistant")?.result ?? null) : null;
  const pick = (turn: string) => (service: string) => setPicked({ at: latestFound?.id ?? "", turn, service });

  if (landing) {
    return (
      <MobileScreen className="matching-ground pb-0" wide="md">
        <Landing onSend={(text) => send(text)} />
      </MobileScreen>
    );
  }

  return (
    // The light grey lit with the glow's colours (`matching-ground`), the landing's own.
    <MobileScreen className="matching-ground pb-0" wide="md">
      <section aria-label={t("chatLabel")} className="relative flex min-h-0 w-full flex-1 flex-col">
        {/* From `md` the conversation fades out over its last 2rem, into the
            box under it, instead of being cut off along a line. On a phone the
            box floats over the conversation's foot instead, and the messages
            pass under its frosted glass, so nothing is faded there. */}
        <ScreenBody className="md:[mask-image:linear-gradient(to_bottom,black_calc(100%-2rem),transparent)]">
          {/* Docked once the conversation scrolls, as on the other pages: a
              frosted band the messages pass under, not a pill they show around. */}
          <TopBar capsule dock unreadNotifications />
          {/* On a phone, 7rem of room at the foot, so the last message can
              scroll up clear of the floating box. */}
          <div className={cn(BAND, "matching-scale pt-8 pb-28 md:pb-8")}>
            <div className={cn(COLUMN, "flex flex-col gap-10")}>
              {turns.map((turn) =>
                turn.role === "user" ? (
                  <UserBubble key={turn.id} text={turn.text} />
                ) : (
                  <AssistantAnswer
                    fresh={turn.id === fresh}
                    key={turn.id}
                    latest={turn.id === lastTurn?.id && !pending}
                    onPick={(text) => send(text)}
                    onSelect={wide ? pick(turn.id) : undefined}
                    selected={wide && shown?.turn === turn.id ? shown.service : undefined}
                    turn={turn}
                  />
                ),
              )}
              {pending ? <Thinking /> : null}
              {failed && lastTurn?.role === "user" ? <Failed kind={failed} onRetry={() => void ask(turns, chat ?? newId())} /> : null}
              {/* Scrolled to, so on a phone it stops clear of the floating box. */}
              <div className="scroll-mb-28 md:scroll-mb-0" ref={end} />
            </div>
            <aside aria-label={t("foundLabel")} className={SIDE}>
              {shown && shownResult ? (
                <HeldInPlace>
                  {/* Level with the answer, below the question. */}
                  <div className="pt-12">
                    <DetailPane result={shownResult} selected={shown.service} />
                  </div>
                </HeldInPlace>
              ) : null}
            </aside>
          </div>
        </ScreenBody>
        {/* Its own row under the conversation from `md`; on a phone it floats
            over the conversation's foot. */}
        <div className={cn(BAND, "matching-scale absolute inset-x-0 bottom-0 shrink-0 pt-3 pb-4 md:static md:pb-6")}>
          <div className={UNDER_COLUMN}>
            <Composer busy={pending} onSend={(text) => send(text)} />
          </div>
          <div aria-hidden className={SIDE} />
        </div>
      </section>
    </MobileScreen>
  );
}

/* ----------------------------------------------------------------- landing */

/**
 * Before the first message: the heading (the search page's, 48 on 56 on a desktop, the last word written by
 * hand), the line under it (20), and the 672 box over its 660 × 170 glow,
 * centred in the screen.
 */
function Landing({ onSend }: { readonly onSend: (text: string) => void }) {
  const t = useTranslations("matching");
  const [text, setText] = useState("");
  const [tried, setTried] = useState(0);
  const examples = [t("example1"), t("example2"), t("example3")];
  const submit = () => {
    if (text.trim()) onSend(text);
  };
  return (
    <ScreenBody>
      <TopBar capsule unreadNotifications />
      <div className="matching-scale relative flex w-full flex-1 flex-col overflow-hidden">
      {/* Centred, but lifted: the space under it is taller than the space over
          it, so the heading sits about a third of the way down at every width. */}
      <div className="relative flex w-full flex-1 flex-col items-center justify-center px-4 pb-28 md:pb-20 lg:pb-20">
        {/* The search page's face, weight and sizes, but 48 on 56 on a desktop. */}
        <h1 className={cn(ENTER, "slide-in-from-bottom-3 duration-700 text-center font-hero text-2xl font-normal tracking-tight text-hero-ink md:text-hero lg:text-5xl lg:leading-14")}>
          <span className="sr-only">{t("landingTitle")}</span>
          <span aria-hidden>
            {t("landingLead")}{" "}
            {/* The heading is English on every page, so its word starts in
                English too; inked in the glow's own colours. */}
            <HandwrittenWord colors={GLOW_COLORS} locale="en" />{" "}
            {t("landingTail")}
          </span>
        </h1>
        <p className={cn(ENTER, "slide-in-from-bottom-3 duration-700 mt-3 px-2 text-center font-hero text-base text-hero-ink md:mt-5 md:text-xl")} style={stagger(0, 0, 120)}>
          {t("landingSubtitle")}
        </p>
        <form
          className={cn(ENTER, "slide-in-from-bottom-4 duration-700 relative mt-8 w-full max-w-168 md:mt-12 lg:mt-16")}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
          style={stagger(0, 0, 240)}
        >
          {/* The glow: 660 by 170 from `lg` (94% where the box is narrower),
              centred on the box. Below that, on a screen that is mostly box,
              it is shorter and at half its strength, or it floods the page. */}
          <span aria-hidden className="pointer-events-none absolute inset-0 opacity-50 lg:opacity-100">
            <span className="matching-glow absolute top-1/2 left-1/2 h-24 w-[min(94%,41.25rem)] -translate-x-1/2 -translate-y-1/2 md:h-30 lg:h-42.5" />
          </span>
          <div className="matching-glass-landing relative flex flex-col rounded-[24px] border border-card/50 backdrop-blur-xl">
            <GlowEdge />
            <label className="sr-only" htmlFor="matching-landing">
              {t("detailLabel")}
            </label>
            <Textarea
              autoFocus
              // One line to start on a phone (14 on 24), the desktop's two (16 on 26) from `md`;
              // typed and placeholder alike (the page's viewport keeps iOS from zooming in on 14).
              className="min-h-10 resize-none rounded-none border-0 bg-transparent px-4 pt-3 pb-0 text-sm leading-6 shadow-none focus-visible:ring-0 md:min-h-17 md:px-5 md:pt-4 md:text-base md:leading-[1.625] dark:bg-transparent"
              id="matching-landing"
              maxLength={PROBLEM_MAX}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  submit();
                }
              }}
              placeholder={t("landingPlaceholder")}
              rows={1}
              value={text}
            />
            <div className="flex items-center justify-between gap-3 p-2.5 md:p-3">
              <Button
                className="h-8 gap-1 rounded-full border-border bg-card px-2.5 text-xs font-medium md:h-9.5 md:gap-1.5 md:px-3 md:text-sm text-muted-foreground shadow-xs active:scale-95"
                onClick={() => {
                  setText(examples[tried % examples.length] ?? "");
                  setTried((n) => n + 1);
                }}
                type="button"
                variant="outline"
              >
                <Sparkles aria-hidden className="size-3.5" />
                {t("try")}
              </Button>
              <Button
                className="h-8 rounded-full bg-hero-ink px-3 text-xs font-medium md:h-9 md:px-4 md:text-sm text-primary-foreground hover:bg-hero-ink/90 active:scale-95 disabled:opacity-40"
                disabled={!text.trim()}
                type="submit"
              >
                {t("askAi")}
              </Button>
            </div>
          </div>
        </form>
      </div>
      </div>
    </ScreenBody>
  );
}

/**
 * The glow's colours in order: sky blue, the brand's blue, lavender, peach.
 * The same four `matching-glow` turns through in `app/globals.css`.
 */
const GLOW_COLORS = ["#84b5ff", "#0569ff", "#ae8eff", "#ffcca5"] as const;

/** A 1.5 line in the glow's colours, drawn once round the landing box's edge as it opens (`matching-edge`). */
function GlowEdge() {
  const id = useId().replace(/:/g, "");
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 size-full overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" x2="1" y1="0" y2="0">
          {GLOW_COLORS.map((color, index) => (
            // Sky blue stands at both ends, so the colour alone is no key.
            <stop key={index} offset={index / (GLOW_COLORS.length - 1)} stopColor={color} />
          ))}
        </linearGradient>
      </defs>
      <rect
        className="matching-edge"
        fill="none"
        pathLength={100}
        rx={23.25}
        stroke={`url(#${id})`}
        strokeWidth={1.5}
        style={{ width: "calc(100% - 1.5px)", height: "calc(100% - 1.5px)" }}
        x={0.75}
        y={0.75}
      />
    </svg>
  );
}

/* ---------------------------------------------------------------- messages */

/** What the person said: a bubble at the right, 24 round but the corner it comes from, in a wash of the ink. */
function UserBubble({ text }: { readonly text: string }) {
  return (
    <div className="flex justify-end">
      <p
        className={cn(
          ENTER,
          "slide-in-from-bottom-2 zoom-in-95 origin-top-right duration-300 max-w-[85%] rounded-3xl rounded-tr-sm bg-foreground/5 px-4 py-3 text-base leading-6 whitespace-pre-wrap text-foreground",
        )}
      >
        {text}
      </p>
    </div>
  );
}

/** The assistant's portrait: a 28 disc in the glow's colours with a spark on it. */
function AssistantMark() {
  return (
    <span
      aria-hidden
      className="flex size-7 shrink-0 items-center justify-center rounded-full text-card"
      style={{ backgroundImage: `linear-gradient(135deg, ${GLOW_COLORS.join(", ")})` }}
    >
      <Sparkles className="size-3.5" />
    </span>
  );
}

/**
 * Everything the assistant says, as a chat writes it: its portrait and name on
 * one line, and what it says under them, set in by the portrait's width from
 * `md` so the words line up with the name.
 */
function AssistantShell({ children, live = false }: { readonly children: ReactNode; readonly live?: boolean }) {
  const t = useTranslations("matching");
  return (
    <article aria-live={live ? "polite" : undefined} className="flex flex-col gap-2.5">
      <p className="flex items-center gap-2.5 text-sm font-medium text-foreground">
        <AssistantMark />
        {t("assistantName")}
      </p>
      <div className="flex min-w-0 flex-col gap-4 md:ps-9.5">{children}</div>
    </article>
  );
}

/** How long a whole answer takes to write itself out at most, and one letter at most. */
const TYPE_TOTAL_MS = 1600;
const TYPE_LETTER_MS = 18;

/**
 * An answer's words written out a letter at a time, as if being typed, then
 * `onDone`. By grapheme, so a Thai vowel or tone mark never shows apart from
 * its consonant. All at once for a reader who asked for less motion.
 */
function Typed({ text, onDone }: { readonly text: string; readonly onDone: () => void }) {
  const [shown, setShown] = useState(0);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });
  const letters = useMemo(() => {
    if (typeof Intl.Segmenter !== "function") return Array.from(text);
    return Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text), (part) => part.segment);
  }, [text]);
  useEffect(() => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const each = still ? 0 : Math.min(TYPE_LETTER_MS, TYPE_TOTAL_MS / Math.max(1, letters.length));
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const count = each === 0 ? letters.length : Math.min(letters.length, Math.floor((now - start) / each));
      setShown(count);
      if (count < letters.length) frame = requestAnimationFrame(step);
      else done.current();
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [letters]);
  return <>{letters.slice(0, shown).join("")}</>;
}

/**
 * One answer, in the assistant's voice: its words, written out as they
 * arrive; then what it found, a row per service, the closest first; when the
 * words were matched rather than read, a question back, as a person would ask
 * it; and on the latest, replies to tap (Claude's, or the usual ways to narrow
 * a search). An answer restored from an earlier visit is drawn whole.
 */
function AssistantAnswer({ turn, latest, fresh, selected, onPick, onSelect }: {
  readonly turn: AssistantTurn;
  readonly latest: boolean;
  readonly fresh: boolean;
  /** The service the panel shows from this answer: its id, `null` for the closest, `undefined` when the panel shows another answer's. */
  readonly selected?: string | null;
  readonly onPick: (text: string) => void;
  /** Shows a service in the panel when its card is clicked; absent where there is no panel, and a card opens the service's page. */
  readonly onSelect?: (serviceId: string) => void;
}) {
  const t = useTranslations("matching");
  const [typed, setTyped] = useState(!fresh);
  const settle = useCallback(() => setTyped(true), []);
  const article = useRef<HTMLDivElement>(null);
  const fallback = [t("refine1"), t("refine2"), t("refine3")];
  const offers = latest ? (turn.suggestions?.length ? turn.suggestions : fallback) : [];
  const asks = turn.mode !== "ai" && turn.result !== null;

  // Once a new answer has written itself out and its rows come in, the page
  // scrolls just far enough to show them, never so far the answer's first
  // line goes under the bar.
  useEffect(() => {
    if (!fresh || !typed) return;
    const timer = window.setTimeout(() => {
      const box = article.current;
      const scroller = box?.closest<HTMLElement>('[data-slot="screen-body"]');
      if (!box || !scroller) return;
      const shape = box.getBoundingClientRect();
      const view = scroller.getBoundingClientRect();
      // Clear of the box floating over the foot on a phone (7rem), or 2rem from `md`.
      const clear = window.matchMedia("(min-width: 768px)").matches ? 32 : 112;
      const below = shape.bottom - view.bottom + clear;
      const room = shape.top - view.top - 112;
      if (below > 0 && room > 0) scroller.scrollBy({ top: Math.min(below, room), behavior: "smooth" });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [fresh, typed]);

  return (
    <div ref={article}>
      <AssistantShell>
        <p className="text-base leading-7 whitespace-pre-wrap text-foreground">
          {typed ? (
            turn.text
          ) : (
            <>
              <span className="sr-only">{turn.text}</span>
              <span aria-hidden>
                <Typed onDone={settle} text={turn.text} />
              </span>
            </>
          )}
        </p>
        {typed && turn.result ? <Found onSelect={onSelect} result={turn.result} selected={selected} /> : null}
        {typed && asks ? (
          <p className={cn(ENTER, "duration-500 text-base leading-7 text-foreground")} style={stagger(0, 0, 420)}>
            {t("followUp")}
          </p>
        ) : null}
        {typed && offers.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {offers.map((offer, index) => (
              <AskChip index={index} key={offer} onPick={onPick} start={520} text={offer} />
            ))}
          </div>
        ) : null}
      </AssistantShell>
    </div>
  );
}

/** A short question to tap: 28 tall, 12 in, on a five-percent wash of the ink. */
function AskChip({ text, index, start, onPick }: {
  readonly text: string;
  readonly index: number;
  readonly start: number;
  readonly onPick: (text: string) => void;
}) {
  return (
    <button
      className={cn(
        ENTER,
        "zoom-in-95 duration-300 flex min-h-7 items-center rounded-full bg-foreground/5 px-3 py-1 text-start text-xs font-medium text-foreground outline-none transition-[background-color,transform] hover:bg-foreground/10 focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-95",
      )}
      onClick={() => onPick(text)}
      style={stagger(index, 70, start)}
      type="button"
    >
      {text}
    </button>
  );
}

/**
 * What one answer found, in the answer: the closest drawn wide, and the others
 * as square cards in a row under it (three across the column from `md`; on a
 * phone the row runs off the edge to scroll). Where the panel shows (a
 * desktop, a landscape tablet), clicking a card shows it there and marks it,
 * and the panel is the way into the page; below it, a card is that way itself.
 */
function Found({ result, selected, onSelect }: {
  readonly result: Result;
  readonly selected?: string | null;
  readonly onSelect?: (serviceId: string) => void;
}) {
  const t = useTranslations("matching");
  const s = useTranslations("search");
  const { cards, catalogue, count } = useMatched(result);
  const [best, ...rest] = cards;
  const shown = (id: string, index: number) => selected !== undefined && (selected ? selected === id : index === 0);

  if (catalogue.error) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted-foreground">{t("loadFailed")}</p>
        <Button className="rounded-full" onClick={catalogue.reload} size="sm" type="button" variant="outline">
          <RotateCcw aria-hidden />
          {s("retry")}
        </Button>
      </div>
    );
  }
  if (catalogue.loading) {
    return (
      <div aria-hidden>
        <div className={PHONE_ROW}>
          {Array.from({ length: count || 2 }, (_, index) => (
            <MiniBones className={PHONE_CARD} key={index} />
          ))}
        </div>
        <div className="hidden flex-col gap-4 lg:flex">
          <TopBones />
          {count === 2 ? <TopBones /> : null}
          {count > 2 ? (
            <div className={MINI_ROW}>
              {Array.from({ length: count - 1 }, (_, index) => (
                <MiniBones key={index} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    );
  }
  return (
    <div aria-label={t("foundLabel")} role="group">
      {/* A phone and an upright tablet: every card the same, closest first
          (and tagged), in one scrolling row. */}
      <div className={PHONE_ROW}>
        {cards.map(({ item, match }, index) => (
          <MiniCard
            best={index === 0}
            className={PHONE_CARD}
            index={index}
            item={item}
            key={item.id}
            match={match}
            selected={false}
          />
        ))}
      </div>
      {/* Beside the panel: the closest drawn wide and the others as a row of
          cards under it (three answers leave the row a card short); two
          answers both drawn wide, one under the other. */}
      <div className="hidden flex-col gap-4 lg:flex">
        {best ? (
          <TopPick
            item={best.item}
            match={best.match}
            onSelect={onSelect ? () => onSelect(best.item.id) : undefined}
            selected={shown(best.item.id, 0)}
          />
        ) : null}
        {rest.length === 1 ? (
          <TopPick
            best={false}
            item={rest[0].item}
            match={rest[0].match}
            onSelect={onSelect ? () => onSelect(rest[0].item.id) : undefined}
            selected={shown(rest[0].item.id, 1)}
          />
        ) : rest.length > 1 ? (
          <div className={MINI_ROW}>
            {rest.map(({ item, match }, index) => (
              <MiniCard
                index={index}
                item={item}
                key={item.id}
                match={match}
                onSelect={onSelect ? () => onSelect(item.id) : undefined}
                selected={shown(item.id, index + 1)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Below `lg`, where there is no panel: every card the same, closest first, in
 * one row that runs off the screen's edge to scroll (176 wide on a phone, 224
 * on an upright tablet).
 */
const PHONE_ROW =
  "-mx-5 flex gap-3 overflow-x-auto overscroll-x-contain px-5 pb-1 [scrollbar-width:none] md:gap-4 lg:hidden [&::-webkit-scrollbar]:hidden";
const PHONE_CARD = "md:w-56";

/** The square cards' row: three across the column from `md`, a row that scrolls off a phone's edge below it. */
const MINI_ROW =
  "-mx-5 flex gap-3 overflow-x-auto overscroll-x-contain px-5 pb-1 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden";

/** The rating as this page writes it: the star and the score, without how many reviews; or that there are none yet. */
function Rating({ item }: { readonly item: LiveService }) {
  const t = useTranslations("matching");
  if (item.rating === null) return null;
  if (item.reviews === 0) return <span>{t("noReviews")}</span>;
  return (
    <span className="flex items-center gap-1 text-foreground">
      <Star aria-hidden className="size-3.5 fill-current" />
      {item.rating.toFixed(1)}
    </span>
  );
}

/** A service's rating, length and (if asked) topic on one line, a dot between each. */
function Facts({ item, minutes, topic = false }: {
  readonly item: LiveService;
  /** The suggested package's length, when it has one, over the service's own. */
  readonly minutes?: number;
  readonly topic?: boolean;
}) {
  const t = useTranslations("matching");
  const parts = [
    item.rating === null ? null : <Rating item={item} key="rating" />,
    <span key="length">{t("minutesValue", { count: minutes ?? item.minutes })}</span>,
    topic && item.category ? <span key="topic">{item.category}</span> : null,
  ].filter((part) => part !== null);
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
      {parts.map((part, index) => (
        <span className="flex items-center gap-1.5" key={part.key}>
          {index > 0 ? <span aria-hidden>·</span> : null}
          {part}
        </span>
      ))}
    </span>
  );
}

/**
 * The closest service, drawn wide in the search card's terms (`ResultCard`):
 * its photo at the right 4:3 (224 × 168 from `md`, never stretched, the "best
 * fit" tag on it), who gives it, its name on one line, why it fits on two, the
 * package to take, its rating, and its price for its length, all held inside
 * the photo's height.
 *
 * The whole card is one control laid over it (`absolute inset-0`): a button
 * showing the service in the panel where there is one, a link to its page
 * where there is not.
 */
function TopPick({ item, match, selected, onSelect, best = true }: {
  readonly item: LiveService;
  readonly match: Match;
  readonly selected: boolean;
  readonly onSelect?: () => void;
  /** Tags it "best fit"; the second of two, drawn wide too, carries no tag. */
  readonly best?: boolean;
}) {
  const t = useTranslations("matching");
  const s = useTranslations("search");
  const format = useFormatter();
  const { suggested } = usePackages(item.id, match);
  const cover = "absolute inset-0 rounded-2xl outline-none";
  return (
    <div
      // Flat on the page, as the cards under it are: no box of its own.
      className={cn(
        ENTER,
        // A row at every width, the photo always 4:3 like every card on the
        // page: 160 × 120 beside the words on a phone, 224 × 168 from `md`.
        "slide-in-from-bottom-3 duration-500 group relative flex gap-3 rounded-2xl has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50 md:gap-5",
      )}
      style={stagger(0, 0, 80)}
    >
      {onSelect ? (
        <Button
          aria-label={item.title}
          aria-pressed={selected}
          // The card shows the focus ring itself, so the button lays over it bare.
          className={cn(cover, "h-auto border-0 p-0 hover:bg-transparent focus-visible:ring-0 active:not-aria-[haspopup]:translate-y-0")}
          onClick={onSelect}
          type="button"
          variant="ghost"
        />
      ) : (
        <Link aria-label={item.title} className={cover} href={item.href} />
      )}
      {/* Ringed while the panel shows it, as the cards under it are. */}
      <span
        className={cn(
          "pointer-events-none relative w-40 shrink-0 self-start overflow-hidden rounded-xl bg-muted shadow-hero-card ring-offset-2 ring-offset-background transition-shadow duration-200 group-hover:shadow-hero-card-hover md:w-56 md:rounded-2xl",
          selected && "ring-2 ring-foreground/70",
        )}
      >
        <Image
          alt=""
          className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none"
          src={item.cover}
        />
        {best ? (
          <span className="absolute top-2 left-2 flex h-6 items-center gap-1 rounded-full bg-card px-2 text-xs font-medium text-foreground shadow-hero-card md:top-2.5 md:left-2.5 md:h-7 md:px-2.5">
            <Sparkles aria-hidden className="size-3.5" />
            {t("topPick")}
          </span>
        ) : null}
      </span>
      <span className="pointer-events-none flex min-w-0 flex-1 flex-col gap-2 md:pe-1">
        <span className="flex min-w-0 items-center gap-2">
          <AdvisorFace item={item} />
          <span className="truncate text-xs font-medium text-foreground">{item.advisorName}</span>
          {item.verified ? <VerifiedTick /> : null}
        </span>
        <span className="flex min-w-0 flex-col gap-1">
          {/* A phone's sizes are the search card's on a phone; larger from `md`. */}
          <span className="truncate text-sm leading-snug font-semibold text-foreground md:text-lg">{item.title}</span>
          <span className="line-clamp-2 text-xs leading-5 text-muted-foreground md:text-sm">{match.reason ?? item.description}</span>
        </span>
        {suggested ? (
          <span className="flex min-w-0 items-center gap-1.5 text-xs text-foreground">
            <Sparkles aria-hidden className="size-3 shrink-0" />
            <span className="truncate">{t("packageSuggested", { name: suggested.name })}</span>
          </span>
        ) : null}
        {/* The search card's last row: the rating, and the price for its length. */}
        <span className="mt-auto flex flex-wrap items-end justify-between gap-x-2 gap-y-1 pt-1">
          <SearchRating count={false} item={item} />
          <span className="flex items-baseline gap-1 whitespace-nowrap">
            <span className="font-latin text-sm font-bold text-foreground tabular-nums md:text-base">
              {format.number(suggested ? suggested.priceSatang / 100 : item.price, { style: "currency", currency: "THB", maximumFractionDigits: 0 })}
            </span>
            <span className="text-xs text-muted-foreground">
              {s("perSession", { minutes: suggested?.durationMinutes ?? item.minutes })}
            </span>
          </span>
        </span>
      </span>
    </div>
  );
}

/**
 * One of the other services, as the search page draws it (`ResultCard`: a
 * 4:3 photo, who gives it, its name, what it covers, its rating and its price
 * for its length), quoting the package the answer suggests. Its photo ringed
 * while the panel shows it.
 */
function MiniCard({ item, match, index, selected, onSelect, className, best = false }: {
  readonly item: LiveService;
  readonly match: Match;
  readonly index: number;
  readonly selected: boolean;
  readonly onSelect?: () => void;
  /** Its width where the default (176 in a scrolling row, the cell from `md`) does not fit. */
  readonly className?: string;
  /** The closest of the answer: tagged as such on its photo, as the wide card is. */
  readonly best?: boolean;
}) {
  const t = useTranslations("matching");
  const { suggested } = usePackages(item.id, match);
  return (
    <div
      className={cn(ENTER, "slide-in-from-bottom-2 duration-500 flex w-44 shrink-0 flex-col md:w-auto", className)}
      style={stagger(index, 70, 160)}
    >
      <ResultCard
        badge={
          best ? (
            <span className="flex h-6 items-center gap-1 rounded-full bg-card px-2 text-xs font-medium text-foreground shadow-hero-card">
              <Sparkles aria-hidden className="size-3" />
              {t("topPick")}
            </span>
          ) : undefined
        }
        item={item}
        onSelect={onSelect}
        quote={suggested ? { price: suggested.priceSatang / 100, minutes: suggested.durationMinutes } : undefined}
        reviewCount={false}
        selected={selected}
      />
    </div>
  );
}

function TopBones() {
  return (
    <div aria-hidden className={cn(GLASS, "flex flex-col gap-4 rounded-2xl p-3 md:flex-row md:gap-5")}>
      <span className="aspect-[4/3] w-full shrink-0 animate-pulse rounded-xl bg-muted motion-reduce:animate-none md:w-56" />
      <span className="flex flex-1 flex-col gap-2.5 py-1">
        <span className="h-3 w-1/3 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
        <span className="h-4 w-4/5 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
        <span className="h-3 w-full animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
        <span className="h-3 w-2/3 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
      </span>
    </div>
  );
}

/** A square card's shape while the list loads, as the search page's skeleton draws it. */
function MiniBones({ className }: { readonly className?: string }) {
  return (
    <div aria-hidden className={cn("flex w-44 shrink-0 flex-col gap-3 md:w-auto", className)}>
      <span className="aspect-[4/3] w-full animate-pulse rounded-2xl bg-muted motion-reduce:animate-none" />
      <span className="flex flex-col gap-2 px-0.5">
        <span className="h-4 w-1/2 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
        <span className="h-4 w-4/5 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
        <span className="h-3 w-1/3 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
      </span>
    </div>
  );
}

/** While the answer is on its way: the assistant, three dots and what it is doing, as a chat shows someone typing. */
function Thinking() {
  const t = useTranslations("matching");
  return (
    <div className={cn(ENTER, "duration-300")}>
      <AssistantShell live>
        <p className="flex items-center gap-2.5 text-base text-muted-foreground">
          <span aria-hidden className="flex items-center gap-1">
            {[0, 1, 2].map((dot) => (
              <span
                className="size-1.5 animate-bounce rounded-full bg-muted-foreground motion-reduce:animate-none"
                key={dot}
                style={{ animationDelay: `${dot * 0.15 - 0.45}s` }}
              />
            ))}
          </span>
          {t("thinking")}
        </p>
      </AssistantShell>
    </div>
  );
}

function Failed({ kind, onRetry }: { readonly kind: "failed" | "tooMany"; readonly onRetry: () => void }) {
  const t = useTranslations("matching");
  const s = useTranslations("search");
  return (
    <AssistantShell>
      <div className="flex flex-wrap items-center gap-3" role="alert">
        <p className="text-base text-destructive">{t(kind)}</p>
        <Button className="rounded-full" onClick={onRetry} size="sm" type="button" variant="outline">
          <RotateCcw aria-hidden />
          {s("retry")}
        </Button>
      </div>
    </AssistantShell>
  );
}

/* --------------------------------------------------------- the side card */

/**
 * The service picked in an answer (the closest, until another is), at the
 * right: its photo, who gives it, its name, its rating, length and topic, why
 * it fits, its packages with the one to take marked, and the way into it.
 */
function DetailPane({ result, selected }: { readonly result: Result; readonly selected: string | null }) {
  const { cards, catalogue } = useMatched(result);
  const index = Math.max(0, cards.findIndex(({ item }) => item.id === selected));
  const chosen = cards[index];
  if (catalogue.loading) return <PaneBones />;
  if (!chosen) return null;
  return <PaneBody best={index === 0} item={chosen.item} key={chosen.item.id} match={chosen.match} />;
}

/** The most packages the panel lists; the service's page has the rest. */
const PANE_PACKAGES = 3;

/**
 * The panel's card, one link to the service's page as a whole (laid over it,
 * `absolute inset-0`): click anywhere on it to go there. "View service" is
 * drawn as its button, darkening with the card's hover.
 */
function PaneBody({ item, match, best }: { readonly item: LiveService; readonly match: Match; readonly best: boolean }) {
  const t = useTranslations("matching");
  const { packages, suggested } = usePackages(item.id, match);
  return (
    <div
      className={cn(
        ENTER,
        GLASS,
        "duration-300 group relative flex flex-col overflow-hidden rounded-2xl transition-shadow hover:shadow-hero-card-hover has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
      )}
    >
      <Link aria-label={item.title} className="absolute inset-0 z-10 rounded-2xl outline-none" href={item.href} />
      <span className="relative block overflow-hidden bg-muted">
        <Image
          alt=""
          className="aspect-[2/1] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none"
          src={item.cover}
        />
        {best ? (
          <span className="absolute top-3 left-3 flex h-7 items-center gap-1 rounded-full bg-card px-2.5 text-xs font-medium text-foreground shadow-hero-card">
            <Sparkles aria-hidden className="size-3.5" />
            {t("topPick")}
          </span>
        ) : null}
      </span>
      <div className="flex flex-col gap-3 p-5">
        <span className="flex min-w-0 items-center gap-2 text-sm text-foreground">
          {item.face ? <Image alt="" className="size-7 shrink-0 rounded-full object-cover" src={item.face} /> : null}
          <span className="truncate font-medium">{item.advisorName}</span>
          {item.verified ? <VerifiedTick /> : null}
        </span>
        <div className="flex flex-col gap-1.5">
          <h3 className="line-clamp-2 text-lg leading-snug font-medium text-foreground">{item.title}</h3>
          <Facts item={item} topic />
        </div>
        <p className="line-clamp-2 text-sm leading-relaxed text-foreground/80">{match.reason ?? item.description}</p>
        {packages.length > 0 ? (
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-muted-foreground">{t("packagesTitle")}</p>
            <ul className="-mx-3 flex flex-col">
              {packages.slice(0, PANE_PACKAGES).map((pack) => (
                <li
                  className={cn("flex items-center justify-between gap-3 rounded-xl px-3 py-2", pack.id === suggested?.id && "bg-foreground/5")}
                  key={pack.id}
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-foreground">
                      <span className="truncate">{pack.name}</span>
                      {pack.id === suggested?.id ? (
                        <span className="flex h-5 shrink-0 items-center gap-1 rounded-full bg-card px-2 text-xs font-medium text-foreground shadow-hero-card">
                          <Sparkles aria-hidden className="size-3" />
                          {t("suggested")}
                        </span>
                      ) : null}
                    </span>
                    <span className="text-xs text-muted-foreground">{t("minutesValue", { count: pack.durationMinutes })}</span>
                  </span>
                  <span className="shrink-0 text-sm font-medium text-foreground">
                    <ServicePrice price={pack.priceSatang / 100} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3 pt-1">
          {packages.length === 0 ? <ServicePrice price={item.price} /> : <span />}
          <span className="inline-flex h-10 shrink-0 items-center rounded-full bg-hero-action px-5 text-sm font-medium text-hero-action-foreground transition-colors group-hover:bg-hero-action/85">
            {t("viewService")}
          </span>
        </div>
      </div>
    </div>
  );
}

function PaneBones() {
  return (
    <div aria-hidden className={cn(GLASS, "flex flex-col overflow-hidden rounded-2xl")}>
      <span className="aspect-[2/1] w-full animate-pulse bg-muted motion-reduce:animate-none" />
      <span className="flex flex-col gap-3 p-5">
        <span className="h-3.5 w-1/3 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
        <span className="h-4 w-4/5 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
        <span className="h-3 w-full animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
        <span className="h-3 w-2/3 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
      </span>
    </div>
  );
}

/* ---------------------------------------------------------------- composer */

/**
 * The conversation's box: 24 round, frosted white with a soft shadow, over a
 * glow 8 past its edges that drifts; the message and send on one row. A line
 * of the message is as tall as the 32 send button, so a single line sits on
 * the box's middle; longer, the box grows and send stays at its foot.
 */
function Composer({ busy = false, onSend }: {
  readonly busy?: boolean;
  readonly onSend: (text: string) => void;
}) {
  const t = useTranslations("matching");
  const [text, setText] = useState("");
  const submit = () => {
    if (busy || !text.trim()) return;
    onSend(text);
    setText("");
  };
  return (
    <form
      className="relative"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      {/* The landing's glow, 8 past the box's edges, at two thirds of its
          strength under a conversation and a third below `lg`. */}
      <span aria-hidden className="pointer-events-none absolute -inset-2 opacity-35 lg:opacity-65">
        <span className="matching-glow absolute inset-0" />
      </span>
      <div className="matching-glass relative flex w-full items-end gap-3 rounded-3xl border border-border py-2.5 ps-5 pe-2.5 shadow-hero-card backdrop-blur-sm transition-shadow focus-within:shadow-hero-card-hover">
        <label className="sr-only" htmlFor="matching-message">
          {t("detailLabel")}
        </label>
        <Textarea
          // 14 on a phone, typed and placeholder alike, as the landing's box.
          className="max-h-48 min-h-8 flex-1 resize-none rounded-none border-0 bg-transparent px-0 py-1.5 text-sm leading-5 shadow-none focus-visible:ring-0 md:text-base md:leading-5 dark:bg-transparent"
          id="matching-message"
          maxLength={PROBLEM_MAX}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            // Enter sends, as a chat does; Shift+Enter starts a new line.
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder={t("chatPlaceholder")}
          rows={1}
          value={text}
        />
        <Button
          aria-label={t("send")}
          className="size-8 shrink-0 rounded-full bg-hero-action p-0 text-hero-action-foreground transition-[background-color,transform,opacity] hover:bg-hero-action/85 active:scale-90 disabled:opacity-30"
          disabled={busy || !text.trim()}
          type="submit"
        >
          <ArrowUp aria-hidden className="size-4" />
        </Button>
      </div>
    </form>
  );
}
