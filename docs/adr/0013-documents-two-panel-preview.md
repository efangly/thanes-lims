# `/documents` เป็น 2-panel + inline preview (ไม่ใช่ 3-panel แบบ ADR-0010)

> เลข 0012 เว้นไว้ให้ ADR ของ branch `redesign/lab-instrument-ui` ที่ยังไม่ merge

หน้า `/documents` เดิมเป็น 2 panel: รายการเอกสาร (Panel ซ้าย) กับ ประวัติการแก้ไข (Panel ขวา)
เพิ่มการ **Preview** ไฟล์เอกสารในหน้าจอ โดยเลือกโครง **2 panel** ต่อไป ไม่ทำเป็น 3 panel
แบบ `/locations` (ADR-0010): Panel ซ้ายรวม table เอกสาร + timeline ประวัติการแก้ไขต่อท้ายด้านล่าง,
Panel ขวาเป็น header metadata + preview ไฟล์เต็มพื้นที่. Preview คือ presigned URL ของ
object storage (`GET /documents/:id/download`) ฝังใน `<iframe>` ตรง ๆ รองรับเฉพาะชนิดที่เบราว์เซอร์
เรนเดอร์เองได้ (pdf, รูป, ข้อความ) ชนิดอื่น degrade เป็นปุ่มดาวน์โหลด. เอกสารที่เลือกเก็บใน
`?doc=<id>` บน route เดียว (แบบ ADR-0005/0010). panel ปรับกว้าง/หุบได้ จำใน `localStorage`
(`lims.documents.panels`) ผ่าน `ResizablePanels` + `usePanelLayout` ที่ทำ `KEY` ให้ parametrize ได้.

## Considered Options

- **3-panel เหมือน `/locations`** (`รายการ | preview | ประวัติ`) — ปฏิเสธ: ประวัติการแก้ไขเป็น
  read-only timeline สั้น ๆ ไม่คุ้มกับคอลัมน์เต็ม ต่างจาก Panel 3 ของ locations ที่เป็น sample
  detail แบบ interactive (ฟอร์ม put-away, drag ฯลฯ). ยัด 3 คอลัมน์ในความกว้าง `lg` เดียวกับ
  KPI row ที่มีอยู่ทำให้ preview แคบเกินใช้งาน
- **Preview เป็น modal เปิดจากรายการ** — ปฏิเสธ: เทียบรายการกับไฟล์พร้อมกันไม่ได้ และขัดกับ
  โจทย์ "แสดงข้อมูลไว้ panel ที่ 2"
- **คง ประวัติ ไว้ Panel ขวา แล้วเบียด preview เป็น Panel 3** — ปฏิเสธ: preview ต้องการพื้นที่
  มากสุด การให้มันเป็นคอลัมน์ท้ายสุดที่แคบที่สุดคือผิดลำดับความสำคัญ
- **เพิ่ม `content_type` ใน DTO** เพื่อให้ frontend เลือก viewer — ปฏิเสธในเฟสนี้: `content_type`
  ไม่ได้ถูก persist (ส่งเข้า `storage.Upload()` แต่ไม่ลง `documents` table) ต้องมี migration +
  แก้ domain/model/repo/usecases. ใช้ `filename` (จาก `path.Base(storage_key)` ที่มีอยู่แล้ว)
  เดานามสกุลแทน — presigned GET ยัง serve `Content-Type` ที่ถูกต้องให้ iframe อยู่ดี

## Consequences

- Backend เพิ่ม field เดียว: `filename` ใน `DocumentResponse` = `path.Base(d.StorageKey)`
  ไม่แตะ schema. `GET /documents/:id/download` (มีอยู่แล้ว คืน `{ url }`) ถูกต่อจากฝั่ง
  frontend เป็นครั้งแรก
- `usePanelLayout` (เดิม hardcode `KEY = "lims.locations.panels"`) รับ `key` เป็น argument
  — `/locations` ส่งค่าเดิม, `/documents` ส่ง `lims.documents.panels`
- `ResizablePanels` ใช้ได้กับ n panel อยู่แล้ว — documents ส่ง 2 panel, splitter เดียว
- whitelist ชนิดที่พรีวิวได้อิงนามสกุลจาก `filename` (`pdf png jpg jpeg gif webp svg txt md csv`,
  case-insensitive) — ไฟล์ไม่มีนามสกุลหรือนอก whitelist เข้า fallback ดาวน์โหลด
- presigned URL อายุ 15 นาที — ขอใหม่ทุกครั้งที่เปลี่ยนเอกสารหรือกด "ลองใหม่" ไม่ cache ข้ามการเลือก
- **iframe ของ Preview ชี้ `blob:` URL ไม่ใช่ presigned URL ตรง ๆ** — Chrome strip cross-origin
  PDF frame ทิ้ง จึง `fetch` bytes มาห่อเป็น blob (แพตเทิร์นเดียวกับ sticker PDF ใน
  `lib/samples-api.ts`) แล้ว `URL.revokeObjectURL` ตอน cleanup. ปุ่มดาวน์โหลด/เปิดแท็บใหม่
  ยังใช้ presigned URL ตรง ๆ
- iframe src ต่อท้าย `#navpanes=0` — Chrome PDF viewer เปิดมาโดยพับ thumbnail/bookmark
  side pane ไว้ (ผู้ใช้กดเปิดเองได้จาก toolbar). image/text viewer ไม่สนใจ fragment นี้
- viewport-fit: หน้า `/documents` เป็น `lg:flex lg:h-full lg:flex-col lg:overflow-hidden`,
  panel area = `lg:flex-1`; `ResizablePanels` desktop ได้ `h-full min-h-0` + column เป็น
  `flex-col` หุ้ม content ด้วย `flex-1 min-h-0` → preview เต็มความสูงที่เหลือ ไม่มี page scroll
- `< lg`: Seg 2 อัน (`รายการ / พรีวิว`), เลือกแถวแล้ว auto-advance ไปพรีวิว (แบบ ADR-0010)
- ประวัติการแก้ไขย้ายจาก Panel ขวาไปเป็น section ใต้ table ใน Panel ซ้าย — panel ซ้ายทั้งอัน
  เป็น `overflow-y-auto` ตัวเดียว (table สูงเกือบคงที่อยู่แล้วจาก client pagination, ADR-0011)
