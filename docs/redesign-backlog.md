# Redesign backlog

รายการหน้าที่ยังต้อง redesign เรียงตามลำดับที่ควรทำ แต่ละข้อเป็นหนึ่ง ticket
ติ๊ก `[x]` เมื่อพี่ดูแล้ว **ผ่าน** ไม่ใช่แค่เขียนโค้ดเสร็จ

อัปเดตล่าสุด: 24 ตุลาคม 2569

## หลักที่ใช้กับทุกหน้า

- desktop ออกแบบที่จอ 1710 × 985 แล้วย่อลงตามสัดส่วนบน iPad แนวนอน (`.auth-scale` / `.doc-scale` / `.page-scale` ใน `app/globals.css`)
- iPad แนวตั้งใช้ layout แบบมือถือ (`MobileScreen wide="md"`)
- มือถือย่อลงหนึ่งขั้น ปุ่มสูงอย่างน้อย 44px ช่องกรอกตัวหนังสือ 16px (กัน iPhone ซูม)
- อ้างอิง fastwork ได้ แต่ห้ามลอกจนเหมือน ต้องเป็นหน้าตาของ Advisory
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

## ทำแล้วแต่ยังไม่ผ่าน

### RD-01 · โปรไฟล์ผู้รับคำปรึกษา
- [ ] `/profile`
- [ ] `/settings/logout` (ใช้หน้าโปรไฟล์เป็นพื้นหลัง จะเปลี่ยนตามเอง)

สถานะ: redesign ไปแล้ว (โครง fastwork, กล่องนัดถัดไป, ตัวเลขจากการจองจริง) แต่พี่ยังไม่ให้ผ่าน ต้องคุยว่าไม่ผ่านตรงไหนก่อนแก้รอบใหม่

## ยังไม่ได้ทำ

### RD-17 · Footer (ทุกหน้า)
- [ ] `components/marketing/site-footer.tsx`

ใช้ร่วมกันทุกหน้า แก้ครั้งเดียวได้ทุกหน้า ตอนนี้ยังเป็นแบบที่ลอก Systronic มา ต้อง redesign ให้เข้าชุดกับ home / login / terms (ปุ่มแคปซูล, Kanit, พื้นขาวหรือแสงฟ้า-ม่วงจางๆ) พร้อมสองภาษา และ scale จาก 1710 บน iPad แนวนอน

### RD-02 · โปรไฟล์สาธารณะของผู้ให้คำปรึกษา ⭐ ทำก่อน
- [ ] `/advisors/[advisorId]`
- [ ] `/advisors/[advisorId]/about`
- [ ] `/advisors/[advisorId]/services`
- [ ] `/advisors/[advisorId]/reviews`

หน้าที่ลูกค้าใช้ตัดสินใจจอง ควรมี: รูป ชื่อ badge ยืนยันตัวตนที่บอกชัดว่าตรวจอะไร คะแนน เวลาตอบ ราคาเริ่มต้น ปุ่มจองติดตลอด เวลาว่างถัดไป บริการ คุณวุฒิ รีวิว

### RD-03 · ค้นหาและบริการ
- [ ] `/search/browse`
- [ ] `/service/[id]`
- [ ] `/matching`, `/matching/searching`, `/matching/results`, `/matching/results/no-results`

### RD-04 · จองและชำระเงิน
- [ ] `/checkout/card`, `/checkout/card/errors`, `/checkout/card/saved`
- [ ] `/checkout/processing`, `/checkout/success`, `/checkout/failed`
- [ ] `/checkout/slot-taken`, `/checkout/unconfirmed`
- [ ] `/bookings`
- [ ] `/transactions`, `/transactions/detail`, `/transactions/detail/failed`, `/transactions/detail/refunded`

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
- [ ] `/availability/profiles`, `/availability/profiles/empty`, `/availability/profiles/add-date`, `/availability/profiles/delete`
- [ ] `/availability/profiles/new`, `/availability/profiles/new/blocked`, `/availability/profiles/new/from-list`, `/availability/profiles/new/specific`
- [ ] `/availability/profiles/edit`, `/availability/profiles/edit/blocked`, `/availability/profiles/edit/error`, `/availability/profiles/edit/picker`, `/availability/profiles/edit/specific`

### RD-08 · รายได้และการคัดกรอง
- [ ] `/earnings`, `/earnings/payout-account`, `/earnings/payout-account/setup`, `/earnings/payout-history`, `/earnings/payout-history/failed`
- [ ] `/screening/setup`, `/screening/questions`, `/screening/requests`, `/screening/review`, `/screening/review/decline`
- [ ] `/screening/submitted`, `/screening/accepted`, `/screening/declined`, `/screening/trial`

### RD-09 · รีวิว
- [ ] `/reviews`, `/reviews/empty`, `/reviews/replying`, `/reviews/reply-failed`
- [ ] `/reviews/session`, `/reviews/session/submitted`

### RD-10 · สมัครเป็นผู้ให้คำปรึกษา
- [ ] `/advisor/apply`
- [ ] `/advisor-onboarding/stage-1`, `/advisor-onboarding/stage-1/errors`
- [ ] `/advisor-onboarding/stage-2`, `/advisor-onboarding/stage-2/uploaded`, `/advisor-onboarding/stage-2/rejected`
- [ ] `/advisor-onboarding/stage-3`, `/advisor-onboarding/stage-3/missing-proof`
- [ ] `/advisor-onboarding/pending`, `/advisor-onboarding/failed`, `/advisor-onboarding/thank-you`

### RD-11 · แชตและการแจ้งเตือน
- [ ] `/chat`, `/chat/empty`, `/chat/session-banner`
- [ ] `/chat/[id]`, `/chat/[id]/message-failed`, `/chat/[id]/report`, `/chat/[id]/report/submitted`
- [ ] `/notifications`, `/notifications/advisor`, `/notifications/empty`, `/notifications/push-primer`

### RD-12 · บัญชีและการตั้งค่า
- [ ] `/profile/edit`, `/profile/edit/photo-rejected`, `/profile/edit/save-failed`
- [ ] `/settings`, `/settings/updated`
- [ ] `/settings/email`, `/settings/email/in-use`, `/settings/email/verify`
- [ ] `/settings/password`, `/settings/password/wrong`
- [ ] `/settings/delete`, `/settings/delete/blocked`

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

เก็บ `/availability/profiles/edit/error` ไว้ เพราะเทส e2e ใช้เป็น fixture

## เรื่องค้างที่ไม่ใช่หน้า

- [ ] หน้า home ยังกระตุกนิดหน่อยตอนเลื่อน
- [ ] Google / Facebook / Apple login: ต้องสร้าง OAuth client แล้วใส่ `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` ฯลฯ ใน `.env` ของ API (โค้ดทั้งสองฝั่งพร้อมแล้ว)
- [ ] ให้ทนายไทยตรวจ `/terms` และ `/privacy-policy` ก่อนเปิดใช้กับลูกค้าจริง
- [ ] เปิดแถบ dock แบบ Systronic/mochiice ในหน้าอื่นที่ควรมี (`TopBar dock`)
- [ ] ปุ่มบน topbar มือถือสองปุ่มสูงแค่ 36px และ 24px (ต่ำกว่า 44px)
- [ ] เพิ่มลิงก์ "เข้าสู่ระบบ" ข้างปุ่ม Get started บน desktop
