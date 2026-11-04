import { cleanup, render, screen, within } from "@testing-library/react";
import { CircleCheckBig, CircleX, Clock3, RotateCcw } from "lucide-react";
import { NextIntlClientProvider, useTranslations, type Messages } from "next-intl";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import "./support/scroll-trigger";

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
    expect(values.deadline).toMatch(/^\D+ 10 พ\.ย\. 2569 · 16:00$/);
    expect(values.short).toBe("10 พ.ย. 10:30");
    expect(values.stamp).toBe("4 พ.ย. 2569 · 20:56");
  });

  it("never lets a line break inside the deadline, in Thai or English", () => {
    for (const locale of ["th", "en"] as const) {
      const view = inLocale(locale, <Formatted />);
      const deadline = screen.getByText("deadline", { selector: "dt" }).nextElementSibling?.textContent ?? "";
      expect(deadline).toMatch(/2026|2569/);
      expect(deadline).not.toMatch(/[ \t\n]/);
      view.unmount();
    }
  });
});

/** True when the nodes come in this order in the page, as a reader or a phone's single column meets them. */
function inOrder(...nodes: readonly Node[]): boolean {
  return nodes.every((node, i) => i === 0 || Boolean(nodes[i - 1].compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING));
}

describe("RefundHead", () => {
  it("leads with the status line as the page heading, then the amount, then what the amount is", () => {
    inLocale("th", <Sheet />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toBe("ยกเลิกการจอง · คืนเต็มจำนวน");
    const amount = screen.getAllByText("฿1,000").find((node) => node.tagName === "P")!;
    expect(inOrder(heading, amount, screen.getByText("ยอดที่ได้คืนถ้ายกเลิกตอนนี้"))).toBe(true);
  });

  it("reads a meta given in parts as one line, the parts joined by a dot", () => {
    inLocale("th", <RefundHead amount="฿1,000" icon={CircleCheckBig} meta={["ยอดที่ขอคืน", "แจ้งได้ถึง 10 พ.ย."]} title="คืนเงินแล้ว" tone="success" />);
    const meta = screen.getByText((_, node) => node?.tagName === "P" && (node.textContent ?? "").startsWith("ยอดที่ขอคืน"));
    expect(meta.textContent?.replaceAll("\u{a0}", " ")).toBe("ยอดที่ขอคืน · แจ้งได้ถึง 10 พ.ย.");
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
});

describe("RefundCard", () => {
  it("reads the head, the sections, then the aside, in the order the task is done", () => {
    inLocale("th", <Sheet />);
    const card = screen.getByRole("article");
    expect([...card.querySelectorAll("h1, h2")].map((heading) => heading.textContent)).toEqual([
      "ยกเลิกการจอง · คืนเต็มจำนวน",
      "ยอดที่ได้คืน",
      "เงื่อนไขการยกเลิก",
      "ความคืบหน้า",
      "หลักฐาน (ไม่บังคับ)",
    ]);
  });

  it("names each cell for what it holds, the foot last", () => {
    inLocale(
      "th",
      <RefundCard aside={<RefundSection heading="ใต้หัว">{null}</RefundSection>} foot={<RefundSection heading="ท้าย">{null}</RefundSection>} head={<h1>หัว</h1>}>
        <RefundSection heading="ขวา">{null}</RefundSection>
      </RefundCard>,
    );
    const cells = [...screen.getByRole("article").children].map((cell) => [
      cell.getAttribute("data-cell"),
      within(cell as HTMLElement).getByRole("heading").textContent,
    ]);
    expect(cells).toEqual([
      ["head", "หัว"],
      ["sections", "ขวา"],
      ["aside", "ใต้หัว"],
      ["foot", "ท้าย"],
    ]);
  });

  it("draws no aside or foot it was not given", () => {
    inLocale(
      "th",
      <RefundCard head={<h1>หัว</h1>}>
        <RefundSection heading="ขวา">{null}</RefundSection>
      </RefundCard>,
    );
    expect([...screen.getByRole("article").children].map((cell) => cell.getAttribute("data-cell"))).toEqual(["head", "sections"]);
  });
});

describe("RefundRow", () => {
  it("marks the row in force as current, with the now pill after its title and before its line", () => {
    inLocale("th", <Sheet />);
    const policy = screen.getByRole("heading", { level: 2, name: "เงื่อนไขการยกเลิก" }).closest("section")!;
    const rows = within(policy).getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    expect(rows[0].getAttribute("aria-current")).toBe("true");
    expect(rows[0].textContent?.replaceAll("\u{a0}", " ")).toMatch(/^ถึง \S+ 10 พ\.ย\. 2569 · 10:30ตอนนี้คืนเต็มจำนวน$/);
    for (const row of rows.slice(1)) {
      expect(row.getAttribute("aria-current")).toBeNull();
      expect(within(row).queryByText("ตอนนี้")).toBeNull();
    }
    expect(rows[1].textContent).toBe("10 พ.ย. 10:30 ถึง 11 พ.ย. 10:30คืน 50% ของค่าบริการ");
    expect(rows[2].textContent).toBe("ตั้งแต่ 11 พ.ย. 10:30ยกเลิกไม่ได้ ถ้ามีปัญหาขอคืนเงินได้ถึง 7 วันหลังจบ");
  });
});

describe("RefundBox", () => {
  it("lists the half refund's lines, then the total", () => {
    inLocale("th", <Sheet />);
    const box = screen.getByText("รวมได้คืน").closest("dl")!;
    expect(readFacts(box)).toEqual({
      "ค่าบริการ · คืน 50%": "฿400",
      "ค่าบริการแพลตฟอร์ม · ไม่คืน": "฿0",
      "รวมได้คืน": "฿400",
    });
    expect(within(box).getAllByRole("term").at(-1)?.textContent).toBe("รวมได้คืน");
  });
});

describe("RefundActions", () => {
  it("sets the buttons first, then the help line, which mails support quoting the receipt number", () => {
    inLocale("th", <Sheet />);
    const help = screen.getByRole("link", { name: "ติดต่อฝ่ายช่วยเหลือ" });
    expect(help.closest("p")?.textContent).toBe("มีคำถามเกี่ยวกับการจองนี้? ติดต่อฝ่ายช่วยเหลือ");
    expect(inOrder(screen.getByRole("button", { name: "ยกเลิกและรับเงินคืน ฿1,000" }), screen.getByRole("button", { name: "เก็บการจองไว้" }), help)).toBe(true);

    const href = help.getAttribute("href") ?? "";
    expect(href.startsWith("mailto:hello@advisory.co.th?subject=")).toBe(true);
    expect(decodeURIComponent(href.split("subject=")[1])).toContain("INV-2026-000123");
  });

  it("drops the help line when told to, for a page whose own button already mails support", () => {
    inLocale(
      "th",
      <RefundActions help={false} invoiceNumber={invoice.invoiceNumber}>
        <Button type="button">ปุ่ม</Button>
      </RefundActions>,
    );
    expect(screen.getByRole("button", { name: "ปุ่ม" })).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByText(/มีคำถามเกี่ยวกับการจองนี้/)).toBeNull();
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
    for (const key of ["bookingRefund.evidenceFailed", "bookingRefund.retry"]) {
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
