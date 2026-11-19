import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  api,
}));

import { groupThread, toTimeline } from "@/components/chat/chat-logic";
import type { ApiChatMessage } from "@/components/chat/chat-data";
import {
  notificationAction,
  notificationCategory,
  notificationHref,
  type ApiNotification,
  type NotificationType,
} from "@/components/notifications/notifications-data";
import {
  declineTrial,
  getServiceTrial,
  grantTrial,
  listRoomTrials,
  mergeTrials,
  requestTrial,
  trialKeys,
  type ApiTrialRequest,
} from "@/components/trials/trial-data";

const ROOM = "room-1";
const ADVISEE = "advisee-1";
const ADVISOR = "advisor-1";

function trial(id: string, createdAt: string, overrides: Partial<ApiTrialRequest> = {}): ApiTrialRequest {
  return {
    id,
    serviceId: "service-1",
    serviceName: "วางแผนภาษี",
    adviseeId: ADVISEE,
    advisorId: ADVISOR,
    chatRoomId: ROOM,
    trialDurationMinutes: 15,
    trialBookingId: null,
    status: "PENDING",
    decisionReason: null,
    createdAt,
    decidedAt: null,
    ...overrides,
  };
}

function message(id: string, sender: string, at: string): ApiChatMessage {
  return { id, chatRoomId: ROOM, senderUserId: sender, message: id, createdAt: at };
}

describe("mergeTrials", () => {
  it("puts a changed card in place of the listed one, and adds a new one, oldest first", () => {
    const first = trial("t1", "2026-11-18T02:00:00.000Z");
    const second = trial("t2", "2026-11-18T01:00:00.000Z");
    const granted = { ...first, status: "GRANTED" as const };
    const added = trial("t3", "2026-11-18T03:00:00.000Z");

    expect(mergeTrials([first, second], [granted, added])).toEqual([second, granted, added]);
  });

  it("keeps the list as it is when nothing changed", () => {
    const first = trial("t1", "2026-11-18T02:00:00.000Z");
    expect(mergeTrials([first], [])).toEqual([first]);
  });
});

describe("trial cards on the timeline", () => {
  it("sits on the advisee's side, between the lines around it", () => {
    const entries = toTimeline(
      [message("m1", ADVISOR, "2026-11-18T02:00:00.000Z"), message("m2", ADVISEE, "2026-11-18T02:10:00.000Z")],
      [],
      [trial("t1", "2026-11-18T02:05:00.000Z")],
    );

    expect(entries.map((entry) => entry.id)).toEqual(["m1", "trial-t1", "m2"]);
    const card = entries[1];
    expect(card.kind).toBe("trial");
    expect(card.senderId).toBe(ADVISEE);

    // The advisee's card and line after it read as one turn of theirs.
    const runs = groupThread(entries, ADVISEE, "Asia/Bangkok")[0].runs;
    expect(runs.map((run) => [run.mine, run.items.map((item) => item.entry.id)])).toEqual([
      [false, ["m1"]],
      [true, ["trial-t1", "m2"]],
    ]);
  });

  it("is the whole timeline of a room the request opened", () => {
    expect(toTimeline([], [], [trial("t1", "2026-11-18T02:05:00.000Z")])).toHaveLength(1);
    expect(toTimeline([], [])).toEqual([]);
  });
});

describe("trial routes", () => {
  beforeEach(() => {
    api.get.mockReset().mockResolvedValue(undefined);
    api.post.mockReset().mockResolvedValue(undefined);
  });

  it("reads a service's trial and a room's cards", async () => {
    await getServiceTrial("service-1");
    await listRoomTrials(ROOM);

    expect(api.get).toHaveBeenCalledWith("services/service-1/trial", { signal: undefined });
    expect(api.get).toHaveBeenCalledWith(`chat/rooms/${ROOM}/trial-requests`, { signal: undefined });
  });

  it("asks, grants and declines", async () => {
    await requestTrial("service-1");
    await grantTrial("t1");
    await declineTrial("t1", "  ตอนนี้คิวเต็ม  ");
    await declineTrial("t2", "   ");

    expect(api.post).toHaveBeenNthCalledWith(1, "services/service-1/trial-requests", { signal: undefined });
    expect(api.post).toHaveBeenNthCalledWith(2, "advisors/me/trial-requests/t1/grant", { signal: undefined });
    expect(api.post).toHaveBeenNthCalledWith(3, "advisors/me/trial-requests/t1/decline", {
      body: { message: "ตอนนี้คิวเต็ม" },
      signal: undefined,
    });
    // An empty message is left out rather than sent blank.
    expect(api.post).toHaveBeenNthCalledWith(4, "advisors/me/trial-requests/t2/decline", {
      body: {},
      signal: undefined,
    });
  });

  it("keys the cache per service and per room", () => {
    expect(trialKeys.service("service-1")).toBe("trials/service/service-1");
    expect(trialKeys.room(ROOM)).toBe(`trials/room/${ROOM}`);
  });
});

describe("trial notifications", () => {
  const roomId = "33333333-3333-4333-8333-333333333333";
  const make = (type: NotificationType, resourceId: string | null = roomId): ApiNotification => ({
    id: "44444444-4444-4444-8444-444444444444",
    type,
    title: "title",
    content: null,
    resourceId,
    isRead: false,
    createdAt: "2026-11-19T00:00:00.000Z",
  });

  it.each(["TRIAL_REQUESTED", "TRIAL_DECIDED"] as const)("opens %s's chat room, where its card is", (type) => {
    expect(notificationHref(make(type))).toBe(`/chat/room?id=${roomId}`);
    expect(notificationAction(make(type))).toEqual({ href: `/chat/room?id=${roomId}`, label: "actionChat" });
    expect(notificationCategory(type)).toBe("message");
  });

  it("falls back to the chat list without a room", () => {
    expect(notificationHref(make("TRIAL_DECIDED", null))).toBe("/chat");
  });
});
