"use client";

import { useEffect, useMemo, useState } from "react";
import { Icons } from "@/lib/icons";
import type {
  HistoryRange,
  PartnerDevice,
  PartnerDeviceHistory,
  PartnerDeviceSnapshot,
  PartnerDeviceTelemetryPage,
} from "@/lib/data";
import { formatDateTime } from "@/lib/backend-mappers";
import { Card, CardBody, CardHead, HistoryChart, PageHead, Pagination, Seg, Tag, type HistorySeries } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { ApiError, apiErrorMessage } from "@/lib/api-client";
import {
  getPartnerDeviceHistory,
  getPartnerDeviceSnapshot,
  getPartnerDeviceTelemetry,
  listPartnerDevices,
} from "@/lib/partner-devices-api";

const RANGES: { value: HistoryRange; label: string }[] = [
  { value: "1d", label: "1 วัน" },
  { value: "7d", label: "7 วัน" },
  { value: "30d", label: "30 วัน" },
];
const METRICS = ["อุณหภูมิ", "ความชื้น"];
const TABLE_LIMIT = 20;
const PROBE_COLORS = ["var(--color-teal)", "var(--color-amber)", "var(--color-violet)", "var(--color-red)"];

/** 404 = backend feature flag off, 429 = shared 60 req/min SMtrack rate limit (backend ADR 0011). */
function historyErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 404) return "ฟีเจอร์ข้อมูลย้อนหลังยังไม่เปิดใช้งาน หรือไม่พบอุปกรณ์นี้";
    if (err.status === 429) return "เรียกข้อมูลถี่เกินไป กรุณารอสักครู่แล้วลองใหม่";
  }
  return apiErrorMessage(err);
}

function formatTick(range: HistoryRange) {
  return (iso: string) => {
    const d = new Date(iso);
    return range === "1d"
      ? d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleString("th-TH", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  };
}

function useLoad<T>(load: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<{ data: T | null; error: string | null; loading: boolean }>({
    data: null,
    error: null,
    loading: true,
  });
  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    load()
      .then((data) => !cancelled && setState({ data, error: null, loading: false }))
      .catch((err) => !cancelled && setState({ data: null, error: historyErrorMessage(err), loading: false }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

function MetaItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.7px] text-muted">{label}</div>
      <div className="mt-0.5 truncate text-[13px]">{children}</div>
    </div>
  );
}

function DeviceMeta({ device, snap }: { device: PartnerDevice | null; snap: PartnerDeviceSnapshot | null }) {
  const yes = (v: boolean, on: string, off: string) => (
    <span className={v ? "text-teal" : "text-red"}>{v ? on : off}</span>
  );
  return (
    <Card>
      <CardHead
        icon={<Icons.Env />}
        title="ข้อมูลอุปกรณ์"
        right={
          <div className="flex flex-wrap gap-1.5">
            {device && !device.active && <Tag tone="grey" label="ปิดใช้งาน" />}
            {snap?.stale && <Tag tone="amber" label="ข้อมูลเก่า" />}
            {snap && <Tag tone={snap.online ? "green" : "red"} label={snap.online ? "ออนไลน์" : "ออฟไลน์"} />}
          </div>
        }
      />
      <CardBody className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
        <MetaItem label="Location">{device?.location ?? snap?.location ?? "—"}</MetaItem>
        <MetaItem label="Serial">
          <span className="font-mono">{snap?.serial ?? device?.serial ?? "—"}</span>
        </MetaItem>
        <MetaItem label="ชื่อ">{snap?.name || "—"}</MetaItem>
        <MetaItem label="Firmware">
          <span className="font-mono">{snap?.firmware || "—"}</span>
        </MetaItem>
        <MetaItem label="สถานะ">{snap ? yes(snap.status, "ใช้งาน", "ปิด") : "—"}</MetaItem>
        <MetaItem label="แบตเตอรี่">
          {snap ? (
            <span className={`font-mono ${snap.battery > 0 && snap.battery < 20 ? "text-red" : ""}`}>
              {snap.battery}%
            </span>
          ) : (
            "—"
          )}
        </MetaItem>
        <MetaItem label="ไฟ">{snap ? yes(snap.plug, "เสียบอยู่", "ไม่เสียบ") : "—"}</MetaItem>
        <MetaItem label="ประตู">
          {snap ? (
            <span className={snap.door1 || snap.door2 || snap.door3 ? "text-red" : "text-teal"}>
              {snap.door1 || snap.door2 || snap.door3 ? "เปิด" : "ปิด"}
            </span>
          ) : (
            "—"
          )}
        </MetaItem>
        <MetaItem label="SD Card">{snap ? yes(snap.extMemory, "มี", "ไม่มี") : "—"}</MetaItem>
        <MetaItem label="ค่าล่าสุด">
          {snap && snap.sendTime ? (
            <span className="font-mono">
              {snap.tempDisplay.toFixed(1)}°C · {snap.humidityDisplay.toFixed(0)}%
            </span>
          ) : (
            "—"
          )}
        </MetaItem>
        <MetaItem label="ส่งข้อมูลล่าสุด">
          <span className="font-mono text-[12.5px]">{snap?.sendTime ? formatDateTime(snap.sendTime) : "—"}</span>
        </MetaItem>
        <MetaItem label="อัปเดตจากระบบ">
          <span className="font-mono text-[12.5px]">{snap ? formatDateTime(snap.fetchedAt) : "—"}</span>
        </MetaItem>
      </CardBody>
    </Card>
  );
}

function toSeries(history: PartnerDeviceHistory | null, metric: number): HistorySeries[] {
  if (!history) return [];
  const byProbe = new Map<string, HistorySeries>();
  for (const b of history.buckets) {
    const key = b.probe || "1";
    let s = byProbe.get(key);
    if (!s) {
      s = { key, label: `Probe ${key}`, color: PROBE_COLORS[byProbe.size % PROBE_COLORS.length], points: [] };
      byProbe.set(key, s);
    }
    s.points.push(
      metric === 0
        ? { time: b.bucketStart, avg: b.tempAvg, min: b.tempMin, max: b.tempMax }
        : { time: b.bucketStart, avg: b.humidityAvg, min: b.humidityMin, max: b.humidityMax }
    );
  }
  return Array.from(byProbe.values());
}

export function PartnerDeviceDetail({ serial }: { serial: string }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [rangeIdx, setRangeIdx] = useState(0);
  const [metric, setMetric] = useState(0);
  const [page, setPage] = useState(1);
  const range = RANGES[rangeIdx].value;

  const history = useLoad(
    () => (isAdmin ? getPartnerDeviceHistory(serial, range) : Promise.resolve(null)),
    [serial, range, isAdmin]
  );
  const telemetry = useLoad<PartnerDeviceTelemetryPage | null>(
    () => (isAdmin ? getPartnerDeviceTelemetry(serial, range, page, TABLE_LIMIT) : Promise.resolve(null)),
    [serial, range, page, isAdmin]
  );

  // metadata: snapshot is a cached read (safe to load once); list gives the `active` flag. Snapshot 404s until first poll - show "—".
  const meta = useLoad<{ device: PartnerDevice | null; snap: PartnerDeviceSnapshot | null } | null>(async () => {
    if (!isAdmin) return null;
    const [list, snap] = await Promise.all([
      listPartnerDevices().catch(() => [] as PartnerDevice[]),
      getPartnerDeviceSnapshot(serial).catch(() => null),
    ]);
    return { device: list.find((d) => d.serial === serial) ?? null, snap };
  }, [serial, isAdmin]);

  const series = useMemo(() => toSeries(history.data, metric), [history.data, metric]);
  const unit = metric === 0 ? "°C" : "%";
  const fmtValue = (v: number) => `${v.toFixed(1)}${unit}`;

  const tel = telemetry.data;
  const totalPages = tel ? Math.max(1, Math.ceil(tel.total / tel.limit)) : 1;
  const rangeStart = tel && tel.total > 0 ? (tel.page - 1) * tel.limit + 1 : 0;
  const rangeEnd = tel ? Math.min(tel.page * tel.limit, tel.total) : 0;

  const onRange = (i: number) => {
    setRangeIdx(i);
    setPage(1);
  };

  return (
    <div className="animate-fade">
      <PageHead
        title="ข้อมูลย้อนหลัง SMTrack+ Device"
        desc={`Serial ${serial} · ข้อมูลอ่านสดจาก SMtrack ไม่ถูกเก็บในระบบ`}
        back={{ label: "SMTrack+ Device", href: "/environment" }}
      />

      {!isAdmin && (
        <Card>
          <div className="py-10 text-center text-[12.5px] text-muted">หน้านี้จำกัดสิทธิ์ผู้ดูแลระบบ</div>
        </Card>
      )}

      {isAdmin && (
        <div className="flex flex-col gap-4">
          <DeviceMeta device={meta.data?.device ?? null} snap={meta.data?.snap ?? null} />
          <Card>
            <CardHead
              icon={<Icons.Env />}
              title="กราฟย้อนหลัง"
              right={
                <div className="flex flex-wrap items-center gap-2">
                  <Seg compact options={METRICS} value={metric} onChange={setMetric} />
                  <Seg compact options={RANGES.map((r) => r.label)} value={rangeIdx} onChange={onRange} />
                </div>
              }
            />
            <CardBody>
              {history.loading && <div className="py-10 text-center text-[12.5px] text-muted">กำลังโหลด…</div>}
              {!history.loading && history.error && (
                <div className="py-10 text-center text-[12.5px] text-red">{history.error}</div>
              )}
              {!history.loading && !history.error && (
                <>
                  <HistoryChart
                    series={series}
                    formatTick={formatTick(range)}
                    formatValue={fmtValue}
                  />
                  {(series.length === 0 || series.every((s) => s.points.length < 2)) && (
                    <div className="py-10 text-center text-[12.5px] text-muted">
                      ไม่มีข้อมูลเพียงพอสำหรับแสดงกราฟในช่วงนี้
                    </div>
                  )}
                  {history.data && (
                    <div className="mt-2 text-[11px] text-muted-2">
                      ช่วงละ {history.data.bucketInterval} · ค่าเฉลี่ย (เส้น) และช่วงต่ำสุด–สูงสุด (แถบ)
                    </div>
                  )}
                </>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHead icon={<Icons.Clock />} title="ตารางข้อมูลย้อนหลัง" />
            {telemetry.loading && <div className="px-5 py-6 text-center text-[12.5px] text-muted">กำลังโหลด…</div>}
            {!telemetry.loading && telemetry.error && (
              <div className="px-5 py-6 text-center text-[12.5px] text-red">{telemetry.error}</div>
            )}
            {!telemetry.loading && !telemetry.error && tel && tel.points.length === 0 && (
              <div className="px-5 py-6 text-center text-[12.5px] text-muted">ไม่มีข้อมูลในช่วงนี้</div>
            )}
            {!telemetry.loading && !telemetry.error && tel && tel.points.length > 0 && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[13px]">
                    <thead>
                      <tr>
                        {["เวลา", "Probe", "อุณหภูมิ", "ความชื้น", "แบตเตอรี่", "ไฟ", "ประตู", "อินเทอร์เน็ต"].map((h) => (
                          <th
                            key={h}
                            className="whitespace-nowrap border-b border-line bg-bg px-3.5 py-2.75 text-left text-[10.5px] font-semibold uppercase tracking-[0.7px] text-muted"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tel.points.map((p, i) => (
                        <tr key={`${p.sendTime}-${p.probe}-${i}`} className="transition hover:bg-bg/60">
                          <td className="whitespace-nowrap border-b border-line px-3.5 py-3 font-mono text-[12.5px]">
                            {formatDateTime(p.sendTime)}
                          </td>
                          <td className="border-b border-line px-3.5 py-3 font-mono text-[12.5px] text-muted">
                            {p.probe || "—"}
                          </td>
                          <td className="border-b border-line px-3.5 py-3 font-mono">{p.tempDisplay.toFixed(1)}°C</td>
                          <td className="border-b border-line px-3.5 py-3 font-mono">
                            {p.humidityDisplay.toFixed(0)}%
                          </td>
                          <td
                            className={`border-b border-line px-3.5 py-3 font-mono ${p.battery > 0 && p.battery < 20 ? "text-red" : ""}`}
                          >
                            {p.battery}%
                          </td>
                          <td className={`border-b border-line px-3.5 py-3 ${p.plug ? "text-teal" : "text-red"}`}>
                            {p.plug ? "เสียบอยู่" : "ไม่เสียบ"}
                          </td>
                          <td
                            className={`border-b border-line px-3.5 py-3 ${p.door1 || p.door2 || p.door3 ? "text-red" : "text-muted"}`}
                          >
                            {p.door1 || p.door2 || p.door3 ? "เปิด" : "ปิด"}
                          </td>
                          <td className={`border-b border-line px-3.5 py-3 ${p.internet ? "text-teal" : "text-red"}`}>
                            {p.internet ? "ออนไลน์" : "ออฟไลน์"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  page={tel.page}
                  totalPages={totalPages}
                  total={tel.total}
                  rangeStart={rangeStart}
                  rangeEnd={rangeEnd}
                  onPage={setPage}
                  unit="รายการ"
                />
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
