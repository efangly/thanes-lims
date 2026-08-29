# `/locations` เป็น 3-panel browser พร้อม lazy tree และ drag-and-drop

หน้า `/locations` เดิมไล่ดูทีละระดับในคอลัมน์เดียว (route `/locations/[id]` ต่อระดับ) เปลี่ยนเป็น route
เดียวที่เก็บโหนดที่เลือกใน `?node=<id>` และเปลี่ยนเป็น
3 panel แบบ eLabNext: tree ที่ lazy-expand และค้างอยู่ (Panel 1), เนื้อหาของโหนดที่เลือก / `BoxGrid`
พร้อมฟอร์มจัดการ (Panel 2), และรายละเอียด sample หรือสรุปโหนด (Panel 3) — แต่ละ panel ปรับความกว้าง
และหุบได้ จำค่าใน `localStorage` (`lims.locations.panels`). โครงนี้ใช้ร่วมทั้งสอง Location Kind
(ADR-0008); Panel 3 ต่างกันตาม Kind — ฝั่ง `sample_storage` โชว์ sample, ฝั่ง `equipment_storage`
โชว์รายการ Equipment/Inventory ที่ผูกกับโหนดนั้น. `BoxGrid` โหมด `manage` เปลี่ยนจาก click-to-move
เป็น drag-and-drop จริง (`@dnd-kit/core`) พร้อม multi-select ลากกลุ่มเป็น batch atomic เดียว
(`moveWithinBox`).

## Considered Options

- **คงการไล่ทีละระดับ แค่จัดใหม่เป็นคอลัมน์** — ปฏิเสธ เพราะจุดค่าของ layout นี้คือ tree ที่เห็นบริบท
  ค้างตลอด ไม่งั้นก็แค่ทาสีใหม่
- **แยก view สำหรับ `equipment_storage`** — ปฏิเสธ ขัด ADR-0008; โครง panel ใช้ร่วมได้ ต่างแค่เนื้อหา Panel 3
- **Native HTML5 DnD / pointer-events custom** — ปฏิเสธ multi-select + grid + keyboard a11y ด้วยมือ
  คือหลุมพราง คุ้มกับการเพิ่ม dependency เดียว
- **เพิ่ม backend endpoint "ancestors of id"** — นอกขอบเขตงาน frontend; ใช้ synthetic path ต่อไป
- **คงโหนดที่เลือกไว้ที่ route `/locations/[id]`** — ปฏิเสธ: สลับจาก `/locations` ไป `/locations/[id]`
  เป็นคนละ route segment ทำให้ `LocationsView` remount และ state ของ tree (โหนดที่กางไว้) หาย
  จึงย้ายไป `?node=<id>` บน route เดียว แบบเดียวกับ ADR-0005 ของหน้า samples; `/locations/[id]`
  เดิม redirect ไป `/locations?node=<id>`

## Consequences

- เพิ่ม dependency `@dnd-kit/core` — dependency แรกของโปรเจกต์นอก React/Next
- โหนดที่เลือกอยู่ใน `?node=<id>` บน route เดียว (`app/(app)/locations/page.tsx`); `use-location-tree`
  ถือ children-map + สถานะกาง/หุบ; การ resolve โหนดจาก id ยังพึ่ง synthetic path จาก `getFullPath`
  เพราะ backend ไม่มี endpoint "ancestors of id" — tree แม่นเต็มที่เฉพาะตอน navigate ใน session;
  deep link / hard refresh โชว์ root หุบไว้ + แถบ path สังเคราะห์เหนือ Panel 2
- Panel 3 ฝั่ง `equipment_storage` filter จาก context ฝั่ง client (`useLims()`) เพราะไม่มี
  `GET /equipment?location_id=` / `GET /inventory?location_id=`
- DnD + multi-select อยู่เฉพาะ `BoxGrid` โหมด `manage` (หน้า Locations); โหมด `pick`
  (put-away / assign modal) ยังคลิกเลือกช่องว่างเหมือนเดิม
- คลิก Cell ที่มี sample ในโหมด `manage` เปลี่ยนความหมายจาก "เริ่มย้าย" เป็น "เปิด Panel 3";
  การย้ายทำผ่าน drag เท่านั้น การสลับสองช่องเป็นการ drag ทับช่องที่มีคนอยู่
- Responsive < `lg`: โชว์ทีละ panel + segmented switcher (Tree / เนื้อหา / รายละเอียด), เลือกโหนด
  แล้ว auto-advance
