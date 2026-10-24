/**
 * The chat's reasoning, kept free of React so it can be tested on its own:
 * how a thread is grouped for reading, who is on the other side of a room, and
 * which lines carry a way to leave the platform.
 */

import type { ApiBooking, ApiPublicAdvisor, ApiPublicService } from "@/lib/api/types";
import type {
  ApiChatFile,
  ApiChatMessage,
  ApiChatRoom,
  ApiChatRoomCounterpart,
} from "@/components/chat/chat-data";

/* ------------------------------------------------------------------ timeline */

/** A message or a file, on one timeline. */
export type ThreadEntry =
  | {
      readonly kind: "message";
      readonly id: string;
      readonly at: number;
      readonly senderId: string;
      readonly message: ApiChatMessage;
    }
  | {
      readonly kind: "file";
      readonly id: string;
      readonly at: number;
      readonly senderId: string;
      readonly file: ApiChatFile;
    };

/**
 * Messages and files, oldest first.
 *
 * A file is not a message (`POST .../files` never writes `chat_messages`), so
 * the two lists are read separately and interleaved by `createdAt`. Ties fall
 * back to the id so the order never flickers between two reads.
 */
export function toTimeline(
  messages: readonly ApiChatMessage[],
  files: readonly ApiChatFile[],
): ThreadEntry[] {
  const entries: ThreadEntry[] = [
    ...messages.map(
      (message): ThreadEntry => ({
        kind: "message",
        id: message.id,
        at: Date.parse(message.createdAt),
        senderId: message.senderUserId,
        message,
      }),
    ),
    ...files.map(
      (file): ThreadEntry => ({
        kind: "file",
        id: `file-${file.id}`,
        at: Date.parse(file.createdAt),
        senderId: file.senderUserId,
        file,
      }),
    ),
  ];
  return entries.sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
}

/** `YYYY-MM-DD` for an instant, on the calendar of `timeZone`. */
export function dayKey(at: number, timeZone: string): string {
  // `en-CA` formats a date as ISO year-month-day, which sorts and parses.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

/** Whole days from day `a` to day `b`, both `YYYY-MM-DD`. */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

export type GroupedEntry = {
  readonly entry: ThreadEntry;
  /** The first bubble of its run: it keeps its corner towards the author. */
  readonly first: boolean;
  /** The last bubble of its run: it carries the time and, for the partner, the face. */
  readonly last: boolean;
};

export type SenderRun = {
  readonly key: string;
  readonly senderId: string;
  readonly mine: boolean;
  readonly items: readonly GroupedEntry[];
};

export type DayBlock = {
  readonly key: string;
  readonly day: string;
  readonly at: number;
  readonly runs: readonly SenderRun[];
};

/** Lines closer than this from one author read as one thought. */
export const RUN_GAP_MS = 5 * 60 * 1000;

/**
 * The thread as it is read: days, then runs of one author inside a day.
 *
 * A run breaks when the author changes, when the day changes, or when the same
 * author pauses for longer than `gap`, so a reply that came an hour later reads
 * as a new turn rather than as the tail of the last one.
 */
export function groupThread(
  entries: readonly ThreadEntry[],
  meId: string | undefined,
  timeZone: string,
  gap: number = RUN_GAP_MS,
): DayBlock[] {
  const days: { key: string; day: string; at: number; runs: { senderId: string; mine: boolean; items: ThreadEntry[] }[] }[] = [];

  for (const entry of entries) {
    const day = dayKey(entry.at, timeZone);
    let block = days.at(-1);
    if (block?.day !== day) {
      block = { key: `day-${day}`, day, at: entry.at, runs: [] };
      days.push(block);
    }
    const run = block.runs.at(-1);
    const previous = run?.items.at(-1);
    if (run && previous && run.senderId === entry.senderId && entry.at - previous.at <= gap) {
      run.items.push(entry);
    } else {
      block.runs.push({ senderId: entry.senderId, mine: meId !== undefined && entry.senderId === meId, items: [entry] });
    }
  }

  return days.map((block) => ({
    key: block.key,
    day: block.day,
    at: block.at,
    runs: block.runs.map((run) => ({
      key: `run-${run.items[0].id}`,
      senderId: run.senderId,
      mine: run.mine,
      items: run.items.map((entry, index) => ({
        entry,
        first: index === 0,
        last: index === run.items.length - 1,
      })),
    })),
  }));
}

/* -------------------------------------------------------------- counterpart */

/**
 * Who is on the other side of a room.
 *
 * The API names them now: `GET /chat/rooms` carries the other member as
 * `counterpart`, which is the answer whenever it is there. A room from an API
 * older than that field, or an anonymous room (whose `counterpart` is null),
 * is put together from what is readable instead, strongest evidence first:
 *
 * 1. **The other sender.** Any line in the room not written by me was written
 *    by the other member. That is a fact, not a guess.
 * 2. **The booking that opened the room.** A room is created with its booking,
 *    and the two carry the same creation instant (`seed.ts` writes both from
 *    one value, and booking creation stamps the room with the booking's own
 *    `createdAt`). Matched only when exactly one of my bookings shares that
 *    instant, and dropped if it names a different person from the one who
 *    actually wrote in the room.
 * 3. **The only booking with that person.** When the instant matches nothing,
 *    a room whose author I know and who I booked exactly once can only be that
 *    booking's room.
 *
 * Anything weaker is left unknown rather than filled in. The booking is still
 * worked out this way even when the API names the person, since a room does
 * not name its appointment.
 */
export type Counterpart = {
  /** The other member's user id, when it can be told. */
  readonly userId: string | null;
  /**
   * Their public profile. Only listed advisors have one, and a listed advisor
   * has passed the identity check (`discoverableWhere` → `isVerifiedAdvisor`
   * in the API), which is what the verified mark rests on.
   */
  readonly advisor: ApiPublicAdvisor | null;
  /**
   * Who the API says they are: a display name and a portrait, for anyone,
   * advisor or not (an advisor reading a room sees the Advisee here).
   */
  readonly person: ApiChatRoomCounterpart | null;
  /** The booking this room belongs to, when it can be told. */
  readonly booking: ApiBooking | null;
  readonly service: ApiPublicService | null;
};

export const NO_COUNTERPART: Counterpart = {
  userId: null,
  advisor: null,
  person: null,
  booking: null,
  service: null,
};

export function resolveCounterpart({
  room,
  senders,
  meId,
  bookings,
  advisors,
  services,
}: {
  readonly room: Pick<ApiChatRoom, "createdAt" | "counterpart"> | undefined;
  /** Every sender id seen in the room, in any order. */
  readonly senders: readonly string[];
  readonly meId: string | undefined;
  readonly bookings: readonly ApiBooking[];
  readonly advisors: readonly ApiPublicAdvisor[];
  readonly services: readonly ApiPublicService[];
}): Counterpart {
  const named = room?.counterpart ?? null;
  const listed = (userId: string | null) =>
    userId ? (advisors.find((a) => a.id === userId) ?? null) : null;

  if (!meId) {
    return named ? { ...NO_COUNTERPART, userId: named.id, advisor: listed(named.id), person: named } : NO_COUNTERPART;
  }

  const other = (booking: ApiBooking) =>
    booking.advisorId === meId ? booking.adviseeId : booking.advisorId;
  // The API's word first; failing that, whoever else has written here.
  const spoke = named?.id ?? senders.find((id) => id !== meId) ?? null;

  let booking: ApiBooking | null = null;
  if (room) {
    const opened = Date.parse(room.createdAt);
    const sameInstant = bookings.filter((b) => Date.parse(b.createdAt) === opened);
    if (sameInstant.length === 1 && (!spoke || other(sameInstant[0]) === spoke)) {
      booking = sameInstant[0];
    }
  }
  if (!booking && spoke) {
    const withThem = bookings.filter((b) => other(b) === spoke);
    if (withThem.length === 1) booking = withThem[0];
  }

  const userId = spoke ?? (booking ? other(booking) : null);
  return {
    userId,
    advisor: listed(userId),
    person: named,
    booking,
    service: booking ? (services.find((s) => s.id === booking.serviceId) ?? null) : null,
  };
}

/* ------------------------------------------------------------- off-platform */

/**
 * What the chat scanner looks for (CF-08): the ways a conversation leaves the
 * platform. The API keeps its own flags for the console, but no advisee route
 * reads them, so the thread recognises the same patterns itself and says so
 * beside the line. A warning, never a block: the reader decides.
 */
export type OffPlatformKind = "phone" | "line" | "email" | "bank" | "link";

export type OffPlatformMatch = {
  readonly kind: OffPlatformKind;
  readonly start: number;
  readonly end: number;
};

const EMAIL_LOCAL = /[a-z0-9._%+-]/i;
const EMAIL_DOMAIN = /[a-z0-9.-]/i;
const LETTER = /[a-z]/i;

/**
 * Email addresses, as `name@label.label.tld` with a top level of two letters
 * or more: the matches `/[a-z0-9._%+-]+@(?:[a-z0-9-]+\.)+[a-z]{2,}/gi` gives,
 * found by scanning out from each `@` instead, because that pattern's labels
 * and top level overlap and backtrack on a long run.
 */
export function findEmails(text: string): { readonly start: number; readonly end: number }[] {
  const found: { start: number; end: number }[] = [];
  let floor = 0;
  for (let at = text.indexOf("@"); at >= 0; at = text.indexOf("@", at + 1)) {
    let start = at;
    while (start > floor && EMAIL_LOCAL.test(text[start - 1])) start -= 1;
    if (start === at) continue;
    let stop = at + 1;
    while (stop < text.length && EMAIL_DOMAIN.test(text[stop])) stop += 1;
    const end = emailDomainEnd(text, at + 1, stop);
    if (end === null) continue;
    found.push({ start, end });
    floor = end;
    at = end - 1;
  }
  return found;
}

/**
 * Where the domain in `text[from, to)` ends: after the longest run of
 * non-empty labels, each closed by a dot, that is followed by two letters or
 * more (the top level, as many letters as follow). Null when there is none.
 */
function emailDomainEnd(text: string, from: number, to: number): number | null {
  let best: number | null = null;
  let labelStart = from;
  for (let i = from; i < to; i += 1) {
    if (text[i] !== ".") continue;
    if (i === labelStart) break; // An empty label: no label run reaches past it.
    let tld = i + 1;
    while (tld < text.length && LETTER.test(text[tld])) tld += 1;
    if (tld - (i + 1) >= 2) best = tld;
    labelStart = i + 1;
  }
  return best;
}

const LINK =
  /\b(?:https?:\/\/|www\.)\S+|\b(?:line\.me|lin\.ee|wa\.me|t\.me|m\.me|fb\.me|facebook\.com|instagram\.com)\/\S*/gi;

/**
 * A LINE id is only an id beside the word for it: "line" alone is an English
 * word, so it takes an "id", a colon or an @-handle to count.
 */
const LINE_ID = [
  /(?:\bline\s*id|ไลน์\s*ไอดี|ไอดีไลน์)\s*(?:[:：]\s*)?@?[a-z0-9][a-z0-9._-]{2,}/gi,
  /(?:\bline|ไลน์|ไลน)\s*[:：]\s*@?[a-z0-9][a-z0-9._-]{2,}/gi,
  /(?:\bline|ไลน์|ไลน)\s*@[a-z0-9][a-z0-9._-]{2,}/gi,
];

/** A run of digits with the separators people type between them. */
const DIGIT_RUN = /\+?\d[\d\s.-]{7,16}\d/g;

/** Thai numbers: a leading 0 and 9 or 10 digits, or the same after +66. */
function isPhone(digits: string): boolean {
  return /^0\d{8,9}$/.test(digits) || /^66\d{8,9}$/.test(digits);
}

const BANK_WORDS =
  /(บัญชี|กสิกร|กรุงเทพ|กรุงไทย|ไทยพาณิชย์|กรุงศรี|ทหารไทย|ออมสิน|ธนชาต|โอน|พร้อมเพย์|\bscb\b|\bkbank\b|\bbbl\b|\bktb\b|\bttb\b|promptpay)/i;

/** The shape Thai banks print an account number in, e.g. `123-4-56789-0`. */
const BANK_SHAPE = /^\d{3}-\d-\d{5}-\d$/;

export function findOffPlatform(text: string): OffPlatformMatch[] {
  const found: OffPlatformMatch[] = [];
  const add = (kind: OffPlatformKind, re: RegExp) => {
    for (const m of text.matchAll(re)) {
      found.push({ kind, start: m.index, end: m.index + m[0].length });
    }
  };

  for (const email of findEmails(text)) found.push({ kind: "email", ...email });
  add("link", LINK);
  for (const re of LINE_ID) add("line", re);

  for (const m of text.matchAll(DIGIT_RUN)) {
    const raw = m[0].trim();
    const digits = raw.replaceAll(/\D/g, "");
    const start = m.index + m[0].indexOf(raw);
    if (isPhone(digits)) {
      found.push({ kind: "phone", start, end: start + raw.length });
      continue;
    }
    const before = text.slice(Math.max(0, start - 24), start);
    if (digits.length >= 10 && digits.length <= 12 && (BANK_SHAPE.test(raw) || BANK_WORDS.test(before))) {
      found.push({ kind: "bank", start, end: start + raw.length });
    }
  }

  // First come wins where two patterns caught the same characters (a LINE
  // handle inside an email address, a link that ends in digits).
  found.sort((a, b) => a.start - b.start || b.end - a.end);
  const kept: OffPlatformMatch[] = [];
  for (const match of found) {
    const last = kept.at(-1);
    if (last && match.start < last.end) continue;
    kept.push(match);
  }
  return kept;
}

/** The kinds a line carries, once each, in the order they appear. */
export function offPlatformKinds(matches: readonly OffPlatformMatch[]): OffPlatformKind[] {
  return [...new Set(matches.map((m) => m.kind))];
}

/** The text cut into plain runs and flagged runs, for highlighting in place. */
export function splitByMatches(
  text: string,
  matches: readonly OffPlatformMatch[],
): { readonly text: string; readonly kind: OffPlatformKind | null; readonly start: number }[] {
  // `start` is where the part begins in `text`: unique, so it keys the part.
  const parts: { text: string; kind: OffPlatformKind | null; start: number }[] = [];
  let cursor = 0;
  for (const match of matches) {
    if (match.start > cursor) parts.push({ text: text.slice(cursor, match.start), kind: null, start: cursor });
    parts.push({ text: text.slice(match.start, match.end), kind: match.kind, start: match.start });
    cursor = match.end;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), kind: null, start: cursor });
  return parts;
}

/* -------------------------------------------------------------------- live */

/** Lines read from REST and lines that arrived live, each once, by id. */
export function mergeMessages(...lists: readonly (readonly ApiChatMessage[])[]): ApiChatMessage[] {
  const byId = new Map<string, ApiChatMessage>();
  for (const list of lists) {
    for (const message of list) {
      if (!byId.has(message.id)) byId.set(message.id, message);
    }
  }
  return [...byId.values()];
}

/**
 * How many lines of a room I have not read: what the API counted, less what I
 * have read since, plus what has arrived since from the other side.
 *
 * - `room.unreadCount` is the API's count when the list was read, which can
 *   cover more lines than the first page holds. It stands until I read the room.
 * - Once I have (`readThrough`, an instant), only their lines newer than it
 *   count, from the page as from what arrived live.
 * - A live line that is also on the page was in the API's count already.
 */
export function unreadIn({
  room,
  page,
  live,
  meId,
  readThrough,
}: {
  readonly room: Pick<ApiChatRoom, "unreadCount" | "lastReadAt">;
  /** The first page of the room, as read with the list. */
  readonly page: readonly ApiChatMessage[];
  readonly live: readonly ApiChatMessage[];
  readonly meId: string | undefined;
  readonly readThrough: number | undefined;
}): number {
  if (!meId) return readThrough === undefined ? room.unreadCount : 0;
  const theirs = (message: ApiChatMessage) => message.senderUserId !== meId;
  const after = (message: ApiChatMessage, instant: number) => Date.parse(message.createdAt) > instant;

  const counted =
    readThrough === undefined
      ? room.unreadCount
      : page.filter((message) => theirs(message) && after(message, readThrough)).length;

  const onPage = new Set(page.map((message) => message.id));
  const floor = Math.max(
    readThrough ?? Number.NEGATIVE_INFINITY,
    room.lastReadAt ? Date.parse(room.lastReadAt) : Number.NEGATIVE_INFINITY,
  );
  const arrived = live.filter(
    (message) => !onPage.has(message.id) && theirs(message) && after(message, floor),
  ).length;

  return counted + arrived;
}

/* ------------------------------------------------------------------ inbox */

/** The newest line of a room, for its row in the list. */
export function newestOf(messages: readonly ApiChatMessage[]): ApiChatMessage | undefined {
  let newest: ApiChatMessage | undefined;
  for (const message of messages) {
    if (!newest || Date.parse(message.createdAt) > Date.parse(newest.createdAt)) newest = message;
  }
  return newest;
}

/** Whether a row answers a search: the name, the service, or the last line. */
export function matchesQuery(query: string, ...fields: readonly (string | null | undefined)[]): boolean {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return true;
  return fields.some((field) => field?.toLocaleLowerCase().includes(needle));
}
