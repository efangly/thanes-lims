import type { CoCStep, Document, DocHistory, EnvAlert, Equipment, Gauge, InventoryItem, Location, LevelType, Notification, PurchaseOrder, Sample, Tag, TestResult } from "@/lib/data";

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("th-TH", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

const SAMPLE_STATUS: Record<string, Tag> = {
  pending: { tone: "amber", label: "รอตรวจสอบ" },
  testing: { tone: "teal", label: "กำลังทดสอบ" },
  completed: { tone: "green", label: "เสร็จสิ้น" },
  transferred: { tone: "violet", label: "ส่งต่อแผนก" },
};

const EQUIPMENT_STATUS: Record<string, Tag> = {
  ready: { tone: "green", label: "พร้อมใช้" },
  due_soon: { tone: "amber", label: "ใกล้สอบเทียบ" },
  overdue: { tone: "red", label: "เลยกำหนด" },
};

const INVENTORY_STATUS: Record<string, Tag> = {
  ok: { tone: "green", label: "เพียงพอ" },
  low: { tone: "amber", label: "ใกล้หมด" },
  critical: { tone: "red", label: "สั่งซื้อด่วน" },
};

const TEST_STATUS: Record<string, Tag> = {
  analyzing: { tone: "teal", label: "กำลังวิเคราะห์" },
  pending_verification: { tone: "amber", label: "รอทวนสอบ" },
  approved: { tone: "green", label: "อนุมัติแล้ว" },
};

function statusTag(map: Record<string, Tag>, status: string): Tag {
  return map[status] ?? { tone: "grey", label: status };
}

export interface SampleDTO {
  id: string;
  name: string;
  type: string;
  custodian: string;
  location_id: string | null;
  status: string;
  received_at: string;
}
export function mapSample(d: SampleDTO): Sample {
  return {
    id: d.id,
    name: d.name,
    type: d.type,
    custodian: d.custodian,
    locationId: d.location_id,
    status: statusTag(SAMPLE_STATUS, d.status),
    recv: formatDateTime(d.received_at),
  };
}

export interface LocationDTO {
  id: string;
  parent_id: string | null;
  name: string;
  level_type: LevelType;
}
export function mapLocation(d: LocationDTO): Location {
  return {
    id: d.id,
    parentId: d.parent_id,
    name: d.name,
    levelType: d.level_type,
  };
}

export interface EquipmentDTO {
  id: string;
  name: string;
  type_code: string;
  last_calibrated_at: string;
  next_calibration_due: string;
  usage_hours: number;
  calibration_pct: number;
  status: string;
}
export function mapEquipment(d: EquipmentDTO): Equipment {
  return {
    id: d.id,
    name: d.name,
    cal: d.calibration_pct,
    next: formatDate(d.next_calibration_due),
    status: statusTag(EQUIPMENT_STATUS, d.status),
    usage: `${d.usage_hours.toLocaleString()} ชม.`,
  };
}

export interface InventoryDTO {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  min: number;
  max: number;
  pct: number;
  status: string;
  default_vendor: string;
}
export function mapInventory(d: InventoryDTO): InventoryItem {
  return {
    id: d.id,
    name: d.name,
    cat: d.category,
    qty: d.quantity,
    unit: d.unit,
    min: d.min,
    max: d.max,
    pct: d.pct,
    status: statusTag(INVENTORY_STATUS, d.status),
  };
}

const ACCESS_LEVEL_LABEL: Record<string, string> = {
  internal: "ทั่วไป",
  public: "ทั่วไป",
  general: "ทั่วไป",
  restricted: "จำกัด – QA",
  confidential: "จำกัด – ผู้บริหาร",
  executive: "จำกัด – ผู้บริหาร",
};

function mapAccessLevel(level: string): string {
  return ACCESS_LEVEL_LABEL[level.toLowerCase()] ?? level;
}

export interface DocumentDTO {
  id: string;
  name: string;
  type: string;
  version: string;
  created_by: string;
  issued_at: string;
  access_level: string;
  locked: boolean;
}
export function mapDocument(d: DocumentDTO): Document {
  return {
    id: d.id,
    name: d.name,
    type: d.type,
    ver: d.version,
    by: d.created_by,
    date: formatDate(d.issued_at),
    access: mapAccessLevel(d.access_level),
    locked: d.locked,
  };
}

export interface TestResultDTO {
  id: string;
  sample_id: string;
  test_name: string;
  analyst: string;
  result: string;
  flag: "hi" | "lo" | "ok";
  ref_range: string;
  status: string;
}
export function mapTestResult(d: TestResultDTO): TestResult {
  return {
    id: d.id,
    sample: d.sample_id,
    test: d.test_name,
    analyst: d.analyst,
    result: d.result,
    flag: d.flag,
    ref: d.ref_range,
    status: statusTag(TEST_STATUS, d.status),
  };
}

export interface GaugeDTO {
  location: string;
  unit: string;
  range_min: number;
  range_max: number;
  value?: number;
  level: "ok" | "warn" | "crit";
}
export function mapGauge(d: GaugeDTO): Gauge {
  return {
    loc: d.location,
    val: d.value !== undefined ? d.value.toFixed(1) : "—",
    unit: d.unit,
    range: `ช่วง ${d.range_min} / ${d.range_max}`,
    level: d.level,
    trend: [],
  };
}

export interface ReadingDTO {
  value: number;
  recorded_at: string;
}
export function mapTrend(readings: ReadingDTO[]): number[] {
  return readings.map((r) => r.value).reverse();
}

export interface AlertDTO {
  id: number;
  location: string;
  level: "crit" | "warn" | "ok";
  title: string;
  message: string;
  triggered_at: string;
  resolved_at?: string;
}
export function mapAlert(d: AlertDTO): EnvAlert {
  return {
    level: d.level,
    title: d.title,
    msg: d.message,
    time: formatDateTime(d.triggered_at),
  };
}

export interface DocHistoryDTO {
  version: string;
  change: string;
  date: string;
  who: string;
}
export function mapDocHistory(d: DocHistoryDTO): DocHistory {
  return { ver: d.version, change: d.change, date: formatDate(d.date), who: d.who };
}

export interface CoCStepDTO {
  id: number;
  state: string;
  icon: string;
  title: string;
  meta: string;
  who: string;
  occurred_at: string;
}
export function mapCoCStep(d: CoCStepDTO): CoCStep {
  return {
    state: d.state === "done" || d.state === "now" ? d.state : "",
    icon: (d.icon as CoCStep["icon"]) ?? "Plus",
    title: d.title,
    meta: `${formatDateTime(d.occurred_at)} · ${d.meta}`,
    who: d.who || "—",
  };
}

const PO_STATUS: Record<string, Tag> = {
  pending_approval: { tone: "amber", label: "รออนุมัติ" },
  sent_to_vendor: { tone: "teal", label: "ส่งให้ผู้ขายแล้ว" },
  received: { tone: "green", label: "ได้รับแล้ว" },
  cancelled: { tone: "red", label: "ยกเลิก" },
};

export interface PurchaseOrderDTO {
  id: string;
  item_id: string;
  quantity: number;
  vendor: string;
  order_date: string;
  status: string;
}
export function mapPurchaseOrder(d: PurchaseOrderDTO): PurchaseOrder {
  return {
    id: d.id,
    item: d.item_id,
    qty: String(d.quantity),
    vendor: d.vendor,
    date: formatDate(d.order_date),
    status: statusTag(PO_STATUS, d.status),
  };
}

export interface NotificationDTO {
  id: string;
  tone: string;
  icon: string;
  title: string;
  message: string;
  created_at: string;
  read: boolean;
}
export function mapNotification(d: NotificationDTO): Notification {
  return {
    id: d.id,
    tone: (d.tone as Notification["tone"]) ?? "grey",
    icon: (d.icon as Notification["icon"]) ?? "Env",
    title: d.title,
    message: d.message,
    time: formatDateTime(d.created_at),
    read: d.read,
  };
}
