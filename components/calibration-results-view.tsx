"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Icons } from "@/lib/icons";
import { Button, Card, CardHead, Field, Input, PageHead, Select, Tag } from "@/components/ui";
import { useLims } from "@/components/lims-data-context";
import { apiErrorMessage } from "@/lib/api-client";
import { searchCalibrationResults, type CalibrationEvent } from "@/lib/equipment-api";

/** Flat, newest-first calibration results across every machine (requirement 2.2). */
export function CalibrationResultsView() {
  const params = useSearchParams();
  const { equipment, openModal } = useLims();
  const equipmentIdParam = params.get("equipment_id") ?? "";

  const [q, setQ] = useState("");
  const [equipmentId, setEquipmentId] = useState(equipmentIdParam);
  const [result, setResult] = useState<"" | "pass" | "fail">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rows, setRows] = useState<CalibrationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEquipmentId(equipmentIdParam);
  }, [equipmentIdParam]);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      setError(null);
      searchCalibrationResults({ q, equipmentId: equipmentId || undefined, result: result || undefined, from, to })
        .then(setRows)
        .catch((err) => setError(apiErrorMessage(err)))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [q, equipmentId, result, from, to]);

  const nameById = useMemo(() => new Map(equipment.map((e) => [e.id, e.name])), [equipment]);

  return (
    <div className="animate-fade">
      <PageHead
        title="ผลการสอบเทียบ"
        desc="รายการผลสอบเทียบข้ามทุกเครื่องมือ เรียงจากใหม่ไปเก่า"
        actions={
          <>
            <Link href="/equipment" className="text-[12.5px] text-muted hover:text-ink">
              ← ทะเบียนเครื่องมือ
            </Link>
            <Button variant="teal" onClick={() => openModal("record-calibration")}>
              <Icons.Plus className="h-[15px] w-[15px]" />
              บันทึกผลสอบเทียบ
            </Button>
          </>
        }
      />

      <Card>
        <CardHead icon={<Icons.Search />} title="ค้นหา" />
        <div className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="ค้นหา (รหัส/ชื่อ/ผู้สอบเทียบ/ประเภท)">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="พิมพ์เพื่อค้นหา" />
          </Field>
          <Field label="เครื่องมือ">
            <Select value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)}>
              <option value="">ทั้งหมด</option>
              {equipment.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="ผล">
            <Select value={result} onChange={(e) => setResult(e.target.value as "" | "pass" | "fail")}>
              <option value="">ทั้งหมด</option>
              <option value="pass">ผ่าน</option>
              <option value="fail">ไม่ผ่าน</option>
            </Select>
          </Field>
          <Field label="ตั้งแต่วันที่">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="ถึงวันที่">
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card className="mt-4">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {["วันสอบเทียบ", "เครื่องมือ", "ประเภท", "ค่าที่วัด", "ค่ายอมรับ", "ผล", "ผู้สอบเทียบ", "ครบกำหนดถัดไป"].map(
                  (h) => (
                    <th
                      key={h}
                      className="whitespace-nowrap border-b border-line bg-bg px-3.5 py-[11px] text-left text-[10.5px] font-semibold uppercase tracking-[0.7px] text-muted"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="px-3.5 py-6 text-center text-[12.5px] text-muted">
                    กำลังโหลด…
                  </td>
                </tr>
              )}
              {error && !loading && (
                <tr>
                  <td colSpan={8} className="px-3.5 py-6 text-center text-[12.5px] text-red">
                    {error}
                  </td>
                </tr>
              )}
              {!loading && !error && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3.5 py-6 text-center text-[12.5px] text-muted">
                    ไม่พบผลการสอบเทียบ
                  </td>
                </tr>
              )}
              {rows.map((ev) => (
                <tr key={ev.id} className="transition hover:bg-bg/60">
                  <td className="border-b border-line px-3.5 py-3 font-mono text-[12.5px]">{ev.calibratedAt}</td>
                  <td className="border-b border-line px-3.5 py-3">
                    <Link href={`/equipment/${ev.equipmentId}`} className="font-medium hover:underline">
                      {nameById.get(ev.equipmentId) ?? ev.equipmentId}
                    </Link>
                    <div className="font-mono text-[11px] text-muted">{ev.equipmentId}</div>
                  </td>
                  <td className="border-b border-line px-3.5 py-3">{ev.type || "—"}</td>
                  <td className="border-b border-line px-3.5 py-3 font-mono text-[12px]">{ev.measured || "—"}</td>
                  <td className="border-b border-line px-3.5 py-3 font-mono text-[12px]">{ev.acceptance || "—"}</td>
                  <td className="border-b border-line px-3.5 py-3">
                    {ev.result ? (
                      <Tag tone={ev.result === "pass" ? "green" : "red"} label={ev.result === "pass" ? "ผ่าน" : "ไม่ผ่าน"} />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="border-b border-line px-3.5 py-3">{ev.performedBy || "—"}</td>
                  <td className="border-b border-line px-3.5 py-3 font-mono text-[12.5px]">{ev.nextDue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
