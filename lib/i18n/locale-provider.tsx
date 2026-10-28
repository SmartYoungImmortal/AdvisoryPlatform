"use client";

import { NextIntlClientProvider, type Locale, type Messages } from "next-intl";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { setRequestLocale } from "@/lib/api/client";
import { formats } from "@/lib/i18n/requests";
import th from "@/messages/th.json";

/** Where the reader's choice is kept: this browser only. */
const STORAGE_KEY = "advisory.locale";

/**
 * Every page is a static export, so the language cannot come from the
 * request: it is chosen here, in the browser, and the whole tree re-renders
 * with the other message file. That only reaches client components, which is
 * why the screens a page renders are all `"use client"`. A server component
 * would be baked into the HTML in Thai at build time and stay Thai.
 *
 * Thai ships in the bundle and is what the HTML is rendered in. English is
 * fetched the first time it is asked for, so a Thai reader never downloads
 * it. A returning English reader sees the first paint in Thai and then the
 * switch, for as long as that request takes: the cost of having no server to
 * render the right language up front.
 */
const LocaleContext = createContext<{
  readonly locale: Locale;
  readonly setLocale: (locale: Locale) => void;
}>({ locale: "th", setLocale: () => {} });

export function useAppLocale() {
  return useContext(LocaleContext);
}

type Tree = { [key: string]: string | Tree };

/** `over` laid on `base`, key by key, at every depth. */
function merge(base: Tree, over: Tree): Tree {
  const out: Tree = { ...base };
  for (const [key, value] of Object.entries(over)) {
    const under = base[key];
    out[key] =
      typeof value === "object" && typeof under === "object" ? merge(under, value) : value;
  }
  return out;
}

/**
 * English is laid over Thai, not used on its own: `messages/en.json` holds
 * only what has been translated so far (the home page and the shell around
 * it), and every key it does not have falls back to the Thai string instead
 * of rendering as a bare key.
 */
async function messagesFor(locale: Locale): Promise<Messages> {
  if (locale !== "en") return th;
  const en = (await import("@/messages/en.json")).default;
  return merge(th as Tree, en as Tree) as Messages;
}

export function LocaleProvider({ children }: { readonly children: ReactNode }) {
  const [state, setState] = useState<{ locale: Locale; messages: Messages }>({
    locale: "th",
    messages: th,
  });

  const apply = useCallback(async (locale: Locale) => {
    const messages = await messagesFor(locale);
    // Before the state changes: the screens re-read their data when the locale
    // does (`useResource` keys its cache by it), and those reads must already
    // ask the API for the new language.
    setRequestLocale(locale === "en" ? "en" : "th");
    setState({ locale, messages });
    document.documentElement.lang = locale;
  }, []);

  // A choice made on an earlier visit.
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      // Storage blocked: Thai, as the page was rendered.
    }
    // After mount on purpose: the first render has to be the Thai the HTML was
    // exported in, or hydration fails. Same reasoning as `components/cms/layout.tsx`.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one read of a per-viewer preference.
    if (saved === "en") void apply("en");
  }, [apply]);

  const setLocale = useCallback(
    (locale: Locale) => {
      try {
        window.localStorage.setItem(STORAGE_KEY, locale);
      } catch {
        // Not remembered, but still switched for this visit.
      }
      void apply(locale);
    },
    [apply],
  );

  return (
    <LocaleContext.Provider value={{ locale: state.locale, setLocale }}>
      <NextIntlClientProvider
        formats={formats}
        locale={state.locale}
        messages={state.messages}
        timeZone="Asia/Bangkok"
      >
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}
