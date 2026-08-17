# Issues พบระหว่างทดสอบ E2E (2026-08-13)

ทดสอบโดยรัน backend จริง (`go run ./cmd/api`, ต่อ Postgres+MinIO instance จริง) คู่กับ frontend (`npm run dev`) หลังต่อสาย wiring เบื้องต้น (login, samples/equipment/inventory/documents/tests/notifications list+create, environment gauges/alerts) แล้วไล่ทดสอบผ่าน browser จริงทีละ module ด้วย role `admin`

**บันทึกตามที่พบเท่านั้น ไม่ได้แก้ไขระหว่างการทดสอบนี้**

## Critical

- [x] **ช่อง input ในทุก modal ฟอร์ม พิมพ์ได้แค่ตัวอักษรตัวแรกตัวเดียว** — **แก้แล้ว (2026-08-13)**: สาเหตุคือ `components/modal.tsx` มี `useEffect` ที่ deps เป็น `[open, onClose]` และเรียก `panelRef.current?.focus()` ทุกครั้งที่ effect รัน เนื่องจาก `onClose` (เช่น `handleClose` ในแต่ละ modal) เป็น function reference ใหม่ทุกครั้งที่ parent re-render (ไม่ได้ห่อด้วย `useCallback`) จึงทำให้ effect รันซ้ำทุก keystroke และแย่ง focus กลับไปที่ตัว dialog panel ทำให้พิมพ์ตัวถัดไปไม่เข้า input — แก้โดยแยก focus-on-open ออกเป็น effect ที่ deps แค่ `[open]` เท่านั้น ไม่ผูกกับ `onClose` อีกต่อไป ทดสอบซ้ำผ่าน browser แล้วพิมพ์ข้อความยาว ("E2E Test Sample After Fix", "Claude Tester", "Fridge-A / R2-99") เข้าครบทุกตัวอักษรในทุกช่อง

## New finding (พบระหว่างตรวจสอบการแก้บั๊กข้างต้น)

- [x] **Sample type ส่งค่าตัวพิมพ์ใหญ่ไม่ตรงกับที่ backend รับ** — **แก้แล้ว (2026-08-13)**: modal "รับตัวอย่างใหม่" ส่ง `type: "Blood"` (ตาม `TYPES` array ใน `add-sample.tsx`) แต่ `internal/domain/sample/sample.go:12-19` กำหนด enum เป็นตัวพิมพ์เล็กเท่านั้น (`blood`, `urine`, `water`, `tissue`, `food`, `serum`) ทำให้ `POST /samples` ตอบ `400 validation failed` เสมอ — แก้โดยแปลง `s.type` เป็นตัวพิมพ์เล็กก่อนส่งใน `addSample` (`components/lims-data-context.tsx`) โดยไม่แตะ UI/label ที่แสดงในฟอร์ม ทดสอบซ้ำผ่าน browser จริงแล้วสร้างตัวอย่างสำเร็จ (`SMP-2569-00003` ปรากฏใน list พร้อม toast "เพิ่มตัวอย่างเรียบร้อย" — มี test data ค้างในระบบจากการทดสอบนี้ 1 รายการ ไม่มี endpoint ลบตัวอย่างในระบบปัจจุบัน)

## Samples

- [x] **toast แสดงข้อความ error ดิบจาก backend เป็นภาษาอังกฤษ (เช่น `validation failed`) ไม่ถูกแปล** — **แก้แล้ว (2026-08-13)**: เพิ่ม `apiErrorMessage()` ใน `lib/api-client.ts` แปล error code มาตรฐานของ backend (`validation_failed`, `not_found`, `conflict`, `unauthorized`, `forbidden`, `internal_error` — ตรงกับ `internal/adapters/http/middleware/error_mapper.go`) เป็นข้อความภาษาไทย แล้วเปลี่ยนทุก modal (add-sample, add-equipment, add-inventory, open-test-order, upload-document) ให้ใช้แทน `err.message` ดิบ, และแก้ `lib/auth-context.tsx` ให้ใช้เช่นกัน (เพิ่ม case พิเศษสำหรับ login ที่ `unauthorized` → "อีเมลหรือรหัสผ่านไม่ถูกต้อง" แทนข้อความทั่วไปที่ไม่เข้ากับบริบท login) ทดสอบซ้ำผ่าน browser ด้วยการ login รหัสผ่านผิด เห็นข้อความ "อีเมลหรือรหัสผ่านไม่ถูกต้อง" ถูกต้อง

## Documents

- [x] **คอลัมน์ access level แสดงค่าดิบจาก backend เช่น `internal` แทนป้ายภาษาไทย** — **แก้แล้ว (2026-08-13)**: สาเหตุคือ `access_level` เป็น free-form string ที่ backend ไม่ validate/บังคับ enum ใดๆ (`internal/domain/document/document.go:31`) ค่า `"internal"` มาจาก `cmd/seed/main.go:250` ที่ hardcode ไว้ตอน seed ข้อมูลตัวอย่าง ส่วนเอกสารที่อัปโหลดผ่านหน้าเว็บเองส่งค่าภาษาไทยอยู่แล้ว (`ACCESS` array ใน `upload-document.tsx`) — แก้โดยเพิ่ม `ACCESS_LEVEL_LABEL` mapping ใน `lib/backend-mappers.ts` แปลงค่าที่รู้จัก (internal/public/general/restricted/confidential/executive) เป็นป้ายไทย และคงค่าดิบไว้เฉยๆถ้าไม่รู้จัก (ไม่กระทบเอกสารที่ส่งเป็นไทยอยู่แล้ว) ทดสอบซ้ำผ่าน browser แล้วเห็นป้าย "ทั่วไป" แทน "internal" ถูกต้อง

## Environment

- [x] **การ์ดวัด gauge แต่ละตัวไม่มีกราฟ sparkline แสดง** — **แก้แล้ว (2026-08-13)**: `GET /environment/gauges` ไม่คืนค่าย้อนหลัง (trend) มาด้วยโดยดีไซน์ ต้องเรียก `GET /environment/gauges/:loc/trend?limit=` แยกต่างหากต่อ location — แก้โดยเพิ่ม `useEnvironmentData()` ใน `components/modules/environment.tsx` ให้ยิง trend request เพิ่มให้ทุก gauge หลังโหลด list หลักสำเร็จ (ต้อง `encodeURIComponent(location)` เพราะ backend match location แบบ exact string และมีอักขระพิเศษ/วงเล็บได้), backend คืนค่าเรียงจากใหม่ไปเก่า (`ORDER BY recorded_at DESC`) จึงเพิ่ม `mapTrend()` ใน `lib/backend-mappers.ts` กลับลำดับให้เป็นเก่า→ใหม่ตามที่ `Sparkline` คาดหวัง — ทดสอบผ่าน browser จริงโดยเพิ่ม reading จริงผ่าน `POST /environment/readings` (ของเดิม seed มาแค่ 1 reading/gauge ไม่พอวาดเส้น) แล้วเห็นเส้นกราฟแสดงถูกต้อง (gauge ที่มีแค่ 1 reading ยังไม่มีเส้นให้เห็นตามธรรมชาติของ sparkline ไม่ใช่บั๊ก)

## Known gaps ที่ตั้งใจไม่ wire ในรอบนี้ (ไม่ใช่บั๊ก แต่บันทึกไว้กันสับสนตอนทดสอบรอบถัดไป)

- [x] **Dashboard: ตัวเลข KPI** — **แก้แล้ว (2026-08-13)**: 4 การ์ด KPI บนแดชบอร์ด รวมถึงตัวเลข `stat` บน 6 module card ด้านล่าง เปลี่ยนจาก hardcode มาคำนวณจากข้อมูลจริงใน `useLims()` (samples/equipment/inventory/documents/tests) บวกกับ fetch `/environment/alerts` เพิ่มในหน้านี้ (`components/modules/dashboard.tsx`) — ทดสอบผ่าน browser จริงเห็นตัวเลขตรงกับข้อมูลใน DB (เช่น 3 ตัวอย่างที่ใช้งาน, 1 เครื่องมือรอสอบเทียบ, 0 การแจ้งเตือน, 0 ผลทดสอบรออนุมัติ) ส่วนกราฟภาระงานรายวัน ("ปริมาณงานทดสอบรายวัน") และ activity feed ("ความเคลื่อนไหวล่าสุด") ยังคงเป็น mock ตามเดิม เนื่องจากไม่มี backend endpoint รองรับ (ไม่มี audit/activity-feed endpoint สำหรับอ่านย้อนหลังแบบ real-time)
- [x] **Inventory: การ์ด "คำสั่งซื้ออัตโนมัติ" และ donut chart "สัดส่วนตามหมวดหมู่"** — **แก้แล้ว (2026-08-13)**: เพิ่ม `PurchaseOrderDTO`/`mapPurchaseOrder` ใน `lib/backend-mappers.ts` และ `usePurchaseOrders()` hook ใน `components/modules/inventory.tsx` ดึงจาก `GET /purchase-orders` จริง (DTO ไม่มีชื่อ/หมวดสินค้า ต้อง join กับ `inventory` list ที่โหลดอยู่แล้วผ่าน `item_id`) การ์ดกรองเฉพาะ PO สถานะ `pending_approval`/`sent_to_vendor` ส่วน donut คำนวณสัดส่วนหมวดหมู่จากรายการ inventory จริงแบบ client-side — ทดสอบผ่าน browser จริงเห็น PO-2569-0001 (เอทานอล 95% · 95 ลิตร · รออนุมัติ) และ donut แสดงสัดส่วน 50/50 ตรงกับข้อมูล seed จริง (2 รายการ inventory)
- [x] **Documents: panel "ประวัติการแก้ไข"** — **แก้แล้ว (2026-08-13)**: เพิ่ม `DocHistoryDTO`/`mapDocHistory` และ `useDocHistory(docId)` hook ใน `components/modules/documents.tsx` ดึงจาก `GET /documents/:id/history` จริง พร้อมเพิ่ม selection state ให้คลิกแถวเอกสารในตาราง "คลังเอกสาร" แล้ว panel ประวัติอัปเดตตามเอกสารที่เลือก (เดิม panel เป็น mock คงที่ไม่ผูกกับแถวที่เลือกเลย) — ทดสอบผ่าน browser จริงคลิกสลับระหว่าง 2 เอกสาร เห็น header และประวัติเปลี่ยนตามจริง
- [x] **Samples: panel "Chain of Custody"** — **แก้แล้ว (2026-08-13)**: เพิ่ม `CoCStepDTO`/`mapCoCStep` และ `useCoC(sampleId)` hook ใน `components/modules/samples.tsx` ดึงจาก `GET /samples/:id/coc` จริง พร้อมเพิ่ม selection state ให้คลิกแถวตัวอย่างในตาราง "ทะเบียนตัวอย่าง" แล้ว panel อัปเดตตามตัวอย่างที่เลือก — ทดสอบผ่าน browser จริงคลิกสลับระหว่างตัวอย่าง เห็น header (SMP-2569-...) และ timeline เปลี่ยนตามจริง
- [ ] AI Chat module ทั้งหมดยังเป็น scripted mock ตามเดิม (ไม่มี backend endpoint รองรับเลย ต้องสร้าง AI/LLM integration ใหม่ทั้งหมด — เป็นงานแยกต่างหาก ไม่ทำในรอบนี้)
- [x] **ไม่มีปุ่ม logout ในหน้า UI เลย** — **แก้แล้ว (2026-08-13)**: `logout()` ใน `lib/auth-context.tsx` มี logic ครบอยู่แล้ว (เรียก `POST /auth/logout` + ล้าง token) แต่ไม่เคยถูกเรียกจาก component ไหนเลย — เพิ่มปุ่ม logout (ไอคอนใหม่ `Icons.Logout`) ที่ footer ของ sidebar (`components/sidebar.tsx`) พร้อมเปลี่ยนชื่อ/ตำแหน่งผู้ใช้จาก hardcode ("ธเนศ สุขใจ" / "Lab Manager") เป็นข้อมูลจริงจาก `useAuth().user` — ทดสอบผ่าน browser จริง กด logout แล้ว redirect กลับหน้า login ถูกต้อง
- [ ] ฟอร์ม "เพิ่มเครื่องมือ" ตัด slider "เปอร์เซ็นต์อายุการสอบเทียบคงเหลือ" ออก (backend คำนวณเองจากวันที่สอบเทียบ ไม่รับค่าจาก client) และไม่มีช่องกรอก `type_code` (ระบบสร้างให้อัตโนมัติจากชื่อเครื่องมือ) — เป็นการลดฟอร์มให้ตรงกับสิ่งที่ API รองรับจริง ยืนยันแล้วว่าถูกต้องตามที่ backend รองรับจริง ไม่ใช่ gap

## ยืนยันว่าทำงานถูกต้อง (ไม่ใช่ปัญหา)

- Login/JWT flow, real data โหลดถูกต้องครบทุก module ที่ wire ไว้ (samples, equipment, inventory, documents, tests, notifications, environment gauges/alerts) ตรงกับข้อมูลที่ seed ไว้จริงใน Postgres
- Mark-notification-read / mark-all-read ยิง PATCH จริงและอัปเดต UI ถูกต้อง (ยืนยันผ่าน network log: `PATCH /notifications/read-all` → 200)
- ไม่มี CORS error, ไม่มี console error ตลอดการทดสอบทุกหน้า
- Backend ปฏิเสธ request ที่ validation ไม่ผ่านอย่างถูกต้อง ไม่มีข้อมูลขยะหลุดเข้า DB
