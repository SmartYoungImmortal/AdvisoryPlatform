"use client";

import { Clock, Search, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { SearchField, ServicePrice } from "@/components/home/parts";
import { TypingPlaceholder } from "@/components/home/typing-placeholder";
import { matchQuery } from "@/lib/catalogue/filters";
import { useLiveCatalogue, type LiveService } from "@/lib/catalogue/live";
import { normalise } from "@/lib/catalogue/search";
import { cn } from "@/lib/utils";

/** One advisor in the suggestions, read off their services in the live catalogue. */
type LiveAdvisor = {
  readonly id: string;
  readonly name: string;
  readonly headline: string;
  readonly face: LiveService["face"];
  /** Their first service, which is where choosing them goes. */
  readonly href: string;
};

/** Services and advisors whose text holds the query, from `GET /services`. */
function matchLive(items: readonly LiveService[], query: string) {
  const q = normalise(query);
  const advisors = new Map<string, LiveAdvisor>();
  for (const item of items) {
    if (advisors.has(item.advisorId)) continue;
    if (![item.advisorName, item.advisorHeadline].some((field) => normalise(field).includes(q))) continue;
    advisors.set(item.advisorId, {
      id: item.advisorId,
      name: item.advisorName,
      headline: item.advisorHeadline,
      face: item.face,
      href: item.href,
    });
  }
  return {
    services: matchQuery(items, query).slice(0, GROUP_MAX),
    advisors: [...advisors.values()].slice(0, GROUP_MAX),
  };
}

/** Where the last few searches are kept: this browser only, never sent. */
const RECENT_KEY = "advisory.recentSearches";
const RECENT_MAX = 5;
/** Each group in the typed state stops here, so the panel never scrolls. */
const GROUP_MAX = 3;

function readRecent(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeRecent(list: readonly string[]) {
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    // Private mode or storage blocked: the panel just has no history.
  }
}

const searchHref = (q: string) => `/search?q=${encodeURIComponent(q)}`;

/** `text` with the first match of `query` set bold. */
function highlight(text: string, query: string): ReactNode {
  const at = normalise(text).indexOf(normalise(query));
  if (!query.trim() || at < 0) return text;
  const end = at + query.trim().length;
  return (
    <>
      {text.slice(0, at)}
      <strong className="font-semibold text-foreground">{text.slice(at, end)}</strong>
      {text.slice(end)}
    </>
  );
}

type Option = { readonly key: string; readonly href: string; readonly q?: string };

/**
 * The home hero's search: a real field that opens `/search?q=…` on Enter or
 * the button, with a panel of suggestions under it while it has focus.
 *
 * Empty, the panel offers a way in for somebody who has not worded their
 * question yet: their own recent searches (kept in this browser), the
 * categories, and the questions the placeholder already cycles through.
 * Typed into, it turns into suggestions matched against the catalogue —
 * categories, services, advisors — under a first row that searches for
 * exactly what was typed. The same matcher feeds `/search`, so a suggestion
 * and the results page never disagree.
 *
 * It is a combobox: arrow keys move through every option in the panel, Enter
 * opens the highlighted one (or searches when none is), Escape closes it.
 *
 * The typed-out examples run only while the field is empty and unfocused.
 */
export function HeroSearch({
  placeholder,
  examples,
  categories,
  submitLabel,
  defaultValue = "",
  variant = "hero",
}: {
  readonly placeholder: string;
  readonly examples: readonly string[];
  /** The category names, in the order the home page shows them. */
  readonly categories: readonly string[];
  readonly submitLabel: string;
  /** What the field opens holding: `/search` passes the query it is showing. */
  readonly defaultValue?: string;
  /**
   * `hero`: the home hero's field, a pill from `lg` only. `page`: the same
   * field as `/search`'s header, a pill at every width on a hairline, its
   * button shown from `md`.
   */
  readonly variant?: "hero" | "page";
}) {
  const t = useTranslations("home");
  const router = useRouter();
  const root = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [value, setValue] = useState(defaultValue);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  // Read once, lazily. Safe against hydration: the history is only drawn
  // inside the panel, and the panel is never open in the first render.
  const [recent, setRecent] = useState<string[]>(() =>
    typeof window === "undefined" ? [] : readRecent(),
  );

  const query = value.trim();
  // The placeholder's examples end in an ellipsis to read as half-typed; as
  // things to press they are whole questions.
  const questions = useMemo(
    () => examples.map((e) => e.replace(/[.…]+$/u, "")).slice(0, 4),
    [examples],
  );
  // The same live catalogue `/search` and the hero's ring read (one cached
  // request), so a suggestion always opens a service that exists.
  const catalogue = useLiveCatalogue();
  const typed = useMemo(() => {
    if (!query) return null;
    const q = normalise(query);
    return {
      categories: categories.filter((c) => normalise(c).includes(q)).slice(0, GROUP_MAX),
      ...matchLive(catalogue.items, query),
    };
  }, [categories, catalogue.items, query]);

  // Every row the arrow keys can land on, in the order they are drawn.
  const options: Option[] = typed
    ? [
        { key: "search", href: searchHref(query), q: query },
        ...typed.categories.map((c) => ({ key: `c:${c}`, href: searchHref(c), q: c })),
        ...typed.services.map((s) => ({ key: `s:${s.id}`, href: s.href })),
        ...typed.advisors.map((a) => ({ key: `a:${a.id}`, href: a.href })),
      ]
    : [
        ...recent.map((r) => ({ key: `r:${r}`, href: searchHref(r), q: r })),
        ...categories.map((c) => ({ key: `c:${c}`, href: searchHref(c), q: c })),
        ...questions.map((x) => ({ key: `q:${x}`, href: searchHref(x), q: x })),
      ];
  const indexOf = (key: string) => options.findIndex((o) => o.key === key);
  const optionId = (key: string) => `${listId}-${indexOf(key)}`;

  const remember = (q: string) => {
    const next = [q, ...recent.filter((r) => r !== q)].slice(0, RECENT_MAX);
    setRecent(next);
    writeRecent(next);
  };

  const go = (option: Option) => {
    if (option.q) remember(option.q);
    setFocused(false);
    input.current?.blur();
    router.push(option.href);
  };

  const removeRecent = (q: string) => {
    const next = recent.filter((r) => r !== q);
    setRecent(next);
    writeRecent(next);
  };

  const rowClass = (key: string) =>
    cn(
      "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-foreground outline-none",
      indexOf(key) === active ? "bg-muted" : "hover:bg-muted/60",
    );

  const row = (key: string, content: ReactNode, href: string, q?: string) => (
    <li aria-selected={indexOf(key) === active} id={optionId(key)} key={key} role="option">
      <Link
        className={rowClass(key)}
        href={href}
        onClick={(event) => {
          event.preventDefault();
          go({ key, href, q });
        }}
        onMouseEnter={() => setActive(indexOf(key))}
        tabIndex={-1}
      >
        {content}
      </Link>
    </li>
  );

  const group = (label: string, children: ReactNode, action?: ReactNode) => (
    <div className="flex flex-col gap-1 py-1">
      <div className="flex items-center justify-between px-3 pt-1">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {action}
      </div>
      <ul className="flex flex-col" role="group">
        {children}
      </ul>
    </div>
  );

  const open = focused && options.length > 0;

  // The panel ends 16px above the bottom of the screen, measured from where
  // the field actually is rather than guessed: anything past that edge could
  // not be reached, because scrolling the page instead sets the hero's
  // scroll-out going.
  const [panelMax, setPanelMax] = useState<number>();
  useEffect(() => {
    if (!open) return;
    const measure = () => {
      const form = root.current;
      if (!form) return;
      const rect = form.getBoundingClientRect();
      // The hero's stage is zoomed as a whole (`.hero-stage`), and a length
      // set inside it is multiplied by that zoom, so screen pixels are turned
      // back into the stage's own before they become a `max-height`.
      const stage = form.closest<HTMLElement>(".hero-stage");
      const zoom = stage ? Number.parseFloat(getComputedStyle(stage).zoom) || 1 : 1;
      setPanelMax(Math.max(192, (window.innerHeight - rect.bottom - 24) / zoom));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open]);

  return (
    <form
      className="relative flex min-w-px flex-1"
      onSubmit={(event) => {
        event.preventDefault();
        const chosen = options[active];
        if (open && chosen) return go(chosen);
        if (query) remember(query);
        setFocused(false);
        router.push(query ? searchHref(query) : "/search");
      }}
      ref={root}
      role="search"
    >
      <SearchField
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={open}
        aria-label={placeholder}
        autoComplete="off"
        enterKeyHint="search"
        // A pill at `lg`, with its button a pill inset by the same 6px on
        // every side, so the two curves run parallel.
        // At `lg`, no outline, only the hero's long soft shadow, the same one
        // the cards float on.
        groupClassName={
          variant === "page"
            ? "h-12 rounded-full border-border bg-card pr-1.5 pl-4 shadow-card"
            : "shadow-panel lg:h-12 lg:rounded-full lg:border-transparent lg:pl-4 lg:pr-1.5 lg:shadow-hero"
        }
        inputClassName={variant === "page" ? "text-base md:text-sm" : "lg:text-sm"}
        name="q"
        onBlur={(event) => {
          // Focus moving into the panel (its clear button) keeps it open.
          if (!root.current?.contains(event.relatedTarget as Node | null)) setFocused(false);
        }}
        onChange={(event) => {
          setValue(event.target.value);
          setActive(-1);
        }}
        onFocus={() => setFocused(true)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (!focused) setFocused(true);
            const step = event.key === "ArrowDown" ? 1 : -1;
            setActive((i) => (options.length ? (i + step + options.length) % options.length : -1));
          } else if (event.key === "Escape") {
            setFocused(false);
            setActive(-1);
            input.current?.blur();
          }
        }}
        // Always an element, even when the examples are off: `SearchField`
        // puts the input in a different wrapper with and without an overlay,
        // so dropping the overlay on focus remounted the input and threw the
        // focus away, and the field took two clicks to type into.
        overlay={<>{!focused && !value ? <TypingPlaceholder phrases={examples} /> : null}</>}
        placeholder={placeholder}
        ref={input}
        role="combobox"
        trailing={
          <button
            className={cn(
              "hidden h-9 shrink-0 items-center rounded-full bg-hero-action px-6 text-sm font-medium text-hero-action-foreground outline-none hover:bg-hero-action/85 focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px",
              variant === "page" ? "md:flex" : "lg:flex",
            )}
            type="submit"
          >
            {submitLabel}
          </button>
        }
        value={value}
      />

      {open ? (
        <div
          aria-label={t("suggestLabel")}
          // `overscroll-contain`: a wheel that reaches the end of the panel
          // stops there instead of carrying on into the page.
          className="absolute inset-x-0 top-full z-20 mt-2 flex flex-col overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card p-2 text-left shadow-card-hover"
          id={listId}
          style={{ maxHeight: panelMax }}
          // Pressing inside the panel must not take focus off the field
          // first, or the blur closes it before the click lands.
          onMouseDown={(event) => event.preventDefault()}
          role="listbox"
        >
          {typed ? (
            <>
              <ul className="flex flex-col" role="group">
                {row(
                  "search",
                  <>
                    <Search className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{t("suggestSearchFor", { query })}</span>
                  </>,
                  searchHref(query),
                  query,
                )}
              </ul>
              {typed.categories.length > 0
                ? group(
                    t("suggestCategories"),
                    typed.categories.map((c) =>
                      row(`c:${c}`, <span>{highlight(c, query)}</span>, searchHref(c), c),
                    ),
                  )
                : null}
              {typed.services.length > 0
                ? group(
                    t("suggestServices"),
                    typed.services.map((s) =>
                      row(
                        `s:${s.id}`,
                        <>
                          <Image
                            alt=""
                            className="size-9 shrink-0 rounded-lg object-cover"
                            height={72}
                            src={s.cover}
                            width={72}
                          />
                          <span className="flex min-w-px flex-1 flex-col">
                            <span className="truncate text-muted-foreground">
                              {highlight(s.title, query)}
                            </span>
                            <span className="text-xs text-muted-foreground">{s.category}</span>
                          </span>
                          <ServicePrice price={s.price} />
                        </>,
                        s.href,
                      ),
                    ),
                  )
                : null}
              {typed.advisors.length > 0
                ? group(
                    t("suggestAdvisors"),
                    typed.advisors.map((a) =>
                      row(
                        `a:${a.id}`,
                        <>
                          {a.face ? (
                            <Image
                              alt=""
                              className="size-9 shrink-0 rounded-full object-cover"
                              height={72}
                              src={a.face}
                              width={72}
                            />
                          ) : (
                            <span
                              aria-hidden
                              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground"
                            >
                              {a.name.slice(0, 1)}
                            </span>
                          )}
                          <span className="flex min-w-px flex-1 flex-col">
                            <span className="truncate text-muted-foreground">
                              {highlight(a.name, query)}
                            </span>
                            <span className="truncate text-xs text-muted-foreground">
                              {highlight(a.headline, query)}
                            </span>
                          </span>
                        </>,
                        a.href,
                      ),
                    ),
                  )
                : null}
            </>
          ) : (
            <>
              {recent.length > 0
                ? group(
                    t("suggestRecent"),
                    recent.map((r) => (
                      <li
                        aria-selected={indexOf(`r:${r}`) === active}
                        className="group/recent relative"
                        id={optionId(`r:${r}`)}
                        key={r}
                        role="option"
                      >
                        <Link
                          className={cn(rowClass(`r:${r}`), "pr-10")}
                          href={searchHref(r)}
                          onClick={(event) => {
                            event.preventDefault();
                            go({ key: `r:${r}`, href: searchHref(r), q: r });
                          }}
                          onMouseEnter={() => setActive(indexOf(`r:${r}`))}
                          tabIndex={-1}
                        >
                          <Clock className="size-4 shrink-0 text-muted-foreground" />
                          <span className="truncate">{r}</span>
                        </Link>
                        <button
                          aria-label={t("suggestRemove", { query: r })}
                          className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                          onClick={() => removeRecent(r)}
                          tabIndex={-1}
                          type="button"
                        >
                          <X className="size-3.5" />
                        </button>
                      </li>
                    )),
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setRecent([]);
                        writeRecent([]);
                      }}
                      tabIndex={-1}
                      type="button"
                    >
                      {t("suggestClearRecent")}
                    </button>,
                  )
                : null}
              <div className="flex flex-col gap-2 px-3 py-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {t("suggestPopular")}
                </span>
                <ul className="flex flex-wrap gap-2" role="group">
                  {categories.map((c) => (
                    <li
                      aria-selected={indexOf(`c:${c}`) === active}
                      id={optionId(`c:${c}`)}
                      key={c}
                      role="option"
                    >
                      <Link
                        className={cn(
                          "flex h-8 items-center rounded-full border border-border px-3 text-sm text-foreground",
                          indexOf(`c:${c}`) === active ? "border-foreground/30 bg-muted" : "hover:bg-muted/60",
                        )}
                        href={searchHref(c)}
                        onClick={(event) => {
                          event.preventDefault();
                          go({ key: `c:${c}`, href: searchHref(c), q: c });
                        }}
                        onMouseEnter={() => setActive(indexOf(`c:${c}`))}
                        tabIndex={-1}
                      >
                        {c}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              {group(
                t("suggestQuestions"),
                questions.map((x) =>
                  row(
                    `q:${x}`,
                    <>
                      <Search className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{x}</span>
                    </>,
                    searchHref(x),
                    x,
                  ),
                ),
              )}
            </>
          )}
        </div>
      ) : null}
    </form>
  );
}
