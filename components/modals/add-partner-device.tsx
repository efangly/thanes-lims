"use client";

import { useState } from "react";
import { Icons } from "@/lib/icons";
import { Modal } from "@/components/modal";
import { Button, Field, Input, Select, Seg, Tag } from "@/components/ui";
import { useUiStore } from "@/lib/stores/ui-store";
import { apiErrorMessage } from "@/lib/api-client";
import { createPartnerDevice, discoverPartnerDevices } from "@/lib/partner-devices-api";
import type { DiscoverDevice } from "@/lib/data";

const LIMIT = 5;

/**
 * Admin-only form to map a third-party SMtrack device Serial to an existing
 * Gauge Location (backend ADR 0011). Serial always comes from `/discover`
 * rather than free text - backend never validates a serial exists on SMtrack
 * at create time, so a typo'd serial would just silently never get a reading.
 */
export function AddPartnerDeviceModal() {
  const activeModal = useUiStore((s) => s.activeModal);
  const closeModal = useUiStore((s) => s.closeModal);
  const pushToast = useUiStore((s) => s.pushToast);
  const modalContext = useUiStore((s) => s.modalContext);
  const open = activeModal === "add-partner-device";
  const locations = modalContext.gaugeLocations ?? [];

  const [ward, setWard] = useState("");
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<DiscoverDevice[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [selected, setSelected] = useState<DiscoverDevice | null>(null);
  const [location, setLocation] = useState("");
  const [activeIdx, setActiveIdx] = useState(0); // 0 = ใช้งาน, 1 = ปิดใช้งาน
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setWard("");
    setSearching(false);
    setSearched(false);
    setSearchError(null);
    setResults([]);
    setPage(1);
    setTotal(0);
    setSelected(null);
    setLocation("");
    setActiveIdx(0);
  };
  const handleClose = () => {
    reset();
    closeModal();
  };

  const runSearch = async (p: number) => {
    if (!ward.trim()) return;
    setSearching(true);
    setSearchError(null);
    setSelected(null);
    try {
      const res = await discoverPartnerDevices(ward.trim(), p, LIMIT);
      setResults(res.devices);
      setTotal(res.total);
      setPage(res.page);
      setSearched(true);
    } catch (err) {
      setResults([]);
      setTotal(0);
      setSearched(true);
      setSearchError(apiErrorMessage(err));
    } finally {
      setSearching(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const handleSubmit = async () => {
    if (!selected || !location) return;
    setSubmitting(true);
    try {
      await createPartnerDevice({ serial: selected.serial, location, active: activeIdx === 0 });
      pushToast(`ผูก SMTrack+ Device "${selected.serial}" กับ ${location} เรียบร้อย`);
      modalContext.onPartnerDeviceCreated?.();
      handleClose();
    } catch (err) {
      pushToast(apiErrorMessage(err), "red");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="เพิ่ม SMTrack+ Device"
      icon={<Icons.Env />}
      size="md"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            ยกเลิก
          </Button>
          <Button
            variant="teal"
            size="sm"
            onClick={handleSubmit}
            disabled={submitting || !selected || !location}
          >
            <Icons.Plus className="h-3.5 w-3.5" />
            {submitting ? "กำลังบันทึก..." : "เพิ่ม SMTrack+ Device"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <Field label="Ward (จากทีม SMtrack/admin)">
          <div className="flex gap-2">
            <Input
              value={ward}
              onChange={(e) => setWard(e.target.value)}
              placeholder="เช่น bbd2930b-fb7c-4038-aa1c-73216aabd4bb"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && runSearch(1)}
            />
            <Button variant="ghost" size="sm" onClick={() => runSearch(1)} disabled={searching || !ward.trim()}>
              <Icons.Search className="h-3.5 w-3.5" />
              ค้นหา
            </Button>
          </div>
        </Field>

        {searching && <div className="py-6 text-center text-[12.5px] text-muted">กำลังค้นหา…</div>}
        {!searching && searchError && (
          <div className="py-6 text-center text-[12.5px] text-red">{searchError}</div>
        )}
        {!searching && !searchError && searched && results.length === 0 && (
          <div className="py-6 text-center text-[12.5px] text-muted">ไม่พบอุปกรณ์ใน ward นี้</div>
        )}
        {!searching && results.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <div className="max-h-55 overflow-y-auto rounded-lg border border-line">
              {results.map((d) => (
                <button
                  key={d.serial}
                  type="button"
                  onClick={() => setSelected(d)}
                  className={`flex w-full items-center justify-between gap-3 border-b border-line px-3 py-2 text-left last:border-none transition ${
                    selected?.serial === d.serial ? "bg-teal-bg" : "hover:bg-bg"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[12.5px] font-medium">
                      <span className="font-mono">{d.serial}</span>
                      {!d.online && <Tag tone="grey" label="ออฟไลน์" />}
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted">{d.name}</div>
                  </div>
                  <div className="whitespace-nowrap text-right font-mono text-[11.5px] text-muted">
                    {d.tempDisplay != null ? `${d.tempDisplay.toFixed(1)}°C` : "—"}
                    {d.humidityDisplay != null ? ` · ${d.humidityDisplay.toFixed(0)}%` : ""}
                  </div>
                </button>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between text-[11.5px] text-muted">
                <span>
                  หน้า {page} / {totalPages} · ทั้งหมด {total} รายการ
                </span>
                <div className="flex gap-1.5">
                  <Button variant="ghost" size="sm" onClick={() => runSearch(page - 1)} disabled={page <= 1}>
                    ก่อนหน้า
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => runSearch(page + 1)} disabled={page >= totalPages}>
                    ถัดไป
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {selected && (
          <>
            <Field label="ผูกกับ Location (ต้องมี Gauge อยู่แล้ว)">
              <Select value={location} onChange={(e) => setLocation(e.target.value)}>
                <option value="">เลือก Location</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="สถานะ">
              <Seg options={["ใช้งาน", "ปิดใช้งาน"]} value={activeIdx} onChange={setActiveIdx} />
            </Field>
          </>
        )}
      </div>
    </Modal>
  );
}
