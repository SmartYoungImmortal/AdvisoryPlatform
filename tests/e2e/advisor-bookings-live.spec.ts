import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { expect, test } from "./support/coverage";
import { z } from "zod";

test.skip(
  process.env.BOOKING_LIVE_PROOF !== "1",
  "Requires the named disposable proof database/API",
);
test.use({ video: "on" });
const api = "http://localhost:3200";
function sql(statement: string) {
  return execFileSync(
    "docker",
    [
      "exec",
      "advisory-booking-proof-db",
      "psql",
      "-U",
      "advisory",
      "-d",
      "advisory_proof",
      "-At",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      statement,
    ],
    { encoding: "utf8" },
  ).trim();
}

for (const width of [1440, 390]) {
  test(`advisor calendar, preparation, exact chat and meeting use persisted bookings at ${width}px`, async ({
    page,
    context,
    request,
    browser,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 1000 });
    const serviceId = randomUUID(),
      bookingId = randomUUID(),
      completedId = randomUUID(),
      cancelledId = randomUUID(),
      boundaryId = randomUUID();
    const roomId = randomUUID(),
      questionId = randomUUID(),
      screeningId = randomUUID();
    const email = `advisor-calendar-${randomUUID()}@example.test`;
    const signup = await context.request.post(`${api}/api/auth/sign-up/email`, {
      data: {
        email,
        password: "Disposable-Advisor-Calendar-2026!",
        name: "Calendar proof advisor",
        fullName: "Calendar proof advisor",
        timezone: "America/New_York",
      },
    });
    expect(signup.status()).toBe(200);
    const advisorId = z
      .object({ user: z.object({ id: z.uuid() }) })
      .parse(await signup.json()).user.id;
    const adviseeId = z
      .uuid()
      .parse(
        sql(
          "SELECT id FROM public.user WHERE email='nattapong.d@advisory.demo'",
        ),
      );
    const pages = new Set<string>();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("response", (response) => {
      const url = new URL(response.url());
      if (
        url.pathname.endsWith("/advisors/me/bookings") &&
        response.status() === 200
      )
        pages.add(url.searchParams.get("page") ?? "1");
    });
    try {
      expect(
        (
          await context.request.post(`${api}/api/v1/advisors/me`, {
            data: { headline: "Disposable calendar proof" },
          })
        ).status(),
      ).toBe(201);
      // Approved advisor, bookings and screening rows are disposable fixtures, not provider payments.
      sql(`BEGIN;
        INSERT INTO advisor_identity (advisor_id,verification_status,document_object_key,submitted_at,verified_at) VALUES ('${advisorId}','VERIFIED','proof/${advisorId}/not-uploaded.jpg',now(),now());
        UPDATE "user" SET role='advisor' WHERE id='${advisorId}';
        INSERT INTO services (id,advisor_id,category_id,name,price_satang,duration_minutes) SELECT '${serviceId}','${advisorId}',id,'Advisor calendar proof',10000,30 FROM service_categories LIMIT 1;
        INSERT INTO chat_rooms (id) VALUES ('${roomId}'); INSERT INTO chat_members (chat_room_id,member_user_id) VALUES ('${roomId}','${advisorId}'),('${roomId}','${adviseeId}');
        INSERT INTO service_appointments (service_id,advisor_id,advisee_id,start_time,end_time,unavailable_until,state,blocks_availability,chat_room_id)
          SELECT '${serviceId}','${advisorId}','${adviseeId}',now()-interval '180 days'+n*interval '1 hour',now()-interval '180 days'+n*interval '1 hour'+interval '30 minutes',now()-interval '180 days'+n*interval '1 hour'+interval '30 minutes','COMPLETED',false,'${roomId}' FROM generate_series(1,101) n;
        INSERT INTO service_appointments (id,service_id,advisor_id,advisee_id,start_time,end_time,unavailable_until,state,blocks_availability,chat_room_id) VALUES
          ('${bookingId}','${serviceId}','${advisorId}','${adviseeId}',now()-interval '2 minutes',now()+interval '28 minutes',now()+interval '28 minutes','BOOKED',false,'${roomId}'),
          ('${completedId}','${serviceId}','${advisorId}','${adviseeId}',now()-interval '2 hours',now()-interval '1 hour',now()-interval '1 hour','COMPLETED',false,'${roomId}');
        INSERT INTO service_appointments (id,service_id,advisor_id,advisee_id,start_time,end_time,unavailable_until,state,blocks_availability,cancelled_at,cancelled_by_user_id,chat_room_id)
          VALUES ('${cancelledId}','${serviceId}','${advisorId}','${adviseeId}',now()-interval '4 hours',now()-interval '3 hours',now()-interval '3 hours','CANCELLED',false,now(),'${advisorId}','${roomId}');
        INSERT INTO service_appointments (id,service_id,advisor_id,advisee_id,start_time,end_time,unavailable_until,state,blocks_availability,chat_room_id)
          SELECT '${boundaryId}','${serviceId}','${advisorId}','${adviseeId}',at,at+interval '30 minutes',at+interval '30 minutes','BOOKED',false,'${roomId}' FROM (SELECT (date_trunc('month',now() AT TIME ZONE 'America/New_York')+interval '1 month 30 minutes') AT TIME ZONE 'UTC' AS at) boundary;
        INSERT INTO service_screening_questions (id,service_id,question,is_required,display_order) VALUES ('${questionId}','${serviceId}','What would you like to discuss?',true,0);
        INSERT INTO screening_requests (id,service_id,advisee_id,status,decided_at) VALUES ('${screeningId}','${serviceId}','${adviseeId}','ACCEPTED',now());
        INSERT INTO screening_answers (screening_request_id,question_id,question_text,answer) VALUES ('${screeningId}','${questionId}','What would you like to discuss?','Persisted preparation answer ${width}px'); COMMIT;`);
      await page.goto("/work/calendar");
      await expect.poll(() => pages.has("2")).toBe(true);
      await expect(
        page.getByText("เขตเวลา: America/New_York", { exact: true }),
      ).toBeVisible();
      const currentLink = page.locator(
        `a[href="/work/session?id=${bookingId}"]`,
      );
      await expect(currentLink).toBeVisible();
      await page.screenshot({
        path: `test-results/advisor-calendar-${width}.png`,
        fullPage: true,
      });
      if (width === 1440) {
        const docs = await context.newPage();
        await docs.goto(`${api}/api/v1/docs`);
        const operation = docs
          .locator(".opblock-get")
          .filter({ hasText: "/api/v1/advisors/me/bookings/{bookingId}" });
        await operation.locator(".opblock-summary").click();
        await operation
          .getByRole("button", { name: "Try it out", exact: true })
          .click();
        await operation
          .locator('input[placeholder="bookingId"]')
          .fill(bookingId);
        const response = docs.waitForResponse((r) =>
          r.url().endsWith(`/api/v1/advisors/me/bookings/${bookingId}`),
        );
        await operation
          .getByRole("button", { name: "Execute", exact: true })
          .click();
        expect((await response).status()).toBe(200);
        const result = operation.locator(".live-responses-table");
        await expect(result).toContainText(screeningId);
        await expect(result).toContainText(roomId);
        await result.scrollIntoViewIfNeeded();
        await docs.screenshot({
          path: "test-results/advisor-booking-swagger.png",
        });
        await docs.close();
      }
      const boundaryDay = sql(
        `SELECT to_char(start_time AT TIME ZONE 'America/New_York','DD')::integer FROM service_appointments WHERE id='${boundaryId}'`,
      );
      await page
        .getByRole("button", {
          name: new RegExp(`^${boundaryDay},`),
          disabled: false,
        })
        .click();
      await expect(
        page.locator(`a[href="/work/session?id=${boundaryId}"]`),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "เดือนถัดไป", exact: true })
        .click();
      await expect(
        page.locator(`a[href="/work/session?id=${boundaryId}"]`),
      ).toHaveCount(0);
      await page.goto(`/work/session?id=${bookingId}`);
      await expect(
        page.getByText(`Persisted preparation answer ${width}px`, {
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.getByText("คำตอบคัดกรองล่าสุด", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText("Advisor calendar proof", { exact: false }),
      ).toBeVisible();
      const chat = page.getByRole("link", { name: "เปิดแชท", exact: true });
      await expect(chat).toHaveAttribute("href", `/chat/room?id=${roomId}`);
      await page.screenshot({
        path: `test-results/advisor-session-${width}.png`,
        fullPage: true,
      });
      const opened = page.waitForResponse((r) =>
        r.url().endsWith(`/bookings/${bookingId}/meeting`),
      );
      const popupPromise = page.waitForEvent("popup");
      await page
        .getByRole("button", { name: "เข้าห้องปรึกษา", exact: true })
        .click();
      expect((await opened).status()).toBe(200);
      const meeting = z
        .object({ data: z.object({ url: z.url() }) })
        .parse(await (await opened).json()).data.url;
      const popup = await popupPromise;
      await expect(popup).toHaveURL(meeting);
      await popup.close();
      const messages = page.waitForResponse((r) =>
        r.url().includes(`/chat/rooms/${roomId}/messages?`),
      );
      await chat.click();
      expect((await messages).status()).toBe(200);
      await expect(page).toHaveURL(new RegExp(`/chat/room\\?id=${roomId}`));
      for (const [id, label] of [
        [completedId, "ปรึกษาแล้ว"],
        [cancelledId, "ยกเลิกแล้ว"],
      ]) {
        await page.goto(`/work/session?id=${id}`);
        await expect(page.getByText(label, { exact: true })).toBeVisible();
        await expect(
          page.getByRole("button", { name: "เข้าห้องปรึกษา", exact: true }),
        ).toBeDisabled();
      }
      await page.goto("/work/session?id=invalid");
      await expect(
        page.getByText("เปิดเซสชันจากปฏิทินของคุณเพื่อดูรายละเอียด", {
          exact: true,
        }),
      ).toBeVisible();
      expect(
        (
          await request.get(`${api}/api/v1/advisors/me/bookings/${bookingId}`)
        ).status(),
      ).toBe(401);
      const stranger = await browser.newContext();
      try {
        expect(
          (
            await stranger.request.post(`${api}/api/auth/sign-in/email`, {
              data: {
                email: "araya.s@advisory.demo",
                password: "AdvisoryDemo!2026",
              },
              headers: { origin: "http://localhost:3001" },
            })
          ).status(),
        ).toBe(200);
        expect(
          (
            await stranger.request.get(
              `${api}/api/v1/advisors/me/bookings/${bookingId}`,
            )
          ).status(),
        ).toBe(404);
      } finally {
        await stranger.close();
      }
      await test.step("Deliberately block the booking-list transport, then retry against the real API", async () => {
        const pattern = /\/api\/v1\/advisors\/me\/bookings\?/;
        await page.route(pattern, (route) => route.abort("failed"));
        await page.goto("/work/calendar");
        await expect(
          page
            .getByRole("alert")
            .filter({ hasText: "โหลดข้อมูลการจองไม่สำเร็จ" }),
        ).toContainText("โหลดข้อมูลการจองไม่สำเร็จ");
        await page.screenshot({
          path: `test-results/advisor-calendar-retry-${width}.png`,
          fullPage: true,
        });
        await page.unroute(pattern);
        await page
          .getByRole("button", { name: "ลองอีกครั้ง", exact: true })
          .click();
        await expect(
          page.locator(`a[href="/work/session?id=${bookingId}"]`),
        ).toBeVisible();
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      expect(errors).toEqual([]);
    } finally {
      sql(
        `BEGIN; DELETE FROM screening_answers WHERE screening_request_id='${screeningId}'; DELETE FROM screening_requests WHERE id='${screeningId}'; DELETE FROM service_screening_questions WHERE id='${questionId}'; DELETE FROM service_appointments WHERE service_id='${serviceId}'; DELETE FROM services WHERE id='${serviceId}'; DELETE FROM chat_messages WHERE chat_room_id='${roomId}'; DELETE FROM chat_members WHERE chat_room_id='${roomId}'; DELETE FROM chat_rooms WHERE id='${roomId}'; DELETE FROM notifications WHERE owner_id='${advisorId}' OR resource_id='${roomId}'; DELETE FROM advisor_identity WHERE advisor_id='${advisorId}'; DELETE FROM advisor_global_availability WHERE advisor_id='${advisorId}'; DELETE FROM advisor_profiles WHERE user_id='${advisorId}'; DELETE FROM session WHERE user_id='${advisorId}'; DELETE FROM account WHERE user_id='${advisorId}'; DELETE FROM verification WHERE value='${advisorId}'; DELETE FROM pdpa_consents WHERE user_id='${advisorId}'; DELETE FROM "user" WHERE id='${advisorId}'; COMMIT;`,
      );
    }
  });
}
