import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

// jsdom has no matchMedia, and gsap's ScrollTrigger asks for it when the
// screen frame registers it at import.
vi.hoisted(() => {
  window.matchMedia ??= (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
});

import { LoginScreen } from "@/components/auth/login-screen";
import en from "@/messages/en.json";
import th from "@/messages/th.json";

vi.mock("next/navigation", () => ({
  usePathname: () => "/login",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

type Tree = { [key: string]: string | Tree };

/** English laid over Thai, the way `lib/i18n/locale-provider.tsx` serves it. */
function merge(base: Tree, over: Tree): Tree {
  const out: Tree = { ...base };
  for (const [key, value] of Object.entries(over)) {
    const under = base[key];
    out[key] = typeof value === "object" && typeof under === "object" ? merge(under, value) : value;
  }
  return out;
}

const LOCALES = {
  th: th as unknown as Tree,
  en: merge(th as unknown as Tree, en as unknown as Tree),
};

/** The five things a reader can be told to do, keyed as the message files name them. */
const GROUPS = {
  cancelled: ["access_denied", "user_cancelled_authorize"],
  expired: ["state_mismatch", "STATE_MISMATCH", "invalid_code", "please_restart_the_process", "no_code"],
  noEmail: ["email_not_found", "email_not_verified"],
  accountExists: ["account_not_linked"],
  failed: ["zzz_unknown", "server_error"],
} as const;

function copy(locale: keyof typeof LOCALES, group: keyof typeof GROUPS) {
  const oauth = (LOCALES[locale].loginErrors as Tree).oauth as Tree | undefined;
  const entry = oauth?.[group] as Tree | undefined;
  return { title: entry?.title as string | undefined, body: entry?.body as string | undefined };
}

function openWith(locale: keyof typeof LOCALES, query: string) {
  window.history.replaceState({}, "", `/login?${query}`);
  return render(
    <NextIntlClientProvider locale={locale} messages={LOCALES[locale]} timeZone="Asia/Bangkok">
      <LoginScreen />
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  window.history.replaceState({}, "", "/");
});

describe("login page back from a provider with ?error=", () => {
  for (const locale of ["th", "en"] as const) {
    for (const [group, codes] of Object.entries(GROUPS) as [keyof typeof GROUPS, readonly string[]][]) {
      for (const code of codes) {
        it(`${locale}: ${code} reads as the ${group} message, never the raw code`, async () => {
          const view = openWith(locale, `error=${code}&error_description=Some+English`);
          const banner = await screen.findByRole("alert");
          const page = view.container.textContent ?? "";
          expect(page.toLowerCase(), "raw code on the page").not.toContain(code.toLowerCase());
          expect(page, "provider description on the page").not.toContain("Some English");
          const { title, body } = copy(locale, group);
          expect(title, `loginErrors.oauth.${group}.title in ${locale}`).toBeTruthy();
          expect(body, `loginErrors.oauth.${group}.body in ${locale}`).toBeTruthy();
          expect(banner.textContent).toContain(title);
          expect(banner.textContent).toContain(body);
        });
      }
    }

    it(`${locale}: each group says something different`, () => {
      const lines = (Object.keys(GROUPS) as (keyof typeof GROUPS)[]).map((group) => {
        const { title, body } = copy(locale, group);
        return `${title}|${body}`;
      });
      expect(new Set(lines).size).toBe(5);
    });
  }

  it("names no provider, because Google, Facebook and Apple all come back here", () => {
    for (const locale of ["th", "en"] as const) {
      for (const group of Object.keys(GROUPS) as (keyof typeof GROUPS)[]) {
        const { title, body } = copy(locale, group);
        expect(`${title} ${body}`).not.toMatch(/google|facebook|apple|กูเกิล|เฟซบุ๊ก|แอปเปิล/i);
      }
    }
  });

  it("thai and english differ, so the english page is translated", () => {
    expect(copy("en", "expired").body).not.toBe(copy("th", "expired").body);
  });

  it("clears the banner once the reader starts typing an email", async () => {
    openWith("th", "error=state_mismatch");
    await screen.findByRole("alert");
    fireEvent.change(screen.getByLabelText(th.login.emailLabel), { target: { value: "a@example.com" } });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows no banner without ?error=", () => {
    openWith("th", "next=/home");
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
