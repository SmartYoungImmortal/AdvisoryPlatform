# API contract

เอกสารนี้อธิบายวิธีเขียน backend ให้ตรงกับที่ frontend รอรับอยู่

**สัญญาอยู่ที่ [`lib/api/contract.ts`](../lib/api/contract.ts)** ไม่ใช่ที่ไฟล์นี้ ถ้าเอกสารกับโค้ดไม่ตรงกัน ให้เชื่อโค้ด — `public/openapi.json` ก็ถูก generate จากไฟล์นั้นเช่นกัน (`pnpm api:spec`) ห้ามแก้มือ

---

## เริ่มยังไง

```ts
// worker/handlers/index.ts
import type { Handlers } from "@/lib/api/contract";

export const handlers = {
  "session.get": async (_input, ctx) => ctx.session,
  // …
} satisfies Handlers;
```

`satisfies Handlers` คือทั้งหมดที่ต้องรู้ TypeScript จะฟ้องเองว่า:

- **ยังไม่ได้เขียน endpoint ไหน** — `is missing the following properties from type 'Handlers': "profile.get", "profile.update", … and 37 more`
- **คืน field ผิดชนิด** — `Types of property 'unreadCount' are incompatible. Type 'string' is not assignable to type 'number'.`

ไม่ต้องเปิดเอกสารเทียบทีละช่อง ให้ `pnpm typecheck` บอก

## ดู spec

```bash
pnpm api:spec        # regenerate public/openapi.json
```

เปิดไฟล์ใน Swagger/Scalar หรือ `https://advisory-platform.nsza.workers.dev/openapi.json` ตอน deploy แล้ว มี 42 operations

---

## กติกาที่พลาดแล้วเจ็บ

### เงินเป็นหน่วยย่อยเสมอ

```ts
{ amountMinor: 120000, currency: "THB" }   // = ฿1,200
```

จำนวนเต็ม หน่วยสตางค์ **ห้ามส่งทศนิยม** (`1200.1 + 0.2 !== 1200.3`) และ**ห้ามส่งสตริงที่จัดรูปแล้ว** — ฝั่ง frontend มี `lib/format/money.ts` ที่ต้องได้ `฿1,200` ตรงตาม Figma เป๊ะ ซึ่ง `Intl` ให้ `฿1,200.00` หรือ `THB 1,200` ไม่ตรง

### วันที่เป็น ISO 8601 UTC เสมอ

```ts
"2026-07-28T09:30:00.000Z"
```

**ห้ามส่งวันที่ไทยที่จัดรูปแล้ว** locale ไทยดีฟอลต์เป็น พ.ศ. (`2569`) แต่ข้อมูลในระบบเป็น ค.ศ. (`INV-2026-0731-0042`) frontend เป็นคนตัดสินใจว่าจะแสดงแบบไหน

### `code` ในตัว error คือ UI ไม่ใช่แค่ log

Figma มีหน้าจอเฉพาะสำหรับความล้มเหลวแต่ละแบบ — `/login/wrong-password`, `/login/account-locked`, `/register/email-in-use`, `/checkout/slot-taken`, `/settings/delete/blocked`

frontend เลือกหน้าจอ**จาก `code`** ⇒ ส่ง `INTERNAL` ตรงที่ควรเป็น `SLOT_TAKEN` = ผู้ใช้เห็นหน้า error กลางๆ แทนหน้าที่ดีไซเนอร์วาดไว้

```json
{
  "code": "VALIDATION_FAILED",
  "message": "for logs only — ไม่เคยถูกเอาไปแสดง",
  "fields": { "email": "already taken" }
}
```

`message` ไม่เคยขึ้นจอ — copy ทั้งหมดเป็นภาษาไทยและอยู่ที่ frontend
`fields` ใช้กับ `VALIDATION_FAILED` เท่านั้น key ต้องตรงกับชื่อ field ใน input schema เพราะมันไหลเข้าช่อง error ของฟอร์มโดยตรง

รายการ code ทั้งหมดและ HTTP status ที่คู่กัน: [`lib/api/errors.ts`](../lib/api/errors.ts)

### `auth` บังคับที่ server เท่านั้น

ทุก endpoint มี `auth: "public" | "user" | "advisor"` ใน contract

> **guard ฝั่ง client ไม่มีค่าด้านความปลอดภัยเลย** `components/auth/require-role.tsx` แค่ `router.replace("/login")` เพื่อ UX มันไม่ได้กรองข้อมูลอะไรทั้งสิ้น เพราะ static export ไม่มี middleware ให้ใช้
>
> **ทุก handler ต้องเช็คเอง** ใช้ `ctx.requireUser()` / `ctx.requireAdvisor()` ซึ่ง throw `ApiError` ออกมา ไม่ได้คืน null — handler ที่ลืมเช็คจะไม่มีทางเผลอส่งข้อมูลออกไป

### 401 กับ `session.get`

`session.get` เป็น `public` และคืน `null` ตอนยังไม่ล็อกอิน พร้อม **status 200** — การไม่ล็อกอินไม่ใช่ error เพราะทุกหน้าเรียกมันตอนโหลด ถ้าตอบ 401 console จะเต็มไปด้วย error ปลอม

---

## ข้อจำกัดของ runtime

รันบน **Cloudflare Workers Free plan** ในดีพลอยเดียวกับตัวเว็บ:

| request | ไปไหน |
|---|---|
| 85 หน้า HTML, `/_next/static/*`, รูป R2 | assets store — **ไม่เรียก Worker เลย** |
| `/api/*` | Worker |

ที่แยกแบบนี้เพราะเคยรัน Next SSR ผ่าน OpenNext แล้ว CPU เกิน 10ms → `Error 1102` (qa ล้ม 104/418 req ใน 1 ชม.) ดู commit `02cd878`

**สิ่งที่ต้องระวังตอนเขียน handler:**

- **CPU 10ms ต่อ invocation** — ไม่นับเวลารอ I/O ⇒ query DB ไม่กิน budget แต่วน loop ประมวลผลข้อมูลก้อนใหญ่กิน
- **50 subrequests ต่อ invocation** — handler ที่ N+1 query จะชนเพดาน ออกแบบให้ join หรือ `db.batch()` แทน
- **ไฟล์ห้ามผ่าน Worker** — upload ใช้ `uploads.create` คืน presigned PUT URL แล้วให้ browser ยิงเข้า R2 ตรงๆ สตรีมไฟล์ 4MB ผ่าน Worker คือวิธีที่ทำให้ CPU budget ระเบิด
- **`neon-http` ไม่มี interactive transaction** — ใช้ `db.batch([...])` ถ้าต้องการ transaction จริง (น่าจะตอนสร้าง booking + invoice พร้อมกัน) สลับ import เป็น `drizzle-orm/neon-serverless` แก้บรรทัดเดียว schema เหมือนเดิม
- **ไม่มี `process.env` ตอน import** — สร้าง db/auth client **ต่อ request จาก `env`** ห้ามทำ singleton ที่ module scope

---

## รูปแบบ request

`contract.ts` กำหนดไว้แล้ว router แปลงให้อัตโนมัติ:

- `:param` ใน path ต้องมี field ชื่อเดียวกันใน input schema (`assertContractIntegrity()` เช็คให้ตอน `pnpm api:spec`)
- **GET / DELETE** — field ที่เหลือกลายเป็น query string
- **POST / PATCH** — field ที่เหลือกลายเป็น JSON body

```
"chat.messages"  GET  /api/chat/threads/:threadId/messages
input: { threadId, cursor?, limit? }
     → GET /api/chat/threads/abc/messages?limit=20
```

## เพิ่ม endpoint ใหม่

1. เพิ่ม schema ที่ `lib/api/schema/`
2. เพิ่ม key ที่ `lib/api/contract.ts`
3. `pnpm typecheck` จะพังจนกว่าทั้ง mock และ worker จะ implement
4. `pnpm api:spec`

**ห้ามเพิ่ม route ใน Worker ที่ไม่มีใน `contract.ts`** — client ไม่มีทางเรียกถึง

---

## Auth

`/api/auth/*` เป็นของ better-auth ทั้งหมด (sign-up / sign-in / sign-out / get-session) จึง**ไม่อยู่ใน contract** — better-auth กำหนด request/response เอง

เพราะเป็น same-origin cookie จึงเป็น `HttpOnly; Secure; SameSite=Lax` และทำงานได้โดยไม่ต้องตั้ง CORS

`role` เก็บบนตาราง `user` ผ่าน `user.additionalFields` ค่าที่ใช้ได้ผูกกับ [`lib/roles.ts`](../lib/roles.ts) — `anon` / `user` / `advisor` / `admin`
