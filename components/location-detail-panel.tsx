"use client";

import Link from "next/link";
import type { Equipment, InventoryItem, Location, LocationKind, Sample } from "@/lib/data";
import { Icons } from "@/lib/icons";
import { Avatar, Button, Card, CardHead, Tag } from "@/components/ui";
import { boxOccupants, occupantOf } from "@/lib/occupancy";
import { levelLabel } from "@/lib/location-kinds";
import { useFullPath } from "@/lib/use-full-path";

/**
 * Panel 3 of the `/locations` browser (ADR-0010). Default view is a summary of the
 * selected node (barcode, full path, occupancy). Clicking a Cell / occupant in
 * Panel 2 swaps it to a sample summary with a Back button. On the equipment tree
 * there are no samples, so the node view lists the Equipment and Inventory Items
 * whose `locationId` points here (filtered client-side — no location endpoint).
 */
export function LocationDetailPanel({
  kind,
  node,
  sample,
  onBack,
  samples,
  equipment,
  inventory,
}: {
  kind: LocationKind;
  node: Location | null;
  sample: Sample | null;
  onBack: () => void;
  samples: Sample[];
  equipment: Equipment[];
  inventory: InventoryItem[];
}) {
  if (sample) {
    return <SampleSummary sample={sample} onBack={onBack} />;
  }

  if (!node) {
    return (
      <Card>
        <CardHead icon={<Icons.Doc />} title="รายละเอียด" />
        <div className="px-5 py-8 text-center text-[12.5px] text-muted">เลือกโหนดจากต้นไม้เพื่อดูรายละเอียด</div>
      </Card>
    );
  }

  return <NodeSummary kind={kind} node={node} samples={samples} equipment={equipment} inventory={inventory} />;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-5 py-2.5">
      <span className="flex-none text-[12px] text-muted">{label}</span>
      <span className="min-w-0 text-right text-[13px] text-ink">{children}</span>
    </div>
  );
}

function NodeSummary({
  kind,
  node,
  samples,
  equipment,
  inventory,
}: {
  kind: LocationKind;
  node: Location;
  samples: Sample[];
  equipment: Equipment[];
  inventory: InventoryItem[];
}) {
  const { path, loading } = useFullPath(node.id);
  const isBox = node.levelType === "box";
  const occ = occupantOf(samples, node.id);

  const items =
    kind === "equipment_storage"
      ? [
          ...equipment.filter((e) => e.locationId === node.id).map((e) => ({ id: e.id, name: e.name, href: `/equipment/${e.id}`, tag: "เครื่องมือ" })),
          ...inventory.filter((i) => i.locationId === node.id).map((i) => ({ id: i.id, name: i.name, href: `/inventory`, tag: "คลัง" })),
        ]
      : [];

  return (
    <Card>
      <CardHead icon={<Icons.Loc />} title={node.name} right={<span className="font-mono text-[11.5px] text-muted">{levelLabel(kind, node.levelType)}</span>} />
      <div className="divide-y divide-line">
        <Row label="Full path">{loading ? "กำลังโหลด…" : path ?? "—"}</Row>
        <Row label="Location Barcode">
          {node.barcodeCode ? <span className="font-mono text-[12px]">{node.barcodeCode}</span> : <span className="text-muted-2">—</span>}
        </Row>
        {isBox && node.rows && node.cols && (
          <Row label="กริด / ใช้ไป">
            <span className="font-mono">
              {node.rows}×{node.cols} · {boxOccupants(samples, node.id).size}/{node.rows * node.cols}
            </span>
          </Row>
        )}
        {kind === "sample_storage" && !isBox && (
          <Row label="ตัวอย่างที่ครองอยู่">
            {occ ? (
              <Link href={`/samples?s=${occ.id}`} className="font-mono text-[12px] text-teal-d hover:underline">
                {occ.id}
              </Link>
            ) : (
              <span className="text-muted-2">ว่าง</span>
            )}
          </Row>
        )}
      </div>

      {kind === "equipment_storage" && (
        <div className="border-t border-line px-5 py-3.5">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.7px] text-muted">สิ่งที่จัดเก็บในตำแหน่งนี้</div>
          {items.length === 0 ? (
            <div className="py-3 text-center text-[12px] text-muted">ยังไม่มีเครื่องมือ/สินค้าในตำแหน่งนี้</div>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {items.map((it) => (
                <li key={it.id} className="flex items-center gap-2 text-[12.5px]">
                  <span className="rounded bg-bg px-1.5 py-0.5 font-mono text-[10px] text-muted-2">{it.tag}</span>
                  <Link href={it.href} className="font-mono text-teal-d hover:underline">
                    {it.id}
                  </Link>
                  <span className="truncate text-muted">{it.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}

function SampleSummary({ sample, onBack }: { sample: Sample; onBack: () => void }) {
  const { path, loading } = useFullPath(sample.locationId);
  return (
    <Card>
      <CardHead
        icon={<Icons.Sample />}
        title="ตัวอย่าง"
        right={
          <Button variant="ghost" size="sm" onClick={onBack}>
            <Icons.Arrow className="h-[13px] w-[13px] rotate-180" />
            กลับ
          </Button>
        }
      />
      <div className="divide-y divide-line">
        <Row label="รหัสตัวอย่าง">
          <span className="font-mono text-[12.5px]">{sample.id}</span>
        </Row>
        <Row label="Barcode ID">
          {sample.barcodeId ? <span className="font-mono text-[12px]">{sample.barcodeId}</span> : <span className="text-muted-2">—</span>}
        </Row>
        <Row label="ตัวอย่าง">
          {sample.name} <span className="text-muted">· {sample.type}</span>
        </Row>
        <Row label="ผู้ดูแล">
          <span className="inline-flex items-center gap-1.5">
            <Avatar initials={sample.custodian?.[0] ?? "?"} size="xs" />
            {sample.custodian}
          </span>
        </Row>
        <Row label="สถานะ">
          <Tag {...sample.status} />
        </Row>
        <Row label="ตำแหน่ง">
          {loading ? "กำลังโหลด…" : `${path ?? "—"}${sample.position ? ` · ช่อง ${sample.position}` : ""}`}
        </Row>
      </div>
      <div className="border-t border-line px-5 py-3">
        <Link href={`/samples?s=${sample.id}`} className="flex items-center gap-1.5 text-[12.5px] font-medium text-teal-d hover:underline">
          <Icons.Arrow className="h-[13px] w-[13px]" />
          เปิดหน้าตัวอย่างเต็ม (Chain of Custody)
        </Link>
      </div>
    </Card>
  );
}
