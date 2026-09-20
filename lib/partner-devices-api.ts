import { apiFetch, apiStream } from "@/lib/api-client";
import {
  mapDiscoverDevice,
  mapHistory,
  mapTelemetryPage,
  mapPartnerDevice,
  mapPartnerDeviceSnapshot,
  mapTimeseriesPoint,
  type DiscoverDevicesResponseDTO,
  type HistoryResponseDTO,
  type TelemetryResponseDTO,
  type PartnerDeviceDTO,
  type PartnerDeviceSnapshotDTO,
  type TimeseriesResponseDTO,
} from "@/lib/backend-mappers";
import type {
  DiscoverDevice,
  HistoryRange,
  PartnerDevice,
  PartnerDeviceHistory,
  PartnerDeviceSnapshot,
  PartnerDeviceTelemetryPage,
  PartnerDeviceTimeseriesPoint,
} from "@/lib/data";

export async function listPartnerDevices(): Promise<PartnerDevice[]> {
  const rows = await apiFetch<PartnerDeviceDTO[]>("/partner-devices");
  return rows.map(mapPartnerDevice);
}

/**
 * Live read from SMtrack (not persisted anywhere) used to pick a real serial
 * before creating a mapping - backend never validates a serial exists on
 * SMtrack at create time, so a typo'd serial just never gets a reading.
 */
export async function discoverPartnerDevices(
  ward: string,
  page = 1,
  limit = 20
): Promise<{ devices: DiscoverDevice[]; total: number; page: number; limit: number }> {
  const qs = new URLSearchParams({ ward, page: String(page), limit: String(limit) });
  const res = await apiFetch<DiscoverDevicesResponseDTO>(`/partner-devices/discover?${qs.toString()}`);
  return { devices: res.devices.map(mapDiscoverDevice), total: res.total, page: res.page, limit: res.limit };
}

export interface PartnerDeviceInput {
  serial: string;
  /** must reference an existing Gauge's Location - never auto-created. */
  location: string;
  active: boolean;
}

export async function createPartnerDevice(input: PartnerDeviceInput): Promise<PartnerDevice> {
  const dto = await apiFetch<PartnerDeviceDTO>("/partner-devices", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return mapPartnerDevice(dto);
}

export async function updatePartnerDevice(
  serial: string,
  input: { location: string; active: boolean }
): Promise<PartnerDevice> {
  const dto = await apiFetch<PartnerDeviceDTO>(`/partner-devices/${encodeURIComponent(serial)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return mapPartnerDevice(dto);
}

/** Served straight from the backend's cache - never calls the Partner API directly (backend ADR 0011). */
export async function getPartnerDeviceSnapshot(serial: string): Promise<PartnerDeviceSnapshot> {
  const dto = await apiFetch<PartnerDeviceSnapshotDTO>(`/partner-devices/${encodeURIComponent(serial)}/snapshot`);
  return mapPartnerDeviceSnapshot(dto);
}

/**
 * Subscribes to the backend's SSE feed of freshly polled Partner Device
 * snapshots (one event per device per poll cycle, ~every 30s). Returns an
 * AbortController - call .abort() on unmount to close the connection.
 */
export function streamPartnerDeviceSnapshots(onSnapshot: (s: PartnerDeviceSnapshot) => void): AbortController {
  return apiStream("/partner-devices/stream", (raw) => {
    try {
      onSnapshot(mapPartnerDeviceSnapshot(JSON.parse(raw) as PartnerDeviceSnapshotDTO));
    } catch {
      // malformed frame - drop it, the next tick will bring a fresh one
    }
  });
}

/**
 * Trailing 1-hour chart data, newest point first - hits SMtrack live on
 * every call (no cache, unlike `/snapshot`), so callers should not poll this
 * more than every 1-5 min per device. `points` is `[]` (not an error) when
 * the device hasn't sent anything in the last hour.
 */
export async function getPartnerDeviceTimeseries(serial: string): Promise<PartnerDeviceTimeseriesPoint[]> {
  const dto = await apiFetch<TimeseriesResponseDTO>(`/partner-devices/${encodeURIComponent(serial)}/timeseries`);
  return dto.points.map(mapTimeseriesPoint);
}

/**
 * Bucketed aggregates for the 1d/7d/30d chart, oldest-first (do NOT reverse).
 * One row per probe per bucket. Backend caches 60s and shares the 60 req/min
 * rate limit - call on demand (range change), never on a fast timer.
 */
export async function getPartnerDeviceHistory(serial: string, range: HistoryRange): Promise<PartnerDeviceHistory> {
  const dto = await apiFetch<HistoryResponseDTO>(
    `/partner-devices/${encodeURIComponent(serial)}/history?range=${range}`
  );
  return mapHistory(dto);
}

/** Raw readings for the history table, newest-first. `limit` is clamped to 200 by the backend (default 50). */
export async function getPartnerDeviceTelemetry(
  serial: string,
  range: HistoryRange,
  page = 1,
  limit = 50
): Promise<PartnerDeviceTelemetryPage> {
  const qs = new URLSearchParams({ range, page: String(page), limit: String(limit) });
  const dto = await apiFetch<TelemetryResponseDTO>(
    `/partner-devices/${encodeURIComponent(serial)}/telemetry?${qs.toString()}`
  );
  return mapTelemetryPage(dto);
}
