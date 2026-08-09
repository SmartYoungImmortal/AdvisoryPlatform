import { and, asc, desc, eq, gt, inArray, isNotNull, sql, type SQL } from "drizzle-orm";

import type { Handlers, InputOf, OutputOf } from "@/lib/api/contract";
import { apiError } from "@/lib/api/errors";
import type {
  Advisor,
  MatchQuery,
  ScreeningAnswer,
  ScreeningRequest,
  ScreeningStatus,
} from "@/lib/api/schema";

import type { WorkerContext } from "../context";
import { schema, type Db } from "../db";

/**
 * Discovery: how an advisee finds an advisor, and the gate an advisor puts in
 * front of themselves.
 *
 * Every read here is bounded and every list is fetched with a join or a single
 * `WHERE … IN`. The Free plan allows 50 subrequests per invocation, so "one
 * query per card" is not a style preference — it is the difference between a
 * results page that renders and one that dies at the eleventh advisor.
 */

/** Exactly the contract keys this file owns. */
type DiscoveryKey =
  | "advisors.get"
  | "advisors.slots"
  | "matching.start"
  | "matching.get"
  | "screening.questions"
  | "screening.submit"
  | "screening.myRequest"
  | "screening.inbox"
  | "screening.respond"
  | "screening.saveQuestions";

/**
 * The contract types `ctx` as the shared `HandlerContext` so the mock backend
 * and the Worker implement one interface. Parameters are contravariant under
 * `strictFunctionTypes`, so a handler asking for the richer `WorkerContext` is
 * *not* assignable to that signature. Declaring the domain against
 * `WorkerContext` and widening once on export keeps every input and output
 * checked against the contract while still giving the handlers `ctx.db` — the
 * alternative, casting `ctx` inside each handler, repeats one assertion ten
 * times.
 */
type DiscoveryDomain = {
  [K in DiscoveryKey]: (
    input: InputOf<K>,
    ctx: WorkerContext,
  ) => Promise<OutputOf<K>>;
};

/** The platform prices in THB only; `service.currency` exists for a later expansion. */
const CURRENCY = "THB" as const;

/** Slots far enough out to fill the calendar, without shipping a year of rows. */
const SLOT_LIMIT = 100;
/** Advisors considered for one search. Scoring is in-memory, so this is the real cost ceiling. */
const CANDIDATE_POOL = 60;
/** Cards on /matching/results. More than this is a scroll nobody finishes. */
const MAX_RESULTS = 12;
/** One screenful of screening requests plus room to scroll. */
const INBOX_LIMIT = 50;
/** `topicLabel` is a one-line summary in a list row, not the answer itself. */
const TOPIC_LABEL_MAX = 80;

function money(amountMinor: number) {
  return { amountMinor, currency: CURRENCY };
}

// ─── Advisors ────────────────────────────────────────────────────────────────

/**
 * Load full `Advisor` cards for whichever profiles match `where`.
 *
 * Two statements, one round trip:
 *
 * 1. profile ⋈ user ⋈ skills — the skills come back *in the same join* as the
 *    profile, because a second query per advisor is the N+1 the subrequest
 *    budget cannot absorb.
 * 2. the cheapest published price per advisor, grouped — same reason.
 *
 * The advisor set is chosen by a sub-select rather than a LIMIT on the joined
 * rows: a LIMIT out here would truncate one advisor's *skill list* instead of
 * the advisor list, which is the quiet way this query goes wrong.
 */
async function loadAdvisors(
  db: Db,
  where: SQL | undefined,
  limit: number,
): Promise<Map<string, Advisor>> {
  // Rebuilt per use — a query builder is consumed when it is compiled into a
  // statement, so the two statements below each need their own.
  const pool = () =>
    db
      .select({ id: schema.advisorProfile.userId })
      .from(schema.advisorProfile)
      .where(where)
      .orderBy(desc(schema.advisorProfile.ratingCount))
      .limit(limit);

  const [rows, prices] = await db.batch([
    db
      .select({
        id: schema.advisorProfile.userId,
        name: schema.user.name,
        image: schema.user.image,
        headline: schema.advisorProfile.headline,
        bio: schema.advisorProfile.bio,
        acceptingRequests: schema.advisorProfile.acceptingRequests,
        ratingSum: schema.advisorProfile.ratingSum,
        ratingCount: schema.advisorProfile.ratingCount,
        sessionCount: schema.advisorProfile.sessionCount,
        skillId: schema.advisorSkill.id,
        skillName: schema.advisorSkill.name,
      })
      .from(schema.advisorProfile)
      .innerJoin(schema.user, eq(schema.user.id, schema.advisorProfile.userId))
      .leftJoin(
        schema.advisorSkill,
        eq(schema.advisorSkill.advisorId, schema.advisorProfile.userId),
      )
      .where(inArray(schema.advisorProfile.userId, pool()))
      // Grouped by advisor so the fold below is a single pass; `position` is the
      // advisor's own ordering of their skills and must survive the join.
      .orderBy(asc(schema.advisorProfile.userId), asc(schema.advisorSkill.position)),
    db
      .select({
        advisorId: schema.service.advisorId,
        cheapestMinor: sql<number>`min(${schema.service.priceMinor})`.mapWith(Number),
      })
      .from(schema.service)
      .where(
        and(
          eq(schema.service.status, "published"),
          inArray(schema.service.advisorId, pool()),
        ),
      )
      .groupBy(schema.service.advisorId),
  ]);

  const cheapest = new Map(prices.map((row) => [row.advisorId, row.cheapestMinor]));
  const advisors = new Map<string, Advisor>();

  for (const row of rows) {
    let advisor = advisors.get(row.id);
    if (!advisor) {
      advisor = {
        id: row.id,
        name: row.name,
        imageUrl: row.image ?? null,
        field: row.headline,
        bio: row.bio,
        // An advisor with nothing published cannot be booked, so 0 is the
        // honest answer rather than a price pulled from a draft service.
        hourlyRate: money(cheapest.get(row.id) ?? 0),
        stats: {
          rating:
            row.ratingCount > 0
              ? Math.round((row.ratingSum / row.ratingCount) * 10) / 10
              : 0,
          sessions: row.sessionCount,
          reviews: row.ratingCount,
        },
        skills: [],
        acceptingRequests: row.acceptingRequests,
      };
      advisors.set(row.id, advisor);
    }
    // Null on both when the advisor has no skills — the LEFT JOIN still yields
    // their profile row, which is the point of it being a LEFT JOIN.
    if (row.skillId !== null && row.skillName !== null) {
      advisor.skills.push({
        id: row.skillId,
        name: row.skillName,
        // There is no per-skill counter in the schema, so the muted line under
        // every skill carries the advisor's total. Give it a real per-skill
        // number the day `advisor_skill` grows one.
        meta: `ปรึกษา ${row.sessionCount} ครั้ง`,
      });
    }
  }

  return advisors;
}

// ─── Matching ────────────────────────────────────────────────────────────────

/** A topic word counts for more than a word buried in the free-text detail. */
const TOPIC_TERM_WEIGHT = 3;
const DETAIL_TERM_WEIGHT = 1;
/** A named skill is a stronger claim of expertise than the one-line headline. */
const SKILL_FIELD_WEIGHT = 1;
const HEADLINE_FIELD_WEIGHT = 0.6;

/**
 * Latin letters, digits and the Thai block are content; everything else is a
 * separator. Thai does not space its words, so this yields phrases as often as
 * words — which is why matching below is substring-based in both directions.
 */
const TERM_SEPARATOR = /[^0-9a-z\u0E00-\u0E7F]+/;

function terms(text: string): string[] {
  return [
    ...new Set(
      text
        .toLowerCase()
        .split(TERM_SEPARATOR)
        .filter((term) => term.length >= 2),
    ),
  ];
}

/**
 * How well one advisor answers one query, 0–1, plus the thing they matched on
 * (the "ตรงกับ …" line on the results card).
 *
 * Deliberately pure and deliberately dumb: keyword overlap against the headline
 * and the skill names. It is exported and free of `ctx` so the embedding-based
 * matcher can replace this one function without touching the handler, and so
 * its ranking can be tested without a database.
 */
export function scoreAdvisorAgainstQuery(
  query: Pick<MatchQuery, "topic" | "detail">,
  advisor: Pick<Advisor, "field" | "skills">,
): { score: number; matchedOn: string } {
  const topicTerms = terms(query.topic);
  const seen = new Set(topicTerms);
  const weighted = [
    ...topicTerms.map((term) => ({ term, weight: TOPIC_TERM_WEIGHT })),
    ...terms(query.detail)
      .filter((term) => !seen.has(term))
      .map((term) => ({ term, weight: DETAIL_TERM_WEIGHT })),
  ];
  if (weighted.length === 0) return { score: 0, matchedOn: "" };

  const haystacks = [
    ...advisor.skills.map((skill) => ({
      label: skill.name,
      text: skill.name.toLowerCase(),
      weight: SKILL_FIELD_WEIGHT,
    })),
    {
      label: advisor.field,
      text: advisor.field.toLowerCase(),
      weight: HEADLINE_FIELD_WEIGHT,
    },
  ].filter((hay) => hay.text.length >= 2);

  let earned = 0;
  let possible = 0;
  let best = { weight: 0, label: "" };

  for (const { term, weight } of weighted) {
    // The ceiling is every term landing on a skill, so a headline-only match
    // scores below a skill match instead of saturating at 1.
    possible += weight * SKILL_FIELD_WEIGHT;

    let hitWeight = 0;
    let hitLabel = "";
    for (const hay of haystacks) {
      // Both directions: "วิจัย" is inside "ระเบียบวิธีวิจัย", and a long query
      // phrase can contain a short skill name.
      if (hay.text.includes(term) || term.includes(hay.text)) {
        if (hay.weight > hitWeight) {
          hitWeight = hay.weight;
          hitLabel = hay.label;
        }
      }
    }

    earned += weight * hitWeight;
    if (hitWeight > 0 && weight * hitWeight > best.weight) {
      best = { weight: weight * hitWeight, label: hitLabel };
    }
  }

  const score = possible > 0 ? Math.min(1, earned / possible) : 0;
  // Rounded because it is persisted as basis points; keeping the two in step
  // means a polled run reports the same number the first response did.
  return { score: Math.round(score * 10000) / 10000, matchedOn: best.label };
}

// ─── Screening ───────────────────────────────────────────────────────────────

const SCREENING_STATUSES: readonly string[] = ["pending", "accepted", "declined"];

/** `status` is text in Postgres; anything unrecognised reads as not-yet-answered. */
function toScreeningStatus(value: string): ScreeningStatus {
  return SCREENING_STATUSES.includes(value) ? (value as ScreeningStatus) : "pending";
}

interface ScreeningRequestRow {
  id: string;
  advisorId: string;
  adviseeId: string;
  topicLabel: string;
  status: string;
  responseNote: string | null;
  unread: boolean;
  respondedAt: Date | null;
  createdAt: Date;
}

function toScreeningRequest(
  row: ScreeningRequestRow,
  adviseeName: string,
  answers: ScreeningAnswer[],
): ScreeningRequest {
  return {
    id: row.id,
    advisorId: row.advisorId,
    adviseeId: row.adviseeId,
    adviseeName,
    topicLabel: row.topicLabel,
    status: toScreeningStatus(row.status),
    answers,
    createdAt: row.createdAt.toISOString(),
    respondedAt: row.respondedAt?.toISOString() ?? null,
    responseNote: row.responseNote,
    unread: row.unread,
  };
}

/** Answers for many requests in one `WHERE … IN`, never one query per request. */
async function loadAnswers(
  db: Db,
  requestIds: string[],
): Promise<Map<string, ScreeningAnswer[]>> {
  const byRequest = new Map<string, ScreeningAnswer[]>();
  if (requestIds.length === 0) return byRequest;

  const rows = await db
    .select({
      id: schema.screeningAnswer.id,
      requestId: schema.screeningAnswer.requestId,
      questionId: schema.screeningAnswer.questionId,
      prompt: schema.screeningAnswer.prompt,
      answer: schema.screeningAnswer.answer,
    })
    .from(schema.screeningAnswer)
    .where(inArray(schema.screeningAnswer.requestId, requestIds))
    .orderBy(
      asc(schema.screeningAnswer.requestId),
      asc(schema.screeningAnswer.position),
    );

  for (const row of rows) {
    const list = byRequest.get(row.requestId) ?? [];
    list.push(toScreeningAnswer(row));
    byRequest.set(row.requestId, list);
  }
  return byRequest;
}

/**
 * Answers pulled out of a LEFT JOIN, where a request with no answers still
 * produces one row of nulls. Keeps the null-narrowing in one place instead of
 * repeating it at every call site.
 */
function answersFromJoin(
  rows: readonly {
    answerId: string | null;
    questionId: string | null;
    prompt: string | null;
    answer: string | null;
  }[],
): ScreeningAnswer[] {
  return rows.flatMap((row) =>
    row.answerId === null || row.prompt === null || row.answer === null
      ? []
      : [
          toScreeningAnswer({
            id: row.answerId,
            questionId: row.questionId,
            prompt: row.prompt,
            answer: row.answer,
          }),
        ],
  );
}

function toScreeningAnswer(row: {
  id: string;
  questionId: string | null;
  prompt: string;
  answer: string;
}): ScreeningAnswer {
  return {
    // The question may have been deleted since (the FK nulls out, the prompt
    // snapshot survives). Fall back to the answer's own id so the field stays a
    // stable, non-empty key rather than pointing at a question that is gone.
    questionId: row.questionId ?? row.id,
    prompt: row.prompt,
    answer: row.answer,
  };
}

const discoveryDomain = {
  // ── Advisors ───────────────────────────────────────────────────────────────

  "advisors.get": async ({ advisorId }, ctx) => {
    const advisors = await loadAdvisors(
      ctx.db,
      and(
        eq(schema.advisorProfile.userId, advisorId),
        // Unverified advisors are not discoverable at all. NOT_FOUND rather
        // than FORBIDDEN: this endpoint is public, and a 403 would confirm that
        // a given person has an application in flight.
        isNotNull(schema.advisorProfile.verifiedAt),
      ),
      1,
    );

    const advisor = advisors.get(advisorId);
    if (!advisor) throw apiError("NOT_FOUND", `No advisor ${advisorId}`);
    return advisor;
  },

  "advisors.slots": async ({ advisorId }, ctx) => {
    const viewer = ctx.requireUser();
    const now = new Date();

    const rows = await ctx.db
      .select({
        id: schema.timeslot.id,
        startAt: schema.timeslot.startAt,
        endAt: schema.timeslot.endAt,
        heldUntil: schema.timeslot.heldUntil,
        heldBy: schema.timeslot.heldBy,
      })
      .from(schema.timeslot)
      .where(
        and(
          eq(schema.timeslot.advisorId, advisorId),
          eq(schema.timeslot.status, "open"),
          // A slot that has already started cannot be booked, and a past slot
          // in the picker is how someone ends up paying for yesterday.
          gt(schema.timeslot.startAt, now),
        ),
      )
      .orderBy(asc(schema.timeslot.startAt))
      .limit(SLOT_LIMIT);

    return rows.map((row) => ({
      id: row.id,
      advisorId,
      startAt: row.startAt.toISOString(),
      durationMinutes: Math.round((row.endAt.getTime() - row.startAt.getTime()) / 60000),
      // A live hold by someone else means someone is in checkout for it right
      // now. It stays in the list — the calendar would otherwise flicker rows in
      // and out — but it is not offered. The caller's own hold is still theirs.
      available: !(row.heldUntil !== null && row.heldUntil > now && row.heldBy !== viewer.id),
    }));
  },

  // ── Matching ───────────────────────────────────────────────────────────────

  "matching.start": async (query, ctx) => {
    const user = ctx.requireUser();
    const runId = crypto.randomUUID();
    const budgetMinor = query.budgetMaxPerHour?.amountMinor ?? null;

    // The run is persisted before scoring so a client that loses the response
    // can resume /matching/searching by id instead of starting a second search.
    await ctx.db.insert(schema.matchRun).values({
      id: runId,
      userId: user.id,
      topic: query.topic,
      detail: query.detail,
      budgetMaxPerHourMinor: budgetMinor,
      status: "searching",
    });

    const candidates = await loadAdvisors(
      ctx.db,
      and(
        isNotNull(schema.advisorProfile.verifiedAt),
        eq(schema.advisorProfile.acceptingRequests, true),
      ),
      CANDIDATE_POOL,
    );

    const results = [...candidates.values()]
      .filter((advisor) => {
        if (budgetMinor === null) return true;
        // hourlyRate is 0 when nothing is published, and an advisor with no
        // bookable price cannot be shown to someone who named a budget.
        return (
          advisor.hourlyRate.amountMinor > 0 &&
          advisor.hourlyRate.amountMinor <= budgetMinor
        );
      })
      .map((advisor) => ({ advisor, ...scoreAdvisorAgainstQuery(query, advisor) }))
      // Zero overlap is not a match. An empty list is a designed screen
      // (/matching/results/no-results); a list of irrelevant advisors is not.
      .filter((match) => match.score > 0)
      .sort((a, b) => b.score - a.score || a.advisor.name.localeCompare(b.advisor.name))
      .slice(0, MAX_RESULTS);

    const finish = ctx.db
      .update(schema.matchRun)
      .set({ status: "done" })
      .where(and(eq(schema.matchRun.id, runId), eq(schema.matchRun.userId, user.id)));

    if (results.length > 0) {
      // Batched so a run can never be marked done without the rows it claims to
      // have — neon-http has no interactive transaction to roll back into.
      await ctx.db.batch([
        ctx.db.insert(schema.matchResult).values(
          results.map((match, index) => ({
            runId,
            advisorId: match.advisor.id,
            matchedOn: match.matchedOn,
            scoreBp: Math.round(match.score * 10000),
            position: index,
          })),
        ),
        finish,
      ]);
    } else {
      await finish;
    }

    return { id: runId, status: "done" as const, results };
  },

  "matching.get": async ({ runId }, ctx) => {
    const user = ctx.requireUser();

    // Run and results in one statement. The LEFT JOIN keeps a still-searching
    // (or empty) run readable, which is what /matching/searching polls.
    const rows = await ctx.db
      .select({
        status: schema.matchRun.status,
        advisorId: schema.matchResult.advisorId,
        matchedOn: schema.matchResult.matchedOn,
        scoreBp: schema.matchResult.scoreBp,
      })
      .from(schema.matchRun)
      .leftJoin(schema.matchResult, eq(schema.matchResult.runId, schema.matchRun.id))
      .where(
        and(
          eq(schema.matchRun.id, runId),
          // Ownership goes in the WHERE, not in a check after the fetch.
          eq(schema.matchRun.userId, user.id),
        ),
      )
      .orderBy(asc(schema.matchResult.position));

    // Someone else's run is indistinguishable from one that never existed —
    // FORBIDDEN here would confirm the id is real.
    if (rows.length === 0) throw apiError("NOT_FOUND", `No match run ${runId}`);

    const advisorIds = rows
      .map((row) => row.advisorId)
      .filter((id): id is string => id !== null);

    const advisors =
      advisorIds.length > 0
        ? await loadAdvisors(
            ctx.db,
            and(
              inArray(schema.advisorProfile.userId, advisorIds),
              isNotNull(schema.advisorProfile.verifiedAt),
            ),
            advisorIds.length,
          )
        : new Map<string, Advisor>();

    const results = rows.flatMap((row) => {
      const advisor = row.advisorId === null ? undefined : advisors.get(row.advisorId);
      // An advisor deleted or un-verified since the run was scored drops out
      // rather than resurfacing on a results page that can no longer book them.
      if (!advisor) return [];
      return [
        {
          advisor,
          matchedOn: row.matchedOn ?? "",
          score: (row.scoreBp ?? 0) / 10000,
        },
      ];
    });

    return {
      id: runId,
      status: rows[0].status === "done" ? ("done" as const) : ("searching" as const),
      results,
    };
  },

  // ── Screening ──────────────────────────────────────────────────────────────

  "screening.questions": async ({ advisorId }, ctx) => {
    return ctx.db
      .select({
        id: schema.screeningQuestion.id,
        prompt: schema.screeningQuestion.prompt,
        required: schema.screeningQuestion.required,
        position: schema.screeningQuestion.position,
      })
      .from(schema.screeningQuestion)
      .where(eq(schema.screeningQuestion.advisorId, advisorId))
      .orderBy(asc(schema.screeningQuestion.position));
  },

  "screening.submit": async ({ advisorId, answers }, ctx) => {
    const me = ctx.requireUser();

    // Three cheap lookups in one round trip: does the advisor exist and is it
    // discoverable, what are their questions, and is there already a request.
    const [advisorRows, questionRows, pendingRows] = await ctx.db.batch([
      ctx.db
        .select({ verifiedAt: schema.advisorProfile.verifiedAt })
        .from(schema.advisorProfile)
        .where(eq(schema.advisorProfile.userId, advisorId))
        .limit(1),
      ctx.db
        .select({
          id: schema.screeningQuestion.id,
          prompt: schema.screeningQuestion.prompt,
          required: schema.screeningQuestion.required,
        })
        .from(schema.screeningQuestion)
        .where(eq(schema.screeningQuestion.advisorId, advisorId))
        .orderBy(asc(schema.screeningQuestion.position)),
      ctx.db
        .select({ id: schema.screeningRequest.id })
        .from(schema.screeningRequest)
        .where(
          and(
            eq(schema.screeningRequest.advisorId, advisorId),
            eq(schema.screeningRequest.adviseeId, me.id),
            eq(schema.screeningRequest.status, "pending"),
          ),
        )
        .limit(1),
    ]);

    if (!advisorRows[0]?.verifiedAt) {
      throw apiError("NOT_FOUND", `No advisor ${advisorId}`);
    }
    // One open request per pair. A second one would give the advisor two
    // inbox rows for the same person and two decisions to make.
    if (pendingRows.length > 0) {
      throw apiError("CONFLICT", "A pending request to this advisor already exists");
    }

    const submitted = new Map(answers.map((a) => [a.questionId, a.answer.trim()]));
    const known = new Set(questionRows.map((q) => q.id));
    const unknown = [...submitted.keys()].filter((id) => !known.has(id));
    // Rejected rather than ignored: an id from another advisor's list would
    // otherwise be snapshotted into this request under their prompt.
    if (unknown.length > 0) {
      throw apiError("VALIDATION_FAILED", "Answer does not belong to this advisor", {
        answers: `Unknown question ${unknown[0]}`,
      });
    }

    const missing: Record<string, string> = {};
    for (const question of questionRows) {
      if (question.required && !submitted.get(question.id)) {
        missing[question.id] = "จำเป็นต้องตอบ";
      }
    }
    if (Object.keys(missing).length > 0) {
      throw apiError("VALIDATION_FAILED", "A required question is unanswered", missing);
    }

    const requestId = crypto.randomUUID();
    const createdAt = new Date();
    // Question order, not the order the client happened to send them in — the
    // advisor reads the answers against their own list.
    const answerValues = questionRows
      .filter((question) => submitted.has(question.id))
      .map((question, index) => ({
        id: crypto.randomUUID(),
        requestId,
        questionId: question.id,
        // Snapshot: the advisor may reword or delete the question tomorrow, and
        // the answer must keep reading as an answer to what was actually asked.
        prompt: question.prompt,
        answer: submitted.get(question.id) ?? "",
        position: index,
      }));

    // No topic field is collected anywhere in this flow, so the advisor's list
    // row is summarised from the first answered question. Give it a real topic
    // the day the form asks for one.
    const topicLabel = (answerValues.find((row) => row.answer.length > 0)?.answer ?? "").slice(
      0,
      TOPIC_LABEL_MAX,
    );

    const insertRequest = ctx.db.insert(schema.screeningRequest).values({
      id: requestId,
      advisorId,
      adviseeId: me.id,
      topicLabel,
      status: "pending",
      unread: true,
      createdAt,
    });

    if (answerValues.length > 0) {
      // One batch: a request row that committed without its answers would show
      // the advisor an empty submission they cannot judge.
      await ctx.db.batch([
        insertRequest,
        ctx.db.insert(schema.screeningAnswer).values(answerValues),
      ]);
    } else {
      await insertRequest;
    }

    return {
      id: requestId,
      advisorId,
      adviseeId: me.id,
      adviseeName: me.name,
      topicLabel,
      status: "pending" as const,
      answers: answerValues.map((row) => ({
        questionId: row.questionId,
        prompt: row.prompt,
        answer: row.answer,
      })),
      createdAt: createdAt.toISOString(),
      respondedAt: null,
      responseNote: null,
      unread: true,
    };
  },

  "screening.myRequest": async ({ advisorId }, ctx) => {
    const me = ctx.requireUser();

    const rows = await ctx.db
      .select({
        id: schema.screeningRequest.id,
        advisorId: schema.screeningRequest.advisorId,
        adviseeId: schema.screeningRequest.adviseeId,
        topicLabel: schema.screeningRequest.topicLabel,
        status: schema.screeningRequest.status,
        responseNote: schema.screeningRequest.responseNote,
        unread: schema.screeningRequest.unread,
        respondedAt: schema.screeningRequest.respondedAt,
        createdAt: schema.screeningRequest.createdAt,
        answerId: schema.screeningAnswer.id,
        questionId: schema.screeningAnswer.questionId,
        prompt: schema.screeningAnswer.prompt,
        answer: schema.screeningAnswer.answer,
      })
      .from(schema.screeningRequest)
      .leftJoin(
        schema.screeningAnswer,
        eq(schema.screeningAnswer.requestId, schema.screeningRequest.id),
      )
      .where(
        and(
          eq(schema.screeningRequest.advisorId, advisorId),
          // "mine" is enforced in the WHERE — never by filtering after the read.
          eq(schema.screeningRequest.adviseeId, me.id),
        ),
      )
      .orderBy(
        desc(schema.screeningRequest.createdAt),
        asc(schema.screeningAnswer.position),
      );

    if (rows.length === 0) return null;

    // A declined request can be followed by a new one, so the pair can have
    // history. Only the newest drives the submitted/accepted/declined screens.
    const newest = rows.filter((row) => row.id === rows[0].id);
    return toScreeningRequest(newest[0], me.name, answersFromJoin(newest));
  },

  "screening.inbox": async (_input, ctx) => {
    const advisor = ctx.requireAdvisor();

    const requests = await ctx.db
      .select({
        id: schema.screeningRequest.id,
        advisorId: schema.screeningRequest.advisorId,
        adviseeId: schema.screeningRequest.adviseeId,
        adviseeName: schema.user.name,
        topicLabel: schema.screeningRequest.topicLabel,
        status: schema.screeningRequest.status,
        responseNote: schema.screeningRequest.responseNote,
        unread: schema.screeningRequest.unread,
        respondedAt: schema.screeningRequest.respondedAt,
        createdAt: schema.screeningRequest.createdAt,
      })
      .from(schema.screeningRequest)
      .innerJoin(schema.user, eq(schema.user.id, schema.screeningRequest.adviseeId))
      .where(eq(schema.screeningRequest.advisorId, advisor.id))
      // Anything still waiting on this advisor sorts first; the rest is history
      // in reverse chronological order.
      .orderBy(
        sql`case when ${schema.screeningRequest.status} = 'pending' then 0 else 1 end`,
        desc(schema.screeningRequest.createdAt),
      )
      .limit(INBOX_LIMIT);

    if (requests.length === 0) return [];

    // One `WHERE … IN` for every request's answers, not one query per row.
    const answers = await loadAnswers(
      ctx.db,
      requests.map((row) => row.id),
    );

    return requests.map((row) =>
      toScreeningRequest(row, row.adviseeName, answers.get(row.id) ?? []),
    );
  },

  "screening.respond": async ({ requestId, decision, note }, ctx) => {
    const advisor = ctx.requireAdvisor();

    // Request, advisee name and answers in one statement — the response body
    // needs all three, and this is also the ownership check.
    const rows = await ctx.db
      .select({
        id: schema.screeningRequest.id,
        advisorId: schema.screeningRequest.advisorId,
        adviseeId: schema.screeningRequest.adviseeId,
        adviseeName: schema.user.name,
        topicLabel: schema.screeningRequest.topicLabel,
        status: schema.screeningRequest.status,
        responseNote: schema.screeningRequest.responseNote,
        unread: schema.screeningRequest.unread,
        respondedAt: schema.screeningRequest.respondedAt,
        createdAt: schema.screeningRequest.createdAt,
        answerId: schema.screeningAnswer.id,
        questionId: schema.screeningAnswer.questionId,
        prompt: schema.screeningAnswer.prompt,
        answer: schema.screeningAnswer.answer,
      })
      .from(schema.screeningRequest)
      .innerJoin(schema.user, eq(schema.user.id, schema.screeningRequest.adviseeId))
      .leftJoin(
        schema.screeningAnswer,
        eq(schema.screeningAnswer.requestId, schema.screeningRequest.id),
      )
      .where(
        and(
          eq(schema.screeningRequest.id, requestId),
          // Another advisor's request reads as absent, not as forbidden.
          eq(schema.screeningRequest.advisorId, advisor.id),
        ),
      )
      .orderBy(asc(schema.screeningAnswer.position));

    if (rows.length === 0) throw apiError("NOT_FOUND", `No screening request ${requestId}`);

    const head = rows[0];
    // The advisee has already been told the outcome; a second decision would
    // rewrite what they were shown.
    if (head.status !== "pending") {
      throw apiError("CONFLICT", "This request has already been answered");
    }

    const status: ScreeningStatus = decision === "accept" ? "accepted" : "declined";
    const respondedAt = new Date();
    const responseNote = note?.trim() ? note.trim() : null;

    await ctx.db.batch([
      ctx.db
        .update(schema.screeningRequest)
        .set({
          status,
          responseNote,
          respondedAt,
          // Answering it is proof the advisor read it, so the dot goes.
          unread: false,
        })
        .where(
          and(
            eq(schema.screeningRequest.id, requestId),
            eq(schema.screeningRequest.advisorId, advisor.id),
            // Still guarded here: two tabs deciding at once must not both write.
            eq(schema.screeningRequest.status, "pending"),
          ),
        ),
      // The advisee is not sitting on the screening page waiting; without this
      // an accepted request is invisible until they think to look.
      ctx.db.insert(schema.notification).values({
        userId: head.adviseeId,
        kind: "system",
        title:
          status === "accepted"
            ? "คำขอปรึกษาได้รับการตอบรับ"
            : "คำขอปรึกษาถูกปฏิเสธ",
        body:
          status === "accepted"
            ? `${advisor.name} ตอบรับคำขอปรึกษาของคุณแล้ว`
            : `${advisor.name} ไม่สามารถรับคำขอปรึกษาของคุณได้ในขณะนี้`,
        href: status === "accepted" ? "/screening/accepted" : "/screening/declined",
      }),
    ]);

    return toScreeningRequest(
      { ...head, status, responseNote, respondedAt, unread: false },
      head.adviseeName,
      answersFromJoin(rows),
    );
  },

  "screening.saveQuestions": async ({ questions }, ctx) => {
    const advisor = ctx.requireAdvisor();

    const existing = await ctx.db
      .select({ id: schema.screeningQuestion.id })
      .from(schema.screeningQuestion)
      .where(eq(schema.screeningQuestion.advisorId, advisor.id));
    const reusable = new Set(existing.map((row) => row.id));

    const values = questions.map((question, index) => {
      // Keep the id when it is one of this advisor's own rows, so editing the
      // list does not churn every key. Anything else — a stale id, one sent
      // twice, or one belonging to another advisor — gets a fresh id rather
      // than a primary key collision against a row this delete never touches.
      const id = question.id && reusable.delete(question.id) ? question.id : crypto.randomUUID();
      return {
        id,
        advisorId: advisor.id,
        prompt: question.prompt,
        required: question.required,
        // Position follows the array; the client's order is the display order.
        position: index,
      };
    });

    const clear = ctx.db
      .delete(schema.screeningQuestion)
      .where(eq(schema.screeningQuestion.advisorId, advisor.id));

    if (values.length === 0) {
      await clear;
      return [];
    }

    // Delete and insert in one batch. Without a transaction a delete that
    // committed alone would leave the advisor with no screening at all — and
    // already-submitted answers keep their prompt snapshot either way, which is
    // why replacing rather than diffing is safe here.
    await ctx.db.batch([clear, ctx.db.insert(schema.screeningQuestion).values(values)]);

    return values.map((row) => ({
      id: row.id,
      prompt: row.prompt,
      required: row.required,
      position: row.position,
    }));
  },
} satisfies DiscoveryDomain;

/** See `DiscoveryDomain` — the widening that lets `handlers/index.ts` compile. */
export const discoveryHandlers = discoveryDomain as Pick<Handlers, DiscoveryKey>;
