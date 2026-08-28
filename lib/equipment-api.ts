import { apiFetch } from "@/lib/api-client";
import { formatDate, mapDocument, mapEquipment, type DocumentDTO, type EquipmentDTO } from "@/lib/backend-mappers";
import type { Document, Equipment } from "@/lib/data";

/**
 * TypeCode drives the per-category ID sequence (EQ-{TYPE}-{seq3}) and stays
 * short — it is derived from the name, never typed. Category (the human-facing
 * classification, Phase 5) is a separate free-text field the user fills in.
 */
export function deriveTypeCode(name: string): string {
  return (
    name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 20) || "EQUIPMENT"
  );
}

export interface EquipmentInput {
  name: string;
  /** next calibration due — yyyy-mm-dd from the date input */
  next: string;
  sn: string;
  category: string;
  manufacturer: string;
  model: string;
  installDate: string | null;
  vendorId: string | null;
  locationId: string | null;
}

export async function createEquipment(input: EquipmentInput): Promise<Equipment> {
  const dto = await apiFetch<EquipmentDTO>("/equipment", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      type_code: deriveTypeCode(input.name),
      next_calibration_due: new Date(input.next).toISOString(),
      serial_number: input.sn,
      category: input.category,
      manufacturer: input.manufacturer,
      model: input.model,
      installation_date: input.installDate ? new Date(input.installDate).toISOString() : null,
      vendor_id: input.vendorId ?? "",
      location_id: input.locationId ?? "",
    }),
  });
  return mapEquipment(dto);
}

/** Asset-field edits only (name / sn / category / manufacturer / model / install date / vendor / location). */
export interface EquipmentPatch {
  name?: string;
  sn?: string;
  category?: string;
  manufacturer?: string;
  model?: string;
  /** null = clear, string = set */
  installDate?: string | null;
  vendorId?: string | null;
  locationId?: string | null;
}

export async function patchEquipment(id: string, patch: EquipmentPatch): Promise<Equipment> {
  const body: Record<string, unknown> = {};
  if (patch.name !== undefined) body.name = patch.name;
  if (patch.sn !== undefined) body.serial_number = patch.sn;
  if (patch.category !== undefined) body.category = patch.category;
  if (patch.manufacturer !== undefined) body.manufacturer = patch.manufacturer;
  if (patch.model !== undefined) body.model = patch.model;
  if (patch.installDate !== undefined) {
    if (patch.installDate === null) body.clear_installation_date = true;
    else body.installation_date = new Date(patch.installDate).toISOString();
  }
  if (patch.vendorId !== undefined) body.vendor_id = patch.vendorId ?? "";
  if (patch.locationId !== undefined) body.location_id = patch.locationId ?? "";
  const dto = await apiFetch<EquipmentDTO>(`/equipment/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  return mapEquipment(dto);
}

export async function getEquipment(id: string): Promise<Equipment> {
  return mapEquipment(await apiFetch<EquipmentDTO>(`/equipment/${encodeURIComponent(id)}`));
}

export interface CalibrationEvent {
  id: number;
  equipmentId: string;
  calibratedAt: string;
  /** raw RFC3339 for sorting/filtering */
  calibratedAtRaw: string;
  nextDue: string;
  performedBy: string;
  notes: string;
  type: string;
  measured: string;
  acceptance: string;
  result: "pass" | "fail" | "";
}

interface CalibrationEventDTO {
  id: number;
  equipment_id: string;
  calibrated_at: string;
  next_calibration_due: string;
  performed_by: string;
  notes: string;
  calibration_type: string;
  calibrate_value: string;
  acceptance_value: string;
  result: string;
}

function mapCalibrationEvent(d: CalibrationEventDTO): CalibrationEvent {
  return {
    id: d.id,
    equipmentId: d.equipment_id,
    calibratedAt: formatDate(d.calibrated_at),
    calibratedAtRaw: d.calibrated_at,
    nextDue: formatDate(d.next_calibration_due),
    performedBy: d.performed_by,
    notes: d.notes,
    type: d.calibration_type,
    measured: d.calibrate_value,
    acceptance: d.acceptance_value,
    result: d.result === "pass" || d.result === "fail" ? d.result : "",
  };
}

export async function listCalibrationEvents(equipmentId: string): Promise<CalibrationEvent[]> {
  const rows = await apiFetch<CalibrationEventDTO[]>(`/equipment/${encodeURIComponent(equipmentId)}/calibration-events`);
  return rows.map(mapCalibrationEvent);
}

export interface CalibrationResultFilter {
  q?: string;
  equipmentId?: string;
  result?: "pass" | "fail" | "";
  from?: string;
  to?: string;
}

/** Flat, newest-first list of every logged calibration across all equipment (requirement 2.2). */
export async function searchCalibrationResults(f: CalibrationResultFilter): Promise<CalibrationEvent[]> {
  const qs = new URLSearchParams();
  if (f.q?.trim()) qs.set("q", f.q.trim());
  if (f.equipmentId) qs.set("equipment_id", f.equipmentId);
  if (f.result) qs.set("result", f.result);
  if (f.from) qs.set("from", new Date(f.from).toISOString());
  if (f.to) qs.set("to", new Date(f.to).toISOString());
  const rows = await apiFetch<CalibrationEventDTO[]>(`/calibration-results?${qs.toString()}`);
  return rows.map(mapCalibrationEvent);
}

/* ---------- Calibration Schedules (ADR-0006) ---------- */

export interface CalibrationSchedule {
  id: number;
  equipmentId: string;
  label: string;
  /** raw RFC3339 */
  nextDueDate: string;
  intervalMonths: number | null;
}

interface CalibrationScheduleDTO {
  id: number;
  equipment_id: string;
  label: string;
  next_due_date: string;
  interval_months: number | null;
}

function mapSchedule(d: CalibrationScheduleDTO): CalibrationSchedule {
  return {
    id: d.id,
    equipmentId: d.equipment_id,
    label: d.label,
    nextDueDate: d.next_due_date,
    intervalMonths: d.interval_months ?? null,
  };
}

/** Every equipment's schedules in one request — the equipment table needs them all up front (ADR-0006). */
export async function listAllSchedules(): Promise<CalibrationSchedule[]> {
  const rows = await apiFetch<CalibrationScheduleDTO[]>("/calibration-schedules");
  return rows.map(mapSchedule);
}

export async function listEquipmentSchedules(equipmentId: string): Promise<CalibrationSchedule[]> {
  const rows = await apiFetch<CalibrationScheduleDTO[]>(
    `/equipment/${encodeURIComponent(equipmentId)}/calibration-schedules`
  );
  return rows.map(mapSchedule);
}

export interface ScheduleInput {
  label: string;
  /** yyyy-mm-dd */
  nextDueDate: string;
  intervalMonths: number | null;
}

export async function createSchedule(equipmentId: string, input: ScheduleInput): Promise<CalibrationSchedule> {
  const dto = await apiFetch<CalibrationScheduleDTO>(`/equipment/${equipmentId}/calibration-schedules`, {
    method: "POST",
    body: JSON.stringify({
      label: input.label,
      next_due_date: new Date(input.nextDueDate).toISOString(),
      interval_months: input.intervalMonths,
    }),
  });
  return mapSchedule(dto);
}

export async function updateSchedule(
  equipmentId: string,
  scheduleId: number,
  input: ScheduleInput
): Promise<CalibrationSchedule> {
  const dto = await apiFetch<CalibrationScheduleDTO>(
    `/equipment/${equipmentId}/calibration-schedules/${scheduleId}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        label: input.label,
        next_due_date: new Date(input.nextDueDate).toISOString(),
        interval_months: input.intervalMonths,
        clear_interval: input.intervalMonths === null,
      }),
    }
  );
  return mapSchedule(dto);
}

export async function deleteSchedule(equipmentId: string, scheduleId: number): Promise<void> {
  await apiFetch<void>(`/equipment/${equipmentId}/calibration-schedules/${scheduleId}`, { method: "DELETE" });
}

export interface RecordCalibrationInput {
  nextCalibrationDue: string;
  calibrationType: string;
  calibrateValue: string;
  acceptanceValue: string;
  result: "pass" | "fail";
  notes?: string;
}

/**
 * Logs a calibration event. The backend returns the updated Equipment, not the
 * event — so the caller must fetch the freshly-created event id separately when it
 * needs to attach a certificate (see `latestCalibrationEventId`).
 */
export async function recordCalibration(equipmentId: string, input: RecordCalibrationInput): Promise<Equipment> {
  const dto = await apiFetch<EquipmentDTO>(`/equipment/${equipmentId}/calibration`, {
    method: "PATCH",
    body: JSON.stringify({
      next_calibration_due: new Date(input.nextCalibrationDue).toISOString(),
      calibration_type: input.calibrationType,
      calibrate_value: input.calibrateValue,
      acceptance_value: input.acceptanceValue,
      result: input.result,
      notes: input.notes ?? "",
    }),
  });
  return mapEquipment(dto);
}

/** The id of the most recent calibration event for an equipment (newest-first from /calibration-results). */
export async function latestCalibrationEventId(equipmentId: string): Promise<number | null> {
  const rows = await searchCalibrationResults({ equipmentId });
  return rows[0]?.id ?? null;
}

export async function listEquipmentDocuments(equipmentId: string): Promise<Document[]> {
  const rows = await apiFetch<DocumentDTO[]>(`/documents?equipment_id=${encodeURIComponent(equipmentId)}`);
  return rows.map(mapDocument);
}
