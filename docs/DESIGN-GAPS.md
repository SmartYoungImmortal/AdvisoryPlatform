# หน้าที่ยังไม่มี design

เทียบ **UX/UI Page list** ของทีม (84 หน้า) กับที่มีจริงใน Figma + โค้ด (77 หน้าจอ)

ตัวเลขไม่ตรงกันแบบตรงไปตรงมาไม่ได้ เพราะ 77 หน้าที่ทำไปนับ error state แยกเป็นหน้า (เช่น `/login`, `/login/wrong-password`, `/login/account-locked` = 3) ส่วนลิสต์ของทีมนับเป็น 1 — **ของจริงคือหมวดใหญ่ 3 หมวดหายไปทั้งยวง**

---

## ⚠️ P0 ที่ยังไม่มี design เลย — ระบบใช้งานไม่ได้ถ้าไม่มี

### Booking — หายเกือบหมด (หมวดนี้คือหัวใจของ product)

| หน้า | สถานะ |
|---|---|
| Booking page calendar + slot picker | **ไม่มี** |
| Booking review before payment | **ไม่มี** |
| My bookings | **ไม่มี** |
| Booking detail | **ไม่มี** |
| Slot-taken conflict | ✅ มี (`/checkout/slot-taken`) |
| Booking confirmed / success | ⚠️ มีแค่หน้าจ่ายเงินสำเร็จ ไม่ใช่หน้ายืนยันการจอง |

นี่คือเหตุผลที่ tab **"การจอง"** ใน `lib/navigation/index.ts` ยังไม่มี `href` — ผมเขียนคอมเมนต์ไว้ตอนนั้นว่า "ไม่มี Figma frame" ปรากฏว่าไม่ใช่แค่ frame เดียว แต่ทั้งหมวด

### Advisor side — หายทั้งหมด 8 หน้า

```
Advisor dashboard        Create session slots      My services
Advisor calendar         Incoming booking requests  Create service
Session detail (advisor view)                       Edit service (P1)
```

ที่ปรึกษาสร้าง service และเปิด timeslot ไม่ได้เลย ⇒ **ไม่มีอะไรให้จอง** ทั้ง flow การจองจึงเริ่มไม่ได้จริง

### Discovery — หายทั้งหมด

```
Landing page (search + filter + no results)   P0
Home                                          P0
Service detail page                           P1
Advisor public profile                        P1
Full review list                              P2
```

`/advisor/profile` ที่มีอยู่คือหน้าที่ **advisor ดูโปรไฟล์ตัวเอง** ไม่ใช่หน้าที่ลูกค้าเห็น — คนละหน้ากัน

### Consultation Session — ตัวการให้คำปรึกษาจริงยังไม่มี

| หน้า | |
|---|---|
| **In-call view (Jitsi) + sidebar** | **ไม่มี** — P0 นี่คือตัวสินค้า |
| Device check (camera/mic) | ไม่มี (P1) |
| Screen share | ไม่มี (P1) |
| Technical trouble / reconnecting | ไม่มี (P2) |
| Call ended | ⚠️ มีปนอยู่ในหน้า review (`/reviews/session`) |

### อื่นๆ P0

- **Role Selection (Advisor/Advisee)** — สมัครเสร็จแล้วไม่มีหน้าให้เลือกว่าเป็นใคร
- **Payment method selection** (card / PromptPay / wallet) — ตรงกับ Figma `995:10283 "Payment - Method"` ที่ผมรายงานไปแล้วว่ายังไม่ได้ทำ
- **Loading state** — ทั้งระบบยังไม่มี

---

## หมวดที่หายทั้งหมวด (ไม่มีแม้แต่หน้าเดียว)

**Admin Console** — 7 หน้า
```
Admin login · Admin dashboard · User management (list/search/suspend)
Advisor verification page (approve/reject) · Refund case manager
Report case management · Category & content management
```
ทีมจัด Admin Console เป็น **core feature** แต่ยังไม่มี design สักหน้า — และ advisor verification เป็นตัวปลดล็อกว่า advisor จะขึ้นระบบได้เมื่อไหร่

**Trust & Safety** — 3 หน้า
```
Policy violation warning · Report user/content · Account penalty points
```
ผูกกับ Off-Platform Detection ที่เป็น core feature เหมือนกัน

---

## หน้าที่มีแล้วแต่ทีมจัดเป็น deferred (P3)

ผมทำครบไปแล้วทั้งที่ทีมเลื่อนออก — ไม่เสียหาย แต่บอกไว้ว่าลำดับความสำคัญไม่ตรงกับที่ทีมโหวต:

- Matching (problem form / searching / results) — P3
- Screening & Trial ทั้ง 8 หน้า — P3

---

## สรุปสำหรับตัดสินใจ

| หมวด | มี | ขาด | ขาดระดับ P0 |
|---|---|---|---|
| Auth & Onboarding | 13 | 3 | 1 |
| Profile & Account | 11 | 1 | 0 |
| Chat | 5 | 4 | 1 |
| Discovery | 0 | 5 | 2 |
| Booking | 1 | 8 | 5 |
| Advisor side | 0 | 8 | 7 |
| Payment | 11 | 1 | 1 |
| Admin | 0 | 7 | — |
| Trust & Safety | 0 | 3 | — |

**ที่ blocking ที่สุดคือ Advisor side + Booking** — สองหมวดนี้ต่อกันเป็น flow เดียว (advisor สร้าง service → เปิด slot → ลูกค้าเห็น → จอง → จ่าย) ตอนนี้มีแค่ท่อนท้าย (จ่ายเงิน) ท่อนต้นทั้งหมดยังไม่มี design

ฝั่ง backend ผมทำ schema + endpoint รองรับไว้แล้ว (`service`, `timeslot` พร้อม constraint กันจองซ้ำระดับ database) เพราะฉะนั้นพอ design มา ต่อได้เลยไม่ต้องแก้ฐานข้อมูล
