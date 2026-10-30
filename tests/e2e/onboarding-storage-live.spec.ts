import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { z } from "zod";

test.skip(process.env.STORAGE_UI_LIVE_PROOF !== "1", "Requires the isolated proof API, SeaweedFS, and named disposable database");
test.use({ video: "on" });

const api = "http://localhost:3200";
const evidence = resolve(process.cwd(), "../.audit/storage-proof-2026-10-27");
const identityImage = readFileSync(resolve(process.cwd(), "public/demo-docs/identity/id-card-araya.jpg"));
const skillImage = readFileSync(resolve(process.cwd(), "public/demo-docs/skill-proofs/profile-screenshot-sarawut.png"));
const signedSchema = z.object({ data: z.object({ url: z.url(), expiresInSeconds: z.number() }) });

function sql(query: string): string {
  return execFileSync("docker", ["exec", "advisory-booking-proof-db", "psql", "-v", "ON_ERROR_STOP=1", "-U", "advisory", "-d", "advisory_proof", "-Atc", query], { encoding: "utf8" }).trim();
}

function deleteObjects(keys: string[]) {
  const code = `const {S3Client,DeleteObjectCommand}=require('@aws-sdk/client-s3');
  (async()=>{try{const client=new S3Client({endpoint:'http://localhost:8333',region:'us-east-1',forcePathStyle:true,credentials:{accessKeyId:'seaweedfsadmin',secretAccessKey:'seaweedfsadmin'}});
  for(const Key of JSON.parse(process.argv[1])) await client.send(new DeleteObjectCommand({Bucket:'advisory-platform',Key}));
  client.destroy();}catch(error){console.error(error.message);process.exitCode=1}})();`;
  execFileSync("node", ["-e", code, JSON.stringify(keys)], { cwd: resolve(process.cwd(), "../AdvisoryPlatformAPI"), stdio: "pipe" });
}

test("real onboarding uploads appear in private admin identity and skill reviews", async ({ page, context, browser }) => {
  test.setTimeout(180_000);
  mkdirSync(evidence, { recursive: true });
  const applicant = await browser.newContext();
  const email = `storage-proof-${randomUUID()}@example.test`;
  let userId: string | undefined;
  const objectKeys: string[] = [];
  try {
    const signup = await applicant.request.post(`${api}/api/auth/sign-up/email`, {
      headers: { origin: "http://localhost:3001" },
      data: { email, password: "Local-storage-proof-2026!", name: "Storage proof applicant", fullName: "Storage proof applicant", timezone: "Asia/Bangkok" },
    });
    expect(signup.status()).toBe(200);
    userId = z.object({ user: z.object({ id: z.uuid() }) }).parse(await signup.json()).user.id;
    expect((await applicant.request.post(`${api}/api/v1/advisors/me`, { data: { headline: "Disposable storage proof" } })).status()).toBe(201);
    const identity = await applicant.request.post(`${api}/api/v1/advisors/me/identity-verification`, {
      multipart: { document: { name: "identity-proof.jpg", mimeType: "image/jpeg", buffer: identityImage } },
    });
    expect(identity.status()).toBe(201);
    const skillId = z.uuid().parse(sql("SELECT id FROM skills ORDER BY id LIMIT 1"));
    const skill = await applicant.request.post(`${api}/api/v1/advisors/me/skill-proofs`, {
      multipart: { skillId, file: { name: "certificate-proof.png", mimeType: "image/png", buffer: skillImage } },
    });
    expect(skill.status()).toBe(201);
    const proofId = z.object({ data: z.object({ id: z.uuid() }) }).parse(await skill.json()).data.id;
    const keys = sql(`SELECT document_object_key FROM advisor_identity WHERE advisor_id='${userId}' UNION ALL SELECT object_key FROM skill_proof_documents WHERE advisor_id='${userId}'`);
    objectKeys.push(...keys.split("\n").filter(Boolean));
    expect(objectKeys).toHaveLength(2);
    const login = await context.request.post(`${api}/api/auth/sign-in/email`, {
      data: { email: "admin@advisory.demo", password: "AdvisoryDemo!2026" }, headers: { origin: "http://localhost:3001" },
    });
    expect(login.status()).toBe(200);
    const cases = [
      { name: "identity", bytes: identityImage, path: `/admin/verification/review?id=${userId}`, route: `/api/v1/admin/identity-verifications/${userId}/document-url` },
      { name: "skill", bytes: skillImage, path: `/admin/skill-proofs/review?id=${proofId}`, route: `/api/v1/admin/skill-proofs/${proofId}/document-url` },
    ];
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const item of cases) {
      expect((await applicant.request.get(`${api}${item.route}`)).status()).toBe(403);
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
        const documentResponse = page.waitForResponse((response) => response.url() === `${api}${item.route}`);
        await page.goto(`http://localhost:3001${item.path}`);
        const response = await documentResponse;
        expect(response.status()).toBe(200);
        const signed = signedSchema.parse(await response.json()).data;
        expect(signed.expiresInSeconds).toBeGreaterThan(0);
        const image = page.locator('img[src*="X-Amz-Signature"]');
        await expect(image).toBeVisible();
        await expect.poll(async () => image.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0)).toBe(true);
        const download = await context.request.get(signed.url);
        expect(download.status()).toBe(200);
        expect(await download.body()).toEqual(item.bytes);
        const direct = new URL(signed.url);
        direct.search = "";
        expect((await context.request.get(direct.href)).status()).toBe(403);
        await page.screenshot({ path: resolve(evidence, `onboarding-${item.name}-${width}.png`), fullPage: true });
      }
    }
    expect(errors).toEqual([]);
  } finally {
    try {
      if (userId) {
        const remaining = sql(`SELECT document_object_key FROM advisor_identity WHERE advisor_id='${userId}' UNION ALL SELECT object_key FROM skill_proof_documents WHERE advisor_id='${userId}'`);
        deleteObjects(remaining.split("\n").filter(Boolean));
        sql(`DELETE FROM skill_proof_documents WHERE advisor_id='${userId}'; DELETE FROM advisor_identity WHERE advisor_id='${userId}'; DELETE FROM advisor_skills WHERE advisor_id='${userId}'; DELETE FROM advisor_global_availability WHERE advisor_id='${userId}'; DELETE FROM advisor_profiles WHERE user_id='${userId}'; DELETE FROM pdpa_consents WHERE user_id='${userId}'; DELETE FROM notifications WHERE owner_id='${userId}'; DELETE FROM session WHERE user_id='${userId}'; DELETE FROM account WHERE user_id='${userId}'; DELETE FROM verification WHERE value='${userId}'; DELETE FROM public.user WHERE id='${userId}'`);
      }
    } finally {
      await applicant.close();
    }
  }
});
