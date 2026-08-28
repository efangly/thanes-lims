export type TagTone = "teal" | "amber" | "red" | "green" | "violet" | "grey";
export type Tag = { tone: TagTone; label: string };

export type ModuleId =
  | "dashboard"
  | "ai-chat"
  | "samples"
  | "locations"
  | "equipment"
  | "environment"
  | "inventory"
  | "documents"
  | "tests";

export const MODULE_META: Record<ModuleId, { code: string; title: string }> = {
  dashboard: { code: "MODULE 00", title: "แดชบอร์ด" },
  "ai-chat": { code: "AI ASSISTANT", title: "ผู้ช่วยอัจฉริยะ" },
  samples: { code: "MODULE 01", title: "การจัดการตัวอย่าง" },
  locations: { code: "MODULE 01B", title: "ตำแหน่งจัดเก็บ" },
  equipment: { code: "MODULE 02", title: "การจัดการเครื่องมือ" },
  environment: { code: "MODULE 03", title: "ควบคุมสภาพแวดล้อม" },
  inventory: { code: "MODULE 04", title: "สินค้าคงคลัง" },
  documents: { code: "MODULE 05", title: "การจัดการเอกสาร" },
  tests: { code: "MODULE 06", title: "ทดสอบ & วิเคราะห์" },
};

/* ---------- Storage Location tree ---------- */
export type LevelType = "cabinet" | "shelf" | "slot" | "sub_slot";

export const LEVEL_LABEL: Record<LevelType, string> = {
  cabinet: "ตู้",
  shelf: "ชั้น",
  slot: "ช่อง",
  sub_slot: "Sub-ช่อง",
};

export interface Location {
  id: string;
  parentId: string | null;
  name: string;
  levelType: LevelType;
}

export interface Sample {
  id: string;
  name: string;
  type: string;
  custodian: string;
  locationId: string | null;
  status: Tag;
  recv: string;
}

export const SAMPLES: Sample[] = [
  { id: "SMP-2569-04821", name: "เลือด EDTA – ผู้ป่วยนอก", type: "Blood", custodian: "พิมพ์ชนก", locationId: null, status: { tone: "teal", label: "กำลังทดสอบ" }, recv: "21 ก.ค. 09:14" },
  { id: "SMP-2569-04820", name: "ปัสสาวะ 24 ชม.", type: "Urine", custodian: "ธเนศ", locationId: null, status: { tone: "green", label: "เสร็จสิ้น" }, recv: "21 ก.ค. 08:52" },
  { id: "SMP-2569-04819", name: "น้ำเสียอุตสาหกรรม", type: "Water", custodian: "สมชาย", locationId: null, status: { tone: "amber", label: "รอตรวจสอบ" }, recv: "21 ก.ค. 08:30" },
  { id: "SMP-2569-04818", name: "เนื้อเยื่อชิ้นเนื้อ", type: "Tissue", custodian: "พิมพ์ชนก", locationId: null, status: { tone: "teal", label: "กำลังทดสอบ" }, recv: "20 ก.ค. 16:47" },
  { id: "SMP-2569-04817", name: "ตัวอย่างอาหาร – นม", type: "Food", custodian: "วิภา", locationId: null, status: { tone: "violet", label: "ส่งต่อแผนก" }, recv: "20 ก.ค. 15:20" },
  { id: "SMP-2569-04816", name: "ซีรั่ม – แผนกภูมิคุ้มกัน", type: "Serum", custodian: "ธเนศ", locationId: null, status: { tone: "green", label: "เสร็จสิ้น" }, recv: "20 ก.ค. 14:05" },
];

export interface CoCStep {
  state: "done" | "now" | "";
  icon: "Plus" | "Loc" | "Arrow" | "Test" | "Check";
  title: string;
  meta: string;
  who: string;
}

export const COC_STEPS: CoCStep[] = [
  { state: "done", icon: "Plus", title: "รับตัวอย่างเข้าระบบ", meta: "21 ก.ค. 09:14 · จุดรับตัวอย่าง", who: "พิมพ์ชนก" },
  { state: "done", icon: "Loc", title: "ย้ายเข้าตู้เย็น Fridge-A", meta: "21 ก.ค. 09:22 · R2-04", who: "พิมพ์ชนก" },
  { state: "done", icon: "Arrow", title: "ส่งมอบให้แผนกโลหิตวิทยา", meta: "21 ก.ค. 10:05 · โอนผู้ดูแล", who: "ธเนศ" },
  { state: "now", icon: "Test", title: "อยู่ระหว่างการทดสอบ CBC", meta: "21 ก.ค. 10:40 · Bench-3", who: "สมชาย" },
  { state: "", icon: "Check", title: "รออนุมัติผลและจัดเก็บคืน", meta: "—", who: "—" },
];

export interface Equipment {
  id: string;
  name: string;
  cal: number;
  next: string;
  status: Tag;
  usage: string;
}

export const EQUIPMENT: Equipment[] = [
  { id: "EQ-CENT-002", name: "เครื่องปั่นเหวี่ยง Hettich", cal: 88, next: "12 ส.ค. 2569", status: { tone: "green", label: "พร้อมใช้" }, usage: "1,204 ชม." },
  { id: "EQ-BAL-004", name: "เครื่องชั่งวิเคราะห์ Mettler", cal: 34, next: "28 ก.ค. 2569", status: { tone: "amber", label: "ใกล้สอบเทียบ" }, usage: "842 ชม." },
  { id: "EQ-PCR-001", name: "เครื่อง Real-Time PCR", cal: 71, next: "05 ส.ค. 2569", status: { tone: "green", label: "พร้อมใช้" }, usage: "2,391 ชม." },
  { id: "EQ-SPEC-003", name: "UV-Vis Spectrophotometer", cal: 12, next: "23 ก.ค. 2569", status: { tone: "red", label: "เลยกำหนด" }, usage: "560 ชม." },
  { id: "EQ-MICR-006", name: "กล้องจุลทรรศน์ Olympus", cal: 59, next: "02 ส.ค. 2569", status: { tone: "green", label: "พร้อมใช้" }, usage: "1,780 ชม." },
];

export interface Gauge {
  loc: string;
  val: string;
  unit: string;
  range: string;
  level: "ok" | "warn" | "crit";
  trend: number[];
}

export const GAUGES: Gauge[] = [
  { loc: "Freezer-A (-80°C)", val: "-79.4", unit: "°C", range: "ช่วง -82 / -78", level: "ok", trend: [20, 18, 19, 17, 18, 16, 17, 15, 16] },
  { loc: "Fridge-A (2–8°C)", val: "6.8", unit: "°C", range: "ช่วง 2 / 8", level: "warn", trend: [10, 12, 11, 14, 15, 17, 19, 22, 25] },
  { loc: "ความชื้น Lab-1", val: "48", unit: "%RH", range: "ช่วง 40 / 60", level: "ok", trend: [14, 15, 13, 16, 14, 15, 16, 15, 14] },
  { loc: "Freezer-B (-20°C)", val: "-11.2", unit: "°C", range: "ช่วง -22 / -18", level: "crit", trend: [8, 9, 12, 14, 18, 20, 23, 26, 29] },
];

export interface EnvAlert {
  level: "crit" | "warn" | "ok";
  title: string;
  msg: string;
  time: string;
}

export const ENV_ALERTS: EnvAlert[] = [
  { level: "crit", title: "Freezer-B อุณหภูมิสูงเกินกำหนด", msg: "ตรวจพบ -11.2°C (กำหนด ≤ -18°C) — อาจมีการเปิดตู้ค้างไว้", time: "2 นาทีที่แล้ว" },
  { level: "warn", title: "Fridge-A เข้าใกล้ขีดจำกัดบน", msg: "6.8°C กำลังเข้าใกล้ 8°C", time: "11 นาทีที่แล้ว" },
  { level: "ok", title: "ระบบไฟฟ้ากลับสู่ปกติ", msg: "UPS สำรองทำงาน 4 นาที ก่อนไฟกลับมา", time: "1 ชม. ที่แล้ว" },
];

export interface InventoryItem {
  id: string;
  name: string;
  cat: string;
  qty: number;
  unit: string;
  min: number;
  max: number;
  pct: number;
  status: Tag;
}

export interface InventoryLot {
  id: string;
  itemId: string;
  lotNo: string;
  /** raw RFC3339 string, or null when the lot has no expiry */
  expireDate: string | null;
  /** localized label for `expireDate`, or "—" when null */
  expireLabel: string;
  qty: number;
}

export const INVENTORY: InventoryItem[] = [
  { id: "CHM-0142", name: "Ethanol 99.9% AR", cat: "สารเคมี", qty: 3, unit: "L", min: 5, max: 20, pct: 15, status: { tone: "red", label: "สั่งซื้อด่วน" } },
  { id: "CHM-0098", name: "Sodium Chloride NaCl", cat: "สารเคมี", qty: 12, unit: "kg", min: 8, max: 25, pct: 48, status: { tone: "green", label: "เพียงพอ" } },
  { id: "CON-0311", name: "Pipette Tips 1000µL", cat: "วัสดุสิ้นเปลือง", qty: 6, unit: "กล่อง", min: 10, max: 40, pct: 15, status: { tone: "red", label: "สั่งซื้อด่วน" } },
  { id: "RGT-0056", name: "PCR Master Mix", cat: "รีเอเจนต์", qty: 9, unit: "ชุด", min: 8, max: 30, pct: 30, status: { tone: "amber", label: "ใกล้หมด" } },
  { id: "CON-0207", name: "Nitrile Gloves M", cat: "วัสดุสิ้นเปลือง", qty: 34, unit: "กล่อง", min: 15, max: 50, pct: 68, status: { tone: "green", label: "เพียงพอ" } },
];

export interface Document {
  id: string;
  name: string;
  type: string;
  ver: string;
  by: string;
  date: string;
  access: string;
  locked: boolean;
}

export const DOCUMENTS: Document[] = [
  { id: "DOC-0001", name: "SOP – การเก็บและขนส่งตัวอย่างเลือด", type: "SOP", ver: "v3.2", by: "ธเนศ", date: "18 ก.ค. 2569", access: "ทั่วไป", locked: false },
  { id: "DOC-0002", name: "คู่มือการใช้เครื่อง Real-Time PCR", type: "Manual", ver: "v1.4", by: "พิมพ์ชนก", date: "14 ก.ค. 2569", access: "ทั่วไป", locked: false },
  { id: "DOC-0003", name: "นโยบายความปลอดภัยข้อมูลผู้ป่วย", type: "Policy", ver: "v2.0", by: "ผู้ดูแลระบบ", date: "02 ก.ค. 2569", access: "จำกัด – ผู้บริหาร", locked: true },
  { id: "DOC-0004", name: "แบบฟอร์มขอสอบเทียบเครื่องมือ", type: "Form", ver: "v1.1", by: "สมชาย", date: "28 มิ.ย. 2569", access: "ทั่วไป", locked: false },
  { id: "DOC-0005", name: "บันทึกการตรวจสอบภายใน (Audit)", type: "Record", ver: "v5.7", by: "ธเนศ", date: "20 ก.ค. 2569", access: "จำกัด – QA", locked: true },
];

export interface DocHistory {
  ver: string;
  change: string;
  date: string;
  who: string;
}

export const DOC_HISTORY: DocHistory[] = [
  { ver: "v3.2", change: "ปรับขั้นตอนการติดฉลากบาร์โค้ด", date: "18 ก.ค. 2569", who: "ธเนศ" },
  { ver: "v3.1", change: "เพิ่มข้อกำหนดอุณหภูมิขนส่ง", date: "02 ก.ค. 2569", who: "พิมพ์ชนก" },
  { ver: "v3.0", change: "ทบทวนประจำปี — อนุมัติโดย QA", date: "15 มิ.ย. 2569", who: "ผู้จัดการ QA" },
  { ver: "v2.4", change: "แก้ไขแบบฟอร์มแนบท้าย", date: "20 พ.ค. 2569", who: "สมชาย" },
];

export interface TestResult {
  id: string;
  sample: string;
  test: string;
  analyst: string;
  result: string;
  flag: "hi" | "lo" | "ok";
  ref: string;
  status: Tag;
}

export const TESTS: TestResult[] = [
  { id: "TST-88401", sample: "SMP-2569-04821", test: "CBC – Complete Blood Count", analyst: "พิมพ์ชนก", result: "WBC 11.4", flag: "hi", ref: "4.0–10.0 ×10⁹/L", status: { tone: "teal", label: "กำลังวิเคราะห์" } },
  { id: "TST-88400", sample: "SMP-2569-04820", test: "Urinalysis – Protein", analyst: "ธเนศ", result: "Neg", flag: "ok", ref: "Negative", status: { tone: "green", label: "อนุมัติแล้ว" } },
  { id: "TST-88399", sample: "SMP-2569-04819", test: "COD – น้ำเสีย", analyst: "สมชาย", result: "340 mg/L", flag: "hi", ref: "≤ 120 mg/L", status: { tone: "amber", label: "รอทวนสอบ" } },
  { id: "TST-88398", sample: "SMP-2569-04817", test: "ปริมาณจุลินทรีย์ – นม", analyst: "วิภา", result: "2.1×10³", flag: "ok", ref: "≤ 1×10⁴ CFU/mL", status: { tone: "green", label: "อนุมัติแล้ว" } },
  { id: "TST-88397", sample: "SMP-2569-04818", test: "Histopathology Grade", analyst: "พิมพ์ชนก", result: "Grade II", flag: "lo", ref: "ดูรายงาน", status: { tone: "teal", label: "กำลังวิเคราะห์" } },
];

export interface FeedItem {
  tone: TagTone;
  icon: "Env" | "Sample" | "Equipment" | "Inventory" | "Check";
  html: { text: string; bold: string; tail: string };
  time: string;
}

export const FEED: FeedItem[] = [
  { tone: "red", icon: "Env", html: { text: "", bold: "Freezer-B", tail: " อุณหภูมิสูงเกินกำหนด (-11.2°C)" }, time: "2 นาทีที่แล้ว" },
  { tone: "teal", icon: "Sample", html: { text: "รับตัวอย่าง ", bold: "SMP-2569-04821", tail: " เข้าระบบ" }, time: "9 นาทีที่แล้ว" },
  { tone: "amber", icon: "Equipment", html: { text: "", bold: "UV-Vis Spec", tail: " เลยกำหนดสอบเทียบ" }, time: "25 นาทีที่แล้ว" },
  { tone: "red", icon: "Inventory", html: { text: "", bold: "Ethanol 99.9%", tail: " ต่ำกว่าจุดสั่งซื้อ — สั่งซื้ออัตโนมัติแล้ว" }, time: "1 ชม.ที่แล้ว" },
  { tone: "green", icon: "Check", html: { text: "อนุมัติผล ", bold: "TST-88400", tail: " Urinalysis" }, time: "1 ชม.ที่แล้ว" },
];

export interface Notification {
  id: string;
  tone: TagTone;
  icon: "Env" | "Sample" | "Equipment" | "Inventory" | "Doc" | "Test";
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export const NOTIFICATIONS: Notification[] = [
  { id: "NTF-001", tone: "red", icon: "Env", title: "Freezer-B อุณหภูมิสูงเกินกำหนด", message: "ตรวจพบ -11.2°C (กำหนด ≤ -18°C) — ตรวจสอบด่วน", time: "2 นาทีที่แล้ว", read: false },
  { id: "NTF-002", tone: "teal", icon: "Sample", title: "รับตัวอย่างใหม่เข้าระบบ", message: "SMP-2569-04821 เข้าสู่ขั้นตอนกำลังทดสอบ", time: "9 นาทีที่แล้ว", read: false },
  { id: "NTF-003", tone: "amber", icon: "Equipment", title: "เครื่องมือใกล้ครบกำหนดสอบเทียบ", message: "UV-Vis Spectrophotometer เลยกำหนดสอบเทียบ", time: "25 นาทีที่แล้ว", read: false },
  { id: "NTF-004", tone: "red", icon: "Inventory", title: "สินค้าต่ำกว่าจุดสั่งซื้อ", message: "Ethanol 99.9% AR เหลือ 3 L — สั่งซื้ออัตโนมัติแล้ว", time: "1 ชม.ที่แล้ว", read: false },
  { id: "NTF-005", tone: "green", icon: "Test", title: "อนุมัติผลทดสอบแล้ว", message: "TST-88400 Urinalysis ผ่านการทวนสอบ", time: "1 ชม.ที่แล้ว", read: true },
  { id: "NTF-006", tone: "violet", icon: "Doc", title: "เอกสารรอทบทวน", message: "SOP – การเก็บและขนส่งตัวอย่างเลือด ครบกำหนดทบทวนประจำปี", time: "3 ชม.ที่แล้ว", read: true },
];

export interface PurchaseOrder {
  id: string;
  item: string;
  qty: string;
  vendor: string;
  date: string;
  status: Tag;
}

export const PURCHASE_ORDERS: PurchaseOrder[] = [
  { id: "PO-2569-0231", item: "Ethanol 99.9% AR", qty: "20 L", vendor: "บจก. เคมีภัณฑ์ไทย", date: "21 ก.ค. 2569", status: { tone: "amber", label: "รออนุมัติ" } },
  { id: "PO-2569-0230", item: "Pipette Tips 1000µL", qty: "30 กล่อง", vendor: "บจก. แล็บซัพพลาย", date: "20 ก.ค. 2569", status: { tone: "teal", label: "ส่งให้ผู้ขายแล้ว" } },
  { id: "PO-2569-0225", item: "PCR Master Mix", qty: "15 ชุด", vendor: "บจก. ไบโอเทค โซลูชัน", date: "15 ก.ค. 2569", status: { tone: "green", label: "ได้รับแล้ว" } },
  { id: "PO-2569-0219", item: "Nitrile Gloves M", qty: "50 กล่อง", vendor: "บจก. เซฟตี้ โปร", date: "08 ก.ค. 2569", status: { tone: "green", label: "ได้รับแล้ว" } },
  { id: "PO-2569-0211", item: "Sodium Chloride NaCl", qty: "25 kg", vendor: "บจก. เคมีภัณฑ์ไทย", date: "29 มิ.ย. 2569", status: { tone: "green", label: "ได้รับแล้ว" } },
  { id: "PO-2569-0203", item: "UV-Vis Cuvettes", qty: "6 กล่อง", vendor: "บจก. แล็บซัพพลาย", date: "18 มิ.ย. 2569", status: { tone: "red", label: "ยกเลิก" } },
];

/* ---------- ข้อมูลอ้างอิงสำหรับผู้ช่วย AI (โมดูล ai-chat) ---------- */

/** ยอดรับตัวอย่าง 7 วันย้อนหลัง — ปิดท้ายที่ 12 รายการวันนี้ (เมื่อวาน 9 → มากกว่า 3) */
export const AI_INTAKE_7D: { label: string; a: number; b: number }[] = [
  { label: "15", a: 46, b: 12 },
  { label: "16", a: 52, b: 18 },
  { label: "17", a: 40, b: 10 },
  { label: "18", a: 62, b: 22 },
  { label: "19", a: 34, b: 8 },
  { label: "20", a: 54, b: 16 },
  { label: "21", a: 74, b: 34 },
];

export interface AiSampleRow {
  id: string;
  name: string;
  custodian: string;
  detail: string;
  status: Tag;
}

/** 5 รายการที่ถูกตั้งสถานะเร่งด่วนของวันนี้ */
export const AI_URGENT_SAMPLES: AiSampleRow[] = [
  { id: "SMP-2569-04821", name: "เลือด EDTA – ผู้ป่วยนอก", custodian: "พิมพ์ชนก", detail: "ครบกำหนด 11:30", status: { tone: "red", label: "เร่งด่วนมาก" } },
  { id: "SMP-2569-04819", name: "น้ำเสียอุตสาหกรรม", custodian: "สมชาย", detail: "ครบกำหนด 13:00", status: { tone: "red", label: "เร่งด่วนมาก" } },
  { id: "SMP-2569-04817", name: "ตัวอย่างอาหาร – นม", custodian: "วิภา", detail: "ครบกำหนด 15:00", status: { tone: "amber", label: "เร่งด่วน" } },
  { id: "SMP-2569-04818", name: "เนื้อเยื่อชิ้นเนื้อ", custodian: "พิมพ์ชนก", detail: "ครบกำหนด 16:20", status: { tone: "amber", label: "เร่งด่วน" } },
  { id: "SMP-2569-04820", name: "ปัสสาวะ 24 ชม.", custodian: "วิภา", detail: "ครบกำหนด 17:00", status: { tone: "amber", label: "เร่งด่วน" } },
];

/** ภาระงานเร่งด่วนต่อผู้ดูแล (ใช้สรุปเป็น KPI คู่กับตาราง) */
export const AI_URGENT_BY_OWNER: { name: string; count: number }[] = [
  { name: "พิมพ์ชนก", count: 2 },
  { name: "วิภา", count: 2 },
  { name: "สมชาย", count: 1 },
];

/** 4 ตัวอย่างใน Freezer-B ที่กำหนดจัดเก็บไม่เกิน -18°C จึงมีความเสี่ยงด้านความคงตัว */
export const AI_AT_RISK_SAMPLES: AiSampleRow[] = [
  { id: "SMP-2569-04820", name: "ปัสสาวะ 24 ชม.", custodian: "วิภา", detail: "กำหนด ≤ -18°C · สัมผัส 3 ชม. 20 น.", status: { tone: "red", label: "เสี่ยงสูง" } },
  { id: "SMP-2569-04818", name: "เนื้อเยื่อชิ้นเนื้อ", custodian: "พิมพ์ชนก", detail: "กำหนด ≤ -18°C · สัมผัส 2 ชม. 45 น.", status: { tone: "red", label: "เสี่ยงสูง" } },
  { id: "SMP-2569-04821", name: "เลือด EDTA – ผู้ป่วยนอก", custodian: "พิมพ์ชนก", detail: "กำหนด ≤ -18°C · สัมผัส 1 ชม. 10 น.", status: { tone: "amber", label: "เฝ้าระวัง" } },
  { id: "SMP-2569-04816", name: "ซีรั่ม – แผนกภูมิคุ้มกัน", custodian: "ธเนศ", detail: "กำหนด ≤ -18°C · สัมผัส 55 นาที", status: { tone: "amber", label: "เฝ้าระวัง" } },
];

/** อุณหภูมิ Freezer-B ย้อนหลัง 24 ชม. (°C) — ไต่ทะลุเกณฑ์ -18 มาจบที่ -11.2 ตรงกับ GAUGES */
export const AI_FREEZER_TREND: number[] = [
  -20.4, -20.2, -20.5, -20.1, -20.3, -19.9, -20.0, -19.6, -19.2, -18.6, -18.1,
  -17.4, -16.5, -15.8, -14.9, -13.6, -12.4, -11.2,
];

export const AI_FREEZER_LIMIT = -18;
