import { apiFetch, apiStream } from "@/lib/api-client";
import {
  mapPartnerDevice,
  mapPartnerDeviceSnapshot,
  type PartnerDeviceDTO,
  type PartnerDeviceSnapshotDTO,
} from "@/lib/backend-mappers";
import type { PartnerDevice, PartnerDeviceSnapshot } from "@/lib/data";

export async function listPartnerDevices(): Promise<PartnerDevice[]> {
  const rows = await apiFetch<PartnerDeviceDTO[]>("/partner-devices");
  return rows.map(mapPartnerDevice);
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
