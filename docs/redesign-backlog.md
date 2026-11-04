# Redesign backlog

รายการหน้าที่ยังต้อง redesign เรียงตามลำดับที่ควรทำ แต่ละข้อเป็นหนึ่ง ticket
ติ๊ก `[x]` เมื่อพี่ดูแล้ว **ผ่าน** ไม่ใช่แค่เขียนโค้ดเสร็จ

อัปเดตล่าสุด: 2 พฤศจิกายน 2569

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
- [x] RD-11 แชต: `/chat`, `/chat/empty`, `/chat/session-banner`, `/chat/[id]` (+ `/message-failed`, `/report`, `/report/submitted`) ผ่าน 1 พ.ย.
- [x] RD-03 หน้าบริการ: `/service/[id]` (หัว showcase, แพ็กเกจ, กล่องจองสองขั้น, รีวิว) ผ่าน 1 พ.ย.
- [x] RD-13 หน้า auth ที่เหลือ: `/reset-password`, `/verification-sent`, `/email-verified` ผ่าน 1 พ.ย.
- [x] RD-18 Toast: `components/mobile/toast.tsx` และ `components/notifications/notification-toaster.tsx` เป็นแบบเดียวกันแล้ว ผ่าน 1 พ.ย.
- [x] RD-04 checkout: `/checkout/card`, `/checkout/card/saved` (บัตรผ่าน Omise, PromptPay, Google Pay, mobile banking, คูปอง) ผ่าน 1 พ.ย.

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
- [ ] `/advisors/[advisorId]`, `/about`, `/services`, `/reviews`: ทำใหม่ 30 ต.ค. navbar ของเว็บ + ปุ่มย้อนกลับ การ์ดแบบหน้าค้นหา รีวิวแบบหน้าบริการ แท็บ About

### RD-04 · จองและชำระเงิน
- [ ] `/checkout/processing`, `/checkout/success`, `/checkout/failed`, `/checkout/slot-taken`, `/checkout/unconfirmed`: success อ่านใบเสร็จจริง ที่เหลือใช้ component เดียวกัน

### RD-09 · รีวิวหลังคุย
- [ ] `/reviews/session`, `/reviews/session/submitted`: ต้องมี `?booking=<id>` ของนัดที่จบแล้วของบัญชีที่ล็อกอิน เปิดเปล่าๆ จะขึ้นว่าไม่มีนัดให้รีวิว

### RD-17 · Footer (ทุกหน้า)
- [ ] `components/marketing/site-footer.tsx`: ทำแล้ว 30 ต.ค. (สามคอลัมน์บนพื้นสว่าง + แถวล่าง) พี่ดูแล้ว 1 พ.ย. ยังไม่ผ่าน

### RD-16 · Admin console
- [ ] ทั้ง 18 หน้า redesign แล้ว 28–30 ต.ค. รายการหน้าอยู่ใน RD-16 ด้านล่าง

### RD-10 · สมัครเป็นผู้ให้คำปรึกษา
- [ ] `/advisor/apply`
- [ ] `/advisor-onboarding/stage-1`, `/stage-2`, `/stage-3`: กรอบเดียวกับ login ขนาดตัวอักษรเท่าหน้า login
- [ ] `/advisor-onboarding/thank-you`, `/pending`, `/failed`

### งาน (RD-05 ถึง RD-08) · กรอบเดียวทั้งหมด (2 พ.ย.)
ทุกหน้าในงานอยู่ใน `components/work/work-frame.tsx`: เมนู "งานของฉัน" ซ้าย (วันนี้ ปฏิทิน บริการ เวลาว่าง คำขอปรึกษา รายได้)
อยู่ทุกหน้าและไฮไลต์หมวดของหน้า, หัวหน้ามีไอคอนในกรอบเทาแบบหน้าตั้งค่า ไม่มีบรรทัดคำอธิบาย, หน้าย่อยใช้ breadcrumb
"หมวด › ชื่อหน้า" แทน `<` บน desktop, มือถือเป็นแคปซูลใต้หัว + ลูกศรย้อนกลับในหน้าย่อย, เนื้อหาใช้ชิ้นของหน้า
ธุรกรรม (แคปซูลกรอง กล่องว่าง skeleton) และแถวของหน้าตั้งค่า (`components/work/desk-parts.tsx`)
- [ ] RD-05 `/work` (วันนี้: นัดถัดไป + รายการ + แผงภาพรวมขวา), `/work/calendar`, `/work/earnings`, `/work/session`
  ยังเหลือ: skeleton ของวันนี้กับปฏิทินให้ตรงหน้าจริง, ตัวอักษรหัวข้อในเนื้อหาให้เข้าชุด
- [ ] RD-05 `/advisor/edit`: อยู่ใต้ "โปรไฟล์" แล้ว (ไม่ใช่งาน) มีผลงาน (portfolio)
- [ ] RD-06 `/advisor/services`: แคปซูล ทั้งหมด / เปิดให้จอง / ซ่อนอยู่ + การ์ดรูป 4 คอลัมน์
- [ ] RD-06 `/advisor/services/new` และ `/advisor/services/view` (แก้ไข): หน้ายาวหน้าเดียว ไม่ยิง API จนกดบันทึก,
  รูปปกใหญ่ซ้ายรูปอื่นข้างๆ, หัวเหลือชื่อบริการ, เปิดให้จองอยู่ในส่วนการจอง, ตารางเวลาอยู่ในส่วนชุดเวลาว่าง
  กำลังทำ: กล่องขวาสลับ แก้ไข / ดูแบบลูกค้า และภาษาที่แก้ ไทย / English
- [ ] RD-06 `/advisor/services/schedule`: ในกรอบงานแล้ว
- [ ] RD-07 `/availability` (และ `/availability/configured`, `/custom` ซึ่งเป็นหน้าเดียวกันกับค่าตัวอย่าง): แถวแบบหน้าตั้งค่า กติกาการจองแต่ละข้อเปิด popup (ยังไม่ commit)
- [ ] RD-07 `/availability/profiles/new`, `/availability/profiles/edit`: ในกรอบงานแล้ว ย้อนกลับไปเวลาว่าง
- [ ] RD-08 `/work/earnings` (`/earnings`): แคปซูลกรองพร้อมยอดเงิน + รายการแบ่งตามเดือน
- [ ] RD-08 `/earnings/payout-account` + ตั้งบัญชีเป็น popup (`/setup` เปิดหน้าเดียวกันพร้อม popup) ยังบันทึกจริงไม่ได้ เพราะ API ไม่มี route
- [ ] RD-08 `/screening/requests`: แคปซูล ทั้งหมด / รอตอบกลับ / ตอบแล้ว

## ยังไม่ได้ทำ

### งาน · หน้าเก่าที่ยังไม่อยู่ในกรอบงาน
- [ ] `/advisor/skills`, `/earnings/payout-history`, `/earnings/payout-history/failed`, `/screening/setup`
- [ ] `/screening/questions`, `/screening/review`, `/screening/review/decline`
- [ ] หน้าสถานะคัดกรองฝั่งลูกค้า: `/screening/submitted`, `/screening/accepted`, `/screening/declined`, `/screening/trial`
- [ ] `/availability/profiles` (รายการเก่า ไม่มีลิงก์ไปแล้ว รายการอยู่ใน `/availability`), `/add-date`, `/delete`, `/new/blocked`, `/new/from-list`, `/new/specific`, `/edit/blocked`, `/edit/picker`, `/edit/specific` (`/edit/error` เก็บไว้ให้เทส e2e)
- [ ] `/advisor/services/manage`, `/manage/delete`, `/new/limit`, `/new/no-profile`, `/[serviceId]/*` (ของเก่าก่อน editor ใหม่)
- [ ] `/advisor/profile`: โหมดผู้ให้คำปรึกษารวมเข้า `/profile` แล้ว ยังไม่ได้ตัดสินว่าจะเก็บ route นี้ไหม

### RD-03 · จับคู่ผู้เชี่ยวชาญ
- [ ] `/matching`, `/matching/searching`, `/matching/results`

### RD-04 · จองและชำระเงิน (ที่เหลือ)
- [ ] ข้างในของ `/bookings` (กรอบทำแล้ว ดู RD-01)
- [ ] `/bookings/refund` + popup การจอง (#114): ทางออกเดียวต่อการจองจากกฎข้อ 8 (`bookingExit`) ยกเลิกคืนเต็ม / คืน 50% / แจ้งปัญหา / รับเงินคืน / สถานะ ในการ์ดใบเสร็จความกว้างเท่าหน้าการจอง ไม่มี breadcrumb รอตรวจ

### RD-09 · รีวิวของผู้ให้คำปรึกษา
- [ ] `/reviews`, `/reviews/empty`, `/reviews/replying`, `/reviews/reply-failed`

### RD-14 · หน้าการตลาด
- [ ] `/about`

`/landing` ลบแล้ว (30 ต.ค.): พี่บอกว่าหน้านี้ไม่ใช่แล้ว ลิงก์ "คำถามที่พบบ่อย" / "ศูนย์ช่วยเหลือ" ไปที่ `/#faq` (home แสดงครบ 8 ข้อ), "ราคาและค่าบริการ" ไปที่ `/#pricing`, "วิธีใช้งาน" ไปที่ `/about`

### RD-15 · สถานะระบบ
- [ ] `/status/no-connection`, `/status/not-found`, `/status/server-error`

### RD-16 · Admin console
- [ ] `/admin`, `/admin/login`, `/admin/dashboard`
- [ ] `/admin/users`, `/admin/users/edit`
- [ ] `/admin/verification` (แท็บ ตัวตน / เอกสารทักษะ `?tab=skills`), `/admin/verification/review`, `/admin/verification/proof`
- [ ] `/admin/reports` (แท็บ จากผู้ใช้ / ระบบตรวจพบ `?tab=flags`), `/admin/reports/review`, `/admin/reports/flag`
- [ ] `/admin/services`, `/admin/services/edit`
- [ ] `/admin/manage` (แท็บ หมวดหมู่ / ทักษะ `?tab=skills`), `/admin/manage/edit`, `/admin/manage/skill`
- [ ] `/admin/refunds`, `/admin/refunds/review`, `/admin/payouts`

redesign แล้ว (28 ต.ค.) รอพี่ดู: กรอบเดียวกับหน้าบัญชี (แถบเมนูบนพื้นเทา หน้าอยู่ในแผ่นขาวมุมโค้ง) เมนูเหลือ 7
ลบแล้ว: `/admin/login/error` (หน้า login แสดง error เอง), `/admin/transactions` (ไม่มี API ข้อมูลเป็นตัวอย่างล้วน),
`/admin/skill-proofs`, `/admin/skills`, `/admin/off-platform` (รวมเป็นแท็บของหน้าที่ใกล้กัน)

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

- [ ] Admin: user guide แบบ Systronics ในหน้า `/admin/services` (และหน้าอื่นของ admin) พี่สั่งให้ทำหลัง redesign admin ผ่าน (1 พ.ย.)

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
