# Redesign backlog

รายการหน้าที่ยังต้อง redesign เรียงตามลำดับที่ควรทำ แต่ละข้อเป็นหนึ่ง ticket
ติ๊ก `[x]` เมื่อพี่ดูแล้ว **ผ่าน** ไม่ใช่แค่เขียนโค้ดเสร็จ

อัปเดตล่าสุด: 28 ตุลาคม 2569

## หลักที่ใช้กับทุกหน้า

- desktop ออกแบบที่จอ 1710 × 985 แล้วย่อลงตามสัดส่วนบน iPad แนวนอน (`.auth-scale` / `.doc-scale` / `.page-scale` ใน `app/globals.css`)
- iPad แนวตั้งใช้ layout แบบมือถือ (`MobileScreen wide="md"`)
- มือถือย่อลงหนึ่งขั้น ปุ่มสูงอย่างน้อย 44px ช่องกรอกตัวหนังสือ 16px (กัน iPhone ซูม)
- หน้าตาต้องเป็นของ Advisory และห้ามเขียนชื่อเว็บที่ใช้อ้างอิงลงในโค้ด คอมมิต หรือ PR
- กรอบหน้าบัญชี: แถบไอคอนซ้าย ไม่มี navbar (`components/account/app-frame.tsx`)
- หน้าในกรอบ `AppFrame` ใช้ `.app-scale`: วาดที่ 1440 ไม่ขยายตามจอที่กว้างกว่า และย่อตามจอที่แคบกว่า
- อนิเมชันมีเฉพาะหน้า home ส่วนหน้าอื่นให้มีแค่ hover/focus (พี่สั่ง 24 ต.ค.)
- ทุกข้อความมีสองภาษา (`messages/th.json` และ `messages/en.json`)
- ใช้ปุ่มแคปซูล `authPill` / สีดำ `hero-action` ให้เข้าชุดกับหน้า home
- ตรวจกับหน้าจริงที่ 1710, 1180 (iPad แนวนอน), 820 (iPad แนวตั้ง), 402 ก่อนบอกว่าเสร็จ

## ผ่านแล้ว

- [x] `/` home: hero วงการ์ด ช่องค้นหา ย่อขยายตามจอ 1710
- [x] `/login`, `/login/wrong-password`, `/login/account-locked`
- [x] `/register`, `/register/email-in-use`, `/register/validation-errors`
- [x] `/terms`, `/privacy-policy`
- [x] `/forgot-password`, `/reset-sent`
- [x] ของที่ใช้ร่วมกัน: navbar, เมนูมือถือ, ปุ่ม TH/EN
- [x] `/search` และ `/search/no-results` (ใช้หน้าเดียวกัน)
- [x] `/notifications` ผ่าน 25 ต.ค.; `/notifications/view` (ทุกแถวเปิดหน้านี้ มีปุ่มไปต่อ: แชท, การจองเปิด popup บน `/bookings`, ใบเสร็จเปิด popup บน `/transactions`) และ `/notifications/advisor` ผ่าน 28 ต.ค.
- [x] `/settings` และ popup ของมัน: เปลี่ยนอีเมล (`/settings/email`, `/settings/email/verify`), เปลี่ยนรหัสผ่าน (`/settings/password` + ตั้งรหัสใหม่ทางอีเมลใน popup ถัดไป), ออกจากระบบ (`/settings/logout`), ลบบัญชี (popup ในหน้า), `/settings/updated` ผ่าน 28 ต.ค.
- [x] `/transactions` (+ popup ใบเสร็จ, "ดูการจองของฉัน" เปิด popup การจองนั้นบน `/bookings`), `/transactions/detail`, `/transactions/detail/failed`, `/transactions/detail/refunded` ผ่าน 28 ต.ค.

## ทำแล้วแต่ยังไม่ผ่าน

รอบ 24-25 ต.ค. 2569 merge เข้า dev แล้ว (web #80, API #59)

### Home ใต้ hero
- [ ] `/` ส่วนใต้ hero: concept "คำถามในใจ" (คำถามลายมือ คำตอบตัวพิมพ์) 4 บท + FAQ + ปิดท้ายบนรูปห้อง
  พี่สั่งให้หยุดและเก็บแบบที่เห็นไว้ก่อน (25 ต.ค.) hero ไม่ได้แตะ

### RD-01 · บัญชี (กรอบ `AppFrame` แถบไอคอนซ้าย, desktop ไม่มี navbar)
- [ ] `/profile`: หัวโปรไฟล์ + กล่องตัวเลข + แบนเนอร์ + แท็บ
- [ ] `/profile/edit`, `/profile/edit/save-failed`: หัวโปรไฟล์ชุดเดียวกันแบบแก้ได้
- [ ] `/bookings`: ใส่กรอบและปรับขนาดตัวหนังสือ ข้างในยังไม่ redesign

### RD-02 · โปรไฟล์สาธารณะของผู้ให้คำปรึกษา
- [ ] `/advisors/[advisorId]`, `/about`, `/services`, `/reviews`: หน้าโปรไฟล์สาธารณะ อยู่ใน `AppFrame`

### RD-03 · หน้าบริการ
- [ ] `/service/[id]`: หัว showcase + แกลเลอรี (ปก + 2 รูปจาก `service_images`) + กล่องจองติดขวา + รีวิว/ผู้เชี่ยวชาญ/บริการอื่น

### RD-10 · สมัครเป็นผู้ให้คำปรึกษา
- [ ] `/advisor/apply`
- [ ] `/advisor-onboarding/stage-1`, `/stage-2`, `/stage-3`: กรอบเดียวกับ login ขนาดตัวอักษรเท่าหน้า login
- [ ] `/advisor-onboarding/thank-you`, `/pending`, `/failed`

### RD-11 · แชตและการแจ้งเตือน
- [ ] `/chat`, `/chat/empty`, `/chat/session-banner`; ห้องแชตย้ายไป `/chat/room?id=…` (+ `/message-failed`, `/report`, `/report/submitted`)

## ยังไม่ได้ทำ

### RD-17 · Footer (ทุกหน้า)
- [ ] `components/marketing/site-footer.tsx`

ใช้ร่วมกันทุกหน้า แก้ครั้งเดียวได้ทุกหน้า ตอนนี้ยังเป็นแบบที่ลอก Systronic มา ต้อง redesign ให้เข้าชุดกับ home / login / terms (ปุ่มแคปซูล, Kanit, พื้นขาวหรือแสงฟ้า-ม่วงจางๆ) พร้อมสองภาษา และ scale จาก 1710 บน iPad แนวนอน

### RD-03 · จับคู่ผู้เชี่ยวชาญ
- [ ] `/matching`, `/matching/searching`, `/matching/results`

### RD-04 · จองและชำระเงิน
- [ ] `/checkout/card`, `/checkout/card/saved`
- [ ] `/checkout/processing`, `/checkout/success`, `/checkout/failed`
- [ ] `/checkout/slot-taken`, `/checkout/unconfirmed`
- [ ] ข้างในของ `/bookings` (กรอบทำแล้ว ดู RD-01)

### RD-05 · โปรไฟล์และหน้าทำงานของผู้ให้คำปรึกษา ⭐
- [ ] `/advisor/profile` (ควรเป็น dashboard: สวิตช์รับงาน นัดวันนี้ คำขอที่รอตอบ รายได้ สถานะยืนยันตัวตน)
- [ ] `/advisor/edit`
- [ ] `/advisor/skills`
- [ ] `/work`, `/work/calendar`, `/work/earnings`, `/work/session`

### RD-06 · บริการของผู้ให้คำปรึกษา
- [ ] `/advisor/services`, `/advisor/services/view`, `/advisor/services/manage`, `/advisor/services/manage/delete`
- [ ] `/advisor/services/new`, `/advisor/services/new/limit`, `/advisor/services/new/no-profile`
- [ ] `/advisor/services/[serviceId]`, `/advisor/services/[serviceId]/edit`, `/advisor/services/[serviceId]/edit/delete`, `/advisor/services/[serviceId]/schedule`

### RD-07 · ตารางเวลาว่าง
- [ ] `/availability`, `/availability/configured`, `/availability/custom`
- [ ] `/availability/profiles`, `/availability/profiles/add-date`, `/availability/profiles/delete`
- [ ] `/availability/profiles/new`, `/availability/profiles/new/blocked`, `/availability/profiles/new/from-list`, `/availability/profiles/new/specific`
- [ ] `/availability/profiles/edit`, `/availability/profiles/edit/blocked`, `/availability/profiles/edit/error`, `/availability/profiles/edit/picker`, `/availability/profiles/edit/specific`

### RD-08 · รายได้และการคัดกรอง
- [ ] `/earnings`, `/earnings/payout-account`, `/earnings/payout-account/setup`, `/earnings/payout-history`, `/earnings/payout-history/failed`
- [ ] `/screening/setup`, `/screening/questions`, `/screening/requests`, `/screening/review`, `/screening/review/decline`
- [ ] `/screening/submitted`, `/screening/accepted`, `/screening/declined`, `/screening/trial`

### RD-09 · รีวิว
- [ ] `/reviews`, `/reviews/empty`, `/reviews/replying`, `/reviews/reply-failed`
- [ ] `/reviews/session`, `/reviews/session/submitted`

### RD-13 · หน้า auth ที่เหลือ (เร็ว ใช้ `AuthSplit` ได้เลย)
- [ ] `/reset-password`
- [ ] `/verification-sent`: ทำแล้วบน `AuthSplit` รอพี่ดู (อีเมลยังไม่ถูกส่งจริง เพราะ API ยังไม่มีบริการส่งเมล)
- [ ] `/email-verified`: ทำแล้วบน `AuthSplit` รอพี่ดู

### RD-14 · หน้าการตลาด
- [ ] `/about`
- [ ] `/landing`

### RD-15 · สถานะระบบ
- [ ] `/status/no-connection`, `/status/not-found`, `/status/server-error`

### RD-16 · Admin console
- [ ] `/admin`, `/admin/login`, `/admin/login/error`, `/admin/dashboard`
- [ ] `/admin/users`, `/admin/users/edit`, `/admin/manage`, `/admin/manage/edit`
- [ ] `/admin/verification`, `/admin/verification/review`, `/admin/skill-proofs`, `/admin/skill-proofs/review`
- [ ] `/admin/services`, `/admin/services/edit`, `/admin/skills`, `/admin/skills/edit`
- [ ] `/admin/transactions`, `/admin/payouts`, `/admin/refunds`, `/admin/refunds/review`
- [ ] `/admin/reports`, `/admin/reports/review`, `/admin/off-platform`, `/admin/off-platform/review`

รอบก่อนแก้เฉพาะจุด (sidebar, PDF viewer, ปุ่มหน้า verification, ข้อความหน้า login) ยังไม่ใช่ redesign

## ไม่ต้องทำ

- `/screens` หน้าสำหรับ dev

## ลบแล้ว (24 ต.ค. 2026)

หน้า state ตาม Figma ที่หน้าจริงแสดงเองอยู่แล้ว กับหน้าที่ไม่มีใช้ ไม่ต้อง redesign:
`/story`, `/appshell`, `/offline/*`, `/login/wrong-password`, `/login/account-locked`,
`/register/email-in-use`, `/register/validation-errors`, `/settings/password/wrong`,
`/settings/email/in-use`, `/settings/delete/blocked`, `/profile/edit/photo-rejected`,
`/advisor-onboarding/stage-1/errors`, `/advisor-onboarding/stage-2/uploaded`,
`/advisor-onboarding/stage-2/rejected`, `/advisor-onboarding/stage-3/missing-proof`,
`/checkout/card/errors`, `/notifications/empty`, `/availability/profiles/empty`,
`/matching/results/no-results`

`/settings/delete` ลบแล้ว (28 ต.ค.): ลบบัญชีเป็น popup ในหน้า `/settings`

`/search/browse` ก็ลบแล้ว: ซ้ำกับ `/search` ที่ไม่ใส่คำค้นก็แสดงบริการทั้งหมดพร้อมตัวกรองอยู่แล้ว
ลิงก์ "หมวดหมู่" ใน footer ชี้ไป `/search` แทน

เก็บ `/availability/profiles/edit/error` ไว้ เพราะเทส e2e ใช้เป็น fixture

## เรื่องค้างที่ไม่ใช่หน้า

- [ ] หน้า home ยังกระตุกนิดหน่อยตอนเลื่อน
- [ ] Google / Facebook / Apple login: ต้องสร้าง OAuth client แล้วใส่ `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` ฯลฯ ใน `.env` ของ API (โค้ดทั้งสองฝั่งพร้อมแล้ว)
- [ ] ให้ทนายไทยตรวจ `/terms` และ `/privacy-policy` ก่อนเปิดใช้กับลูกค้าจริง
- [ ] เปิดแถบ dock แบบ Systronic/mochiice ในหน้าอื่นที่ควรมี (`TopBar dock`)
- [ ] ปุ่มบน topbar มือถือสองปุ่มสูงแค่ 36px และ 24px (ต่ำกว่า 44px)
- [ ] เพิ่มลิงก์ "เข้าสู่ระบบ" ข้างปุ่ม Get started บน desktop
- [ ] `/bookings` แสดง id ดิบของบริการที่ปิดไปแล้วแทนชื่อ
- [ ] `useQueryValue` ใน `components/bookings/booking-flow.ts` ค้างค่า query เก่าเมื่อหน้าลิงก์หาตัวเองด้วย query ใหม่ (หน้า service แก้แล้วด้วย `useSearchParams`)
- [ ] advisor ที่โดนปฏิเสธแล้วสมัครใหม่ ต้องกรอกทักษะ/หลักฐานใหม่ทั้งหมด และหลักฐานอาจถูกส่งซ้ำ
- [ ] key ข้อความที่ไม่มีใครใช้แล้วใน `messages/th.json` (`payment.*` หลายตัว, `home.promo*` ฯลฯ, ข้อความสมัคร advisor ที่ผิด เช่น 10 MB)
- [ ] บัญชีเดโม `nattapong.d@advisory.demo` โดนแบนใน DB ที่ใช้อยู่ (ใช้ `supaporn.t` แทน)
- [ ] API: ทุก request ที่มี cookie เสียเวลาอ่าน session จาก DB ~300ms เพราะ cookie cache ไม่ถูกต่ออายุ (รายละเอียดใน API PR #60) รอพี่ตัดสินใจวิธีแก้
