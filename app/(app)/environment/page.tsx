"use client";

import { useCallback, useEffect, useState } from "react";
import { Icons } from "@/lib/icons";
import type { EnvAlert, Gauge, PartnerDevice, PartnerDeviceSnapshot } from "@/lib/data";
import { AreaChart, Button, Card, CardBody, CardHead, PageHead, Sparkline, Tag } from "@/components/ui";
import { useLims } from "@/components/lims-data-context";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { mapAlert, mapGauge, mapTrend, type AlertDTO, type GaugeDTO, type ReadingDTO } from "@/lib/backend-mappers";
import { getPartnerDeviceSnapshot, listPartnerDevices, streamPartnerDeviceSnapshots } from "@/lib/partner-devices-api";

function useEnvironmentData() {
  const [gauges, setGauges] = useState<Gauge[]>([]);
  const [alerts, setAlerts] = useState<EnvAlert[]>([]);
  useEffect(() => {
    apiFetch<GaugeDTO[]>("/environment/gauges")
      .then(async (r) => {
        const mapped = r.map(mapGauge);
        setGauges(mapped);
        const withTrend = await Promise.all(
          r.map(async (g, i) => {
            try {
              const readings = await apiFetch<ReadingDTO[]>(`/environment/gauges/${encodeURIComponent(g.location)}/trend`);
              return { ...mapped[i], trend: mapTrend(readings) };
            } catch {
              return mapped[i];
            }
          })
        );
        setGauges(withTrend);
      })
      .catch(() => {});
    apiFetch<AlertDTO[]>("/environment/alerts").then((r) => setAlerts(r.map(mapAlert))).catch(() => {});
  }, []);
  return { gauges, alerts };
}

/**
 * Partner Device data is Admin-only server-side (backend RBAC module
 * `partnerdevice` defaults to Admin, see backend CONTEXT.md#environment) -
 * `enabled` gates the fetch so a non-admin viewer never fires a request
 * that's just going to 403. Snapshots come from the backend's cache (never
 * a direct Partner API call - ADR 0011) and are kept fresh by the SSE
 * stream after the initial load.
 */
function usePartnerDevices(enabled: boolean) {
  const [devices, setDevices] = useState<PartnerDevice[]>([]);
  const [snapshots, setSnapshots] = useState<Record<string, PartnerDeviceSnapshot>>({});

  const refetchDevices = useCallback(async () => {
    const list = await listPartnerDevices();
    setDevices(list);
    const entries = await Promise.all(
      list.map(async (d) => {
        try {
          return [d.serial, await getPartnerDeviceSnapshot(d.serial)] as const;
        } catch {
          return null; // not polled yet - the SSE stream will fill it in once the poller runs
        }
      })
    );
    setSnapshots((prev) => {
      const next = { ...prev };
      for (const entry of entries) if (entry) next[entry[0]] = entry[1];
      return next;
    });
  }, []);

  useEffect(() => {
    if (!enabled) return;
    refetchDevices().catch(() => {});

    const stream = streamPartnerDeviceSnapshots((snap) => {
      setSnapshots((prev) => ({ ...prev, [snap.serial]: snap }));
    });

    return () => {
      stream.abort();
    };
  }, [enabled, refetchDevices]);

  return { devices, snapshots, refetchDevices };
}

function useClock() {
  const [time, setTime] = useState("--:--:--");
  useEffect(() => {
    const pad = (x: number) => String(x).padStart(2, "0");
    const tick = () => {
      const n = new Date();
      setTime(`${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

const gaugeStroke = {
  ok: "var(--color-teal)",
  warn: "var(--color-amber)",
  crit: "var(--color-red)",
};
const gaugeValColor = {
  ok: "text-teal",
  warn: "text-amber",
  crit: "text-red",
};

const alertMeta = {
  crit: { cls: "bg-red-bg text-red", icon: <Icons.Env /> },
  warn: { cls: "bg-amber-bg text-amber", icon: <Icons.Drop /> },
  ok: { cls: "bg-green-bg text-green", icon: <Icons.Power /> },
};

export default function EnvironmentPage() {
  const time = useClock();
  const { openModal } = useLims();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { gauges, alerts } = useEnvironmentData();
  const { devices: partnerDevices, snapshots: partnerSnapshots, refetchDevices: refetchPartnerDevices } = usePartnerDevices(isAdmin);

  const today = new Date().toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" });
  // เลือก gauge ที่น่าสนใจสุดสำหรับกราฟแนวโน้ม: crit ก่อน แล้ว warn แล้วตัวแรก
  const trendGauge =
    gauges.find((g) => g.level === "crit") ?? gauges.find((g) => g.level === "warn") ?? gauges[0] ?? null;

  return (
    <div className="animate-fade">
      <PageHead
        title="การควบคุมอุณหภูมิและสภาพแวดล้อม"
        desc="รายงานอุณหภูมิและความชื้นแบบเรียลไทม์ พร้อมการแจ้งเตือนอัจฉริยะไปยังสมาร์ตโฟนทันทีเมื่อเกินค่ากำหนด ตู้แช่เปิดค้าง หรือระบบไฟฟ้าขัดข้อง"
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => openModal("alert-thresholds")}>
              <Icons.Bell className="h-[15px] w-[15px]" />
              ตั้งค่าเกณฑ์แจ้งเตือน
            </Button>
            <Button variant="teal" onClick={() => openModal("add-sensor")}>
              <Icons.Plus className="h-[15px] w-[15px]" />
              เพิ่มเซนเซอร์
            </Button>
          </>
        }
      />

      {/* SIGNATURE: live instrument readout strip */}
      <div className="mb-4 overflow-hidden rounded-[10px] bg-[var(--color-readout)] shadow-card">
        <div className="flex items-center justify-between border-b border-[var(--color-readout-line)] px-4 py-3 md:px-[18px]">
          <div className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[1.5px] text-muted">
            <span className="h-2 w-2 rounded-full bg-teal animate-pulse-dot" />
            LIVE ENVIRONMENTAL MONITORING · {gauges.length} SENSORS
          </div>
          <div className="font-mono text-[12.5px] tracking-[0.5px] text-ink">
            {today} · {time}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {gauges.map((g, i) => (
            <div
              key={i}
              className="relative border-b border-r border-[var(--color-readout-line)] px-4 pb-4 pt-3 last:border-r-0 md:px-[18px] md:pb-[18px] md:pt-4"
            >
              <div className="flex items-center justify-between text-[11px] text-muted">
                <span>{g.loc}</span>
              </div>
              <div className="absolute right-4 top-3.5">
                <Tag
                  tone={g.level === "crit" ? "red" : g.level === "warn" ? "amber" : "teal"}
                  label={g.level === "crit" ? "วิกฤต" : g.level === "warn" ? "เฝ้าระวัง" : "ปกติ"}
                />
              </div>
              <div className={`mt-[7px] font-mono text-[29px] font-semibold leading-none tracking-[-1px] ${gaugeValColor[g.level]}`}>
                {g.val}
                <span className="ml-0.5 text-[14px] font-normal text-muted">{g.unit}</span>
              </div>
              <Sparkline points={g.trend} stroke={gaugeStroke[g.level]} />
              <div className="mt-2 font-mono text-[10.5px] text-muted-2">{g.range}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHead
            icon={<Icons.Env />}
            title={trendGauge ? `แนวโน้ม 24 ชั่วโมง — ${trendGauge.loc}` : "แนวโน้ม 24 ชั่วโมง"}
            right={
              trendGauge ? (
                <Tag
                  tone={trendGauge.level === "crit" ? "red" : trendGauge.level === "warn" ? "amber" : "teal"}
                  label={trendGauge.level === "crit" ? "วิกฤต" : trendGauge.level === "warn" ? "เฝ้าระวัง" : "ปกติ"}
                />
              ) : undefined
            }
          />
          <CardBody>
            {trendGauge && trendGauge.trend.length > 1 ? (
              <AreaChart points={trendGauge.trend} limit={trendGauge.rangeMax} />
            ) : (
              <div className="py-10 text-center text-[12.5px] text-muted">
                {gauges.length === 0 ? "กำลังโหลด…" : "ยังไม่มีข้อมูลแนวโน้มเพียงพอ"}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHead
            icon={<Icons.Bell />}
            title="แจ้งเตือนเข้าสมาร์ตโฟน"
            right={<span className="font-mono text-[11.5px] text-muted">Push · SMS</span>}
          />
          <div>
            {alerts.map((a, i) => {
              const m = alertMeta[a.level];
              return (
                <div key={i} className="flex items-start gap-3 border-b border-line px-4 py-[13px] last:border-none">
                  <div className={`grid h-[34px] w-[34px] flex-none place-items-center rounded-[9px] ${m.cls}`}>
                    <span className="h-[17px] w-[17px]">{m.icon}</span>
                  </div>
                  <div className="flex-1">
                    <div className="text-[13px] font-medium">{a.title}</div>
                    <div className="mt-0.5 text-[11.5px] text-muted">{a.msg}</div>
                  </div>
                  <div className="whitespace-nowrap font-mono text-[10.5px] text-muted-2">{a.time}</div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-1.5 px-4 py-3.5 text-[11.5px] text-muted-2 md:px-[18px] md:py-4">
            <Icons.Shield className="h-[13px] w-[13px]" />
            วิเคราะห์คุณภาพการจัดเก็บ เพื่อรักษาความถูกต้องของตัวอย่าง
          </div>
        </Card>
      </div>

      {/* Partner Device (SMtrack third-party sensors) — Admin-only, backend CONTEXT.md#environment / ADR 0011 */}
      {isAdmin && (
        <Card className="mt-4">
          <CardHead
            icon={<Icons.Env />}
            title={`Partner Devices (SMtrack) · ${partnerDevices.length}`}
            right={
              <Button
                variant="teal"
                size="sm"
                onClick={() =>
                  openModal("add-partner-device", {
                    gaugeLocations: gauges.map((g) => g.loc),
                    onPartnerDeviceCreated: refetchPartnerDevices,
                  })
                }
              >
                <Icons.Plus className="h-[14px] w-[14px]" />
                เพิ่ม Partner Device
              </Button>
            }
          />
          <div>
            {partnerDevices.length === 0 && (
              <div className="py-8 text-center text-[12.5px] text-muted">
                ยังไม่มี Partner Device — เพิ่มได้จากปุ่มด้านบน
              </div>
            )}
            {partnerDevices.map((d) => {
              const snap = partnerSnapshots[d.serial];
              const level = snap?.level || "ok";
              return (
                <div
                  key={d.serial}
                  className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 last:border-none md:px-[18px]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-[13px] font-medium">
                      <span className="font-mono">{d.serial}</span>
                      {!d.active && <Tag tone="grey" label="ปิดใช้งาน" />}
                      {snap?.stale && <Tag tone="amber" label="ข้อมูลเก่า" />}
                      {snap && !snap.online && <Tag tone="red" label="ออฟไลน์" />}
                    </div>
                    <div className="mt-0.5 text-[11.5px] text-muted">
                      {d.location}
                      {snap?.name ? ` · ${snap.name}` : ""}
                    </div>
                  </div>
                  <div className="text-right">
                    {snap ? (
                      <div className={`font-mono text-[15px] font-semibold ${gaugeValColor[level]}`}>
                        {snap.tempDisplay.toFixed(1)}
                        <span className="ml-0.5 text-[11px] font-normal text-muted">°C</span>
                        <span className="ml-2.5 text-muted">{snap.humidityDisplay.toFixed(0)}%</span>
                      </div>
                    ) : (
                      <span className="text-[12.5px] text-muted-2">รอข้อมูล…</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
