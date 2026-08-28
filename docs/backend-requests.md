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

## ที่ **ไม่ได้** ขอ (บันทึกไว้กันถามซ้ำ)

- **ลบ Vendor** — ตกลงว่าไม่ทำ ทั้งฝั่ง UI และ backend (FK จาก equipment/inventory/PO ทำให้การลบจริง
  ทำประวัติเสีย) ถ้าภายหลังมี vendor เลิกใช้เยอะค่อยคุยเรื่อง "ปิดใช้งาน" แยก
- **permission list ใน `/auth/me`** — frontend ยังไม่ gate ปุ่มตาม role ตาม ADR-0002 ปล่อยให้ backend
  ตอบ 403 แล้วแสดงข้อความ ยังไม่ต้องทำอะไรเพิ่ม
- **แก้ `next_calibration_due` ให้เป็น optional** ใน `PATCH /equipment/{id}/calibration` — frontend
  ส่งค่าจาก schedule ที่ผู้ใช้เลือกให้เองอยู่แล้ว ไม่ติดขัด
