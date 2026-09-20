"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Icons } from "@/lib/icons";
import type { PartnerDevice, PartnerDeviceSnapshot, PartnerDeviceTimeseriesPoint } from "@/lib/data";
import { formatDateTime } from "@/lib/backend-mappers";
import { Button, Card, PageHead, Tag, TimeseriesChart } from "@/components/ui";
import { useLims } from "@/components/lims-data-context";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import {
  getPartnerDeviceSnapshot,
  getPartnerDeviceTimeseries,
  listPartnerDevices,
  streamPartnerDeviceSnapshots,
} from "@/lib/partner-devices-api";

/**
 * `/timeseries` hits SMtrack live on every call (no cache) - the backend
 * guide recommends refreshing every 1-5 min per device, not faster.
 */
const TIMESERIES_REFRESH_MS = 3 * 60 * 1000;

/**
 * `apiStream` only authenticates once, at connection open (a single
 * 401-retry-with-refresh, same as `apiFetch`) - it never re-checks the
 * bearer token for the life of a long-held SSE connection. Reopening on
 * this timer forces a fresh `getAccessToken()`/refresh cycle well before a
 * realistic access-token TTL, so a device left on this page for hours never
 * ends up holding a stale token with no way back.
 */
const STREAM_RECONNECT_MS = 10 * 60 * 1000;

/**
 * Only fetches `/environment/gauges` to know which Locations already have a
 * Gauge - the Add/Edit Partner Device forms may only target one of those
 * (backend never auto-creates a Gauge). Nothing about the gauges themselves
 * (value, thresholds, trend) is rendered on this page anymore.
 */
function useGaugeLocations() {
  const [locations, setLocations] = useState<string[]>([]);
  useEffect(() => {
    apiFetch<{ location: string }[]>("/environment/gauges")
      .then((r) => setLocations(r.map((g) => g.location)))
      .catch(() => {});
  }, []);
  return locations;
}

/**
 * Partner Device data is Admin-only server-side (backend RBAC module
 * `partnerdevice` defaults to Admin, see backend CONTEXT.md#environment) -
 * `enabled` gates the fetch so a non-admin viewer never fires a request
 * that's just going to 403. Snapshots come from the backend's cache (never
 * a direct Partner API call - ADR 0011) and are kept fresh by the SSE
 * stream after the initial load.
 *
 * `timeseries` comes from `GET /partner-devices/:serial/timeseries` - a
 * genuine trailing-1-hour history from SMtrack (no wider range is possible -
 * see ADR 0011/0012), refetched on a slow timer since that endpoint is
 * uncached and hits SMtrack on every call.
 */
function usePartnerDevices(enabled: boolean) {
  const [devices, setDevices] = useState<PartnerDevice[]>([]);
  const [snapshots, setSnapshots] = useState<Record<string, PartnerDeviceSnapshot>>({});
  const [timeseries, setTimeseries] = useState<Record<string, PartnerDeviceTimeseriesPoint[]>>({});

  const refetchDevices = useCallback(async () => {
    const list = await listPartnerDevices();
    setDevices(list);
    await Promise.all(
      list.map(async (d) => {
        try {
          const snap = await getPartnerDeviceSnapshot(d.serial);
          setSnapshots((prev) => ({ ...prev, [d.serial]: snap }));
        } catch {
          // not polled yet - the SSE stream will fill it in once the poller runs
        }
      })
    );
  }, []);

  const refetchTimeseries = useCallback(async (list: PartnerDevice[]) => {
    await Promise.all(
      list.map(async (d) => {
        try {
          const points = await getPartnerDeviceTimeseries(d.serial);
          setTimeseries((prev) => ({ ...prev, [d.serial]: points }));
        } catch {
          // serial not visible on SMtrack right now - leave the previous chart (if any) as-is
        }
      })
    );
  }, []);

  useEffect(() => {
    if (!enabled) return;
    refetchDevices().catch(() => {});

    let stream = streamPartnerDeviceSnapshots((snap) => {
      setSnapshots((prev) => ({ ...prev, [snap.serial]: snap }));
    });

    const reconnectId = setInterval(() => {
      stream.abort();
      stream = streamPartnerDeviceSnapshots((snap) => {
        setSnapshots((prev) => ({ ...prev, [snap.serial]: snap }));
      });
    }, STREAM_RECONNECT_MS);

    return () => {
      clearInterval(reconnectId);
      stream.abort();
    };
  }, [enabled, refetchDevices]);

  useEffect(() => {
    if (!enabled || devices.length === 0) return;
    refetchTimeseries(devices);
    const id = setInterval(() => refetchTimeseries(devices), TIMESERIES_REFRESH_MS);
    return () => clearInterval(id);
  }, [enabled, devices, refetchTimeseries]);

  return { devices, snapshots, timeseries, refetchDevices };
}

const levelValColor = {
  ok: "text-teal",
  warn: "text-amber",
  crit: "text-red",
};
const levelStroke = {
  ok: "var(--color-teal)",
  warn: "var(--color-amber)",
  crit: "var(--color-red)",
};

function formatTimeShort(iso: string) {
  return new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

export default function EnvironmentPage() {
  const { openModal } = useLims();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const gaugeLocations = useGaugeLocations();
  const {
    devices: partnerDevices,
    snapshots: partnerSnapshots,
    timeseries: partnerTimeseries,
    refetchDevices: refetchPartnerDevices,
  } = usePartnerDevices(isAdmin);

  return (
    <div className="animate-fade">
      <PageHead
        title="SMTrack+ Device"
        desc="อุปกรณ์วัดอุณหภูมิ/ความชื้นของ SMtrack ที่ผูกเข้ากับ Location ในระบบ พร้อมค่าล่าสุดแบบเรียลไทม์ผ่าน SSE"
      />

      {!isAdmin && (
        <Card>
          <div className="py-10 text-center text-[12.5px] text-muted">หน้านี้จำกัดสิทธิ์ผู้ดูแลระบบ</div>
        </Card>
      )}

      {isAdmin && (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-display text-[15px] font-semibold">
              <Icons.Env className="h-4 w-4 text-teal-d" />
              SMTrack+ Device · {partnerDevices.length}
            </h2>
            <Button
              variant="teal"
              size="sm"
              onClick={() =>
                openModal("add-partner-device", {
                  gaugeLocations,
                  onPartnerDeviceCreated: refetchPartnerDevices,
                })
              }
            >
              <Icons.Plus className="h-3.5 w-3.5" />
              เพิ่ม SMTrack+ Device
            </Button>
          </div>

          {partnerDevices.length === 0 && (
            <Card>
              <div className="py-8 text-center text-[12.5px] text-muted">
                ยังไม่มี SMTrack+ Device — เพิ่มได้จากปุ่มด้านบน
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {partnerDevices.map((d) => {
              const snap = partnerSnapshots[d.serial];
              const level = snap?.level || "ok";
              const series = partnerTimeseries[d.serial];
              // backend returns newest-first; chart wants oldest-first (left-to-right)
              const chartPoints = series
                ? [...series].reverse().map((p) => ({ time: p.sendTime, value: p.tempDisplay }))
                : undefined;
              return (
                <Card key={d.serial} className="p-4 md:p-4.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 text-[13px] font-medium">
                        <span>{d.location}</span>
                      </div>
                      <div className="mt-0.5 truncate text-[11.5px] text-muted">
                        <span className="font-mono">{d.serial}</span>
                        {snap?.name ? ` · ${snap.name}` : ""}
                      </div>
                    </div>
                    <Link
                      href={`/environment/${encodeURIComponent(d.serial)}`}
                      className="ml-auto whitespace-nowrap px-2 py-1 text-[12.5px] font-medium text-teal-d hover:underline"
                    >
                      ย้อนหลัง
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        openModal("edit-partner-device", {
                          editingPartnerDevice: d,
                          gaugeLocations,
                          onPartnerDeviceUpdated: refetchPartnerDevices,
                        })
                      }
                    >
                      แก้ไข
                    </Button>
                  </div>

                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {!d.active && <Tag tone="grey" label="ปิดใช้งาน" />}
                    {snap?.stale && <Tag tone="amber" label="ข้อมูลเก่า" />}
                    {snap && !snap.online && <Tag tone="red" label="ออฟไลน์" />}
                  </div>

                  {snap ? (
                    <>
                      <div className={`mt-2.5 font-mono text-[26px] font-semibold leading-none ${levelValColor[level]}`}>
                        {snap.tempDisplay.toFixed(1)}
                        <span className="ml-0.5 text-[13px] font-normal text-muted">°C</span>
                        <span className="ml-2.5 text-[15px] text-muted">{snap.humidityDisplay.toFixed(0)}%</span>
                      </div>
                      {chartPoints === undefined ? (
                        <div className="mt-2.5 h-27.5 text-[11px] text-muted-2">กำลังโหลดกราฟ…</div>
                      ) : chartPoints.length > 1 ? (
                        <>
                          <TimeseriesChart
                            points={chartPoints}
                            stroke={levelStroke[level]}
                            height={110}
                            showAxes
                            formatTick={formatTimeShort}
                            formatValue={(v) => `${v.toFixed(1)}°C`}
                          />
                        </>
                      ) : (
                        <div className="mt-2.5 h-27.5 text-[11px] text-muted-2">
                          ไม่มีข้อมูลกราฟใน 1 ชม. ที่ผ่านมา
                        </div>
                      )}
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 ${snap.battery > 0 && snap.battery < 20 ? "text-red" : "text-teal"}`}
                          >
                            <Icons.Battery className="h-5 w-5" />
                            <span className="font-mono text-[11px]">{snap.battery}%</span>
                          </span>
                          <Icons.Plug className={`h-5 w-5 ${snap.plug ? "text-teal" : "text-red"}`} />
                          <Icons.Door
                            className={`h-5 w-5 ${snap.door1 || snap.door2 || snap.door3 ? "text-red" : "text-teal"}`}
                          />
                          <Icons.SdCard className={`h-5 w-5 ${snap.extMemory ? "text-teal" : "text-red"}`} />
                        </div>
                        <span className="font-mono text-[10.5px] text-muted-2">
                          {snap.sendTime ? formatDateTime(snap.sendTime) : "—"}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="py-6 text-center text-[12.5px] text-muted-2">รอข้อมูล…</div>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
