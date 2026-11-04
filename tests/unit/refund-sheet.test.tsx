import { cleanup, render, screen, within } from "@testing-library/react";
import { CircleCheckBig, CircleX, Clock3, RotateCcw } from "lucide-react";
import { NextIntlClientProvider, useTranslations, type Messages } from "next-intl";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

// invoice-screens reaches GSAP's ScrollTrigger, which asks matchMedia as its module loads.
vi.hoisted(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
});

import {
  RefundActions,
  RefundBox,
  RefundCard,
  RefundFacts,
  RefundHead,
  RefundList,
  RefundRow,
  RefundSection,
  refundPill,
  useRefundFormat,
} from "@/components/bookings/refund-sheet";
import { StatusPill } from "@/components/mobile/status-pill";
import { Button } from "@/components/ui/button";
import type { ApiAdviseeInvoice, ApiBooking } from "@/lib/api/types";
import { formats } from "@/lib/i18n/requests";
import { terms } from "@/lib/legal/terms";
import en from "@/messages/en.json";
import th from "@/messages/th.json";

afterEach(cleanup);

const START = "2026-11-11T03:30:00.000Z";
const END = "2026-11-11T04:30:00.000Z";

const booking: ApiBooking = {
  id: "15638839-49d1-4553-b79c-59821ff58f2e",
  serviceId: "service-1",
  advisorId: "advisor-1",
  adviseeId: "advisee-1",
  startTime: START,
  endTime: END,
  unavailableUntil: END,
  state: "BOOKED",
  blocksAvailability: true,
  cancelledAt: null,
  cancelledByUserId: null,
  createdAt: "2026-11-04T13:00:00.000Z",
};

const invoice: ApiAdviseeInvoice = {
  id: "invoice-1",
  invoiceNumber: "INV-2026-000123",
  status: "paid",
  amountSatang: 100_000,
  platformFeeSatang: 20_000,
  priceSatang: 80_000,
  refundSatang: null,
  createdAt: "2026-11-04T13:00:00.000Z",
  paidAt: "2026-11-04T13:01:00.000Z",
  service: { id: "service-1", name: "วางแผนการเงินส่วนบุคคล" },
  advisor: { id: "advisor-1", displayName: "ณัฐพงษ์ ดวงดี" },
  session: { startTime: START, endTime: END },
  booking: "confirmed",
  card: { brand: "Visa", lastDigits: "1111" },
};

function inLocale(locale: "th" | "en", ui: ReactNode) {
  const errors: Error[] = [];
  // English on its own, not laid over Thai as the app does, so a key English lacks shows here.
  const messages = locale === "th" ? th : (en as unknown as Messages);
  const view = render(
    <NextIntlClientProvider
      formats={formats}
      locale={locale}
      messages={messages}
      onError={(error) => errors.push(error)}
      timeZone="Asia/Bangkok"
    >
      {ui}
    </NextIntlClientProvider>,
  );
  return { ...view, errors };
}

function Formatted() {
  const when = useRefundFormat();
  return (
    <dl>
      <dt>whole</dt>
      <dd>{when.baht(100_000)}</dd>
      <dt>satang</dt>
      <dd>{when.baht(40_050)}</dd>
      <dt>none</dt>
      <dd>{when.baht(0)}</dd>
      <dt>deadline</dt>
      <dd>{when.deadline("2026-11-10T09:00:00.000Z")}</dd>
      <dt>short</dt>
      <dd>{when.short("2026-11-10T03:30:00.000Z")}</dd>
      <dt>stamp</dt>
      <dd>{when.stamp("2026-11-04T13:56:00.000Z")}</dd>
    </dl>
  );
}

/** Each term and what it says, in reading order, as a screen reader pairs them. */
function readFacts(root: HTMLElement): Record<string, string> {
  const terms = within(root).getAllByRole("term");
  const definitions = within(root).getAllByRole("definition");
  return Object.fromEntries(
    terms.map((term, i) => [term.textContent, (definitions[i].textContent ?? "").replaceAll(/\s+/g, " ")]),
  );
}

/** The cancel-with-full-refund sheet as a mode screen would compose it, from the real words. */
function Sheet({ card = invoice.card }: { readonly card?: ApiAdviseeInvoice["card"] }) {
  const t = useTranslations("bookingRefund");
  const when = useRefundFormat();
  const fullUntil = "2026-11-10T03:30:00.000Z";

  return (
    <>
      <RefundCard
        head={
          <RefundHead
            amount={when.baht(invoice.amountSatang)}
            icon={RotateCcw}
            meta={t("meta.cancel")}
            title={t("head.cancelFull")}
            tone="primary"
          >
            <RefundFacts booking={booking} invoice={{ ...invoice, card }} />
          </RefundHead>
        }
        aside={
          <RefundSection heading={t("attachments.label")}>
            <p>{t("attachments.limits")}</p>
          </RefundSection>
        }
      >
        <RefundSection heading={t("box.heading")}>
          <RefundBox
            lines={[
              { label: t("box.service"), value: when.baht(40_000) },
              { label: t("box.fee"), value: when.baht(0) },
            ]}
            total={{ label: t("box.total"), value: when.baht(40_000) }}
          />
        </RefundSection>
        <RefundSection heading={t("policy.heading")}>
          <RefundList>
            <RefundRow
              current
              icon={CircleCheckBig}
              sub={t("policy.full.what")}
              title={t("policy.full.when", { date: when.deadline(fullUntil) })}
              tone="success"
              trailing={<StatusPill tone="accent">{t("policy.now")}</StatusPill>}
            />
            <RefundRow
              icon={Clock3}
              sub={t("policy.half.what")}
              title={t("policy.half.when", { from: when.short(fullUntil), to: when.short(START) })}
            />
            <RefundRow icon={CircleX} sub={t("policy.started.what")} title={t("policy.started.when", { date: when.short(START) })} />
          </RefundList>
        </RefundSection>
        <RefundSection heading={t("progress.heading")}>
          <RefundList ordered>
            <RefundRow icon={CircleCheckBig} title={t("progress.cancellation.cancelled")} tone="success" />
          </RefundList>
        </RefundSection>
      </RefundCard>
      <RefundActions invoiceNumber={invoice.invoiceNumber}>
        <Button className={refundPill("danger")} type="button">
          {t("actions.confirmCancel", { amount: when.baht(invoice.amountSatang) })}
        </Button>
        <Button className={refundPill("outline")} type="button" variant="outline">
          {t("actions.keep")}
        </Button>
      </RefundActions>
    </>
  );
}

describe("useRefundFormat", () => {
  it("writes baht with the ฿ sign, and satang only when there are some", () => {
    inLocale("th", <Formatted />);
    const values = readFacts(document.body);
    expect(values.whole).toBe("฿1,000");
    expect(values.satang).toBe("฿400.50");
    expect(values.none).toBe("฿0");
  });

  it("keeps the ฿ sign in English", () => {
    inLocale("en", <Formatted />);
    expect(readFacts(document.body).whole).toBe("฿1,000");
  });

  it("writes the deadline, the short form and the stamp in Thai on a 24-hour clock, in Bangkok time", () => {
    inLocale("th", <Formatted />);
    const values = readFacts(document.body);
    expect(values.deadline).toMatch(/^\D+\s10 พ\.ย\. 2569 · 16:00$/);
    expect(values.short).toBe("10 พ.ย. 10:30");
    expect(values.stamp).toBe("4 พ.ย. 2569 · 20:56");
  });
});

describe("RefundHead", () => {
  it("leads with the status line as the page heading, then the amount large, then what the amount is", () => {
    inLocale("th", <Sheet />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toBe("ยกเลิกการจอง · คืนเต็มจำนวน");
    expect(heading.className).toContain("text-xs");
    expect(heading.className).toContain("lg:text-frame-meta");
    expect(heading.className).toContain("font-medium");

    const amount = screen.getAllByText("฿1,000").find((node) => node.tagName === "P");
    expect(amount?.className).toContain("text-2xl");
    expect(amount?.className).toContain("lg:text-frame-title");
    expect(screen.getByText("ยอดที่ได้คืนถ้ายกเลิกตอนนี้")).toBeTruthy();
  });

  it("colours only the mark in green, never the words", () => {
    inLocale(
      "th",
      <RefundHead amount="฿1,000" icon={CircleCheckBig} title="คืนเงินแล้ว" tone="success" />,
    );
    const heading = screen.getByRole("heading", { level: 1, name: "คืนเงินแล้ว" });
    expect(heading.className).toContain("text-foreground");
    expect(heading.className).not.toContain("text-success");
    expect(heading.querySelector("svg")?.getAttribute("class")).toContain("text-success");
  });
});

describe("RefundFacts", () => {
  it("names the advisor, the day over the hours, the service and the card the money goes back to", () => {
    inLocale("th", <RefundFacts booking={booking} invoice={invoice} />);
    const facts = readFacts(document.body);
    expect(Object.keys(facts)).toEqual(["ที่ปรึกษา", "วันที่นัด", "บริการ", "คืนเข้า"]);
    expect(facts["ที่ปรึกษา"]).toBe("ณัฐพงษ์ ดวงดี");
    expect(facts["บริการ"]).toBe("วางแผนการเงินส่วนบุคคล");
    expect(facts["คืนเข้า"]).toBe("Visa •••• 1111");

    const lines = [...screen.getAllByRole("definition")[1].children].map((line) => line.textContent);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(/11 พ\.ย\. 2569$/);
    expect(lines[1]).toBe("10:30 ถึง 11:30 น.");
  });

  it("says the payment method when the invoice names no card", () => {
    inLocale("th", <RefundFacts booking={booking} invoice={{ ...invoice, card: null }} />);
    expect(readFacts(document.body)["คืนเข้า"]).toBe("ช่องทางที่ชำระ");
  });

  it("lays the facts out on the receipt's two-column grid", () => {
    const { container } = inLocale("th", <RefundFacts booking={booking} invoice={invoice} />);
    const grid = container.querySelector("dl");
    expect(grid?.className).toContain("grid-cols-2");
    expect(grid?.className).toContain("lg:gap-x-6");
    expect(grid?.className).toContain("lg:gap-y-5");
  });
});

describe("RefundCard", () => {
  it("is the receipt's card, split from lg into the head and the sections behind a dashed rule", () => {
    inLocale("th", <Sheet />);
    const card = screen.getByRole("article");
    for (const name of ["rounded-card", "border-hero-card-border", "shadow-hero-card", "bg-card", "lg:grid", "lg:grid-cols-2"]) {
      expect(card.className).toContain(name);
    }

    const headCell = screen.getByRole("heading", { level: 1 }).closest("section")?.parentElement;
    const sectionsCell = screen.getByRole("heading", { level: 2, name: "เงื่อนไขการยกเลิก" }).closest("section")?.parentElement;
    expect(headCell?.parentElement).toBe(card);
    expect(sectionsCell?.parentElement).toBe(card);
    expect(sectionsCell).not.toBe(headCell);
    expect(sectionsCell?.className).toContain("lg:border-l");
    expect(sectionsCell?.className).toContain("lg:border-dashed");
    expect(headCell?.className).not.toContain("border-l");
  });

  it("puts each section under a dashed rule that only the right cell's first drops from lg", () => {
    inLocale("th", <Sheet />);
    for (const name of ["ยอดที่ได้คืน", "เงื่อนไขการยกเลิก", "ความคืบหน้า", "หลักฐาน (ไม่บังคับ)"]) {
      const section = screen.getByRole("heading", { level: 2, name }).closest("section");
      expect(section?.className).toContain("border-t");
      expect(section?.className).toContain("border-dashed");
      expect(section?.className).toContain("lg:group-data-[cell=sections]/cell:first:border-t-0");
      expect(section?.className).not.toContain("lg:first:border-t-0");
    }
    const sectionsCell = screen.getByRole("heading", { level: 2, name: "ยอดที่ได้คืน" }).closest("section")?.parentElement;
    expect(sectionsCell?.getAttribute("data-cell")).toBe("sections");
    expect(sectionsCell?.className).toContain("group/cell");
  });

  it("from lg sets the aside under the head in the left cell, and on a phone after the sections", () => {
    inLocale("th", <Sheet />);
    const card = screen.getByRole("article");
    const [headCell, sectionsCell, asideCell] = [...card.children];
    expect(headCell.querySelector("h1")).toBeTruthy();
    expect(within(sectionsCell as HTMLElement).getByRole("heading", { level: 2, name: "เงื่อนไขการยกเลิก" })).toBeTruthy();
    expect(within(asideCell as HTMLElement).getByRole("heading", { level: 2, name: "หลักฐาน (ไม่บังคับ)" })).toBeTruthy();
    expect(card.className).toContain("lg:grid-rows-[auto_1fr_auto]");
    expect(headCell.className).toContain("lg:row-start-1");
    expect(sectionsCell.className).toContain("lg:row-span-2");
    expect(asideCell.className).toContain("lg:col-start-1");
    expect(asideCell.className).toContain("lg:row-start-2");
    // Only the right cell is "sections", whose first section drops its rule.
    expect(asideCell.getAttribute("data-cell")).toBe("aside");
  });

  it("from lg runs a foot under both cells, last on a phone", () => {
    inLocale(
      "th",
      <RefundCard foot={<RefundSection heading="ท้าย">{null}</RefundSection>} head={<h1>หัว</h1>}>
        <RefundSection heading="ขวา">{null}</RefundSection>
      </RefundCard>,
    );
    const card = screen.getByRole("article");
    const foot = card.lastElementChild!;
    expect(foot.getAttribute("data-cell")).toBe("foot");
    expect(foot.className).toContain("lg:col-span-2");
    expect(foot.className).toContain("lg:row-start-3");
    expect(within(foot as HTMLElement).getByRole("heading", { level: 2 }).textContent).toBe("ท้าย");
  });
});

describe("RefundRow", () => {
  it("sets the row in force in ink with the now pill, and the others muted", () => {
    inLocale("th", <Sheet />);
    const policy = screen.getByRole("heading", { level: 2, name: "เงื่อนไขการยกเลิก" }).closest("section")!;
    const rows = within(policy).getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    expect(rows[0].getAttribute("aria-current")).toBe("true");
    expect(within(rows[0]).getByText("ตอนนี้")).toBeTruthy();
    expect(rows[0].querySelector("p")?.className).toContain("font-medium");
    expect(rows[0].querySelector("p")?.className).toContain("text-foreground");
    for (const row of rows.slice(1)) {
      expect(row.getAttribute("aria-current")).toBeNull();
      expect(within(row).queryByText("ตอนนี้")).toBeNull();
      expect(row.querySelector("p")?.className).toContain("text-muted-foreground");
    }
    expect(rows[0].textContent).toContain("10 พ.ย. 2569 · 10:30");
    expect(rows[0].textContent).toContain("คืนเต็มจำนวน");
    expect(rows[1].textContent).toContain("10 พ.ย. 10:30 ถึง 11 พ.ย. 10:30");
    expect(rows[2].textContent).toContain("ตั้งแต่ 11 พ.ย. 10:30");
  });

  it("draws a 20px mark and a 14/12px pair of lines, 14px apart", () => {
    inLocale("th", <Sheet />);
    const policy = screen.getByRole("heading", { level: 2, name: "เงื่อนไขการยกเลิก" }).closest("section")!;
    const list = within(policy).getByRole("list");
    expect(list.className).toContain("gap-3.5");
    const [title, sub] = list.querySelectorAll("li:first-child p");
    expect(list.querySelector("li svg")?.getAttribute("class")).toContain("size-5");
    expect(title.className).toContain("text-sm");
    expect(sub.className).toContain("text-xs");
  });
});

describe("RefundBox", () => {
  it("lists the half refund's lines and the total on the receipt's faint ground", () => {
    inLocale("th", <Sheet />);
    const box = screen.getByText("รวมได้คืน").closest("dl")!;
    expect(box.className).toContain("bg-muted/50");
    expect(box.className).toContain("rounded-xl");
    expect(readFacts(box)).toEqual({
      "ค่าบริการ · คืน 50%": "฿400",
      "ค่าบริการแพลตฟอร์ม · ไม่คืน": "฿0",
      "รวมได้คืน": "฿400",
    });
  });
});

describe("RefundActions", () => {
  it("stacks the capsules 10px apart, then the help line quoting the receipt number", () => {
    inLocale("th", <Sheet />);
    const confirm = screen.getByRole("button", { name: "ยกเลิกและรับเงินคืน ฿1,000" });
    expect(confirm.parentElement?.className).toContain("gap-2.5");
    expect(screen.getByText(/มีคำถามเกี่ยวกับการจองนี้\?/)).toBeTruthy();

    const help = screen.getByRole("link", { name: "ติดต่อฝ่ายช่วยเหลือ" });
    const href = help.getAttribute("href") ?? "";
    expect(href.startsWith("mailto:hello@advisory.co.th?subject=")).toBe(true);
    expect(decodeURIComponent(href.split("subject=")[1])).toContain("INV-2026-000123");
    expect(help.className).toContain("focus-visible:ring-3");
  });

  it("from lg is the receipt's column, centred under the whole card", () => {
    inLocale("th", <Sheet />);
    const stack = screen.getByRole("button", { name: "เก็บการจองไว้" }).parentElement?.parentElement;
    const classes = stack?.className.split(" ") ?? [];
    for (const name of ["w-full", "lg:mx-auto", "lg:w-144"]) expect(classes).toContain(name);
    expect(classes).not.toContain("lg:ml-auto");
    expect(classes).not.toContain("lg:w-1/2");
  });
});

describe("refundPill", () => {
  it("is 44 tall on a phone and an upright tablet and 56 from lg, full width", () => {
    for (const kind of ["solid", "outline", "danger"] as const) {
      const pill = refundPill(kind).split(" ");
      for (const name of ["h-11", "md:h-11", "lg:h-14", "w-full"]) expect(pill).toContain(name);
    }
  });

  it("keeps the button's focus ring on a capsule", () => {
    inLocale("th", <Sheet />);
    for (const name of ["ยกเลิกและรับเงินคืน ฿1,000", "เก็บการจองไว้"]) {
      expect(screen.getByRole("button", { name }).className).toContain("focus-visible:ring-3");
    }
  });

  it("fills the danger capsule in red with white words, and nothing else in red", () => {
    const danger = refundPill("danger").split(" ");
    expect(danger).toContain("bg-destructive");
    expect(danger).toContain("text-primary-foreground");
    expect(danger).not.toContain("bg-hero-action");
    expect(refundPill("solid").split(" ")).toContain("bg-hero-action");
    expect(refundPill("outline").split(" ")).toContain("border-border");
  });
});

describe("in English", () => {
  it("renders the whole sheet with no key missing", () => {
    const { errors } = inLocale("en", <Sheet />);
    expect(errors).toEqual([]);
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/\b(bookingRefund|bookings|transactions|landing)\.\w/);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Cancel booking · full refund");
    expect(readFacts(screen.getAllByRole("term")[0].closest("dl")!)["Refund to"]).toBe("Visa •••• 1111");
    expect(screen.getByRole("button", { name: "Cancel and get ฿1,000 back" })).toBeTruthy();
  });

  it("says the original payment method when there is no card", () => {
    inLocale("en", <Sheet card={null} />);
    expect(readFacts(screen.getAllByRole("term")[0].closest("dl")!)["Refund to"]).toBe("Original payment method");
  });
});

type Tree = { readonly [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === "string" ? [`${prefix}${key}`] : flatten(value, `${prefix}${key}.`),
  );
}

function strings(tree: Tree | string): string[] {
  return typeof tree === "string" ? [tree] : Object.values(tree).flatMap(strings);
}

describe("messages", () => {
  const thTree = th as unknown as Tree;
  const enTree = en as unknown as Tree;

  it("holds the same refund and booking keys in Thai and English", () => {
    for (const namespace of ["bookingRefund", "bookings"]) {
      const thKeys = flatten(thTree[namespace] as Tree).sort();
      const enKeys = flatten(enTree[namespace] as Tree).sort();
      expect(enKeys).toEqual(thKeys);
    }
  });

  it("has no English key that Thai, which the app types its keys from, lacks", () => {
    const thKeys = new Set(flatten(thTree));
    expect(flatten(enTree).filter((key) => !thKeys.has(key))).toEqual([]);
  });

  it("keeps the keys other screens still read", () => {
    const thKeys = new Set(flatten(thTree));
    const enKeys = new Set(flatten(enTree));
    for (const key of ["bookingRefund.evidenceFailed", "bookingRefund.requestLink", "bookingRefund.status.OPEN"]) {
      expect(thKeys.has(key)).toBe(true);
      expect(enKeys.has(key)).toBe(true);
    }
  });

  it("uses only numbers that /terms section 8 states", () => {
    for (const [locale, tree] of [["th", thTree], ["en", enTree]] as const) {
      const index = terms[locale].sections.findIndex((section) => section.id === "cancellation");
      const section = terms[locale].sections[index];
      const allowed = new Set([...JSON.stringify(section).matchAll(/\d+/g)].map((m) => m[0]));
      allowed.add(String(index + 1));

      const refund = tree.bookingRefund as Tree;
      const booking = tree.bookings as Tree;
      const groups = ["head", "stage", "meta", "policy", "box", "progress", "announce", "errors", "states", "ruleLine"];
      const words = [...groups.flatMap((group) => strings(refund[group])), ...strings(booking.exit), ...strings(booking.refundNote)];
      const numbers = new Set(words.flatMap((text) => [...text.matchAll(/\d+/g)].map((m) => m[0])));

      expect([...numbers].filter((number) => !allowed.has(number))).toEqual([]);
      expect([...numbers].sort()).toEqual(["14", "24", "50", "7", "8"]);
    }
  });

  it("sizes files in MB", () => {
    for (const tree of [thTree, enTree]) {
      const words = strings((tree.bookingRefund as Tree).attachments);
      expect(words.some((text) => text.includes("50 MB"))).toBe(true);
      expect(words.some((text) => text.includes("MiB"))).toBe(false);
    }
  });
});
