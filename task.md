# Thanes LIMS Frontend — งาน UI ตาม requirement ใหม่ (grill เสร็จ 2026-08-28)

Requirement ต้นทาง: [`docs/Comment_LIMS_Rev01_26082569.md`](./docs/Comment_LIMS_Rev01_26082569.md)
Backend ทำครบทั้ง 9 phase แล้ว (`../backend/task.md`) — งานที่เหลือคือฝั่ง UI ล้วน ๆ

ทุก decision ผ่าน grilling session แล้ว: คำศัพท์อยู่ใน [`CONTEXT.md`](./CONTEXT.md) (หัวข้อ Sample Identity,
Storage Location (two trees), Equipment, Inventory) และจุดที่กลับตัวยาก/ผิดจาก convention เดิมอยู่ใน
[ADR-0006](./docs/adr/0006-calibration-schedules-drive-equipment-status.md)
[ADR-0007](./docs/adr/0007-equipment-detail-is-a-full-route.md)
[ADR-0008](./docs/adr/0008-one-location-browser-for-both-trees.md)

มีงานฝาก backend 2 ชิ้นที่บล็อก phase 6 กับ 8 — [`docs/backend-requests.md`](./docs/backend-requests.md)

แบ่ง 8 phase เรียงตาม dependency ทำแยก session ได้ เริ่มจาก checkbox แรกที่ยังไม่ติ๊กเสมอ

---

- [x] **Phase 1 — Foundation ที่ทุก phase ใช้ร่วม** _(เสร็จ 2026-08-28)_
  - `<ScanInput>` component เดียวใช้ซ้ำทุกจุดที่สแกน: text input ธรรมดา (รองรับเครื่องสแกน USB/BT
    wedge ที่ยิง keystroke + Enter และพิมพ์มือได้เมื่อบาร์โค้ดเสียหาย) — ยิง resolve เมื่อกด **Enter
    เท่านั้น** ไม่ debounce ตามการพิมพ์ (scanner พิมพ์เข้ามาทีละตัวจะกลายเป็นการยิง API รัว), หาไม่เจอ
    → toast แดง + `select()` ข้อความเดิมไว้ (สแกนซ้ำทับได้ทันที คนพิมพ์มือเห็นว่าพิมพ์อะไรผิด) ไม่เคลียร์
    ช่อง, มี prop `autoRefocus` สำหรับโหมดสแกนต่อเนื่อง (หน้ารับของ/ทะเบียนตัวอย่าง — คนถือ scanner
    มือเดียวไม่ได้จับเมาส์). กล้อง (`BarcodeDetector`) ยังไม่ทำ — ออกแบบ props ให้เพิ่มเป็น adapter ตัวที่
    สองของ component เดิมได้ทีหลัง
  - `<VendorSelect>` — dropdown จาก `GET /vendors` + ตัวเลือกท้ายรายการ "+ เพิ่มผู้ขายใหม่" ที่เปิด
    modal ซ้อน บันทึกเข้า master จริงแล้วเลือกให้อัตโนมัติ (ห้ามเก็บเป็น copy ในฟอร์ม), ใต้ dropdown แสดง
    contact ของ vendor ที่เลือก **อ่านอย่างเดียว** — "Vendor Contact Detail" ใน requirement ไม่ใช่ช่อง
    กรอกซ้ำ
  - Location รองรับ Kind ตาม ADR-0008: `LEVEL_LABEL` / ลำดับ level / level ที่ลึกสุด ย้ายเป็น config
    ต่อ kind (`sample_storage` = cabinet→shelf→slot→sub_slot, `equipment_storage` =
    building→room→zone→cabinet→shelf), `use-location-browser` + `locations-view` + `location-picker`
    รับ `kind` เป็น prop (ห้ามพึ่ง default ของ backend), ลบ hard-code `sub_slot` ที่
    `components/locations-view.tsx:109`
  - ข้อความ error 403 ให้ชัดว่า "ไม่มีสิทธิ์ทำรายการนี้" (`apiErrorMessage` มี case `forbidden` แล้ว) —
    ยังไม่ gate ปุ่มตาม role ตาม ADR-0002
  - **ที่ทำจริง**: `components/scan-input.tsx`, `components/vendor-select.tsx` + `lib/vendors-api.ts`,
    `lib/location-kinds.ts` (config ต่อ kind) — `lib/data.ts` (`LocationKind`, `LevelType` รวมสองต้นไม้,
    `Location.kind`/`barcodeCode`), `lib/locations-api.ts` (`listLocations(parentId, kind)`,
    `createCabinet`→`createRoot(name, kind)`, `lookupLocationByBarcode`), `use-location-browser(routeId, kind)`
    (reset path เมื่อสลับต้นไม้), `location-picker`/`locations-view` รับ `kind` + ซ่อน occupancy/ผูก sample
    เมื่อไม่ใช่ `sample_storage`, `components/modal.tsx` ให้ Escape ปิดเฉพาะ modal บนสุด (ไม่งั้น quick-add
    ผู้ขายจะปิด modal แม่พร้อมฟอร์มที่กรอกค้างไปด้วย). `apiErrorMessage` มีข้อความ `forbidden` ถูกต้องอยู่แล้ว
    ไม่ต้องแก้

- [x] **Phase 7′ (ดันขึ้นมาทำก่อน — แก้ของที่พังอยู่) — ฟอร์มรายการคลัง** _(เสร็จ 2026-08-28)_
  - **Regression**: `components/modals/add-inventory.tsx:50` ยังส่ง `qty` ตอน create แต่ backend
    phase 8 ตัด field `quantity` ออกจาก create-item แล้ว (สต็อกเข้าได้ทางเดียวคือ lot)
  - modal เดียวโหมดคู่ create/edit (field ชุดเดียวกัน ต่างแค่ `POST /inventory` vs `PATCH /inventory/{id}`)
    — เพิ่ม ผู้ดูแล (dropdown user, **บังคับ**), Manufacturer (free text — ไม่ใช่ vendor),
    `<VendorSelect>`, Location picker (kind = `equipment_storage`) และ**ตัดช่องจำนวนคงเหลือออก**
  - บันทึกเสร็จ → ถามต่อ "รับของเข้าคลังเลยไหม?" ลิงก์ไป `/inventory/receive?item=<id>` (อย่ายิง
    create + receive ต่อกันเอง — 2 request ที่ไม่ atomic ถ้าอันที่สองล้มจะได้ item ที่ผู้ใช้เชื่อว่ามีของ)
  - **ที่ทำจริง**: `InventoryItem` +`custodianUserId/manufacturer/vendorId/locationId/earliestExpireDate/lotCount`,
    `mapInventory` map ครบ. `lib/inventory-api.ts` เพิ่ม `createItem`/`updateItem` (ไม่มี `quantity`,
    `custodian_user_id` บังคับ, `vendor_id`/`location_id`="" = clear) + `receiveStock`. `lims-data-context`
    `addInventoryItem(ItemInput)→Item`, `patchInventoryItem`, `applyReceivedItem`, `ModalContext.inventoryItemId`.
    `add-inventory.tsx` เขียนใหม่เป็น dual create/edit — ตัดช่องจำนวน, เพิ่ม ผู้ดูแล (dropdown บังคับ) /
    Manufacturer / `<VendorSelect>` / `<LocationField equipment_storage>`, หลัง create โชว์ปุ่มไป
    `/inventory/receive?item=`. หน้า inventory เพิ่มปุ่มแถว "แก้ไข" / "รับของเข้า"

- [x] **Phase 2 — Vendor + ข้อมูลหลัก + ต้นไม้ตำแหน่งต้นที่สอง** _(เสร็จ 2026-08-28)_
  - sidebar เพิ่มกลุ่ม "ข้อมูลหลัก" (ไม่แตะเลขโมดูล 01-06 ที่อ้างอิง requirement) ย้าย/รวม "ตำแหน่งจัดเก็บ"
    เข้ากลุ่มนี้ + เพิ่ม "ผู้ขาย (Vendor)"
  - หน้า Vendor: list + เพิ่ม + แก้ไข **ไม่มีปุ่มลบ** (backend ตั้งใจไม่มี delete — vendor ถูกอ้างด้วย FK
    จาก equipment/inventory/PO)
  - `/locations` เพิ่ม tab สลับต้นไม้ "ตำแหน่งตัวอย่าง / ตำแหน่งเครื่องมือ&คลัง" ใช้ view เดียวกันตาม ADR-0008
  - **ที่ทำจริง**: `app/(app)/vendors/page.tsx` (list + ค้นหา + modal เพิ่ม/แก้ไขตัวเดียวโหมดคู่ ไม่มีลบ),
    sidebar กลุ่ม "ข้อมูลหลัก" (`locations` ย้ายออกจากกลุ่มโมดูล เลข 01-06 ไม่ขยับ) + `ModuleId`/`MODULE_META`
    เพิ่ม `vendors`. Kind ของหน้าตำแหน่งอยู่ใน **`?kind=`** ไม่ใช่ state — เพราะ drill-down เด้งไป
    `/locations/[id]` ถ้า kind ไม่อยู่ใน URL การ refresh/ส่งลิงก์ node ของต้นไม้เครื่องมือจะกลับมาเป็นต้นไม้
    ตัวอย่าง (ทั้งสอง route ห่อ `<Suspense>` ตาม `useSearchParams`), สลับ tab เด้งกลับ root เสมอ,
    `LocationBreadcrumb` รับ `rootCrumbLabel` (ตู้ทั้งหมด / อาคารทั้งหมด)

- [x] **Phase 3 — ทะเบียนตัวอย่าง: filter + barcode + สติ๊กเกอร์** (requirement 1.1, 1.2) _(เสร็จ 2026-08-28)_
  - filter bar: `<ScanInput>` (→ `GET /samples?barcode_id=` exact) + ช่องค้นหา**ชื่อตู้/ตำแหน่งจัดเก็บ**
    (→ `?location=` ILIKE ชื่อ leaf — ยืนยันแล้วว่า "ค้นหาชื่อเครื่อง" ในเอกสารหมายถึงชื่อตู้ใน location
    ไม่ใช่เครื่องมือทดสอบ) + dropdown ผู้ดูแล (→ `?custodian_user_id=`)
  - modal "รับตัวอย่างใหม่" เป็น 2 ขั้น: ขั้น 1 กรอกข้อมูล (เพิ่ม **Description** + ผู้ดูแลเป็น dropdown ซึ่ง
    ทำแล้ว) → บันทึก → ขั้น 2 "บาร์โค้ด & สติ๊กเกอร์": กรอก Barcode ID เอง หรือกด Gen
    (`POST /samples/{id}/barcode` — idempotent) แล้วสั่งพิมพ์ **ห้าม gen เลขเองฝั่ง frontend** (คนละ
    sequence กับ `SMP-BC-{seq5}` และซ้ำได้)
  - พิมพ์สติ๊กเกอร์: เลือก template (cap 9.5×6.4 / stem 20.5×6.5 / small 40×20 / medium 60×30mm) +
    symbology (code128 / qr) — default = ค่าที่ใช้ล่าสุดจาก localStorage — แล้วเปิด PDF จาก
    `GET /samples/{id}/sticker?template=&symbology=` **ในแท็บใหม่ให้ผู้ใช้กด print เอง** (ห้าม
    `window.print()` อัตโนมัติ — dialog จะไม่ได้ตั้ง paper size ได้ A4 ที่มีสติ๊กเกอร์จิ๋วมุมเดียว)
    + ปุ่มพิมพ์ซ้ำในตารางทะเบียน
  - ตาราง: เพิ่มคอลัมน์ Barcode ID (ห้ามแทนที่คอลัมน์รหัสตัวอย่าง — barcode เป็น optional และ
    `SMP-2569-xxxxx` คือตัวระบุหลักที่ทั้งระบบอ้าง), Description ไปอยู่ใน panel ขวา
  - **ที่ทำจริง**: `lib/samples-api.ts` (`searchSamples`/`generateSampleBarcode` + sticker prefs ใน
    localStorage + `openStickerInNewTab` — เปิดแท็บ sync ก่อน await แล้วยิง blob ทีหลัง กัน popup blocker,
    ห้าม `window.print()`), `lib/api-client.ts` เพิ่ม `apiFetchBlob` (sticker PDF ต้องแนบ Bearer
    ที่อยู่ใน memory — เปิด URL ตรง ๆ ในแท็บใหม่จะไม่มี auth), `Sample.barcodeId`/`description` +
    `mapSample`, `lims-data-context` `addSample` รับ `description`/`barcodeId` แล้วคืน `Sample`,
    เพิ่ม `genSampleBarcode`. `components/modals/add-sample.tsx` เป็น 2 ขั้น. `samples-view` filter bar
    (`<ScanInput>`→`?barcode_id=` / ช่องชื่อตู้→`?location=` / dropdown ผู้ดูแล→`?custodian_user_id=`
    debounce 250ms, ไม่มี filter = ใช้ list จาก context) + คอลัมน์ Barcode ID พร้อมปุ่มพิมพ์ซ้ำ +
    Description ใน panel ขวา
  - **ต่างจาก plan เดิม**: ช่อง "กรอก Barcode ID เอง" ย้ายไปขั้น 1 (backend รับ `barcode_id` เฉพาะตอน
    `POST /samples` — `POST /samples/{id}/barcode` เป็น auto-gen อย่างเดียว ไม่มี endpoint ตั้งรหัสเอง
    หลังสร้าง) ขั้น 2 เหลือปุ่ม Gen + พิมพ์สติ๊กเกอร์

- [x] **Phase 4 — ย้ายตำแหน่งตัวอย่างด้วยการสแกน** (requirement 1.3) _(เสร็จ 2026-08-28)_
  - `put-away-sample` / `assign-sample-to-location`: สแกนตู้ → `GET /locations/by-barcode/{code}` →
    ถ้า node ที่ได้**ไม่ใช่ leaf** ให้ browse ต่อเฉพาะ subtree ของ node นั้นและแสดง**เฉพาะ leaf ที่ว่าง**
    ให้เลือก/สแกนอีกที (backend บังคับว่าปลายทางต้องเป็น leaf + ไม่มีตัวอย่างอื่นครองอยู่ —
    `internal/application/sample/assign_location.go:34-51`) แล้วค่อย `PATCH /samples/{id}/location`
  - **ห้าม**ให้ระบบเลือก leaf ว่างช่องแรกให้อัตโนมัติ — ระบบเลือกช่องหนึ่ง คนไปวางอีกช่อง = ข้อมูลกับของจริง
    แยกจากกันทันที
  - แทนที่ `components/modals/scan-barcode.tsx` ที่เป็น animation ปลอม + สุ่มตัวอย่างจาก list (ไม่ยิง API เลย)
  - **ที่ทำจริง**: `lib/occupancy.ts` (แยก `occupantOf`/`TRANSFERRED_LABEL` ออกจาก `locations-view` ให้ picker
    ใช้ร่วม), `use-location-browser` เพิ่ม `jumpTo(node)` (กระโดดเข้า subtree ของ node ที่สแกนมา ทิ้ง
    ancestor chain เดิม แล้วดึง `getFullPath` มาโชว์เป็น `ancestorLabel` อ่านอย่างเดียว), `location-picker`
    รับ prop `emptyLeavesOnly` (leaf ที่มี sample ครองอยู่โชว์แต่กดไม่ได้ + ป้าย "มีตัวอย่างครองอยู่")
    และ `enableScan` (`<ScanInput>` → `lookupLocationByBarcode` → leaf ว่าง = เลือกเลย / ไม่ใช่ leaf =
    jumpTo), `put-away-sample.tsx` เปิดสอง prop นี้, `scan-barcode.tsx` เขียนใหม่เป็น 2 ขั้น (สแกนบาร์โค้ด
    ตัวอย่าง → `searchSamples({barcodeId})` → เลือก/สแกนตำแหน่งปลายทาง → `putAwaySample`) ปุ่มหัวหน้า
    samples เปลี่ยนป้ายเป็น "ย้ายตำแหน่ง (สแกน)"

- [x] **Phase 5 — เครื่องมือ: field ใหม่ + หน้ารายละเอียด + เอกสาร** (requirement 2.1) _(เสร็จ 2026-08-28)_
  - ฟอร์มเพิ่มเครื่องมือ: S/N, ประเภท (Category — คนละตัวกับ TypeCode ที่ระบบ gen), ผู้ผลิต
    (Manufacturer), รุ่น (Model), Installation Date, `<VendorSelect>`, Location picker
    (kind = `equipment_storage`)
  - `/equipment/[id]` เป็นหน้าเต็มตาม ADR-0007 (ไม่ใช่ `?e=` แบบ samples) — การ์ด: ข้อมูลทรัพย์สิน
    (แก้ผ่าน `PATCH /equipment/{id}`), Calibration Schedules (phase 6), เอกสารแนบ, ประวัติสอบเทียบ
    5 รายการล่าสุด + ลิงก์ "ดูทั้งหมด" ไปหน้าผลสอบเทียบพร้อม `?equipment_id=`
  - เอกสาร (บัตรรับประกัน): ใช้ `upload-document.tsx` ตัวเดิม รับ prop `context` เพิ่ม (preset
    `type=warranty` + `equipment_id`, ซ่อน field ที่ไม่ต้องเลือก) — ไฟล์ยังไปโผล่ในโมดูลเอกสารตามปกติ
  - ตารางทะเบียนเครื่องมือ: เพิ่ม S/N + ตำแหน่ง, **ตัด "ชั่วโมงใช้งานสะสม" ออก** (ย้ายไปหน้ารายละเอียด),
    ช่องค้นหาค้นได้ทั้งชื่อและ S/N
  - **ที่ทำจริง**: `lib/data.ts` `Equipment` เพิ่ม `sn/category/manufacturer/model/installDate/vendorId/locationId`,
    `Document` เพิ่ม `equipmentId/calibrationEventId`. `backend-mappers` map field ใหม่ (installDate เก็บ
    เป็น `yyyy-mm-dd`). `lib/equipment-api.ts` (ใหม่): `createEquipment` (derive `type_code` จากชื่อ,
    Category แยกต่างหาก), `patchEquipment` (partial — `clear_installation_date`, `vendor_id`/`location_id`
    ส่ง "" = clear), `getEquipment`, `listCalibrationEvents`, `listEquipmentDocuments`. `lims-data-context`:
    `addEquipment(EquipmentInput)` คืน `Equipment`, `patchEquipmentFields`, `addDocument` รับ `equipmentId`,
    `openModal(key, ModalContext)` + `modalContext` (ส่ง preset ให้ modal). `components/location-field.tsx`
    (ใหม่) — LocationPicker แบบย่อสำหรับใส่ในฟอร์ม (chip + เปิด/ปิด tree, `enableScan`). `add-equipment.tsx`
    ฟอร์มใหม่ครบ field + `<VendorSelect>` + `<LocationField kind=equipment_storage>`. `equipment-detail.tsx`
    + route `app/(app)/equipment/[id]/page.tsx` (full route ตาม ADR-0007): การ์ดข้อมูลทรัพย์สิน (แก้ inline →
    `PATCH /equipment/{id}`), เอกสารแนบ (`GET /documents?equipment_id=` + ปุ่มเปิด `upload-document` preset
    `type=warranty`+`equipment_id`), ประวัติสอบเทียบ 5 รายการล่าสุด + ลิงก์ "ดูทั้งหมด" →
    `/equipment/calibration-results?equipment_id=` (หน้าอยู่ใน phase 6). `upload-document.tsx` ซ่อน
    dropdown ประเภท/สิทธิ์เมื่อมี `modalContext.docType`. หน้า list: แถวคลิกไป detail, คอลัมน์ S/N + ตำแหน่ง
    (`useFullPath` ต่อแถว), ตัดชั่วโมงใช้งาน, ช่องค้นหา ชื่อ/SN
  - **ทำใน phase 6 แล้ว**: การ์ด Calibration Schedules + หน้า calibration-results

- [x] **Phase 6 — สอบเทียบ: schedules + หน้าผลการสอบเทียบ** (requirement 2.2) _(เสร็จ 2026-08-28 —
      งานฝาก backend ข้อ 1 มาแล้ว: `GET /calibration-schedules`)_
  - Calibration Schedules ในหน้ารายละเอียดเครื่องมือ: list + modal เพิ่ม/แก้ทีละรอบ (label, วันครบกำหนด,
    interval เดือน — ใส่หรือไม่ใส่ก็ได้), ลบต้องผ่าน `confirm-context` เพราะ backend เป็น **hard delete**,
    รอบที่ไม่ตั้ง interval ต้องมีป้ายบอกว่า "ต้องกรอกวันถัดไปเองทุกครั้ง" (พฤติกรรมต่างกันจริง)
  - ตารางทะเบียนเครื่องมืออ่านสถานะจาก **schedule ที่ due เร็วที่สุด** ตาม ADR-0006 — เครื่องที่ยังไม่มี
    schedule เลยแสดง "ยังไม่ตั้งรอบสอบเทียบ" ไม่ fallback ไป `NextCalibrationDue`
  - หน้าใหม่ `/equipment/calibration-results`: search bar (`q` / `equipment_id` / `result` / `from` /
    `to`) + ตารางผลข้ามเครื่องเรียงใหม่→เก่า จาก `GET /calibration-results`
  - ปุ่ม "บันทึกผลสอบเทียบ" → modal 2 ขั้น (pattern เดียวกับ phase 3): ขั้น 1 เลือกเครื่อง (ค้นด้วยชื่อ
    หรือ S/N — **S/N แสดงอ่านอย่างเดียว ไม่ใช่ช่องกรอก** เพราะเป็นของ Equipment ไม่ใช่ของ event) +
    ประเภทการสอบเทียบ (เลือกจาก label ของ schedule) + ค่าที่วัด + ค่ายอมรับ + ผล pass/fail →
    `PATCH /equipment/{id}/calibration` โดย frontend เติม `next_calibration_due` จาก schedule ที่เลือกให้เอง
    (ไม่แสดงช่องนี้ — ADR-0006) → ขั้น 2 แนบ certificate (`upload-document` context
    `type=certificate` + `calibration_event_id`)
  - เปิด modal เดียวกันนี้จากหน้ารายละเอียดเครื่องมือได้ โดยเลือกเครื่องไว้ล่วงหน้า
  - **ที่ทำจริง**: `lib/equipment-api.ts` เพิ่ม schedule CRUD (`listAllSchedules`/`listEquipmentSchedules`/
    `createSchedule`/`updateSchedule`(+`clear_interval`)/`deleteSchedule`), `searchCalibrationResults`,
    `recordCalibration` + `latestCalibrationEventId` (backend คืน Equipment ไม่คืน event id — ต้องยิง
    `/calibration-results?equipment_id=` เอาตัวใหม่สุด), `CalibrationEvent` เพิ่ม `equipmentId`/`calibratedAtRaw`.
    `lib/calibration-status.ts` (ใหม่) — `calibrationStanding(schedules)` derive สถานะ/ring/วันครบกำหนดจาก
    schedule ที่ due เร็วสุด, ไม่มี schedule = "ยังไม่ตั้งรอบสอบเทียบ" (ไม่ fallback scalar), + `groupSchedules`.
    หน้า list เครื่องมือยิง `listAllSchedules()` ครั้งเดียวแล้ว derive ทุกแถว (คอลัมน์ "รอบสอบเทียบถัดไป" +
    ring + Tag), Seg "ต้องดำเนินการ" อ่านจาก derived tone, ตัด `eq.next`/`eq.cal` ออกจากตาราง, ลบ
    scalar row "รอบสอบเทียบถัดไป" ในการ์ดข้อมูลทรัพย์สิน. `equipment-detail.tsx` เพิ่ม `CalibrationSchedulesCard`
    (list + `ScheduleFormModal` เพิ่ม/แก้, ลบผ่าน `useConfirm` เตือน hard delete, ป้าย "ต้องกรอกวันถัดไป
    เองทุกครั้ง" เมื่อไม่มี interval) + ปุ่ม "บันทึกผลสอบเทียบ" (preset equipment). `components/modals/
    record-calibration.tsx` (ModalKey `record-calibration`) — ขั้น 1 เลือกเครื่อง (ค้นชื่อ/SN, SN โชว์
    อ่านอย่างเดียว) + dropdown ประเภท = label ของ schedule + ค่าที่วัด/ค่ายอมรับ + ปุ่ม pass/fail →
    `recordCalibration` เติม `next_calibration_due` จาก schedule → ขั้น 2 ปุ่ม "แนบใบรับรอง" เปิด
    `upload-document` context `docType=certificate` + `calibration_event_id`. เครื่องที่ยังไม่มี schedule
    บล็อกการบันทึกผล + ลิงก์ไปเพิ่มรอบ. `calibration-results` view + route (Suspense, `?equipment_id=`) —
    search bar `q`/เครื่อง/`result`/`from`/`to` debounce 250ms, ตารางเรียงใหม่→เก่าจาก backend, ชื่อเครื่อง
    join จาก context. `lims-data-context` — ModalKey + `ModalContext.calibrationEventId`, `addDocument`
    ส่ง `calibration_event_id`

- [x] **Phase 8 — รับของเข้าคลัง** (requirement 3.2) _(เสร็จ 2026-08-28 — backend ใส่ `earliest_expire_date`
      + `lot_count` บน `ItemResponse` แล้ว)_
  - หน้าใหม่ `/inventory/receive` (รับ `?item=<id>` เพื่อเลือกรายการไว้ล่วงหน้า): ค้น/สแกนหารายการ →
    กรอก Lot No. (บังคับ) + Expire Date (ไม่บังคับ) + QTY (> 0) → `POST /inventory/{id}/receive` →
    เคลียร์ฟอร์มพร้อมรับตัวถัดไป + แสดงรายการที่เพิ่งรับในรอบนี้ด้านล่าง (**ทีละรายการ ไม่ทำตะกร้าหลาย
    บรรทัด** — API เป็น 1 รายการ 1 lot ต่อ request ถ้า loop เองแล้วบรรทัดที่ 3 จาก 5 ล้ม ผู้ใช้จะไม่รู้ว่า
    อะไรเข้าไปแล้วบ้าง)
  - แสดง lot ที่มีอยู่ของรายการนั้นใต้ฟอร์ม — **lot no. ซ้ำ = บวกทบ lot เดิม ไม่ใช่ error** ผู้ใช้ต้องเห็นก่อน
    ว่ากำลังทบหรือสร้างใหม่
  - จุดเข้า: ปุ่มบนหัวหน้า inventory (เข้าหน้าเปล่าให้สแกน/ค้นเอง) + เมนูในแถว "รับของเข้า" (ลิงก์พร้อม
    `?item=`) — สองสถานการณ์จริงต่างกัน (ของมาส่งเป็นกอง vs เห็นในตารางว่าใกล้หมดแล้วเพิ่งได้ของ)
  - ตารางคลัง: คอลัมน์ "หมดอายุใกล้สุด" + badge เตือน lot ใกล้/เลยหมดอายุ และ KPI "ล็อตใกล้หมดอายุ"
    ด้านบน (ต้องรอ field `earliest_expire_date` จากงานฝาก backend ข้อ 2 — ห้ามยิง
    `GET /inventory/{id}/lots` ทีละรายการ)
  - **ที่ทำจริง**: `components/inventory-receive-view.tsx` + route `app/(app)/inventory/receive/` (Suspense,
    `?item=`) — ค้นรายการ (ชื่อ/รหัส) → Lot No. + วันหมดอายุ + QTY → `receiveStock` (1 lot/request) →
    เคลียร์ฟอร์ม + list "รับเข้าในรอบนี้" + list ล็อตที่มีอยู่ใต้ฟอร์ม, เตือน "lot ซ้ำ = บวกทบ" ก่อนกดบันทึก.
    จุดเข้า: ปุ่มหัวหน้า inventory (หน้าเปล่า) + ปุ่มแถว "รับของเข้า" (`?item=`). ตาราง inventory: คอลัมน์
    "หมดอายุใกล้สุด" (`expiryInfo` จาก `earliestExpireDate`, badge แดง=เลยกำหนด/เหลือง≤30วัน + `(n ล็อต)`)
    + KPI "ล็อตใกล้หมดอายุ" (นับ item ที่ soon). `applyReceivedItem` อัปเดต derived qty/expiry ใน context

---

## สรุปที่มาของ decision (กันถามซ้ำ)

| ประเด็น | สรุป | เหตุผลย่อ |
|---|---|---|
| การสแกน | text input + Enter (wedge scanner) | กล้องต้อง HTTPS + permission, แล็บใช้ handheld เกือบทั้งหมด |
| หน้าใหม่วางที่ไหน | sub-route ใต้โมดูลแม่ | sidebar มีเลขโมดูล 01-06 ตาม requirement แทรกแล้วเลขเพี้ยน |
| แก้ไขข้อมูล | เครื่องมือ = หน้ารายละเอียด, คลัง = modal | เครื่องมือมี child collection 3 ก้อน ยัด modal ไม่ไหว |
| barcode/สติ๊กเกอร์/certificate | modal 2 ขั้น (สร้างก่อน แล้วค่อยแนบ/พิมพ์) | backend ต้องมี id ก่อนเสมอ — pattern เดียวใช้ทั้ง 3 ที่ |
| จำนวนตอนสร้างรายการคลัง | ตัดออก | สต็อกเข้าได้ทางเดียวคือ lot (backend phase 8) |
| ลบ vendor / gate ปุ่มตาม role | ไม่ทำ | FK ทำประวัติเสีย / ต่อเนื่องจาก ADR-0002 |
