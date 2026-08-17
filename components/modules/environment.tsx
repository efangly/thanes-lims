"use client";

import { useEffect, useState } from "react";
import { Icons } from "@/lib/icons";
import type { EnvAlert, Gauge } from "@/lib/data";
import { AreaChart, Button, Card, CardHead, PageHead, Sparkline, Tag } from "@/components/ui";
import { useLims } from "@/components/lims-data-context";
import { apiFetch } from "@/lib/api-client";
import { mapAlert, mapGauge, mapTrend, type AlertDTO, type GaugeDTO, type ReadingDTO } from "@/lib/backend-mappers";

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
  ok: "text-white",
  warn: "text-[#f0a742]",
  crit: "text-[#ec7b70]",
};

const alertMeta = {
  crit: { cls: "bg-red-bg text-red", icon: <Icons.Env /> },
  warn: { cls: "bg-amber-bg text-amber", icon: <Icons.Drop /> },
  ok: { cls: "bg-green-bg text-green", icon: <Icons.Power /> },
};

export function EnvironmentView() {
  const time = useClock();
  const { openModal } = useLims();
  const { gauges, alerts } = useEnvironmentData();

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
        <div className="flex items-center justify-between border-b border-[var(--color-readout-line)] px-[18px] py-3">
          <div className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[1.5px] text-[#9fb3c2]">
            <span className="h-2 w-2 rounded-full bg-teal animate-pulse-dot" />
            LIVE ENVIRONMENTAL MONITORING · 4 SENSORS
          </div>
          <div className="font-mono text-[12.5px] tracking-[0.5px] text-[#e7eef3]">
            21 ก.ค. 2569 · {time}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {gauges.map((g, i) => (
            <div
              key={i}
              className="relative border-b border-r border-[var(--color-readout-line)] px-[18px] pb-[18px] pt-4 last:border-r-0"
            >
              <div className="flex items-center justify-between text-[11px] text-[#8ba3b3]">
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
                <span className="ml-0.5 text-[14px] font-normal text-[#7f97a8]">{g.unit}</span>
              </div>
              <Sparkline points={g.trend} stroke={gaugeStroke[g.level]} />
              <div className="mt-2 font-mono text-[10.5px] text-[#6f8799]">{g.range}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHead
            icon={<Icons.Env />}
            title="แนวโน้มอุณหภูมิ 24 ชั่วโมง — Fridge-A"
            right={<Tag tone="amber" label="เข้าใกล้ขีดจำกัด" />}
          />
          <div className="px-5 py-[18px]">
            <AreaChart />
            <div className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-muted-2">
              <Icons.Bolt className="h-[13px] w-[13px]" />
              ตรวจพบการเปิดตู้ 3 ครั้งในช่วง 14:00–15:00 ทำให้อุณหภูมิสูงขึ้น
            </div>
          </div>
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
          <div className="flex items-center gap-1.5 px-[18px] py-4 text-[11.5px] text-muted-2">
            <Icons.Shield className="h-[13px] w-[13px]" />
            วิเคราะห์คุณภาพการจัดเก็บ เพื่อรักษาความถูกต้องของตัวอย่าง
          </div>
        </Card>
      </div>
    </div>
  );
}
