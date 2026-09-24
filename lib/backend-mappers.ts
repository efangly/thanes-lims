import type { CoCStep, Document, DueStatus, DocHistory, DiscoverDevice, EnvAlert, Equipment, FeedItem, InventoryItem, InventoryLot, Location, LocationKind, LevelType, Notification, HistoryRange, PartnerDevice, PartnerDeviceHistory, PartnerDeviceSnapshot, PartnerDeviceTelemetryPage, PartnerDeviceTimeseriesPoint, PurchaseOrder, Sample, Tag, TestResult, TestVolumePoint } from "@/lib/data";
import type { UserDTO, SampleDTO, EquipmentDTO, InventoryDTO, DocumentDTO, TestResultDTO, NotificationDTO } from "@/lib/schemas";

// DTO type มาจาก Zod schema ใน lib/schemas (single source of truth) — re-export ไว้ให้ import เดิมยังใช้ได้
export type { UserDTO, SampleDTO, EquipmentDTO, InventoryDTO, DocumentDTO, TestResultDTO, NotificationDTO };

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("th-TH", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export const SAMPLE_STATUS: Record<string, Tag> = {
  pending: { tone: "amber", label: "รอตรวจสอบ" },
  testing: { tone: "teal", label: "กำลังทดสอบ" },
  completed: { tone: "green", label: "เสร็จสิ้น" },
  transferred: { tone: "violet", label: "ส่งต่อแผนก" },
};

const DUE_STATUS_TONE: Record<DueStatus, Tag["tone"]> = {
  overdue: "red",
  due_soon: "amber",
  ready: "green",
  none: "grey",
};

const DUE_STATUS_LABEL: Record<DueStatus, string> = {
  overdue: "เลยกำหนด",
  due_soon: "ใกล้ครบกำหนด",
  ready: "พร้อม",
  none: "ไม่มีแผน",
};

/** Badge for a server-derived Cal / MA / Overall status. `none` reads "ไม่มีแผน", never "พร้อม". */
export function dueStatusTag(status: DueStatus, prefix?: string): Tag {
  const label = DUE_STATUS_LABEL[status];
  return { tone: DUE_STATUS_TONE[status], label: prefix ? `${prefix} ${label}` : label };
}

/** Severity order used to sort by overall status: overdue > due_soon > ready > none. */
export const DUE_STATUS_RANK: Record<DueStatus, number> = { overdue: 3, due_soon: 2, ready: 1, none: 0 };

const INVENTORY_STATUS: Record<string, Tag> = {
  ok: { tone: "green", label: "เพียงพอ" },
  normal: { tone: "green", label: "เพียงพอ" },
  low: { tone: "amber", label: "ใกล้หมด" },
  critical: { tone: "red", label: "สั่งซื้อด่วน" },
  out: { tone: "red", label: "หมด" },
};

const TEST_STATUS: Record<string, Tag> = {
  analyzing: { tone: "teal", label: "กำลังวิเคราะห์" },
  pending_verification: { tone: "amber", label: "รอทวนสอบ" },
  approved: { tone: "green", label: "อนุมัติแล้ว" },
};

function statusTag(map: Record<string, Tag>, status: string): Tag {
  return map[status] ?? { tone: "grey", label: status };
}


export function mapSample(d: SampleDTO, userNames?: Map<number, string>): Sample {
  return {
    id: d.id,
    name: d.name,
    type: d.type,
    custodian: userNames?.get(d.custodian_user_id) ?? `ผู้ใช้ #${d.custodian_user_id}`,
    locationId: d.location_id,
    status: statusTag(SAMPLE_STATUS, d.status),
    recv: formatDateTime(d.received_at),
    barcodeId: d.barcode_id ?? null,
    description: d.description ?? "",
    position: d.position ?? null,
  };
}

export interface LocationDTO {
  id: string;
  parent_id: string | null;
  name: string;
  kind?: LocationKind;
  level_type: LevelType;
  barcode_code?: string;
  rows?: number;
  cols?: number;
}
export function mapLocation(d: LocationDTO): Location {
  return {
    id: d.id,
    parentId: d.parent_id,
    name: d.name,
    kind: d.kind ?? "sample_storage",
    levelType: d.level_type,
    barcodeCode: d.barcode_code,
    rows: d.rows,
    cols: d.cols,
  };
}

export function mapEquipment(d: EquipmentDTO): Equipment {
  return {
    id: d.id,
    name: d.name,
    cal: d.calibration_pct,
    next: formatDate(d.next_calibration_due),
    status: dueStatusTag(d.calibration_status),
    calStatus: d.calibration_status,
    maStatus: d.maintenance_status,
    overallStatus: d.overall_status,
    usage: `${d.usage_hours.toLocaleString()} ชม.`,
    sn: d.serial_number ?? "",
    category: d.category ?? "",
    manufacturer: d.manufacturer ?? "",
    model: d.model ?? "",
    installDate: d.installation_date ? d.installation_date.slice(0, 10) : null,
    vendorId: d.vendor_id ?? null,
    locationId: d.location_id ?? null,
  };
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
    custodianUserId: d.custodian_user_id ?? null,
    manufacturer: d.manufacturer ?? "",
    vendorId: d.vendor_id ?? null,
    locationId: d.location_id ?? null,
    earliestExpireDate: d.earliest_expire_date ?? null,
    lotCount: d.lot_count ?? 0,
  };
}

export interface InventoryLotDTO {
  id: string;
  item_id: string;
  lot_no: string;
  expire_date: string | null;
  quantity: number;
}
export function mapInventoryLot(d: InventoryLotDTO): InventoryLot {
  return {
    id: d.id,
    itemId: d.item_id,
    lotNo: d.lot_no,
    expireDate: d.expire_date,
    expireLabel: d.expire_date ? formatDate(d.expire_date) : "—",
    qty: d.quantity,
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
    fileName: d.filename && d.filename !== "." ? d.filename : "",
    equipmentId: d.equipment_id ?? null,
    calibrationEventId: d.calibration_event_id ?? null,
  };
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

export interface PartnerDeviceDTO {
  serial: string;
  location: string;
  active: boolean;
}
export function mapPartnerDevice(d: PartnerDeviceDTO): PartnerDevice {
  return { serial: d.serial, location: d.location, active: d.active };
}

export interface PartnerDeviceSnapshotDTO {
  serial: string;
  location: string;
  name: string;
  status: boolean;
  online: boolean;
  firmware: string;
  temp_display: number;
  humidity_display: number;
  send_time: string;
  level: "ok" | "warn" | "crit" | "";
  battery: number;
  plug: boolean;
  door1: boolean;
  door2: boolean;
  door3: boolean;
  ext_memory: boolean;
  fetched_at: string;
  stale: boolean;
}
export function mapPartnerDeviceSnapshot(d: PartnerDeviceSnapshotDTO): PartnerDeviceSnapshot {
  return {
    serial: d.serial,
    location: d.location,
    name: d.name,
    status: d.status,
    online: d.online,
    firmware: d.firmware,
    tempDisplay: d.temp_display,
    humidityDisplay: d.humidity_display,
    sendTime: d.send_time || null,
    level: d.level,
    battery: d.battery,
    plug: d.plug,
    door1: d.door1,
    door2: d.door2,
    door3: d.door3,
    extMemory: d.ext_memory,
    fetchedAt: d.fetched_at,
    stale: d.stale,
  };
}

export interface DiscoverDeviceDTO {
  serial: string;
  name: string;
  status: boolean;
  firmware: string;
  online: boolean;
  temp_display?: number;
  humidity_display?: number;
  send_time?: string;
}
export interface DiscoverDevicesResponseDTO {
  devices: DiscoverDeviceDTO[];
  total: number;
  page: number;
  limit: number;
}
export function mapDiscoverDevice(d: DiscoverDeviceDTO): DiscoverDevice {
  return {
    serial: d.serial,
    name: d.name,
    status: d.status,
    firmware: d.firmware,
    online: d.online,
    tempDisplay: d.temp_display ?? null,
    humidityDisplay: d.humidity_display ?? null,
    sendTime: d.send_time ?? null,
  };
}

export interface TimeseriesPointDTO {
  send_time: string;
  temp_display: number;
  humidity_display: number;
}
export interface TimeseriesResponseDTO {
  serial: string;
  points: TimeseriesPointDTO[];
}
export function mapTimeseriesPoint(d: TimeseriesPointDTO): PartnerDeviceTimeseriesPoint {
  return { sendTime: d.send_time, tempDisplay: d.temp_display, humidityDisplay: d.humidity_display };
}

export interface HistoryBucketDTO {
  bucket_start: string;
  probe: string;
  temp_avg: number;
  temp_min: number;
  temp_max: number;
  humidity_avg: number;
  humidity_min: number;
  humidity_max: number;
  battery_min: number;
  door_open: boolean;
  samples: number;
}
export interface HistoryResponseDTO {
  serial: string;
  range: HistoryRange;
  bucket_interval: string;
  buckets: HistoryBucketDTO[] | null;
}
export function mapHistory(d: HistoryResponseDTO): PartnerDeviceHistory {
  return {
    serial: d.serial,
    range: d.range,
    bucketInterval: d.bucket_interval,
    buckets: (d.buckets ?? []).map((b) => ({
      bucketStart: b.bucket_start,
      probe: b.probe,
      tempAvg: b.temp_avg,
      tempMin: b.temp_min,
      tempMax: b.temp_max,
      humidityAvg: b.humidity_avg,
      humidityMin: b.humidity_min,
      humidityMax: b.humidity_max,
      batteryMin: b.battery_min,
      doorOpen: b.door_open,
      samples: b.samples,
    })),
  };
}

export interface TelemetryPointDTO {
  send_time: string;
  probe: string;
  temp: number;
  temp_display: number;
  humidity: number;
  humidity_display: number;
  temp_internal: number;
  battery: number;
  plug: boolean;
  door1: boolean;
  door2: boolean;
  door3: boolean;
  internet: boolean;
  ext_memory: boolean;
}
export interface TelemetryResponseDTO {
  serial: string;
  range: HistoryRange;
  points: TelemetryPointDTO[] | null;
  total: number;
  page: number;
  limit: number;
}
export function mapTelemetryPage(d: TelemetryResponseDTO): PartnerDeviceTelemetryPage {
  return {
    serial: d.serial,
    range: d.range,
    total: d.total,
    page: d.page,
    limit: d.limit,
    points: (d.points ?? []).map((p) => ({
      sendTime: p.send_time,
      probe: p.probe,
      temp: p.temp,
      tempDisplay: p.temp_display,
      humidity: p.humidity,
      humidityDisplay: p.humidity_display,
      tempInternal: p.temp_internal,
      battery: p.battery,
      plug: p.plug,
      door1: p.door1,
      door2: p.door2,
      door3: p.door3,
      internet: p.internet,
      extMemory: p.ext_memory,
    })),
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

const ACTIVITY_ICONS: FeedItem["icon"][] = ["Env", "Sample", "Equipment", "Inventory", "Check"];

export interface ActivityDTO {
  id: string;
  tone: string;
  icon: string;
  text: string;
  occurred_at: string;
}
export function mapActivity(d: ActivityDTO): FeedItem {
  return {
    id: d.id,
    tone: (["teal", "amber", "red", "green", "violet", "grey"].includes(d.tone) ? d.tone : "grey") as FeedItem["tone"],
    icon: ACTIVITY_ICONS.includes(d.icon as FeedItem["icon"]) ? (d.icon as FeedItem["icon"]) : "Check",
    text: d.text,
    time: formatDateTime(d.occurred_at),
  };
}

export interface TestVolumeDTO {
  date: string;
  completed: number;
  pending: number;
}
export function mapTestVolume(d: TestVolumeDTO): TestVolumePoint {
  return {
    label: new Date(d.date).toLocaleDateString("th-TH", { day: "2-digit" }),
    completed: d.completed,
    pending: d.pending,
  };
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

export function mapNotification(d: NotificationDTO): Notification {
  return {
    id: d.id,
    tone: (d.tone as Notification["tone"]) ?? "grey",
    icon: d.icon,
    title: d.title,
    message: d.message,
    time: formatDateTime(d.created_at),
    read: d.read,
  };
}
