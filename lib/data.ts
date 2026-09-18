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
  | "tests"
  | "vendors"
  | "users"
  | "profile";

export const MODULE_META: Record<ModuleId, { code: string; title: string }> = {
  dashboard: { code: "MODULE 00", title: "แดชบอร์ด" },
  "ai-chat": { code: "AI ASSISTANT", title: "ผู้ช่วยอัจฉริยะ" },
  samples: { code: "MODULE 01", title: "การจัดการตัวอย่าง" },
  locations: { code: "ข้อมูลหลัก", title: "ตำแหน่งจัดเก็บ" },
  equipment: { code: "MODULE 02", title: "การจัดการเครื่องมือ" },
  environment: { code: "MODULE 03", title: "ควบคุมสภาพแวดล้อม" },
  inventory: { code: "MODULE 04", title: "สินค้าคงคลัง" },
  documents: { code: "MODULE 05", title: "การจัดการเอกสาร" },
  tests: { code: "MODULE 06", title: "ทดสอบ & วิเคราะห์" },
  vendors: { code: "ข้อมูลหลัก", title: "ผู้ขาย (Vendor)" },
  users: { code: "ผู้ดูแลระบบ", title: "การจัดการผู้ใช้งาน" },
  profile: { code: "บัญชีของฉัน", title: "โปรไฟล์" },
};

/* ---------- Storage Location tree ---------- */
/** Which of the two storage trees a Location belongs to — see lib/location-kinds.ts (ADR-0008). */
export type LocationKind = "sample_storage" | "equipment_storage";

/**
 * Union of both trees' rungs. Depth and meaning come from the Kind, never from the name.
 * `box` is special: a terminal marker in the sample tree (ADR-0009) that can appear at
 * depth 2, 3, or 4 and never has children — it is not part of the fixed level chain.
 */
export type LevelType = "cabinet" | "shelf" | "slot" | "sub_slot" | "building" | "room" | "zone" | "box";

export interface Location {
  id: string;
  parentId: string | null;
  name: string;
  kind: LocationKind;
  levelType: LevelType;
  /** Scannable code carried by every node; absent only on pre-Phase-2 rows the backend never backfilled. */
  barcodeCode?: string;
  /** Box Grid dimensions — set only when `levelType === "box"` (ADR-0009). */
  rows?: number;
  cols?: number;
}

export interface Sample {
  id: string;
  name: string;
  type: string;
  custodian: string;
  locationId: string | null;
  status: Tag;
  recv: string;
  /** Optional scan code — either printed on the tube already or generated after intake. Null until set. */
  barcodeId: string | null;
  /** Free-text intake notes. Empty string when none. */
  description: string;
  /** Box Cell (`A1`, `H12`) when `locationId` points at a Box; null on a plain leaf or unassigned (ADR-0009). */
  position: string | null;
}

export interface CoCStep {
  state: "done" | "now" | "";
  icon: "Plus" | "Loc" | "Arrow" | "Test" | "Check";
  title: string;
  meta: string;
  who: string;
}

export interface Equipment {
  id: string;
  name: string;
  cal: number;
  next: string;
  status: Tag;
  usage: string;
  /** Asset/nameplate fields (Phase 5). Empty string when unset. */
  sn: string;
  category: string;
  manufacturer: string;
  model: string;
  /** `yyyy-mm-dd` for the date input, or null. */
  installDate: string | null;
  vendorId: string | null;
  locationId: string | null;
}

export interface EnvAlert {
  level: "crit" | "warn" | "ok";
  title: string;
  msg: string;
  time: string;
}

/** Admin-managed Serial<->Location mapping for a third-party SMtrack sensor (backend ADR 0011). */
export interface PartnerDevice {
  serial: string;
  location: string;
  active: boolean;
}

/** Polled metadata + latest reading + derived alert Level for one Partner Device. `level` is "" when the device has no reading yet. */
export interface PartnerDeviceSnapshot {
  serial: string;
  location: string;
  name: string;
  status: boolean;
  online: boolean;
  firmware: string;
  tempDisplay: number;
  humidityDisplay: number;
  sendTime: string | null;
  level: "ok" | "warn" | "crit" | "";
  /** % (0-100). Zero-valued alongside tempDisplay/humidityDisplay when the device has no reading yet. */
  battery: number;
  /** true when the device is on external/mains power. */
  plug: boolean;
  /** true when that door is open - most devices only use door1. */
  door1: boolean;
  door2: boolean;
  door3: boolean;
  /** true when the device's SD/external memory card is present. */
  extMemory: boolean;
  fetchedAt: string;
  /** true when this snapshot is served from cache because the last live poll of the Partner API failed. */
  stale: boolean;
}

/**
 * One SMtrack device returned by `GET /partner-devices/discover?ward=` - a live
 * read from SMtrack, not persisted anywhere. `tempDisplay`/`humidityDisplay`/
 * `sendTime` are null when the device has never sent a reading yet - never
 * coerce that to 0, "no value" and "value is 0" are different things.
 */
export interface DiscoverDevice {
  serial: string;
  name: string;
  status: boolean;
  firmware: string;
  online: boolean;
  tempDisplay: number | null;
  humidityDisplay: number | null;
  sendTime: string | null;
}

/**
 * One reading from `GET /partner-devices/:serial/timeseries` - a live,
 * uncached read straight from SMtrack limited to the trailing 1 hour (no
 * `from`/`to` range is possible). Don't poll this more than every 1-5 min per
 * device - unlike `/snapshot` it hits SMtrack on every call.
 */
export interface PartnerDeviceTimeseriesPoint {
  sendTime: string;
  tempDisplay: number;
  humidityDisplay: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  cat: string;
  /** derived from received lots — never set directly (Phase 8) */
  qty: number;
  unit: string;
  min: number;
  max: number;
  pct: number;
  status: Tag;
  /** custodian User id — required by the backend on create (Phase 7′) */
  custodianUserId: number | null;
  /** plain nameplate text, not a Vendor */
  manufacturer: string;
  vendorId: string | null;
  locationId: string | null;
  /** raw RFC3339 of the soonest-expiring lot, or null */
  earliestExpireDate: string | null;
  lotCount: number;
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

export interface Document {
  id: string;
  name: string;
  type: string;
  ver: string;
  by: string;
  date: string;
  access: string;
  locked: boolean;
  /** Stored file's base name with extension (e.g. "sop.pdf"); "" when unknown. */
  fileName: string;
  equipmentId: string | null;
  calibrationEventId: number | null;
}

export interface DocHistory {
  ver: string;
  change: string;
  date: string;
  who: string;
}

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

export interface FeedItem {
  id: string;
  tone: TagTone;
  icon: "Env" | "Sample" | "Equipment" | "Inventory" | "Check";
  text: string;
  time: string;
}

/** จุดข้อมูลกราฟปริมาณงานทดสอบรายวัน (dashboard) */
export interface TestVolumePoint {
  label: string;
  completed: number;
  pending: number;
}

export interface Notification {
  id: string;
  tone: TagTone;
  icon: "Env" | "Sample" | "Equipment" | "Inventory" | "Doc" | "Test";
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export interface PurchaseOrder {
  id: string;
  item: string;
  qty: string;
  vendor: string;
  date: string;
  status: Tag;
}

