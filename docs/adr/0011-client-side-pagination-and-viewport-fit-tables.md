# ตารางทั้งหมดใช้ client-side pagination + layout พอดีจอ (ไม่มี page scroll)

ทุกหน้าที่มีตาราง (`/samples`, `/equipment`, `/tests`, `/inventory`, `/vendors`,
`/equipment/calibration-results`) รวมถึงคลังเอกสารแบบรายการ (`/documents`) เดิมแสดงทุกแถว
รวดเดียวแล้วให้ทั้งหน้าจอเลื่อนลงไป เปลี่ยนเป็น:

- **Pagination ฝั่ง client** — `usePagination` (`components/ui.tsx`) รับ array ที่โหลดมาเต็มแล้ว
  `slice` ทีละ `PAGE_SIZE = 12` แถว หมายเลขหน้าเก็บใน URL query param (`?page=` เมื่อมีตารางเดียว
  ต่อหน้า) แบบเดียวกับ ADR-0005 — reload / แชร์ลิงก์ / ปุ่ม back-forward อยู่หน้าเดิม
  เปลี่ยนตัวกรองแล้วรีเซ็ตกลับหน้า 1 และ `page` ถูก clamp ไม่ให้เกินจำนวนหน้าที่เหลือ
- **Layout พอดีจอ** — บนจอ `lg+` (หน้าตารางเดี่ยวใช้ `md+`) หน้าเป็น `flex` คอลัมน์สูงเต็ม
  พื้นที่: `PageHead` + แถว KPI อยู่นิ่งด้านบน, ตัวตารางเป็น `flex-1 min-h-0 overflow-auto`
  (เลื่อนเฉพาะในตารางถ้าจอเตี้ย), แถบ `<Pagination>` ตรึงอยู่ท้าย `Card` เสมอ
  panel ด้านข้าง (Chain of Custody, ประวัติเอกสาร ฯลฯ) เลื่อนอิสระของตัวเอง
  ต่ำกว่า breakpoint = พฤติกรรมเดิมทุกอย่าง (ทั้งหน้าเลื่อน + ตารางเลื่อนแนวนอน) มีแค่ปุ่ม pagination เพิ่ม

## Considered Options

- **Server-side pagination (`page`/`limit`)** — ปฏิเสธในเฟสนี้: backend (Go/Fiber, repo `../backend`)
  รองรับ `page`/`limit` แค่ `GET /audit/logs` เท่านั้น ทุก endpoint ที่เกี่ยวข้อง (samples, inventory,
  vendors, equipment, documents, calibration-results) คืน list เต็มไม่มี `meta` การทำ server-side
  ต้องแก้ handler + repo + migration ทุกตัว กับ dataset ปัจจุบันหลักร้อยแถวยังไม่คุ้ม —
  เก็บไว้เป็น follow-up เมื่อข้อมูลโตถึงหลักพัน (`Envelope.meta` ใน `lib/api-client.ts` มีที่รออยู่แล้ว)
- **จำนวนแถวต่อหน้าแบบ dynamic (วัดความสูง viewport)** — ปฏิเสธ: janky ตอน resize และ
  ทำให้ deep link `?page=` ไม่นิ่ง ใช้ค่าคงที่ 12 + ตารางเลื่อนในตัวเองบนจอเตี้ยแทน
- **บังคับ viewport-fit ทุกหน้ารวมทั้ง shell** — ปฏิเสธ: หน้าอย่าง `/environment`, ฟอร์มยาว,
  `equipment/[id]` มีเนื้อหายาวโดยธรรมชาติ แก้ `app/(app)/layout.tsx` ให้ `overflow-hidden`
  จะซ่อนเนื้อหาส่วนล่าง จึงให้เฉพาะหน้าตารางจัดการความสูงตัวเอง shell คงเดิม
- **สร้าง `<DataTable>` รวม markup `<table>` ที่ copy-paste เหมือนกัน 6 หน้า** — เลื่อนออกไป
  ก่อน: เฟสนี้เพิ่มแค่ `<Pagination>` + `usePagination` เพื่อลดความเสี่ยง regression

## Consequences

- ทุกแถวยังถูกโหลดมาที่ client (ผ่าน `useLims()` context หรือ search endpoint) — pagination
  ช่วยเรื่องการ render/สายตา ไม่ได้ลด payload เครือข่าย
- `/equipment` ยังเลื่อนหน้าได้ตามปกติ (ไม่ได้ล็อกความสูง) เพราะมีการ์ดแจ้งเตือน/เอกสารต่อ
  ท้ายตาราง — ได้แค่ pagination บนตาราง ถ้าต้องการ viewport-fit ต้องย้ายการ์ดสองใบนั้นก่อน
- หน้า `/tests`, `/inventory`, `/vendors`, `/documents` เพิ่มการใช้ `useSearchParams` จึงต้องห่อ
  ด้วย `<Suspense>` (แยก `XPageInner`) ตามแพตเทิร์นเดียวกับ `/samples`
- ระหว่าง `md`–`lg` หน้าที่มี panel ข้าง (`lg:grid-cols-[1.3fr_1fr]`) ยัง scroll ปกติ —
  viewport-fit เริ่มที่ `lg` เพราะต่ำกว่านั้น layout เป็นคอลัมน์เดียวซ้อนกัน
