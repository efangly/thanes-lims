# ข้อมูลย้อนหลัง Partner Device: route แยก + server-side pagination

Backend เพิ่ม `GET /partner-devices/:serial/history?range=1d|7d|30d` (bucket aggregate สำหรับกราฟ)
และ `GET /partner-devices/:serial/telemetry?range&page&limit` (raw readings แบบแบ่งหน้า) ข้อมูลอ่านสดจาก
SMtrack ทุกครั้ง ไม่ persist ในระบบ (backend ADR 0011/0012) และใช้ rate limit 60 req/min ร่วมกัน

ตัดสินใจ:
- หน้าแยก **`/environment/[serial]`** (ตาม ADR-0007) แทน modal เพราะมีทั้งกราฟและตารางแบ่งหน้า
  ลิงก์ "ย้อนหลัง" จากการ์ดในหน้า `/environment`
- ตารางใช้ **server-side pagination** (`page`/`limit` ส่งไป backend) ต่างจาก ADR-0011 ที่ slice array
  ฝั่ง client เพราะ telemetry มีหลายพันแถวและ backend แบ่งหน้าให้แล้ว ใช้ `Pagination` (presentational)
  กับ `useState` page ไม่ผูก URL; เปลี่ยน range แล้วรีเซ็ตเป็นหน้า 1
- กราฟใช้ `HistoryChart` (Recharts, ดู ADR-0018) แยก series ตาม `probe`
  แสดงเส้น avg + แถบ min–max แกน x ตามเวลาจริง
- fetch เมื่อเปลี่ยน range/หน้าเท่านั้น ไม่ poll (backend cache 60 วินาที)
- 404 (feature flag ปิด) และ 429 แสดงข้อความเฉพาะ; หน้าจำกัดสิทธิ์ admin ตาม ADR-0014
