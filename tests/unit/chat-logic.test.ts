import { describe, expect, it } from "vitest";

import {
  dayKey,
  daysBetween,
  findOffPlatform,
  groupThread,
  matchesQuery,
  mergeMessages,
  newestOf,
  offPlatformKinds,
  resolveCounterpart,
  splitByMatches,
  toTimeline,
  unreadIn,
} from "@/components/chat/chat-logic";
import type { ApiChatFile, ApiChatMessage } from "@/components/chat/chat-data";
import type { ApiBooking, ApiPublicAdvisor, ApiPublicService } from "@/lib/api/types";

const ME = "me";
const HER = "advisor-1";
const ROOM = "room-1";

function message(id: string, sender: string, at: string, text = id): ApiChatMessage {
  return { id, chatRoomId: ROOM, senderUserId: sender, message: text, createdAt: at };
}

function file(id: string, sender: string, at: string): ApiChatFile {
  return {
    id,
    chatRoomId: ROOM,
    senderUserId: sender,
    originalFileName: `${id}.pdf`,
    mimeType: "application/pdf",
    fileSizeBytes: 2048,
    expiryDate: null,
    createdAt: at,
  };
}

function booking(id: string, advisorId: string, createdAt: string, serviceId = "service-1"): ApiBooking {
  return {
    id,
    serviceId,
    advisorId,
    adviseeId: ME,
    startTime: "2026-09-28T07:00:00.000Z",
    endTime: "2026-09-28T08:00:00.000Z",
    unavailableUntil: "2026-09-28T08:15:00.000Z",
    state: "BOOKED",
    blocksAvailability: true,
    cancelledAt: null,
    cancelledByUserId: null,
    createdAt,
  };
}

const advisor: ApiPublicAdvisor = {
  id: HER,
  displayName: "กัญญา พรหมมา",
  headline: "ที่ปรึกษากฎหมายธุรกิจและสัญญา",
  bio: null,
  avatarKey: null,
  image: null,
  skills: [],
  publishedServiceCount: 1,
};

const service: ApiPublicService = {
  id: "service-1",
  advisorId: HER,
  categoryId: "c",
  name: "ตรวจสัญญาก่อนเซ็น",
  description: "",
  priceSatang: 150000,
  durationMinutes: 60,
  screeningRequired: false,
  trialEnabled: false,
  trialDurationMinutes: null,
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("timeline", () => {
  it("interleaves messages and files oldest first", () => {
    const entries = toTimeline(
      [message("m2", HER, "2026-09-12T10:05:00Z"), message("m1", ME, "2026-09-12T10:00:00Z")],
      [file("f1", ME, "2026-09-12T10:02:00Z")],
    );
    expect(entries.map((e) => e.id)).toEqual(["m1", "file-f1", "m2"]);
  });

  it("splits days on the Bangkok calendar, not UTC", () => {
    // 17:30 UTC is 00:30 the next day in Bangkok.
    expect(dayKey(Date.parse("2026-09-12T17:30:00Z"), "Asia/Bangkok")).toBe("2026-09-13");
    expect(daysBetween("2026-09-12", "2026-09-13")).toBe(1);
    expect(daysBetween("2026-09-13", "2026-09-13")).toBe(0);
  });

  it("groups runs by author and breaks them on a pause or a new day", () => {
    const entries = toTimeline(
      [
        message("a", ME, "2026-09-12T03:00:00Z"),
        message("b", ME, "2026-09-12T03:02:00Z"),
        message("c", HER, "2026-09-12T03:03:00Z"),
        message("d", HER, "2026-09-12T04:30:00Z"),
        message("e", HER, "2026-09-13T03:00:00Z"),
      ],
      [],
    );
    const days = groupThread(entries, ME, "Asia/Bangkok");
    expect(days.map((d) => d.day)).toEqual(["2026-09-12", "2026-09-13"]);
    const runs = days[0].runs;
    expect(runs.map((r) => r.items.map((i) => i.entry.id))).toEqual([["a", "b"], ["c"], ["d"]]);
    expect(runs[0].mine).toBe(true);
    expect(runs[1].mine).toBe(false);
    expect(runs[0].items.map((i) => [i.first, i.last])).toEqual([
      [true, false],
      [false, true],
    ]);
  });
});

describe("counterpart", () => {
  const base = { advisors: [advisor], services: [service], meId: ME };

  it("names the other sender and the booking opened with the room", () => {
    const opened = "2026-08-14T07:00:00.000Z";
    const result = resolveCounterpart({
      ...base,
      room: { createdAt: opened },
      senders: [ME, HER],
      bookings: [booking("b1", HER, opened), booking("b2", HER, "2026-09-01T00:00:00.000Z")],
    });
    expect(result.userId).toBe(HER);
    expect(result.advisor?.displayName).toBe("กัญญา พรหมมา");
    expect(result.booking?.id).toBe("b1");
    expect(result.service?.name).toBe("ตรวจสัญญาก่อนเซ็น");
  });

  it("finds a silent partner through the booking that opened the room", () => {
    const opened = "2026-09-25T07:00:00.000Z";
    const result = resolveCounterpart({
      ...base,
      room: { createdAt: opened },
      senders: [ME],
      bookings: [booking("b1", HER, opened)],
    });
    expect(result.userId).toBe(HER);
    expect(result.booking?.id).toBe("b1");
  });

  it("drops a booking that names someone other than the person who wrote", () => {
    const opened = "2026-09-25T07:00:00.000Z";
    const result = resolveCounterpart({
      ...base,
      room: { createdAt: opened },
      senders: ["someone-else", ME],
      bookings: [booking("b1", HER, opened)],
    });
    expect(result.userId).toBe("someone-else");
    expect(result.booking).toBeNull();
    expect(result.advisor).toBeNull();
  });

  it("falls back to the only booking with that person, and no further", () => {
    const one = resolveCounterpart({
      ...base,
      room: { createdAt: "2026-01-01T00:00:00.000Z" },
      senders: [HER],
      bookings: [booking("b1", HER, "2026-02-01T00:00:00.000Z")],
    });
    expect(one.booking?.id).toBe("b1");

    const two = resolveCounterpart({
      ...base,
      room: { createdAt: "2026-01-01T00:00:00.000Z" },
      senders: [HER],
      bookings: [booking("b1", HER, "2026-02-01T00:00:00.000Z"), booking("b2", HER, "2026-03-01T00:00:00.000Z")],
    });
    expect(two.userId).toBe(HER);
    expect(two.booking).toBeNull();
  });

  it("knows nothing without a signed-in user or any evidence", () => {
    expect(resolveCounterpart({ ...base, meId: undefined, room: undefined, senders: [HER], bookings: [] }).userId).toBeNull();
    expect(resolveCounterpart({ ...base, room: undefined, senders: [ME], bookings: [] }).userId).toBeNull();
  });
});

describe("off-platform scanner", () => {
  const kinds = (text: string) => offPlatformKinds(findOffPlatform(text));

  it("catches the seeded lines that leaked a way off the platform", () => {
    expect(kinds("ขอเบอร์ติดต่อได้ไหมครับ 089-123-4567 จะได้คุยนอกแอป")).toEqual(["phone"]);
    expect(kinds("แอดไลน์มาได้เลยครับ LINE: @sarawut.dev จะส่งโจทย์ให้ก่อน")).toEqual(["line"]);
    expect(kinds("โอนตรงเข้าบัญชีได้ไหมครับ กสิกร 123-4-56789-0 จะได้ไม่เสียค่าธรรมเนียม")).toEqual(["bank"]);
    expect(kinds("ส่งอีเมลมาที่ kanya.law@gmail.com ก็ได้ค่ะ")).toEqual(["email"]);
    expect(kinds("ทักมาที่ https://line.me/ti/p/abc ได้เลย")).toEqual(["link"]);
    expect(kinds("ไลน์ @advisor_k นะคะ หรือโทร +66 81 234 5678")).toEqual(["line", "phone"]);
  });

  it("leaves ordinary numbers and words alone", () => {
    expect(kinds("ราคา 1,200 บาท นัด 14:00 วันที่ 2026-09-12")).toEqual([]);
    expect(kinds("แนบแบบ ภ.ง.ด.90 ที่กรอกไว้แล้วค่ะ")).toEqual([]);
    expect(kinds("ถ้าสะดวกผมนัดชดเชยให้ฟรีอีก 30 นาทีก็ได้ครับ")).toEqual([]);
    expect(kinds("We should line up the documents first")).toEqual([]);
  });

  it("cuts a line into plain and flagged runs", () => {
    const text = "โทร 089-123-4567 ได้เลย";
    const parts = splitByMatches(text, findOffPlatform(text));
    expect(parts).toEqual([
      { text: "โทร ", kind: null },
      { text: "089-123-4567", kind: "phone" },
      { text: " ได้เลย", kind: null },
    ]);
  });
});

describe("inbox helpers", () => {
  it("finds the newest line and matches a query against any field", () => {
    const newest = newestOf([message("a", ME, "2026-09-12T03:00:00Z"), message("b", HER, "2026-09-12T05:00:00Z")]);
    expect(newest?.id).toBe("b");
    expect(newestOf([])).toBeUndefined();
    expect(matchesQuery("สัญญา", "กัญญา", "ตรวจสัญญาก่อนเซ็น")).toBe(true);
    expect(matchesQuery("ภาษี", "กัญญา", null)).toBe(false);
    expect(matchesQuery("  ", "anything")).toBe(true);
  });
});

describe("live lines", () => {
  const room = { unreadCount: 2, lastReadAt: "2026-09-12T01:00:00.000Z" };
  const page = [message("p1", HER, "2026-09-12T02:00:00.000Z"), message("p2", HER, "2026-09-12T03:00:00.000Z")];

  it("merges REST and live lines once each", () => {
    const merged = mergeMessages(page, [page[1], message("l1", HER, "2026-09-12T04:00:00.000Z")]);
    expect(merged.map((m) => m.id)).toEqual(["p1", "p2", "l1"]);
  });

  it("adds their new lines to the API count and ignores mine", () => {
    const live = [message("l1", HER, "2026-09-12T04:00:00.000Z"), message("l2", ME, "2026-09-12T04:01:00.000Z"), page[1]];
    expect(unreadIn({ room, page, live, meId: ME, readThrough: undefined })).toBe(3);
  });

  it("counts only what came after I read the room", () => {
    const readThrough = Date.parse("2026-09-12T03:00:00.000Z");
    expect(unreadIn({ room, page, live: [], meId: ME, readThrough })).toBe(0);
    const live = [message("l1", HER, "2026-09-12T04:00:00.000Z")];
    expect(unreadIn({ room, page, live, meId: ME, readThrough })).toBe(1);
  });

  it("names the person the API names, even before anyone writes", () => {
    const counterpart = resolveCounterpart({
      room: { createdAt: "2026-01-01T00:00:00.000Z", counterpart: { id: HER, displayName: "กัญญา", image: null } },
      senders: [],
      meId: ME,
      bookings: [],
      advisors: [advisor],
      services: [],
    });
    expect(counterpart.userId).toBe(HER);
    expect(counterpart.person?.displayName).toBe("กัญญา");
    expect(counterpart.advisor?.id).toBe(HER);
  });
});
