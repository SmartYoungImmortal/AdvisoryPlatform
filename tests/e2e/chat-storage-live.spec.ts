import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { z } from "zod";

test.skip(process.env.STORAGE_UI_LIVE_PROOF !== "1", "Requires local proof API, SeaweedFS, and the named disposable database");
test.use({ video: "on" });

const api = "http://localhost:3200";
const frontend = "http://localhost:3001";
const evidence = resolve(process.cwd(), "../.audit/storage-proof-2026-10-27");
const fileSchema = z.object({ data: z.object({ id: z.uuid(), originalFileName: z.string() }) });
const signedSchema = z.object({ data: z.object({ url: z.url(), expiresInSeconds: z.number() }) });

function proofSql(query: string): string {
  return execFileSync("docker", ["exec", "advisory-booking-proof-db", "psql", "-v", "ON_ERROR_STOP=1", "-U", "advisory", "-d", "advisory_proof", "-Atc", query], { encoding: "utf8" }).trim();
}

async function signIn(context: BrowserContext, email: string) {
  const response = await context.request.post(`${api}/api/auth/sign-in/email`, {
    data: { email, password: "AdvisoryDemo!2026" }, headers: { origin: frontend },
  });
  expect(response.status()).toBe(200);
}

async function visibleDownload(page: Page, roomId: string, fileId: string, name: string, bytes: Buffer) {
  const fresh = page.waitForResponse((response) => response.url() === `${api}/api/v1/chat/rooms/${roomId}/files/${fileId}` && response.request().method() === "GET");
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: new RegExp(name.replaceAll(".", "\\.")) }).click();
  const response = await fresh;
  expect(response.status()).toBe(200);
  const signed = signedSchema.parse(await response.json()).data;
  expect(signed.expiresInSeconds).toBe(300);
  const popup = await popupPromise;
  await expect(popup).toHaveURL(signed.url);
  const download = await page.context().request.get(signed.url);
  expect(download.status()).toBe(200);
  expect(await download.body()).toEqual(bytes);
  await popup.close();
}

for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  test(`chat attachment uploads and private downloads work through the existing UI at ${viewport.width}px`, async ({ page, context, browser }) => {
    test.setTimeout(120_000);
    await page.setViewportSize(viewport);
    mkdirSync(evidence, { recursive: true });
    const roomId = randomUUID();
    const sender = z.uuid().parse(proofSql("SELECT id FROM public.user WHERE email='nattapong.d@advisory.demo'"));
    const peer = z.uuid().parse(proofSql("SELECT id FROM public.user WHERE email='araya.s@advisory.demo'"));
    const peerContext = await browser.newContext({ viewport });
    const outsiderContext = await browser.newContext({ viewport });
    let fileId: string | undefined;
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    proofSql(`INSERT INTO chat_rooms (id) VALUES ('${roomId}'); INSERT INTO chat_members(chat_room_id,member_user_id) VALUES ('${roomId}','${sender}'),('${roomId}','${peer}')`);
    try {
      await signIn(context, "nattapong.d@advisory.demo");
      await signIn(peerContext, "araya.s@advisory.demo");
      await signIn(outsiderContext, "kanya.p@advisory.demo");
      await page.goto(`${frontend}/chat/room?id=${roomId}`);
      const bytes = Buffer.alloc(1024, 0x61);
      const name = `storage-ui-${viewport.width}.txt`;
      const uploaded = page.waitForResponse((response) => response.url() === `${api}/api/v1/chat/rooms/${roomId}/files` && response.request().method() === "POST");
      const chooserPromise = page.waitForEvent("filechooser");
      await page.locator("button").filter({ has: page.locator("svg.lucide-paperclip") }).click();
      await (await chooserPromise).setFiles({ name, mimeType: "text/plain", buffer: bytes });
      const response = await uploaded;
      expect(response.status()).toBe(201);
      fileId = fileSchema.parse(await response.json()).data.id;
      await expect(page.getByRole("button", { name: new RegExp(name.replaceAll(".", "\\.")) })).toBeVisible();
      await page.screenshot({ path: resolve(evidence, `chat-upload-${viewport.width}.png`), fullPage: true });
      await visibleDownload(page, roomId, fileId, name, bytes);
      await page.reload();
      await expect(page.getByRole("button", { name: new RegExp(name.replaceAll(".", "\\.")) })).toBeVisible();

      const peerPage = await peerContext.newPage();
      peerPage.on("pageerror", (error) => errors.push(error.message));
      await peerPage.goto(`${frontend}/chat/room?id=${roomId}`);
      await expect(peerPage.getByRole("button", { name: new RegExp(name.replaceAll(".", "\\.")) })).toBeVisible();
      await visibleDownload(peerPage, roomId, fileId, name, bytes);
      await peerPage.screenshot({ path: resolve(evidence, `chat-peer-download-${viewport.width}.png`), fullPage: true });

      const outsiderPage = await outsiderContext.newPage();
      const denied = outsiderPage.waitForResponse((item) => item.url().startsWith(`${api}/api/v1/chat/rooms/${roomId}/files?`));
      await outsiderPage.goto(`${frontend}/chat/room?id=${roomId}`);
      expect((await denied).status()).toBe(404);
      await expect(outsiderPage.getByRole("button", { name: new RegExp(name.replaceAll(".", "\\.")) })).toHaveCount(0);
      expect((await outsiderContext.request.get(`${api}/api/v1/chat/rooms/${roomId}/files/${fileId}`)).status()).toBe(404);
      await outsiderPage.screenshot({ path: resolve(evidence, `chat-outsider-denied-${viewport.width}.png`), fullPage: true });
      expect(errors).toEqual([]);
    } finally {
      try {
        if (fileId) expect((await context.request.delete(`${api}/api/v1/chat/rooms/${roomId}/files/${fileId}`)).status()).toBe(200);
        proofSql(`DELETE FROM chat_messages WHERE chat_room_id='${roomId}'; DELETE FROM chat_members WHERE chat_room_id='${roomId}'; DELETE FROM chat_rooms WHERE id='${roomId}'`);
      } finally {
        await peerContext.close();
        await outsiderContext.close();
      }
    }
  });
}
