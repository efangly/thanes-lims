# งานฝาก backend จาก grilling session ฝั่ง frontend (2026-08-28)

สองข้อนี้เกิดจาก decision ที่ตกลงกันไว้แล้วฝั่ง UI แล้วพบว่า API ปัจจุบันทำให้ไม่ได้โดยไม่ยิง N request
ต่อการเปิดหนึ่งหน้า ทั้งคู่เป็น read-only เพิ่ม endpoint/field ไม่ต้องแตะ schema หรือ use case ที่มีอยู่

---

## 1. รายการ Calibration Schedule แบบข้ามเครื่อง (บล็อก frontend phase 6) — ✅ backend ทำแล้ว (`GET /calibration-schedules?equipment_id=`), frontend phase 6 เสร็จ 2026-08-28

**ทำไมต้องมี** — ADR-0006 (`docs/adr/0006-calibration-schedules-drive-equipment-status.md`) ตัดสินว่า
คอลัมน์ "รอบสอบเทียบถัดไป" + วงแหวนเวลาเหลือ + สถานะ ready/due_soon/overdue ในตารางทะเบียนเครื่องมือ
อ่านจาก **schedule ที่ due เร็วที่สุดของแต่ละเครื่อง** ไม่ใช่ `Equipment.NextCalibrationDue` เพราะเครื่องที่
เพิ่งสอบเทียบภายในแต่ค้างสอบเทียบภายนอกอยู่จะขึ้นเขียวทั้งที่ค้างงานจริง

ตอนนี้มีแต่ `GET /equipment/{id}/calibration-schedules` รายเครื่อง → ตาราง 32 เครื่อง = 32 request
ทุกครั้งที่เข้าโมดูล

**ที่ขอ** — endpoint list ข้ามเครื่อง reuse `ScheduleRepository` เดิม:

```
GET /calibration-schedules?equipment_id=EQ-CENT-0001,EQ-PCR-0002
    (ไม่ส่ง equipment_id = คืนทั้งหมด)
permission: equipment:view (เดิม)

200 → [ { "id": 12, "equipment_id": "EQ-CENT-0001", "label": "สอบเทียบภายนอก",
          "next_due_date": "2026-11-01T00:00:00Z", "interval_months": 12 }, ... ]
```

รูปแบบ response ใช้ตัวเดียวกับ `GET /equipment/{id}/calibration-schedules` ที่มีอยู่ (frontend จัดกลุ่มตาม
`equipment_id` เอง) ถ้าจะทำเป็น `GET /equipment?with=schedules` แทนก็รับได้เหมือนกัน — ขอแค่ให้จบใน
request เดียว

---

## 2. ข้อมูลวันหมดอายุของ lot บน `GET /inventory` (บล็อก frontend phase 8) — ✅ backend ใส่ `earliest_expire_date` + `lot_count` บน `ItemResponse` แล้ว, frontend phase 8 เสร็จ 2026-08-28

**ทำไมต้องมี** — ตกลงกันว่าตารางสินค้าคงคลังจะมีคอลัมน์ "หมดอายุใกล้สุด" พร้อม badge เตือน และ KPI
"ล็อตใกล้หมดอายุ" ด้านบน หลังจาก phase 8 ทำให้ `quantity` เป็นค่า derived จาก lot และวันหมดอายุอยู่ที่
lot ไม่ใช่ที่ item

`ItemResponse` (`internal/adapters/http/inventory/dto.go:107`) ตอนนี้มีแค่ `quantity` ที่ sum มาแล้ว
ไม่มีอะไรเกี่ยวกับ lot เลย → ต้องยิง `GET /inventory/{id}/lots` ทีละรายการถึงจะรู้วันหมดอายุ

**ที่ขอ** — เพิ่ม 2 field บน `ItemResponse` (คำนวณจาก lot ชุดเดียวกับที่ sum `quantity` อยู่แล้วใน
`postgres/inventory.Repository` — ไม่มี query เพิ่ม):

```jsonc
{
  // ... field เดิม
  "earliest_expire_date": "2026-09-15T00:00:00Z", // null ได้ (ไม่มี lot / ทุก lot ไม่มีวันหมดอายุ)
  "lot_count": 3
}
```

ถ้าไม่อยากขยาย `ItemResponse` ทางเลือกที่ frontend ใช้ได้เหมือนกันคือ
`GET /inventory/lots?expiring_before=<date>` (lot ข้ามรายการ) — แต่แบบแรกตรงกับที่ตารางต้องใช้กว่า

---

# งานฝาก backend รอบ "ลบ mockup ออกจาก frontend" (2026-09-09)

frontend ลบข้อมูล mockup ทั้งหมดออกจากจอแล้ว การ์ด KPI / Donut / พาเนล ที่คำนวณจาก list ที่โหลดอยู่แล้ว
ได้ (`/samples`, `/tests`, `/inventory`, `/documents`, `/equipment` + `/calibration-schedules`) ทำเสร็จแล้ว
ที่เหลือด้านล่างยังไม่มี endpoint รองรับ — ระหว่างนี้ frontend แสดง empty state / ป้าย "เร็ว ๆ นี้" ไว้

## 3. ฟีดความเคลื่อนไหวล่าสุด — dashboard "ความเคลื่อนไหวล่าสุด"

การ์ดนี้เคยเป็น array mock (`FEED`) ตอนนี้เรียก `GET /activity?limit=8` แล้ว `.catch` → แสดง "ยังไม่มีความเคลื่อนไหว"

```
GET /activity?limit=<n>
permission: อ่านทั่วไป (เหมือน /notifications)

200 → [ { "id": "act-123",
          "tone": "red|amber|teal|green|violet|grey",
          "icon": "Env|Sample|Equipment|Inventory|Check",
          "text": "Freezer-B อุณหภูมิสูงเกินกำหนด (-11.2°C)",
          "occurred_at": "2026-09-09T08:14:00Z" }, ... ]
```

เหตุการณ์ข้ามโมดูล (รับตัวอย่าง, เลยกำหนดสอบเทียบ, สต็อกต่ำ, อนุมัติผล, alert สภาพแวดล้อม) เรียงใหม่→เก่า
ถ้ามี event log อยู่แล้วก็ project ออกมาเป็นรูปนี้ได้เลย

## 4. ปริมาณงานทดสอบรายวัน — dashboard กราฟแท่ง

เคย hardcode 7 แท่ง ตอนนี้เรียก `GET /tests/volume?days=7` แล้ว `.catch` → "ยังไม่มีข้อมูลปริมาณงานทดสอบ"

```
GET /tests/volume?days=<n>
200 → [ { "date": "2026-09-03", "completed": 41, "pending": 12 }, ... ]  // เรียงเก่า→ใหม่, n จุด
```

`completed` = ผลที่ approved ในวันนั้น, `pending` = ที่เปิด/ยังไม่ approved — นับจาก TestResult ตามวันที่

## 5. วันที่บน TestResult / Sample (สำหรับ KPI "วันนี้")

การ์ด KPI "คำสั่งทดสอบวันนี้" (tests) และ "รับเข้าวันนี้" (samples) ถูกสลับเป็นเมตริกรวม (`tests.length`,
`samples.length`) ชั่วคราว เพราะ DTO ไม่มี field วันที่ที่เทียบ "วันนี้" ได้:
- `TestResultDTO` — ขอเพิ่ม `created_at` (RFC3339)
- `SampleDTO` — มี `received_at` อยู่แล้วใน mapper (`recv`) แต่เป็น string ที่ format แล้ว ขอเก็บ raw
  RFC3339 ไว้ด้วย (เช่น `received_at_raw`) เพื่อให้ frontend เทียบวันได้

## 6. แนวโน้มอุณหภูมิ 24 ชม. — environment

ใช้ `GET /environment/gauges/{location}/trend` ที่มีอยู่แล้ว (frontend เลือก gauge ที่ crit/warn มาแสดง)
caption "ตรวจพบการเปิดตู้ N ครั้ง …" ลบออกถาวร — ถ้าต้องการกลับมา ขอเป็น field เสริมบน trend response
(`door_open_events: [{ from, to, count }]`)

## 7. วิเคราะห์ผลด้วย AI — tests พาเนล "AI ANALYSIS"

ลบ finding ที่ hardcode ออกแล้ว เหลือป้าย "อยู่ระหว่างการพัฒนา" — เมื่อพร้อมขอ
`GET /tests/insights` → `{ anomalies: [...], qc_summary: {...} }`

## 8. เขียนค่ากลับ — modal ที่ปุ่มบันทึกถูกปิดไว้

- **ตั้งค่าเกณฑ์แจ้งเตือน** (`alert-thresholds`) — แสดง gauge จาก `/environment/gauges` จริงแล้ว
  ปุ่มบันทึกปิดไว้ รอ `PATCH /environment/gauges/{location}/thresholds` `{ range_min, range_max }`
- **สร้างรายงาน** / **ส่งออกรายงาน Audit** — ตัดขั้นตอนปลอม (ชื่อ/ขนาดไฟล์ PDF ปลอม) ออก เหลือป้าย
  "เร็ว ๆ นี้" รอ `POST /reports` (คืนไฟล์) และ `GET /equipment/audit-report` (คืน PDF)
- **จัดการสิทธิ์เข้าถึง** (`manage-access`) — ตัด matrix ปลอมออก แสดงข้อความว่าจัดการที่ backend
  (สอดคล้อง ADR-0002) ยังไม่ขอ endpoint
  — ✅ 2026-09-10: มีหน้า `/users` (admin) + `/profile` (self-service) แล้ว จาก grilling session
  "เพิ่มระบบผู้ใช้งาน" backend เพิ่ม suspend/reactivate/retire/reset-password + `PATCH /users/me`
  + `POST /users/me/password` (ADR backend 0010, frontend 0014) — matrix role↔permission ยังไม่ทำ (คงตาม ADR-0002)

## 9. เปลี่ยนสถานะตัวอย่างจาก UI — `/samples` พาเนลรายละเอียด — ✅ backend มี endpoint นี้อยู่แล้ว
   (`PATCH /samples/{id}/status`, `internal/adapters/http/sample`), frontend ต่อสายใช้งานจริงแล้ว
   2026-09-14

**ทำไมเคยคิดว่าต้องขอ** — ตอนสำรวจโค้ด frontend (2026-09-14) พบว่า `status` ของ sample ถูกใช้เป็น
ค่า read-only อย่างเดียวในหน้า `/samples` เลยเข้าใจผิดว่ายังไม่มี endpoint ฝั่ง backend — ตรวจสอบซ้ำแล้ว
พบว่า `PATCH /samples/{id}/status` มีครบทั้ง domain state machine (`Sample.Transition`,
`internal/domain/sample/sample.go`), use case (`UpdateSampleStatusUseCase`), RBAC (edit permission),
CoC auto-log และ swagger docs อยู่แล้ว ไม่ต้องขอเพิ่ม

**สิ่งที่ frontend ทำ** — การ์ด "สถานะตัวอย่าง" ใน `SampleDetailPanel`
(`components/samples-view.tsx`) มี dropdown + ปุ่มบันทึกที่เรียก `updateSampleStatus` จริง
(`lib/samples-api.ts` → `PATCH /samples/{id}/status`) dropdown จำกัดตัวเลือกตาม transition ที่ backend
อนุญาตเท่านั้น (mirror ของ `validTransitions` ใน `sample.go` — backend ยัง validate ซ้ำเป็นแหล่งความจริง
เดียวอยู่ดี) transition ที่ไม่ถูกต้องจาก backend (`400`) ขึ้น toast ข้อความที่ backend ส่งกลับมาตรงๆ

---

## ที่ **ไม่ได้** ขอ (บันทึกไว้กันถามซ้ำ)

- **ลบ Vendor** — ตกลงว่าไม่ทำ ทั้งฝั่ง UI และ backend (FK จาก equipment/inventory/PO ทำให้การลบจริง
  ทำประวัติเสีย) ถ้าภายหลังมี vendor เลิกใช้เยอะค่อยคุยเรื่อง "ปิดใช้งาน" แยก
- **permission list ใน `/auth/me`** — frontend ยังไม่ gate ปุ่มตาม role ตาม ADR-0002 ปล่อยให้ backend
  ตอบ 403 แล้วแสดงข้อความ ยังไม่ต้องทำอะไรเพิ่ม
- **แก้ `next_calibration_due` ให้เป็น optional** ใน `PATCH /equipment/{id}/calibration` — frontend
  ส่งค่าจาก schedule ที่ผู้ใช้เลือกให้เองอยู่แล้ว ไม่ติดขัด
